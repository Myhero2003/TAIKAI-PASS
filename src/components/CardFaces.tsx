'use client';

import { useId, useState } from 'react';
import { FORMAT_LABEL, formatDate, monogram, percent, placeLabel } from '@/lib/client/format';
import type { PassCard } from '@/lib/model/types';

/**
 * 首ストラップ(生地 + 金具カシメ + ナスカン + リング)。
 * カード本体の上にはみ出して描き、リングがカードの穴に掛かるように配置する。
 * 裏返しても金具は動かないよう、フリップする要素の外に置く。
 */
export function Lanyard({ color }: { color: string }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg className="pc-lanyard" viewBox="0 0 100 64" aria-hidden="true">
      <defs>
        <linearGradient id={`fade${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.35" stopColor="#fff" stopOpacity="1" />
        </linearGradient>
        <mask id={`mask${id}`}>
          <rect x="0" y="0" width="100" height="64" fill={`url(#fade${id})`} />
        </mask>
        <pattern id={`weave${id}`} width="2.4" height="2.4" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <rect width="2.4" height="2.4" fill={color} />
          <rect width="1.2" height="2.4" fill="#000" opacity="0.1" />
        </pattern>
        <linearGradient id={`metal${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8d9299" />
          <stop offset="0.45" stopColor="#f2f4f6" />
          <stop offset="0.6" stopColor="#c3c8ce" />
          <stop offset="1" stopColor="#6f747b" />
        </linearGradient>
      </defs>

      <g mask={`url(#mask${id})`}>
        <line x1="22" y1="-4" x2="45" y2="36" stroke={`url(#weave${id})`} strokeWidth="11" />
        <line x1="78" y1="-4" x2="55" y2="36" stroke={`url(#weave${id})`} strokeWidth="11" />
        <line x1="22" y1="-4" x2="45" y2="36" stroke="#fff" strokeOpacity="0.35" strokeWidth="0.6" strokeDasharray="1.6 1.4" />
        <line x1="78" y1="-4" x2="55" y2="36" stroke="#fff" strokeOpacity="0.35" strokeWidth="0.6" strokeDasharray="1.6 1.4" />
      </g>

      {/* カシメ */}
      <rect x="39" y="32" width="22" height="10" rx="2.5" fill={`url(#metal${id})`} stroke="#5d6167" strokeWidth="0.4" />
      <line x1="40.5" y1="37" x2="59.5" y2="37" stroke="#5d6167" strokeWidth="0.4" opacity="0.6" />
      {/* 回転カン */}
      <circle cx="50" cy="45" r="2.6" fill="none" stroke={`url(#metal${id})`} strokeWidth="1.6" />
      {/* ナスカン本体 */}
      <path
        d="M50 47.5c3.6 0 5.2 2.8 5.2 5.6 0 3.2-2.2 5.3-5.2 5.3s-5.2-2.1-5.2-5.3c0-2.8 1.6-5.6 5.2-5.6z"
        fill={`url(#metal${id})`}
        stroke="#5d6167"
        strokeWidth="0.4"
      />
      <path d="M53.2 50.5v4.8" stroke="#5d6167" strokeWidth="0.7" strokeLinecap="round" />
      {/* 穴に掛かるリング */}
      <path d="M47 57v4.6a3 3 0 0 0 6 0V57" fill="none" stroke={`url(#metal${id})`} strokeWidth="1.5" />
    </svg>
  );
}

function nameSize(name: string): string {
  const len = [...name].reduce((n, ch) => n + (ch.charCodeAt(0) > 0xff ? 1.7 : 1), 0);
  const k = Math.min(1, 9 / Math.max(len, 1));
  return `calc(var(--cw) * ${(0.13 * Math.max(k, 0.42)).toFixed(4)})`;
}

export function CardFront({ card }: { card: PassCard }) {
  const { theme, iconUrl, name } = card.tournament;
  const games = card.results.map((r) => r.game);
  const shown = games.length <= 3 ? games : games.slice(0, 2);
  const extra = games.length - shown.length;

  return (
    <div className="pc-face pc-front">
      <div
        className="pc-art"
        style={{ background: `linear-gradient(160deg, ${theme.gradient[0]}, ${theme.gradient[1]})` }}
      >
        <div className="pc-hole" />
        <div className={`pc-icon ${iconUrl ? '' : 'is-mono'}`} style={{ color: theme.onPrimary }}>
          {iconUrl ? (
            <img src={iconUrl} alt={name} draggable={false} loading="lazy" />
          ) : (
            <span>{monogram(name)}</span>
          )}
        </div>
        {card.isMultiTitle && (
          <div className="pc-games" aria-label={`${games.length}タイトル`}>
            {shown.map((g) => (
              <span key={g.id} className="pc-game" title={g.name}>
                {g.iconUrl ? (
                  <img src={g.iconUrl} alt={g.name} draggable={false} loading="lazy" />
                ) : (
                  <span>{monogram(g.name).slice(0, 2)}</span>
                )}
              </span>
            ))}
            {extra > 0 && <span className="pc-game is-more">+{extra}</span>}
          </div>
        )}
      </div>
      <div className="pc-name">
        <span style={{ fontSize: nameSize(card.displayName) }}>{card.displayName}</span>
      </div>
    </div>
  );
}

export function CardBack({ card }: { card: PassCard }) {
  const [tab, setTab] = useState(0);
  const { theme } = card.tournament;
  const r = card.results[Math.min(tab, card.results.length - 1)];
  const topPct = r.placement != null && r.numEntrants > 0 ? r.placement / r.numEntrants : null;

  return (
    <div className="pc-face pc-back" style={{ background: theme.primary, color: theme.onPrimary }}>
      <div className="pc-hole" />
      <header className="pb-head">
        <div className="pb-title">{card.tournament.name}</div>
        <div className="pb-meta">
          {formatDate(card.date)} · {placeLabel(card)}
        </div>
      </header>

      {card.results.length > 1 && (
        <div className="pb-tabs" role="tablist" data-no-drag data-no-tap>
          {card.results.map((res, i) => (
            <button
              key={res.eventId}
              role="tab"
              aria-selected={i === tab}
              className={i === tab ? 'is-active' : ''}
              onClick={() => setTab(i)}
            >
              {res.game.name}
            </button>
          ))}
        </div>
      )}

      <div className="pb-event">
        {r.eventName}
        {r.format !== 'singles' && <span className="pb-chip">{FORMAT_LABEL[r.format]}</span>}
      </div>

      <div className="pb-rank">
        <span className="pb-rank-num">{r.placement ?? '—'}</span>
        <span className="pb-rank-unit">位</span>
        {!r.final && <span className="pb-chip">暫定</span>}
        <div className="pb-rank-sub">
          {r.numEntrants}人中{topPct != null && ` · 上位${percent(topPct, topPct < 0.1 ? 1 : 0)}`}
        </div>
      </div>

      <dl className="pb-grid">
        <div>
          <dt>試合数</dt>
          <dd>{r.sets.played}</dd>
        </div>
        <div>
          <dt>勝率</dt>
          <dd>{percent(r.winRate)}</dd>
        </div>
        <div>
          <dt>戦績</dt>
          <dd>
            {r.sets.won}-{r.sets.lost}
          </dd>
        </div>
      </dl>

      <div className="pb-chars">
        {r.characters ? (
          r.characters.slice(0, 3).map((c) => (
            <div key={c.id} className="pb-char">
              <span className="pb-char-name">{c.name}</span>
              <span className="pb-char-bar">
                <span style={{ transform: `scaleX(${c.ratio})` }} />
              </span>
              <span className="pb-char-pct">{percent(c.ratio)}</span>
            </div>
          ))
        ) : (
          <p className="pb-empty">キャラ情報なし</p>
        )}
      </div>

      {r.subEvents.length > 0 && (
        <ul className="pb-subs">
          {r.subEvents.map((s) => (
            <li key={s.eventId}>
              {s.name} <b>{s.placement ?? '—'}位</b>
            </li>
          ))}
        </ul>
      )}

      <a
        className="pb-link"
        href={card.tournament.url}
        target="_blank"
        rel="noreferrer"
        data-no-drag
        data-no-tap
      >
        start.gg で見る ↗
      </a>
    </div>
  );
}
