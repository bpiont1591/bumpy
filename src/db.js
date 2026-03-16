const path = require('path');
const Database = require('better-sqlite3');
const { nanoid } = require('nanoid');

const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'data.sqlite');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS servers (
    guild_id TEXT PRIMARY KEY,
    guild_name TEXT NOT NULL,
    invite_url TEXT NOT NULL,
    description TEXT DEFAULT '',
    ad_title TEXT DEFAULT '',
    ad_body TEXT DEFAULT '',
    banner_url TEXT DEFAULT '',
    panel_token TEXT NOT NULL,
    bumps_count INTEGER DEFAULT 0,
    bumped_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS bump_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    bumped_at TEXT NOT NULL,
    FOREIGN KEY(guild_id) REFERENCES servers(guild_id)
  );
`);

const upsertServerStmt = db.prepare(`
  INSERT INTO servers (
    guild_id, guild_name, invite_url, description, ad_title, ad_body, banner_url, panel_token,
    bumps_count, bumped_at, created_at, updated_at
  ) VALUES (
    @guildId, @guildName, @inviteUrl, @description, @adTitle, @adBody, @bannerUrl, @panelToken,
    1, @bumpedAt, @createdAt, @updatedAt
  )
  ON CONFLICT(guild_id) DO UPDATE SET
    guild_name=excluded.guild_name,
    invite_url=excluded.invite_url,
    description=COALESCE(NULLIF(excluded.description,''), servers.description),
    ad_title=COALESCE(NULLIF(excluded.ad_title,''), servers.ad_title),
    ad_body=COALESCE(NULLIF(excluded.ad_body,''), servers.ad_body),
    banner_url=COALESCE(NULLIF(excluded.banner_url,''), servers.banner_url),
    bumps_count=servers.bumps_count + 1,
    bumped_at=excluded.bumped_at,
    updated_at=excluded.updated_at
`);

const insertBumpLogStmt = db.prepare(`
  INSERT INTO bump_logs (guild_id, bumped_at)
  VALUES (?, ?)
`);

const createServerFromBump = ({ guildId, guildName, inviteUrl }) => {
  const now = new Date().toISOString();
  const panelToken = nanoid(24);

  upsertServerStmt.run({
    guildId,
    guildName,
    inviteUrl,
    description: '',
    adTitle: '',
    adBody: '',
    bannerUrl: '',
    panelToken,
    bumpedAt: now,
    createdAt: now,
    updatedAt: now
  });

  insertBumpLogStmt.run(guildId, now);

  return db.prepare('SELECT * FROM servers WHERE guild_id = ?').get(guildId);
};

const listServers = () => {
  return db.prepare(`
    SELECT guild_id, guild_name, invite_url, description, ad_title, ad_body, banner_url, bumps_count, bumped_at
    FROM servers
    ORDER BY datetime(bumped_at) DESC
  `).all();
};

const getServerByToken = (guildId, panelToken) => {
  return db.prepare(`
    SELECT * FROM servers WHERE guild_id = ? AND panel_token = ?
  `).get(guildId, panelToken);
};

const updateServerSettings = ({ guildId, panelToken, description, adTitle, adBody, inviteUrl, bannerUrl }) => {
  const now = new Date().toISOString();

  const result = db.prepare(`
    UPDATE servers
    SET description = @description,
        ad_title = @adTitle,
        ad_body = @adBody,
        invite_url = @inviteUrl,
        banner_url = @bannerUrl,
        updated_at = @updatedAt
    WHERE guild_id = @guildId AND panel_token = @panelToken
  `).run({ guildId, panelToken, description, adTitle, adBody, inviteUrl, bannerUrl, updatedAt: now });

  return result.changes > 0;
};

module.exports = {
  createServerFromBump,
  listServers,
  getServerByToken,
  updateServerSettings
};
