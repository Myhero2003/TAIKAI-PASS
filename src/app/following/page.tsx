'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Attribution } from '@/components/Attribution';
import { GameShelves, PlayerShelf, type TileItem } from '@/components/Recommendations';
import { buildTimeline, isNewTournament, seenKey, sortByLatest, type FollowedPlayer } from '@/lib/client/following';
import { formatDate, monogram } from '@/lib/client/format';
import type { Recommendation } from '@/lib/client/recommendations';
import { storage, toFollowEntry, type FollowEntry } from '@/lib/client/storage';
import { useSession } from '@/lib/client/useSession';
import type { PlayerIndex, TournamentStub } from '@/lib/model/types';

const CONCURRENCY = 2;
const COLLAPSED_PLAYERS = 5;
const TIMELINE_PAGE = 30;
const MAX_RECS = 12;

const monthFmt = new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'long' });
const dayFmt = new Intl.DateTimeFormat('ja-JP', { month: 'numeric', day: 'numeric' });

/** フォロー中のプレイヤー一覧と、その人たちの最近の出場 */
export default function FollowingPage() {
  const [follows, setFollows] = useState<FollowEntry[] | null>(null);
  const [tournaments, setTournaments] = useState<Record<string, TournamentStub[]>>({});
  const [failed, setFailed] = useState<string[]>([]);
  const [showAllPlayers, setShowAllPlayers] = useState(false);
  const [visibleRows, setVisibleRows] = useState(TIMELINE_PAGE);
  const [confirming, setConfirming] = useState<string | null>(null);
  // null = まだ集計していない
  const [savedRecs, setSavedRecs] = useState<Recommendation[] | null>(null);
  const { session } = useSession();
  // このページを開いた時点の既読。見ている間は NEW が消えないように固定する
  const seenAtOpen = useRef(new Set<string>());

  const seenLive = useRef(new Set<string>());
  const loader = useRef<AbortController | null>(null);

  const loadPlayer = useCallback(async ({ slug, gamerTag }: FollowEntry, signal: AbortSignal) => {
    try {
      const res = await fetch(`/api/players/${slug}`, { signal });
      if (!res.ok) throw new Error(gamerTag);
      const { player, tournaments: list } = (await res.json()) as PlayerIndex;
      if (signal.aborted) return;
      setTournaments((prev) => ({ ...prev, [slug]: list }));

      // 名前とアイコンを最新にしておく(次に開いたときすぐ出せるように)
      const profile = { gamerTag: player.gamerTag, prefix: player.prefix, avatarUrl: player.avatarUrl };
      setFollows((prev) => {
        const next = (prev ?? []).map((e) => (e.slug === slug ? { ...e, ...profile } : e));
        storage.setFollowing(next);
        return next;
      });
      for (const t of list) seenLive.current.add(seenKey(slug, t.id));
      storage.setSeen([...seenLive.current]);
    } catch {
      if (signal.aborted) return;
      setFailed((prev) => [...prev, gamerTag]);
    }
  }, []);

  useEffect(() => {
    const list = storage.getFollowing();
    const seen = storage.getSeen();
    seenLive.current = new Set(seen);
    seenAtOpen.current = new Set(seen);
    setFollows(list);

    const ctrl = new AbortController();
    loader.current = ctrl;
    const queue = [...list];
    const worker = async () => {
      for (let f = queue.shift(); f && !ctrl.signal.aborted; f = queue.shift()) {
        await loadPlayer(f, ctrl.signal);
      }
    };
    Array.from({ length: CONCURRENCY }, worker);
    return () => ctrl.abort();
  }, [loadPlayer]);

  // おすすめは自分のバインダーを開いたときに端末へ保存したものを読む
  useEffect(() => {
    if (session?.user) setSavedRecs(storage.getRecommendations(session.user.userId));
  }, [session]);

  const players = useMemo<FollowedPlayer[]>(
    () =>
      sortByLatest((follows ?? []).map((follow) => ({ follow, tournaments: tournaments[follow.slug] ?? null }))),
    [follows, tournaments],
  );
  const timeline = useMemo(() => buildTimeline(players, seenAtOpen.current), [players]);
  const followed = useMemo(() => new Set((follows ?? []).map((f) => f.slug)), [follows]);
  const opponentItems = useMemo<TileItem[]>(
    () =>
      (savedRecs ?? [])
        .filter((r) => !followed.has(r.slug) && r.slug !== session?.user?.slug)
        .slice(0, MAX_RECS)
        .map((r) => ({ ...r, highlight: `${r.sets}回対戦` })),
    [savedRecs, followed, session],
  );

  if (!follows) return null;

  const followFromShelf = (item: TileItem) => {
    if (followed.has(item.slug)) return;
    const entry = toFollowEntry(item);
    const next = [...follows, entry];
    storage.setFollowing(next);
    setFollows(next);
    if (loader.current) void loadPlayer(entry, loader.current.signal);
  };

  const opponentsShelf = (
    <PlayerShelf title="よく対戦した相手" items={opponentItems} followed={followed} onFollow={followFromShelf} />
  );

  if (follows.length === 0) {
    return (
      <div className="setup">
        <h1>フォロー</h1>
        <p>気になる選手をフォローすると、その人が新しい大会に出るたびにここに流れてきます。</p>
        {session && !session.user && session.configured && (
          <p className="setup-note">
            <Link href="/">start.gg でログイン</Link>すると、対戦したことのある相手もおすすめに出ます。
          </p>
        )}
        {session?.user && savedRecs === null && (
          <p className="setup-note">
            <Link href="/">マイバインダー</Link>を開くと、対戦したことのある相手もおすすめに出ます。
          </p>
        )}
        <div className="fl-shelves">
          {opponentsShelf}
          <GameShelves followed={followed} onFollow={followFromShelf} />
        </div>
        <Attribution className="page-attribution" />
      </div>
    );
  }

  const unfollow = (slug: string) => {
    const next = follows.filter((f) => f.slug !== slug);
    storage.setFollowing(next);
    setFollows(next);
    setConfirming(null);
  };

  const shownPlayers = showAllPlayers ? players : players.slice(0, COLLAPSED_PLAYERS);
  const shownRows = timeline.slice(0, visibleRows);
  const stillLoading = players.some((p) => p.tournaments === null && !failed.includes(p.follow.gamerTag));

  return (
    <div className="fl">
      {opponentsShelf}
      <section className="fl-players" aria-labelledby="fl-players-title">
        <div className="fl-head">
          <h1 id="fl-players-title">フォロー中</h1>
          <span className="fl-count">{follows.length}人</span>
          <Link className="fl-add" href="/search">
            ＋ さがす
          </Link>
        </div>
        <ul className="fp-list">
          {shownPlayers.map(({ follow, tournaments: list }) => {
            const latest = list?.[0];
            const newCount = list?.filter((t) => isNewTournament(follow, t, seenAtOpen.current)).length ?? 0;
            const isFailed = !list && failed.includes(follow.gamerTag);
            return (
              <li key={follow.slug} className="fp-row">
                <Link className="fp-main" href={`/p/${follow.slug}`}>
                  <Avatar follow={follow} size="lg" />
                  <span className="fp-text">
                    <span className="fp-name">
                      {follow.prefix && <span className="b-prefix">{follow.prefix}</span>}
                      {follow.gamerTag}
                    </span>
                    {latest ? (
                      <>
                        <span className="fp-latest">{latest.name}</span>
                        <span className="fp-sub">
                          {formatDate(latest.startAt)} · 累計 {list.length}大会
                        </span>
                      </>
                    ) : (
                      <span className="fp-sub">
                        {isFailed ? '取得できませんでした' : list ? '出場記録なし' : '読み込み中…'}
                      </span>
                    )}
                  </span>
                  {newCount > 0 && <em className="new">NEW {newCount}</em>}
                </Link>
                {confirming === follow.slug ? (
                  <span className="fp-confirm">
                    <button className="btn" onClick={() => unfollow(follow.slug)}>
                      解除
                    </button>
                    <button className="btn-ghost" onClick={() => setConfirming(null)}>
                      やめる
                    </button>
                  </span>
                ) : (
                  <button
                    className="fp-menu"
                    aria-label={`${follow.gamerTag} のフォローを解除`}
                    onClick={() => setConfirming(follow.slug)}
                  >
                    解除
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        {players.length > COLLAPSED_PLAYERS && (
          <button className="btn-ghost fl-more" onClick={() => setShowAllPlayers((v) => !v)}>
            {showAllPlayers ? '閉じる' : `すべて表示(${players.length}人)`}
          </button>
        )}
      </section>

      <section className="fl-timeline" aria-labelledby="fl-timeline-title">
        <h2 id="fl-timeline-title">最近の大会</h2>
        {shownRows.length === 0 && (
          <p className="muted">{stillLoading ? '読み込み中…' : '表示できる大会がありません'}</p>
        )}
        <ol className="ft-list">
          {shownRows.map(({ tournament, players: entered, isNew }, i) => {
            const month = monthFmt.format(new Date(tournament.startAt));
            const prev = shownRows[i - 1];
            const newMonth = !prev || monthFmt.format(new Date(prev.tournament.startAt)) !== month;
            return (
              <li key={tournament.id}>
                {newMonth && <div className="ft-month">{month}</div>}
                <div className="ft-row">
                  <span className="ft-thumb" aria-hidden="true">
                    {tournament.iconUrl ? (
                      <img src={tournament.iconUrl} alt="" loading="lazy" />
                    ) : (
                      <span>{monogram(tournament.name).slice(0, 2)}</span>
                    )}
                  </span>
                  <div className="ft-body">
                    <div className="ft-name">{tournament.name}</div>
                    <div className="ft-meta">
                      <time dateTime={tournament.startAt}>{dayFmt.format(new Date(tournament.startAt))}</time>
                      {entered.map(({ follow }) => (
                        <Link key={follow.slug} className="ft-player" href={`/p/${follow.slug}`}>
                          <Avatar follow={follow} size="sm" />
                          {follow.gamerTag}
                        </Link>
                      ))}
                    </div>
                  </div>
                  {isNew && <em className="new">NEW</em>}
                </div>
              </li>
            );
          })}
        </ol>
        {timeline.length > visibleRows && (
          <button className="btn-ghost fl-more" onClick={() => setVisibleRows((n) => n + TIMELINE_PAGE)}>
            もっと見る
          </button>
        )}
        {stillLoading && shownRows.length > 0 && <p className="muted fl-loading">ほかのプレイヤーを読み込み中…</p>}
        <Attribution className="page-attribution" />
      </section>
    </div>
  );
}

function Avatar({ follow, size }: { follow: FollowEntry; size: 'sm' | 'lg' }) {
  return follow.avatarUrl ? (
    <img className={`fa fa-${size}`} src={follow.avatarUrl} alt="" loading="lazy" />
  ) : (
    <span className={`fa fa-${size} is-empty`} aria-hidden="true">
      {[...follow.gamerTag][0]?.toUpperCase()}
    </span>
  );
}
