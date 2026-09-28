// start.gg GraphQL クエリ。
// 使っているフィールドが実在するかは `npm run check-schema` で確認できる。

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
        nodes { id slug name startAt endAt }
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
            entrant { id }
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
