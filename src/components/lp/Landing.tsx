import { Dela_Gothic_One } from 'next/font/google';
import Link from 'next/link';
import { Attribution } from '@/components/Attribution';
import type { PassCard } from '@/lib/model/types';
import type { Showcase } from '@/lib/server/showcase';
import { ShowcaseStack } from './ShowcaseStack';
import { StaticPass } from './StaticPass';

const display = Dela_Gothic_One({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  preload: false,
  variable: '--font-display',
});

/** 「表裏で見せる」説明に使う1枚。キャラ情報があって成績の良いものを選ぶ */
function pickExplainCard(cards: PassCard[]): PassCard {
  const withChars = cards.filter((c) => c.results[0]?.characters);
  const pool = withChars.length ? withChars : cards;
  return [...pool].sort((a, b) => (a.bestPercentile ?? 1) - (b.bestPercentile ?? 1))[0];
}

/** LP 本体。/lp は実データ、/lp/demo はデモデータでこれを描く */
export function Landing({ showcase }: { showcase: Showcase }) {
  const { player, cards } = showcase;
  const explain = pickExplainCard(cards);
  const tag = player.prefix ? `${player.prefix} | ${player.gamerTag}` : player.gamerTag;

  return (
    <div className={`lp ${display.variable}`}>
      <section className="lp-hero">
        <div className="lp-hero-copy">
          <p className="lp-eyebrow">start.gg 連携 · 大会出場コレクション</p>
          <h1 className="lp-display">
            出た大会の数だけ、
            <br />
            パスが増える。
          </h1>
          <p className="lp-lead">
            順位は関係ない。出場したら1枚。
            <br />
            あなたの大会の記録が、首かけパスのコレクションになる。
          </p>
          <div className="lp-cta">
            <Link className="btn btn-lg" href="/">
              バインダーを作る
            </Link>
            <a className="btn-ghost btn-lg" href="#how">
              しくみを見る
            </a>
          </div>
        </div>
        <div className="lp-hero-stage">
          <p className="lp-stage-label">
            <span>
              <b>{tag}</b> のバインダー{showcase.source === 'demo' && '(デモ)'}
            </span>
            <span>← めくる · タップで拡大 →</span>
          </p>
          <ShowcaseStack cards={cards} />
        </div>
      </section>

      <section className="lp-numbers" aria-label={`${tag} の出場記録`}>
        <p className="lp-numbers-label">{tag} の場合</p>
        <div className="lp-numbers-grid">
          <div>
            <b className="lp-display">{showcase.total}</b>
            <span>大会に出場</span>
          </div>
          <div>
            <b className="lp-display">{showcase.lastYear}</b>
            <span>直近1年の出場</span>
          </div>
          {showcase.sinceYear && (
            <div>
              <b className="lp-display">{showcase.sinceYear}</b>
              <span>初出場の年</span>
            </div>
          )}
        </div>
        <p className="lp-numbers-note">
          勝った数ではなく、そこにいた数。
          {showcase.source === 'startgg' && ' start.gg の公開データから集計。'}
        </p>
      </section>

      <section className="lp-concept">
        <h2 className="lp-display">「強さ」ではなく、<wbr />「熱量」を残す。</h2>
        <div className="lp-points">
          <article>
            <span className="lp-num">01</span>
            <h3>順位に関係なく、1大会1枚</h3>
            <p>優勝でも初戦敗退でも、出場すればパスが発行される。強さではなく、その日そこにいたことの記録。</p>
          </article>
          <article>
            <span className="lp-num">02</span>
            <h3>積み上がるのは、通った数</h3>
            <p>累計の出場数、シリーズの皆勤、遠征した地域。勝ち負けとは別の軸で、あなたの大会生活が見えてくる。</p>
          </article>
          <article>
            <span className="lp-num">03</span>
            <h3>大きな大会も、1枚にまとめる</h3>
            <p>EVO のように複数タイトルに出た大会は1枚のパスに。表面に出場タイトルのアイコンが並び、裏面で切り替えられる。</p>
          </article>
        </div>
      </section>

      <section className="lp-how" id="how">
        <div className="lp-how-copy">
          <h2 className="lp-display">裏返すと、<wbr />その日の戦績。</h2>
          <p>
            表は大会のロゴと名前だけのシンプルなパス。裏返すと、順位・試合数・勝率・使ったキャラが見える。
            ストラップの色は大会のテーマカラー。
          </p>
          <ol className="lp-steps">
            <li>
              <b>start.gg でログインする</b>
              <span>本人のアカウントだけが、マイバインダーになる。</span>
            </li>
            <li>
              <b>過去の大会が1枚ずつパスになる</b>
              <span>出場した大会を start.gg から読み込んで発行。</span>
            </li>
            <li>
              <b>めくって、裏返して、眺める</b>
              <span>開催日・成績・地域・タイトルで並び替えと絞り込み。</span>
            </li>
          </ol>
        </div>
        <div className="lp-how-cards" aria-hidden="true">
          <div className="lp-how-front">
            <StaticPass card={explain} side="front" width="min(40vw, 200px)" />
            <span className="lp-how-tag">表</span>
          </div>
          <div className="lp-how-back">
            <StaticPass card={explain} side="back" width="min(40vw, 200px)" />
            <span className="lp-how-tag">裏</span>
          </div>
        </div>
      </section>

      <section className="lp-social">
        <h2 className="lp-display">推しのバインダーも、<wbr />のぞける。</h2>
        <p>
          start.gg に記録があれば、アプリを使っていない選手のパスも閲覧できる。
          フォローしておけば、新しい大会に出るたびにタイムラインに流れてくる。
        </p>
        <Link className="btn-ghost btn-lg" href={`/p/${player.slug}`}>
          {tag} のバインダーを見る →
        </Link>
      </section>

      <section className="lp-final">
        <h2 className="lp-display">
          次の大会で、
          <br />
          パスがまた1枚増える。
        </h2>
        <Link className="btn btn-lg btn-invert" href="/">
          バインダーを作る
        </Link>
      </section>

      <footer className="lp-foot">
        <Attribution />
        TAIKAI PASS は start.gg の公開 API を利用した非公式アプリです。大会のロゴ・名称の権利は各主催者に帰属します。
      </footer>
    </div>
  );
}
