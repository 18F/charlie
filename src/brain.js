const { Client } = require("pg");

let client;
const brain = new Map();

const get = (key) => brain.get(key);

const set = async (key, value) => {
  brain.set(key, value);
  await client.query(
    "INSERT INTO brain (key, value) VALUES($1, $2) ON CONFLICT (key) DO UPDATE SET value=$2",
    [key, JSON.stringify(value)]
  );
};

const initialize = async (config = process.env) => {
  client = new Client({ connectionString: config.DATABASE_URL });
  await client.connect();

  await client.query(
    "CREATE TABLE IF NOT EXISTS brain (key TEXT PRIMARY KEY, value TEXT)"
  );

  const data = await client.query("SELECT * FROM brain");

  data.rows.forEach(({ key, value }) => {
    brain.set(key, JSON.parse(value));
  });
};

module.exports = { initialize, get, set };
