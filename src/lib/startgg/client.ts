import 'server-only';

const ENDPOINT = 'https://api.start.gg/gql/alpha';

// start.gg の制限は 80 リクエスト/60秒。サーバーレスではインスタンス間で共有できないので、
// インスタンスごとに余裕を持たせた値で絞り、超過時(429 / rate limit メッセージ)はバックオフで再試行する。
const BUCKET_CAPACITY = 20;
const REFILL_PER_SEC = 1;
const MAX_ATTEMPTS = 4;

export class StartggError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'StartggError';
  }
}

let tokens = BUCKET_CAPACITY;
let lastRefill = Date.now();

async function takeToken(): Promise<void> {
  for (;;) {
    const now = Date.now();
    tokens = Math.min(BUCKET_CAPACITY, tokens + ((now - lastRefill) / 1000) * REFILL_PER_SEC);
    lastRefill = now;
    if (tokens >= 1) {
      tokens -= 1;
      return;
    }
    await sleep(((1 - tokens) / REFILL_PER_SEC) * 1000);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoff(attempt: number) {
  return 1500 * 2 ** attempt + Math.random() * 500;
}

type GqlResponse<T> = {
  data?: T;
  errors?: Array<{ message: string }>;
  success?: boolean;
  message?: string;
};

export async function gql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const token = process.env.STARTGG_TOKEN;
  if (!token) throw new StartggError('STARTGG_TOKEN が設定されていません(.env.local)', 500);

  let lastError = '';
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    await takeToken();
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query, variables }),
      cache: 'no-store',
    });

    if (res.status === 429 || res.status >= 500) {
      lastError = `HTTP ${res.status}`;
      await sleep(backoff(attempt));
      continue;
    }
    if (res.status === 401 || res.status === 403) {
      throw new StartggError('start.gg のトークンが無効です', res.status);
    }

    const json = (await res.json()) as GqlResponse<T>;
    // レート超過は 200 + { success: false, message: "Rate limit exceeded ..." } で返ることがある
    if (json.success === false && /rate limit/i.test(json.message ?? '')) {
      lastError = json.message ?? 'rate limit';
      await sleep(backoff(attempt));
      continue;
    }
    if (json.errors?.length) {
      const message = json.errors.map((e) => e.message).join(' / ');
      if (/rate limit/i.test(message)) {
        lastError = message;
        await sleep(backoff(attempt));
        continue;
      }
      throw new StartggError(`start.gg GraphQL error: ${message}`, 502);
    }
    if (!json.data) throw new StartggError('start.gg から空のレスポンス', 502);
    return json.data;
  }
  throw new StartggError(`start.gg への再試行が上限に達しました (${lastError})`, 503);
}
