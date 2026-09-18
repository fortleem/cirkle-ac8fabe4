-- Mashahd Plus: feature parity port from the standalone MASHAHD app.
-- All tables idempotent (CREATE TABLE IF NOT EXISTS) with demo rows so the
-- UI is never empty. video_id / channel_id are stored as TEXT to match the
-- convention used by video_comments (videos.id is an INTEGER but is always
-- referenced as a string across the API).

-- ── Playlists ──
CREATE TABLE IF NOT EXISTS playlist_folders (
  id          TEXT PRIMARY KEY,
  owner_id    INTEGER NOT NULL,
  name        TEXT NOT NULL,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS playlists (
  id          TEXT PRIMARY KEY,
  owner_id    INTEGER NOT NULL,
  folder_id   TEXT,
  title       TEXT NOT NULL,
  description TEXT DEFAULT '',
  visibility  TEXT DEFAULT 'public',
  cover_url   TEXT DEFAULT '',
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_playlists_owner ON playlists(owner_id);

CREATE TABLE IF NOT EXISTS playlist_items (
  id          TEXT PRIMARY KEY,
  playlist_id TEXT NOT NULL,
  video_id    TEXT NOT NULL,
  position    INTEGER DEFAULT 0,
  added_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_playlist_items_pl ON playlist_items(playlist_id);

CREATE TABLE IF NOT EXISTS smart_playlists (
  id          TEXT PRIMARY KEY,
  owner_id    INTEGER NOT NULL,
  title       TEXT NOT NULL,
  rules_json  TEXT NOT NULL DEFAULT '{}',
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ── Clips ──
CREATE TABLE IF NOT EXISTS clips (
  id          TEXT PRIMARY KEY,
  video_id    TEXT NOT NULL,
  creator_id  INTEGER NOT NULL,
  title       TEXT NOT NULL,
  start_sec   INTEGER DEFAULT 0,
  end_sec     INTEGER DEFAULT 15,
  views       INTEGER DEFAULT 0,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_clips_video ON clips(video_id);

-- ── Continue watching ──
CREATE TABLE IF NOT EXISTS continue_watching (
  user_id       INTEGER NOT NULL,
  video_id      TEXT NOT NULL,
  position_sec  REAL DEFAULT 0,
  completed     INTEGER DEFAULT 0,
  playback_speed REAL DEFAULT 1,
  quality_pref  TEXT DEFAULT 'auto',
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, video_id)
);

-- ── Interest profiles / recommendations ──
CREATE TABLE IF NOT EXISTS interest_profiles (
  user_id     INTEGER PRIMARY KEY,
  categories_json TEXT DEFAULT '{}',
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS recommendation_feedback (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL,
  video_id    TEXT NOT NULL,
  reason      TEXT NOT NULL,
  note        TEXT DEFAULT '',
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, video_id)
);

CREATE TABLE IF NOT EXISTS recommendation_changelog (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL,
  change_type TEXT NOT NULL,
  detail      TEXT DEFAULT '',
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ── User blocks / preferences / premium ──
CREATE TABLE IF NOT EXISTS user_blocks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL,
  block_type  TEXT NOT NULL,
  block_value TEXT NOT NULL,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, block_type, block_value)
);

CREATE TABLE IF NOT EXISTS watch_preferences (
  user_id     INTEGER PRIMARY KEY,
  preferred_quality TEXT DEFAULT 'auto',
  preferred_speed REAL DEFAULT 1,
  autoplay_next INTEGER DEFAULT 0,
  disable_shorts INTEGER DEFAULT 0,
  home_mode   TEXT DEFAULT 'smart',
  reduced_motion INTEGER DEFAULT 0,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notification_preferences_mashahd (
  user_id     INTEGER PRIMARY KEY,
  new_videos  INTEGER DEFAULT 1,
  comments    INTEGER DEFAULT 1,
  subscribers INTEGER DEFAULT 1,
  tips        INTEGER DEFAULT 1,
  mentions    INTEGER DEFAULT 1,
  email_enabled INTEGER DEFAULT 1,
  push_enabled INTEGER DEFAULT 0,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS premium_tiers (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  price_minor INTEGER NOT NULL,
  currency    TEXT DEFAULT 'USD',
  perks_json  TEXT DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS premium_subscriptions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL,
  tier_id     TEXT NOT NULL,
  status      TEXT DEFAULT 'active',
  started_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ── Sessions / catalog / analytics / support / transparency / data export ──
CREATE TABLE IF NOT EXISTS mashahd_sessions (
  id          TEXT PRIMARY KEY,
  user_id     INTEGER NOT NULL,
  video_id    TEXT,
  device      TEXT DEFAULT 'web',
  started_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  ended_at    DATETIME
);

CREATE TABLE IF NOT EXISTS support_tickets (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL,
  subject     TEXT NOT NULL,
  body        TEXT NOT NULL,
  status      TEXT DEFAULT 'open',
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transparency_decisions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  target_type TEXT NOT NULL,
  target_id   TEXT NOT NULL,
  decision    TEXT NOT NULL,
  reason      TEXT DEFAULT '',
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS data_export_requests (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL,
  status      TEXT DEFAULT 'pending',
  download_url TEXT DEFAULT '',
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ── Video extras ──
CREATE TABLE IF NOT EXISTS video_chapters (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  video_id    TEXT NOT NULL,
  title       TEXT NOT NULL,
  start_sec   INTEGER NOT NULL,
  ai_generated INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_chapters_video ON video_chapters(video_id);

CREATE TABLE IF NOT EXISTS video_polls (
  id          TEXT PRIMARY KEY,
  video_id    TEXT NOT NULL,
  question    TEXT NOT NULL,
  options_json TEXT NOT NULL DEFAULT '[]',
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS video_poll_votes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  poll_id     TEXT NOT NULL,
  user_id     INTEGER NOT NULL,
  option_idx  INTEGER NOT NULL,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(poll_id, user_id)
);

CREATE TABLE IF NOT EXISTS video_qa (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  video_id    TEXT NOT NULL,
  user_id     INTEGER NOT NULL,
  question    TEXT NOT NULL,
  answer      TEXT DEFAULT '',
  answered_by INTEGER,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_qa_video ON video_qa(video_id);

CREATE TABLE IF NOT EXISTS video_corrections (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  video_id    TEXT NOT NULL,
  user_id     INTEGER NOT NULL,
  text        TEXT NOT NULL,
  status      TEXT DEFAULT 'pending',
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS video_relationships (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  video_id    TEXT NOT NULL,
  related_video_id TEXT NOT NULL,
  relation_type TEXT DEFAULT 'related'
);

CREATE TABLE IF NOT EXISTS video_quality_signals (
  video_id    TEXT PRIMARY KEY,
  watch_completion_pct REAL DEFAULT 0,
  clickbait_score REAL DEFAULT 0,
  misinfo_flags INTEGER DEFAULT 0,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ad_disclosures (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  video_id    TEXT NOT NULL,
  disclosure_type TEXT NOT NULL,
  sponsor     TEXT DEFAULT '',
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rights_claims (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  video_id    TEXT NOT NULL,
  claimant    TEXT NOT NULL,
  claim_type  TEXT DEFAULT 'copyright',
  status      TEXT DEFAULT 'open',
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rights_claim_disputes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  claim_id    INTEGER NOT NULL,
  user_id     INTEGER NOT NULL,
  reason      TEXT NOT NULL,
  status      TEXT DEFAULT 'pending',
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS video_shares (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  video_id    TEXT NOT NULL,
  sharer_id   INTEGER NOT NULL,
  platform    TEXT DEFAULT 'copy_link',
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS live_to_vod (
  video_id    TEXT PRIMARY KEY,
  vod_video_id TEXT,
  status      TEXT DEFAULT 'processing',
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ── Channel studio ──
CREATE TABLE IF NOT EXISTS channel_roles (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_id  TEXT NOT NULL,
  user_id     INTEGER NOT NULL,
  role        TEXT DEFAULT 'editor',
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(channel_id, user_id)
);

CREATE TABLE IF NOT EXISTS channel_revenue (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_id  TEXT NOT NULL,
  source      TEXT NOT NULL,
  amount_minor INTEGER DEFAULT 0,
  currency    TEXT DEFAULT 'USD',
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS channel_subscriptions (
  channel_id  TEXT NOT NULL,
  user_id     INTEGER NOT NULL,
  notify      INTEGER DEFAULT 1,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (channel_id, user_id)
);

-- ── AI feature cache (for reuse / offline demo) ──
CREATE TABLE IF NOT EXISTS ai_video_artifacts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  video_id    TEXT NOT NULL,
  kind        TEXT NOT NULL, -- summary | chapters | transcript | translate | tone | starters
  lang        TEXT DEFAULT 'en',
  content     TEXT NOT NULL,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ai_artifacts ON ai_video_artifacts(video_id, kind);

-- ─────────────────────────────── Demo rows ───────────────────────────────

INSERT OR IGNORE INTO playlist_folders (id, owner_id, name) VALUES
  ('plf1', 1, 'Watch later boards');

INSERT OR IGNORE INTO playlists (id, owner_id, folder_id, title, description, visibility, cover_url) VALUES
  ('pl1', 1, 'plf1', 'Cairo Nights', 'My favourite Cairo street videos', 'public', ''),
  ('pl2', 2, NULL, 'Sufi Sessions', 'Whirling & music', 'public', '');

INSERT OR IGNORE INTO playlist_items (id, playlist_id, video_id, position) VALUES
  ('pli1', 'pl1', '1', 0),
  ('pli2', 'pl1', '2', 1),
  ('pli3', 'pl2', '2', 0);

INSERT OR IGNORE INTO smart_playlists (id, owner_id, title, rules_json) VALUES
  ('spl1', 1, 'Trending in Cairo', '{"city":"Cairo","min_views":1000,"sort":"views"}');

INSERT OR IGNORE INTO clips (id, video_id, creator_id, title, start_sec, end_sec, views) VALUES
  ('clip1', '1', 5, 'Best sunset moment', 30, 45, 320);

INSERT OR IGNORE INTO continue_watching (user_id, video_id, position_sec, completed) VALUES
  (1, '1', 120, 0),
  (1, '3', 45, 0);

INSERT OR IGNORE INTO interest_profiles (user_id, categories_json) VALUES
  (1, '{"travel":0.8,"tech":0.4,"music":0.6}');

INSERT OR IGNORE INTO recommendation_changelog (user_id, change_type, detail) VALUES
  (1, 'initialized', 'Interest profile seeded from demo watch history');

INSERT OR IGNORE INTO watch_preferences (user_id) VALUES (1), (2);
INSERT OR IGNORE INTO notification_preferences_mashahd (user_id) VALUES (1), (2);

INSERT OR IGNORE INTO premium_tiers (id, name, price_minor, currency, perks_json) VALUES
  ('tier_plus', 'Mashahd Plus', 499, 'USD', '["No ads","Offline downloads","Background play"]'),
  ('tier_pro', 'Mashahd Pro', 999, 'USD', '["Everything in Plus","4K uploads","Priority support"]');

INSERT OR IGNORE INTO premium_subscriptions (user_id, tier_id, status) VALUES (1, 'tier_plus', 'active');

INSERT OR IGNORE INTO video_chapters (video_id, title, start_sec, ai_generated) VALUES
  ('1', 'Introduction', 0, 1),
  ('1', 'The bazaar entrance', 90, 1),
  ('1', 'Sunset shots', 300, 1);

INSERT OR IGNORE INTO video_polls (id, video_id, question, options_json) VALUES
  ('poll1', '1', 'Which spot did you like most?', '["Bazaar entrance","Sunset alley","Tea house"]');

INSERT OR IGNORE INTO video_qa (video_id, user_id, question, answer, answered_by) VALUES
  ('1', 4, 'What camera did you use?', 'A Sony A7S III with a 24-70mm lens.', 5);

INSERT OR IGNORE INTO video_quality_signals (video_id, watch_completion_pct, clickbait_score, misinfo_flags) VALUES
  ('1', 68.5, 0.12, 0);

INSERT OR IGNORE INTO ad_disclosures (video_id, disclosure_type, sponsor) VALUES
  ('2', 'paid_promotion', 'Stella Coffee Co.');

INSERT OR IGNORE INTO rights_claims (video_id, claimant, claim_type, status) VALUES
  ('2', 'Sufi Music Archive', 'copyright', 'open');

INSERT OR IGNORE INTO video_relationships (video_id, related_video_id, relation_type) VALUES
  ('1', '2', 'related'),
  ('1', '3', 'same_creator_series');

INSERT OR IGNORE INTO channel_roles (channel_id, user_id, role) VALUES
  ('1', 1, 'owner');

INSERT OR IGNORE INTO channel_revenue (channel_id, source, amount_minor, currency) VALUES
  ('1', 'ads', 12400, 'USD'),
  ('1', 'tips', 5300, 'USD'),
  ('1', 'memberships', 8900, 'USD');

INSERT OR IGNORE INTO channel_subscriptions (channel_id, user_id) VALUES ('1', 2);
