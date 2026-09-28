// README 用のスクリーンショットを撮る(依存パッケージなし。インストール済みの Chrome を DevTools Protocol で操作)
//   npm run dev を起動した状態で: npm run screenshots [ベースURL]
// headless Chrome の --screenshot はウィンドウ幅に下限があり、スマホ幅がはみ出すため、端末エミュレーションで撮る。

import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = process.argv[2] ?? 'http://localhost:3000';
const OUT = 'docs/screenshots';
const PORT = 9333;

const PHONE = { width: 390, height: 844, mobile: true };
const DESKTOP = { width: 1280, height: 800, mobile: false };

// 実在の選手・大会が写らないよう、デモデータのページだけを撮る(API 規約: 取得データの再配布禁止)
const SHOTS = [
  { name: 'lp-desktop', path: '/lp/demo', ...DESKTOP },
  { name: 'lp-mobile', path: '/lp/demo', ...PHONE },
  { name: 'binder-mobile', path: '/demo', ...PHONE },
  { name: 'binder-back-mobile', path: '/demo', ...PHONE, flip: true },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

mkdirSync(OUT, { recursive: true });
const profile = mkdtempSync(join(tmpdir(), 'taikai-shot-'));
const chrome = spawn(
  CHROME,
  ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--hide-scrollbars', 'about:blank'],
  { stdio: 'ignore' },
);

try {
  let target;
  for (let i = 0; i < 50 && !target; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
      target = list.find((t) => t.type === 'page');
    } catch {
      await sleep(200);
    }
  }
  if (!target) throw new Error('Chrome の DevTools に接続できませんでした');

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve) => ws.addEventListener('open', resolve, { once: true }));
  let seq = 0;
  const pending = new Map();
  const listeners = new Set();
  ws.addEventListener('message', (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    } else {
      for (const l of listeners) l(msg);
    }
  });
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++seq;
      pending.set(id, (m) => (m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result)));
      ws.send(JSON.stringify({ id, method, params }));
    });
  const evaluate = async (expression) =>
    (await send('Runtime.evaluate', { expression, returnByValue: true })).result.value;
  const mouse = (type, x, y) =>
    send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1 });

  await send('Page.enable');

  for (const shot of SHOTS) {
    await send('Emulation.setDeviceMetricsOverride', {
      width: shot.width,
      height: shot.height,
      deviceScaleFactor: 2,
      mobile: shot.mobile,
    });
    const loaded = new Promise((resolve) => {
      const l = (m) => {
        if (m.method === 'Page.loadEventFired') {
          listeners.delete(l);
          resolve();
        }
      };
      listeners.add(l);
    });
    await send('Page.navigate', { url: BASE + shot.path });
    await loaded;
    await sleep(2500); // フォントと画像の読み込み待ち

    if (shot.flip) {
      // 中央のカードをタップして拡大 → 横にドラッグして裏返す
      const rect = await evaluate(
        `(() => { const r = document.querySelector('.pc[data-index="0"]').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`,
      );
      await mouse('mousePressed', rect.x, rect.y);
      await mouse('mouseReleased', rect.x, rect.y);
      await sleep(900);
      const y = shot.height / 2;
      await mouse('mousePressed', 110, y);
      for (let x = 110; x <= 300; x += 10) await mouse('mouseMoved', x, y);
      await mouse('mouseReleased', 300, y);
      await sleep(1500);
    }

    const { data } = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(join(OUT, `${shot.name}.png`), Buffer.from(data, 'base64'));
    console.log(`✓ ${OUT}/${shot.name}.png`);
  }
  ws.close();
} finally {
  // 終了を待ってからプロファイルを消す(書き込み中に消すと ENOTEMPTY になる)
  await new Promise((resolve) => {
    if (chrome.exitCode !== null) return resolve();
    chrome.once('exit', resolve);
    chrome.kill();
  });
  rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
