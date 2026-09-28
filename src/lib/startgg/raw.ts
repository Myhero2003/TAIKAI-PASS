// start.gg GraphQL のレスポンス型(queries.ts で取得する範囲だけ)。
// ID 型は JSON 上 number で返ることがあるので、変換側で必ず String() に揃える。

export type RawId = string | number;

export type RawImage = { url: string | null; type: string | null };

export type RawPlayerIndexPage = {
  user: {
    id: RawId;
    slug: string | null;
    images: RawImage[] | null;
    location: { country: string | null; state: string | null } | null;
    player: { id: RawId; gamerTag: string | null; prefix: string | null } | null;
    tournaments: {
      pageInfo: { total: number | null; totalPages: number | null } | null;
      nodes: Array<{
        id: RawId;
        slug: string | null;
        name: string | null;
        startAt: number | null;
        endAt: number | null;
      } | null> | null;
    } | null;
  } | null;
};

export type RawVideogame = {
  id: RawId;
  name: string | null;
  displayName: string | null;
  images: RawImage[] | null;
};

export type RawEvent = {
  id: RawId;
  name: string | null;
  slug: string | null;
  startAt: number | null;
  state: string | null;
  numEntrants: number | null;
  teamRosterSize: { maxPlayers: number | null } | null;
  videogame: RawVideogame | null;
  userEntrant: {
    id: RawId;
    name: string | null;
    standing: { placement: number | null } | null;
  } | null;
};

export type RawTournament = {
  id: RawId;
  slug: string | null;
  name: string | null;
  startAt: number | null;
  endAt: number | null;
  isOnline: boolean | null;
  countryCode: string | null;
  addrState: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  images: RawImage[] | null;
  events: RawEvent[] | null;
};

export type RawTournamentForUser = { tournament: RawTournament | null };

export type RawSet = {
  id: RawId;
  winnerId: RawId | null;
  displayScore: string | null;
  slots: Array<{
    entrant: { id: RawId } | null;
    standing: { stats: { score: { value: number | null } | null } | null } | null;
  } | null> | null;
  games: Array<{
    winnerId: RawId | null;
    selections: Array<{
      entrant: { id: RawId } | null;
      character: { id: RawId; name: string | null } | null;
    } | null> | null;
  } | null> | null;
};

export type RawEntrantSets = {
  entrant: {
    id: RawId;
    paginatedSets: {
      pageInfo: { totalPages: number | null } | null;
      nodes: Array<RawSet | null> | null;
    } | null;
  } | null;
};
