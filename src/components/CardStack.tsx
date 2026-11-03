'use client';

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { haptic, hapticsNeedGesture } from '@/lib/client/haptics';
import { Spring } from '@/lib/client/spring';
import type { PassCard } from '@/lib/model/types';
import { CardBack, CardFront, Lanyard } from './CardFaces';

// --- 見た目 ---
const CARD_RATIO = 1.42; // 高さ / 幅
const STRAP_RATIO = 0.56; // カード上にはみ出すストラップの高さ / 幅
const SPREAD = 0.52; // 隣のカードまでの距離(カード幅比)
const STEP = 0.1; // 2枚目以降の重なり間隔(カード幅比)
const ROT = 52; // 横のカードの傾き(度)
const MAX_VISIBLE = 6; // 左右それぞれ何枚目まで見せるか
const WINDOW = 8; // DOM に置くのは中心 ± WINDOW 枚だけ

// --- 操作 ---
const EDGE_GUARD = 32; // 画面端からのドラッグは無視する(iOS の戻るジェスチャーと衝突させない)
const TAP_SLOP = 8;
const TAP_MAX_MS = 500;
const MAX_FLING = 4; // 1回のフリックで進む最大枚数

type DragState = {
  id: number;
  x0: number;
  y0: number;
  t0: number;
  lastX: number;
  lastT: number;
  vx: number; // px/ms
  axis: 'x' | 'y' | null;
  startPos: number;
  startAngle: number;
  target: Element;
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const faceOf = (angle: number) => Math.abs(Math.round(angle / 180)) % 2;

/** 範囲外に引っ張ったときは抵抗をかける */
function rubber(v: number, lo: number, hi: number) {
  if (v < lo) return lo - (lo - v) * 0.3;
  if (v > hi) return hi + (v - hi) * 0.3;
  return v;
}

type Props = {
  cards: PassCard[];
  /** 値が変わったら先頭のカードに戻す(並び替え・絞り込みを変えたとき) */
  resetKey?: string;
  onCenterChange?: (card: PassCard | null) => void;
  onFocusChange?: (card: PassCard | null) => void;
};

/**
 * カード一覧のインタラクション。
 * 1. 一覧: 本のページのように左右に重なったカードを横ドラッグでめくる
 * 2. タップ: 中央のカードを拡大して単独表示(横のカードをタップした場合はそのカードを中央へ)
 * 3. 単独表示中の横ドラッグ: 指に追従して裏返る。タップで一覧に戻る
 *
 * 毎フレームの更新は React を通さず、ref 経由で transform / opacity だけを書き換える。
 */
export function CardStack({ cards, resetKey, onCenterChange, onFocusChange }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const els = useRef(new Map<number, HTMLDivElement>());
  const flips = useRef(new Map<number, HTMLDivElement>());

  const pos = useRef(new Spring(0, { stiffness: 170, damping: 24 })).current;
  const focusT = useRef(new Spring(0, { stiffness: 190, damping: 23 })).current;
  const flip = useRef(new Spring(0, { stiffness: 150, damping: 19, epsilon: 0.05 })).current;

  const mode = useRef<'list' | 'focus'>('list');
  /** 拡大対象のカード。一覧に戻るアニメーション中も保持する */
  const focusedIdx = useRef<number | null>(null);
  const settledFace = useRef(0);
  const drag = useRef<DragState | null>(null);
  const raf = useRef(0);
  const lastTime = useRef(0);
  const centerRef = useRef(0);
  const metrics = useRef({ cw: 200, focusScale: 1.4 });
  const lastResetKey = useRef(resetKey);
  const cardsRef = useRef(cards);
  const callbacks = useRef({ onCenterChange, onFocusChange });
  callbacks.current = { onCenterChange, onFocusChange };

  const [center, setCenter] = useState(0);
  /**
   * カードの DOM は「拡大表示したときの大きさ」(cw × focusScale)で組み、一覧では縮小して見せる。
   * 小さく組んで scale で拡大すると、ブラウザが低解像度のまま引き伸ばして文字がにじむため。
   */
  const [size, setSize] = useState({ cw: 200, focusScale: 1.4 });
  const [focused, setFocused] = useState<number | null>(null);

  // ---------- 描画 ----------

  function apply() {
    const { cw, focusScale } = metrics.current;
    const strap = cw * STRAP_RATIO;
    const p = pos.value;
    const f = focusT.value;
    const fi = focusedIdx.current;

    for (const [i, el] of els.current) {
      const d = i - p;
      const ad = Math.abs(d);
      const sd = Math.sign(d);
      const near = Math.min(ad, 1);
      const far = Math.max(0, ad - 1);

      let x = sd * (near * SPREAD + far * STEP) * cw;
      let y = strap / 2; // ストラップ込みで全体が中央に来るように
      let rot = -sd * near * ROT;
      let scale = 1 - near * 0.12 - Math.min(far, MAX_VISIBLE) * 0.025;
      let opacity = clamp(MAX_VISIBLE + 1 - ad, 0, 1);

      if (fi === i) {
        x *= 1 - f;
        rot *= 1 - f;
        scale = lerp(scale, focusScale, f);
        y = lerp(y, (strap * focusScale) / 2, f);
        opacity = 1;
      } else if (fi !== null) {
        opacity *= 1 - f;
        y += f * cw * 0.3;
        scale *= 1 - 0.08 * f;
      }

      // DOM は拡大時のサイズで組んであるので、ここでの scale は 1/focusScale を掛けて縮める方向になる
      const cssScale = scale / focusScale;
      el.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) rotateY(${rot.toFixed(2)}deg) scale(${cssScale.toFixed(4)})`;
      el.style.opacity = opacity.toFixed(3);
      const z = String(fi === i ? 2000 : 1000 - Math.round(ad * 10));
      if (el.style.zIndex !== z) el.style.zIndex = z;
      const vis = opacity < 0.01 ? 'hidden' : 'visible';
      if (el.style.visibility !== vis) el.style.visibility = vis;

      const fl = flips.current.get(i);
      if (fl) {
        const angle = fi === i ? flip.value : 0;
        // 裏返る途中で少し縮めて奥行きを出す
        const dip = 1 - 0.08 * Math.abs(Math.sin((angle * Math.PI) / 180));
        fl.style.transform = `rotateY(${angle.toFixed(2)}deg) scale(${dip.toFixed(4)})`;
        // 画像など別レイヤーで描かれる要素は backface-visibility をすり抜けて反対の面に透けるため、
        // 見えていない側の面は visibility で隠す(切り替わるのは真横を向いた瞬間なので見た目には出ない)
        const norm = ((angle % 360) + 360) % 360;
        const side = norm > 90 && norm < 270 ? 'back' : 'front';
        if (fl.dataset.side !== side) fl.dataset.side = side;
      }
    }
  }

  function tick(now: number) {
    const dt = lastTime.current ? (now - lastTime.current) / 1000 : 1 / 60;
    lastTime.current = now;
    const draggingX = drag.current?.axis === 'x';

    if (!(draggingX && mode.current === 'list')) pos.step(dt);
    focusT.step(dt);
    if (!(draggingX && mode.current === 'focus')) flip.step(dt);

    const n = cardsRef.current.length;
    const c = clamp(Math.round(pos.value), 0, Math.max(0, n - 1));
    if (c !== centerRef.current) {
      centerRef.current = c;
      setCenter(c);
    }

    // 一覧に戻るアニメーションが終わったら拡大対象を外す
    if (mode.current === 'list' && focusedIdx.current !== null && focusT.settled && flip.settled) {
      flip.set(0);
      focusedIdx.current = null;
    }

    // 裏返り完了(Android 等はここで鳴らす。iOS は指を離した時点で鳴らしている)
    if (mode.current === 'focus' && !draggingX && flip.settled) {
      const face = faceOf(flip.value);
      if (face !== settledFace.current) {
        settledFace.current = face;
        if (!hapticsNeedGesture()) haptic();
      }
    }

    apply();

    const busy =
      !!drag.current || !pos.settled || !focusT.settled || !flip.settled || (mode.current === 'list' && focusedIdx.current !== null);
    if (busy) {
      raf.current = requestAnimationFrame(tick);
    } else {
      raf.current = 0;
      lastTime.current = 0;
    }
  }

  function kick() {
    if (!raf.current) {
      lastTime.current = 0;
      raf.current = requestAnimationFrame(tick);
    }
  }

  // ---------- 状態遷移 ----------

  function focusOn(i: number) {
    focusedIdx.current = i;
    mode.current = 'focus';
    settledFace.current = 0;
    flip.set(0);
    pos.to(i);
    focusT.to(1);
    setFocused(i);
    callbacks.current.onFocusChange?.(cardsRef.current[i] ?? null);
    kick();
  }

  function unfocus() {
    mode.current = 'list';
    focusT.to(0);
    flip.to(Math.round(flip.value / 360) * 360);
    setFocused(null);
    callbacks.current.onFocusChange?.(null);
    kick();
  }

  function flipTo(target: number, velocity?: number) {
    flip.to(target, velocity);
    // iOS はユーザー操作の中でしか鳴らせないので、裏返りが確定した時点で鳴らす
    if (hapticsNeedGesture() && faceOf(target) !== settledFace.current) haptic();
    kick();
  }

  /** カード幅の 60% ドラッグで半回転 → 30% 動かせば離したときに裏返る */
  function degPerPx() {
    const { cw, focusScale } = metrics.current;
    return 180 / (cw * focusScale * 0.6);
  }

  function handleTap(target: Element) {
    if (mode.current === 'focus') {
      if (target.closest('[data-no-tap]')) return;
      unfocus();
      return;
    }
    const el = target.closest<HTMLElement>('[data-index]');
    if (!el) return;
    const i = Number(el.dataset.index);
    if (i === Math.round(pos.value)) focusOn(i);
    else {
      pos.to(i);
      kick();
    }
  }

  // ---------- ポインター ----------

  function onPointerDown(e: React.PointerEvent) {
    if (drag.current) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const target = e.target as Element;
    if (target.closest('[data-no-drag]')) return;
    if (e.clientX < EDGE_GUARD || e.clientX > window.innerWidth - EDGE_GUARD) return;
    drag.current = {
      id: e.pointerId,
      x0: e.clientX,
      y0: e.clientY,
      t0: e.timeStamp,
      lastX: e.clientX,
      lastT: e.timeStamp,
      vx: 0,
      axis: null,
      startPos: pos.value,
      startAngle: flip.value,
      target,
    };
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;

    if (!d.axis) {
      const dx = e.clientX - d.x0;
      const dy = e.clientY - d.y0;
      if (Math.hypot(dx, dy) < TAP_SLOP) return;
      d.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (d.axis === 'y') {
        // 一覧での縦方向はページのスクロールに任せる
        if (mode.current === 'list') drag.current = null;
        return;
      }
      stageRef.current?.setPointerCapture(e.pointerId);
      // 動いているスプリングを掴んだ位置から追従させる
      d.x0 = e.clientX;
      d.startPos = pos.value;
      d.startAngle = flip.value;
      d.lastX = e.clientX;
      d.lastT = e.timeStamp;
    }
    if (d.axis !== 'x') return;

    const dt = e.timeStamp - d.lastT;
    if (dt > 0) {
      d.vx = d.vx * 0.2 + ((e.clientX - d.lastX) / dt) * 0.8;
      d.lastX = e.clientX;
      d.lastT = e.timeStamp;
    }
    const dx = e.clientX - d.x0;
    if (mode.current === 'list') {
      const n = cardsRef.current.length;
      pos.set(rubber(d.startPos - dx / (SPREAD * metrics.current.cw), 0, Math.max(0, n - 1)));
    } else {
      flip.set(d.startAngle + dx * degPerPx());
    }
    kick();
  }

  function onPointerUp(e: React.PointerEvent) {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    drag.current = null;

    if (!d.axis) {
      if (e.timeStamp - d.t0 < TAP_MAX_MS) handleTap(d.target);
      return;
    }
    if (d.axis !== 'x') return;
    release(e.timeStamp - d.lastT > 80 ? 0 : d.vx, d.startAngle);
  }

  function onPointerCancel(e: React.PointerEvent) {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    drag.current = null;
    if (d.axis === 'x') release(0, d.startAngle);
  }

  /** 指を離したらスプリングで最寄りのカード/面に収める。vx は px/ms */
  function release(vx: number, startAngle: number) {
    if (mode.current === 'list') {
      const n = cardsRef.current.length;
      const v = (-vx * 1000) / (SPREAD * metrics.current.cw); // 枚/秒
      const fling = clamp(v * 0.18, -MAX_FLING, MAX_FLING);
      pos.to(clamp(Math.round(pos.value + fling), 0, Math.max(0, n - 1)), v);
      kick();
    } else {
      const v = vx * 1000 * degPerPx(); // 度/秒
      const base = Math.round(startAngle / 180) * 180;
      // 1回のドラッグで裏返るのは1面まで
      const target = clamp(Math.round((flip.value + v * 0.12) / 180) * 180, base - 180, base + 180);
      flipTo(target, v);
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const n = cardsRef.current.length;
    if (!n) return;
    if (mode.current === 'list') {
      const c = Math.round(pos.target);
      if (e.key === 'ArrowLeft') pos.to(Math.max(0, c - 1));
      else if (e.key === 'ArrowRight') pos.to(Math.min(n - 1, c + 1));
      else if (e.key === 'Enter' || e.key === ' ') focusOn(clamp(c, 0, n - 1));
      else return;
      kick();
    } else {
      const base = Math.round(flip.target / 180) * 180;
      if (e.key === 'ArrowLeft') flipTo(base - 180);
      else if (e.key === 'ArrowRight') flipTo(base + 180);
      else if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') unfocus();
      else return;
    }
    e.preventDefault();
  }

  // ---------- レイアウト ----------

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const measure = () => {
      const { width, height } = stage.getBoundingClientRect();
      const byWidth = width * 0.54;
      const byHeight = (height - 24) / (CARD_RATIO + STRAP_RATIO);
      const w = Math.round(clamp(Math.min(byWidth, byHeight), 120, 240));
      const focusScale = Math.min((width - 32) / w, (height - 16) / (w * (CARD_RATIO + STRAP_RATIO)), 1.8);
      metrics.current = { cw: w, focusScale: Math.max(1, focusScale) };
      setSize(metrics.current);
      apply();
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(stage);
    return () => ro.disconnect();
  }, []);

  // 並び替え・絞り込みを変えたら先頭へ。読み込みでカードが増えたときは、見ていたカードを中央に保つ
  useLayoutEffect(() => {
    const prev = cardsRef.current;
    if (prev === cards) return;
    cardsRef.current = cards;
    const n = cards.length;

    const reset = lastResetKey.current !== resetKey;
    lastResetKey.current = resetKey;
    // 先頭を見ているなら、前に新しいカードが届いても先頭に留まる(古い順で一番古い大会を見たいときなど)
    const atStart =
      !drag.current && focusedIdx.current === null && centerRef.current === 0 && Math.round(pos.target) === 0;

    if (reset || atStart) {
      pos.set(0);
    } else {
      const centerId = prev[centerRef.current]?.id;
      const newCenter = centerId ? cards.findIndex((c) => c.id === centerId) : -1;
      const shift = newCenter >= 0 ? newCenter - centerRef.current : 0;
      pos.value = clamp(pos.value + shift, 0, Math.max(0, n - 1));
      pos.target = clamp(Math.round(pos.target + shift), 0, Math.max(0, n - 1));
    }
    centerRef.current = clamp(Math.round(pos.value), 0, Math.max(0, n - 1));
    setCenter(centerRef.current);

    if (focusedIdx.current !== null) {
      const id = prev[focusedIdx.current]?.id;
      const fi = id ? cards.findIndex((c) => c.id === id) : -1;
      if (fi < 0) {
        focusedIdx.current = null;
        if (mode.current === 'focus') unfocus();
      } else {
        focusedIdx.current = fi;
        if (mode.current === 'focus') setFocused(fi);
      }
    }
    kick();
  }, [cards, resetKey]);

  // 描画範囲が変わって新しく DOM に入ったカードにも、ペイント前に位置を当てる
  useLayoutEffect(() => {
    apply();
  });

  useEffect(() => {
    callbacks.current.onCenterChange?.(cards[center] ?? null);
  }, [center, cards]);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const lo = Math.max(0, center - WINDOW);
  const hi = Math.min(cards.length - 1, center + WINDOW);
  const indices: number[] = [];
  for (let i = lo; i <= hi; i++) indices.push(i);
  if (focused !== null && (focused < lo || focused > hi)) indices.push(focused);

  // 拡大時の実寸。一覧では apply() が 1/focusScale に縮める
  const fullW = Math.round(size.cw * size.focusScale);
  const fullH = fullW * CARD_RATIO;

  return (
    <div
      ref={stageRef}
      className={`stack${focused !== null ? ' is-focus' : ''}`}
      style={{ '--cw': `${fullW}px` } as CSSProperties}
      tabIndex={0}
      role="region"
      aria-roledescription="カード一覧"
      aria-label={
        focused !== null
          ? `${cards[focused]?.tournament.name ?? ''}。左右キーで裏返し、Escで一覧に戻る`
          : '左右キーでめくる、Enterで拡大'
      }
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onKeyDown={onKeyDown}
    >
      {indices.map((i) => {
        const card = cards[i];
        return (
          <div
            key={card.id}
            className="pc"
            data-index={i}
            style={{ width: fullW, height: fullH, marginLeft: -fullW / 2, marginTop: -fullH / 2 }}
            ref={(el) => {
              if (!el) return;
              els.current.set(i, el);
              return () => {
                if (els.current.get(i) === el) els.current.delete(i);
              };
            }}
          >
            <Lanyard color={card.tournament.theme.primary} />
            <div
              className="pc-flip"
              ref={(el) => {
                if (!el) return;
                flips.current.set(i, el);
                return () => {
                  if (flips.current.get(i) === el) flips.current.delete(i);
                };
              }}
            >
              <CardFront card={card} />
              <CardBack card={card} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
