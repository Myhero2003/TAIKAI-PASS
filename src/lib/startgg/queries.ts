// start.gg GraphQL クエリ。
// 使っているフィールドが実在するかは `npm run check-schema` で確認できる。

/** ログインしたユーザー本人の確認(OAuth トークンで呼ぶ) */
export const CURRENT_USER = /* GraphQL */ `
  query CurrentUser {
    currentUser {
      id
      slug
      player { gamerTag }
    }
  }
`;

/** 「さがす」の棚: そのゲームの最近の国内大会(参加人数はこの中で比べる) */
export const TOP_TOURNAMENTS = /* GraphQL */ `
  query TopTournaments($videogameId: ID!, $perPage: Int!, $afterDate: Timestamp) {
    videogame(id: $videogameId) { images { url type } }
    tournaments(query: {
      page: 1
      perPage: $perPage
      sortBy: "startAt desc"
      filter: { past: true, countryCode: "JP", videogameIds: [$videogameId], afterDate: $afterDate }
    }) {
      nodes { id name slug startAt numAttendees }
    }
  }
`;

/** 「さがす」の棚: 大会のそのゲームのイベントの上位8人 */
export const TOURNAMENT_TOP_STANDINGS = /* GraphQL */ `
  query TournamentTopStandings($id: ID!, $videogameId: ID!) {
    tournament(id: $id) {
      events(filter: { videogameId: [$videogameId] }) {
        name
        numEntrants
        state
        teamRosterSize { maxPlayers }
        standings(query: { page: 1, perPage: 8 }) {
          nodes {
            placement
            entrant {
              participants {
                gamerTag
                prefix
                user { slug images { url type } }
              }
            }
          }
        }
      }
    }
  }
`;

/** Step 1: プレイヤー情報と参加大会の一覧(軽量) */
export const PLAYER_INDEX = /* GraphQL */ `
  query PlayerIndex($slug: String!, $page: Int!, $perPage: Int!) {
    user(slug: $slug) {
      id
      slug
      images { url type }
      location { country state }
      player { id gamerTag prefix }
      tournaments(query: { page: $page, perPage: $perPage, filter: { past: true } }) {
        pageInfo { total totalPages }
        nodes { id slug name startAt endAt images { url type } }
      }
    }
  }
`;

/** Step 2: 大会詳細 + 各イベントでのそのユーザーのエントリー */
export const TOURNAMENT_FOR_USER = /* GraphQL */ `
  query TournamentForUser($id: ID!, $userId: ID!) {
    tournament(id: $id) {
      id
      slug
      name
      startAt
      endAt
      isOnline
      countryCode
      addrState
      city
      lat
      lng
      images { url type }
      events {
        id
        name
        slug
        startAt
        state
        numEntrants
        teamRosterSize { maxPlayers }
        videogame { id name displayName images { url type } }
        userEntrant(userId: $userId) {
          id
          name
          standing { placement }
        }
      }
    }
  }
`;

/** Step 3: エントリーのセット一覧(試合数・勝率・使用キャラ) */
export const ENTRANT_SETS = /* GraphQL */ `
  query EntrantSets($entrantId: ID!, $page: Int!, $perPage: Int!) {
    entrant(id: $entrantId) {
      id
      paginatedSets(page: $page, perPage: $perPage) {
        pageInfo { totalPages }
        nodes {
          id
          winnerId
          displayScore
          slots {
            entrant {
              id
              participants {
                gamerTag
                prefix
                user { slug images { url type } }
              }
            }
            standing { stats { score { value } } }
          }
          games {
            winnerId
            selections {
              entrant { id }
              character { id name }
            }
          }
        }
      }
    }
  }
`;
