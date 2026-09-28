/** 減衰スプリング。値は1次元、フレームごとに step(dt) で進める */
export class Spring {
  value: number;
  velocity = 0;
  target: number;
  private readonly stiffness: number;
  private readonly damping: number;
  private readonly epsilon: number;

  constructor(value: number, opts: { stiffness?: number; damping?: number; epsilon?: number } = {}) {
    this.value = value;
    this.target = value;
    this.stiffness = opts.stiffness ?? 210;
    this.damping = opts.damping ?? 26;
    this.epsilon = opts.epsilon ?? 0.001;
  }

  /** 値を直接置く(ドラッグ中の追従用)。速度は保持しない */
  set(value: number) {
    this.value = value;
    this.target = value;
    this.velocity = 0;
  }

  to(target: number, velocity?: number) {
    this.target = target;
    if (velocity !== undefined) this.velocity = velocity;
  }

  get settled(): boolean {
    return Math.abs(this.value - this.target) < this.epsilon && Math.abs(this.velocity) < this.epsilon * 10;
  }

  /** dt は秒。安定のため固定幅の小ステップに分けて積分する */
  step(dt: number) {
    if (this.settled) {
      this.value = this.target;
      this.velocity = 0;
      return;
    }
    const h = 1 / 240;
    let remaining = Math.min(dt, 0.064);
    while (remaining > 0) {
      const s = Math.min(h, remaining);
      const accel = -this.stiffness * (this.value - this.target) - this.damping * this.velocity;
      this.velocity += accel * s;
      this.value += this.velocity * s;
      remaining -= s;
    }
  }
}
