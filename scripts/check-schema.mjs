// start.gg のスキーマを取得し、このアプリが使うフィールドが実在するかを確認する。
//   npm run check-schema                 … フィールドの存在チェック
//   npm run check-schema -- 1a2b3c4d     … 加えて、その user slug で実際にクエリを投げる

const ENDPOINT = 'https://api.start.gg/gql/alpha';
const token = process.env.STARTGG_TOKEN;
if (!token) {
  console.error('STARTGG_TOKEN が未設定です(.env.local に書いてください)');
  process.exit(1);
}

async function gql(query, variables = {}) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (!res.ok || json.errors) throw new Error(JSON.stringify(json.errors ?? json, null, 2));
  return json.data;
}

// 型名 → このアプリが参照するフィールド
const EXPECTED = {
  Query: ['user', 'tournament', 'entrant'],
  User: ['id', 'slug', 'images', 'location', 'player', 'tournaments'],
  Address: ['country', 'state'],
  Player: ['id', 'gamerTag', 'prefix'],
  Tournament: [
    'id', 'slug', 'name', 'startAt', 'endAt', 'isOnline',
    'countryCode', 'addrState', 'city', 'lat', 'lng', 'images', 'events',
  ],
  Event: ['id', 'name', 'slug', 'startAt', 'state', 'numEntrants', 'teamRosterSize', 'videogame', 'userEntrant'],
  TeamRosterSize: ['maxPlayers'],
  Videogame: ['id', 'name', 'displayName', 'images'],
  Entrant: ['id', 'name', 'standing', 'paginatedSets'],
  Standing: ['placement', 'stats'],
  Set: ['id', 'winnerId', 'displayScore', 'slots', 'games'],
  SetSlot: ['entrant', 'standing'],
  Game: ['winnerId', 'selections'],
  GameSelection: ['entrant', 'character'],
  Character: ['id', 'name'],
  Image: ['url', 'type'],
};

const INPUT_EXPECTED = {
  UserTournamentsPaginationFilter: ['past'],
};

const typeQuery = `
  query T($name: String!) {
    __type(name: $name) {
      name
      fields { name }
      inputFields { name }
    }
  }
`;

let ok = true;
for (const [type, fields] of Object.entries({ ...EXPECTED, ...INPUT_EXPECTED })) {
  const { __type } = await gql(typeQuery, { name: type });
  if (!__type) {
    console.log(`✗ 型 ${type} が見つかりません`);
    ok = false;
    continue;
  }
  const have = new Set([...(__type.fields ?? []), ...(__type.inputFields ?? [])].map((f) => f.name));
  const missing = fields.filter((f) => !have.has(f));
  if (missing.length) {
    ok = false;
    console.log(`✗ ${type}: ${missing.join(', ')} がありません`);
  } else {
    console.log(`✓ ${type}`);
  }
}

const slug = process.argv[2];
if (slug) {
  console.log(`\n--- user/${slug} で試行 ---`);
  const data = await gql(
    `query ($slug: String!) {
      user(slug: $slug) {
        id
        player { gamerTag }
        tournaments(query: { page: 1, perPage: 3, filter: { past: true } }) {
          pageInfo { total }
          nodes { id name startAt }
        }
      }
    }`,
    { slug: `user/${slug}` },
  );
  console.log(JSON.stringify(data, null, 2));
}

process.exit(ok ? 0 : 1);
