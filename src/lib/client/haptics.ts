/**
 * ハプティクス。
 * - Android Chrome 等: navigator.vibrate
 * - iOS Safari (18+): vibrate が無いので、<input type="checkbox" switch> をラベル経由で切り替えたときの
 *   システムハプティクスを使う。ユーザー操作の最中でないと鳴らないため、呼ぶタイミングが異なる。
 */

let switchLabel: HTMLLabelElement | null = null;

/** true なら、ユーザー操作(pointerup 等)の中で呼ばないと効かない */
export function hapticsNeedGesture(): boolean {
  return typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function';
}

export function haptic() {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(12);
      return;
    }
    if (typeof document === 'undefined') return;
    if (!switchLabel) {
      switchLabel = document.createElement('label');
      switchLabel.setAttribute('aria-hidden', 'true');
      switchLabel.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;pointer-events:none';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.setAttribute('switch', '');
      input.tabIndex = -1;
      switchLabel.appendChild(input);
      document.body.appendChild(switchLabel);
    }
    switchLabel.click();
  } catch {
    // 非対応環境では何もしない
  }
}
