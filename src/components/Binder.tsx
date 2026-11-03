'use client';

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { formatDate, placeLabel } from '@/lib/client/format';
import {
  applySortFilter,
  countryName,
  EMPTY_FILTER,
  filterOptions,
  flagEmoji,
  SORT_LABEL,
  type Filter,
  type SortKey,
} from '@/lib/client/sortFilter';
import { storage } from '@/lib/client/storage';
import { JP_REGION_LABEL, type PassCard, type PlayerProfile } from '@/lib/model/types';
import { computeStats } from '@/lib/transform/stats';
import { Attribution } from './Attribution';
import { CardStack } from './CardStack';
import { ReorderSheet } from './ReorderSheet';

type Props = {
  player: PlayerProfile | null;
  cards: PassCard[];
  /** 自分のバインダーなら手動並び替えを出す */
  isOwner: boolean;
  progress?: { done: number; total: number; failed: number; loading: boolean };
  actions?: ReactNode;
  /** 読み込み途中なら、選んだ並びの先頭に来るカードから読み込むために使う */
  onSortChange?: (sort: SortKey) => void;
};

export function Binder({ player, cards, isOwner, progress, actions, onSortChange }: Props) {
  const [sort, setSort] = useState<SortKey>('date_desc');
  const [filter, setFilter] = useState<Filter>(EMPTY_FILTER);
  const [manualOrder, setManualOrder] = useState<string[]>([]);
  const [showReorder, setShowReorder] = useState(false);
  const [centerCard, setCenterCard] = useState<PassCard | null>(null);
  const [focusedCard, setFocusedCard] = useState<PassCard | null>(null);
  // 一覧に戻るときも色を残したままフェードアウトさせる
  const [tintCard, setTintCard] = useState<PassCard | null>(null);

  useEffect(() => {
    if (isOwner && player) setManualOrder(storage.getManualOrder(player.userId));
  }, [isOwner, player]);

  useEffect(() => {
    if (focusedCard) setTintCard(focusedCard);
  }, [focusedCard]);

  const visible = useMemo(
    () => applySortFilter(cards, sort, filter, manualOrder),
    [cards, sort, filter, manualOrder],
  );
  const options = useMemo(() => filterOptions(cards), [cards]);
  const stats = useMemo(
    () => computeStats(cards, player ?? { homeCountry: null, homeRegion: null }),
    [cards, player],
  );

  const sortKeys = (Object.keys(SORT_LABEL) as SortKey[]).filter((k) => k !== 'manual' || isOwner);
  const centerIndex = centerCard ? visible.findIndex((c) => c.id === centerCard.id) : -1;
  const tint = tintCard?.tournament.theme;

  return (
    <div className={`binder${focusedCard ? ' is-focus' : ''}`}>
      <div
        className="tint"
        data-on={focusedCard ? '1' : '0'}
        style={{ '--tint': tint?.tint ?? 'transparent', '--tint-dark': tint?.primary ?? 'transparent' } as CSSProperties}
      />

      <header className="b-head b-fade">
        <div className="b-player">
          {player?.avatarUrl ? (
            <img className="b-avatar" src={player.avatarUrl} alt="" />
          ) : (
            <span className="b-avatar is-empty" />
          )}
          <div>
            <div className="b-tag">
              {player?.prefix && <span className="b-prefix">{player.prefix}</span>}
              {player?.gamerTag ?? '…'}
            </div>
            <div className="b-stats">
              <span>
                <b>{stats.totalTournaments}</b> 大会
              </span>
              <span>
                <b>{stats.totalEvents}</b> イベント
              </span>
              <span>
                遠征 <b>{stats.awayCount}</b>
              </span>
              {stats.countries.length > 1 && (
                <span>
                  <b>{stats.countries.length}</b> か国
                </span>
              )}
            </div>
          </div>
        </div>
        {actions && <div className="b-actions">{actions}</div>}
      </header>

      {stats.series.length > 0 && (
        <div className="b-series b-fade">
          {stats.series.map((s) => (
            <span key={s.seriesId} className={`b-badge${s.perfect ? ' is-perfect' : ''}`}>
              {s.perfect ? '皆勤' : `${s.currentStreak}連続`} · {s.name} {s.attended}/{s.total}
            </span>
          ))}
        </div>
      )}

      <div className="b-tools b-fade">
        <label>
          <span className="sr-only">並び替え</span>
          <select value={sort} onChange={(e) => {
              const next = e.target.value as SortKey;
              setSort(next);
              onSortChange?.(next);
            }}>
            {sortKeys.map((k) => (
              <option key={k} value={k}>
                {SORT_LABEL[k]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">地域</span>
          <select value={filter.area} onChange={(e) => setFilter({ ...filter, area: e.target.value })}>
            <option value="">すべての地域</option>
            {options.regions.length > 0 && (
              <optgroup label="国内">
                {options.regions.map((r) => (
                  <option key={r} value={`jp:${r}`}>
                    {JP_REGION_LABEL[r]}
                  </option>
                ))}
              </optgroup>
            )}
            {options.countries.length > 0 && (
              <optgroup label="海外">
                {options.countries.map((c) => (
                  <option key={c} value={`country:${c}`}>
                    {flagEmoji(c)} {countryName(c)}
                  </option>
                ))}
              </optgroup>
            )}
            {options.hasOnline && <option value="online">オンライン</option>}
          </select>
        </label>
        <label>
          <span className="sr-only">タイトル</span>
          <select value={filter.game} onChange={(e) => setFilter({ ...filter, game: e.target.value })}>
            <option value="">すべてのタイトル</option>
            {options.games.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>
        {isOwner && sort === 'manual' && (
          <button className="btn-ghost" onClick={() => setShowReorder(true)}>
            並べ替える
          </button>
        )}
      </div>

      {progress && progress.loading && (
        <div className="b-progress b-fade" role="status">
          <span style={{ transform: `scaleX(${progress.total ? progress.done / progress.total : 0})` }} />
          <em>
            カード発行中 {progress.done}/{progress.total}
          </em>
        </div>
      )}

      {visible.length > 0 ? (
        <CardStack
          cards={visible}
          resetKey={`${sort}|${filter.area}|${filter.game}`}
          onCenterChange={setCenterCard}
          onFocusChange={setFocusedCard}
        />
      ) : (
        <div className="b-empty">
          {progress?.loading ? 'カードを発行しています…' : cards.length ? '条件に合うカードがありません' : 'まだカードがありません'}
        </div>
      )}

      <footer className="b-caption">
        {focusedCard ? (
          <span className="b-hint">左右にドラッグで裏返す · タップで戻る</span>
        ) : centerCard ? (
          <>
            <div className="b-caption-title">{centerCard.tournament.name}</div>
            <div className="b-caption-meta">
              {formatDate(centerCard.date)} · {placeLabel(centerCard)}
              <span className="b-count">
                {centerIndex + 1} / {visible.length}
              </span>
            </div>
          </>
        ) : null}
        {progress && progress.failed > 0 && !progress.loading && (
          <div className="b-warn">{progress.failed} 大会の取得に失敗しました(再読み込みで再試行)</div>
        )}
        <Attribution className="b-fade" />
      </footer>

      {showReorder && player && (
        <ReorderSheet
          cards={applySortFilter(cards, 'manual', EMPTY_FILTER, manualOrder)}
          onClose={() => setShowReorder(false)}
          onSave={(ids) => {
            setManualOrder(ids);
            storage.setManualOrder(player.userId, ids);
            setShowReorder(false);
          }}
        />
      )}
    </div>
  );
}
