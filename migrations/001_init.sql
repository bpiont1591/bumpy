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
  bumped_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS panel_sessions (
  session_id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
