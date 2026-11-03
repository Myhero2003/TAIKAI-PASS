'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { GameShelf } from '@/lib/model/types';

export type TileItem = {
  slug: string;
  gamerTag: string;
  prefix: string | null;
  avatarUrl: string | null;
  /** 名前の下に目立たせる情報(「5回対戦」「3位」など) */
  highlight: string;
  /** その下の補足(大会名など) */
  caption?: string;
};

type ShelfProps = {
  title: string;
  icon?: ReactNode;
  subtitle?: string;
  items: TileItem[];
  followed: Set<string>;
  onFollow: (item: TileItem) => void;
};

/** 横スクロールで選手が並ぶ棚 */
export function PlayerShelf({ title, icon, subtitle, items, followed, onFollow }: ShelfProps) {
  if (items.length === 0) return null;

  return (
    <section className="rc">
      <div className="rc-head">
        {icon}
        <h2>{title}</h2>
        {subtitle && <span className="rc-subtitle">{subtitle}</span>}
      </div>
      <ul className="rc-list" aria-label={title}>
        {items.map((item) => {
          const isFollowed = followed.has(item.slug);
          return (
            <li key={item.slug} className="rc-tile">
              <Link className="rc-main" href={`/p/${item.slug}`}>
                {item.avatarUrl ? (
                  <img className="fa fa-lg" src={item.avatarUrl} alt="" loading="lazy" />
                ) : (
                  <span className="fa fa-lg is-empty" aria-hidden="true">
                    {[...item.gamerTag][0]?.toUpperCase()}
                  </span>
                )}
                <span className="rc-prefix">{item.prefix ?? ''}</span>
                <span className="rc-name">{item.gamerTag}</span>
                <span className="rc-highlight">{item.highlight}</span>
                {item.caption && <span className="rc-caption">{item.caption}</span>}
              </Link>
              <button
                className={`${isFollowed ? 'btn-ghost' : 'btn'} rc-follow`}
                disabled={isFollowed}
                onClick={() => onFollow(item)}
              >
                {isFollowed ? 'フォロー中' : 'フォロー'}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** ゲームごとの棚(最近の大きな大会の上位入賞者) */
export function GameShelves({ followed, onFollow }: { followed: Set<string>; onFollow: (item: TileItem) => void }) {
  const [shelves, setShelves] = useState<GameShelf[] | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch('/api/recommendations', { signal: ctrl.signal })
      .then((res) => (res.ok ? (res.json() as Promise<{ shelves: GameShelf[] }>) : { shelves: [] }))
      .then((body) => setShelves(body.shelves))
      .catch(() => {
        if (!ctrl.signal.aborted) setShelves([]);
      });
    return () => ctrl.abort();
  }, []);

  const rows = useMemo(
    () =>
      (shelves ?? []).map((shelf) => ({
        shelf,
        items: shelf.players.map((p) => ({ ...p, highlight: `${p.placement}位`, caption: p.tournamentName })),
      })),
    [shelves],
  );

  if (!shelves) return <p className="muted rc-loading">おすすめを読み込み中…</p>;

  return (
    <>
      {rows.map(({ shelf, items }) => (
        <PlayerShelf
          key={shelf.id}
          title={shelf.name}
          subtitle="最近の大会の上位入賞者"
          icon={shelf.iconUrl ? <img className="rc-game-icon" src={shelf.iconUrl} alt="" loading="lazy" /> : undefined}
          items={items}
          followed={followed}
          onFollow={onFollow}
        />
      ))}
    </>
  );
}
