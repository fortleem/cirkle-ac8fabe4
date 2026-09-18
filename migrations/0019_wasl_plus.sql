-- 0019_wasl_plus.sql — Ported feature parity from the standalone Wasl (Next.js) app.
-- Idempotent: CREATE TABLE IF NOT EXISTS + INSERT OR IGNORE demo rows using
-- existing seeded users (1-8) and rooms from seed.sql / seed_v12.sql.

-- ─── Stories ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wasl_stories (
  id            TEXT PRIMARY KEY,
  user_id       INTEGER NOT NULL,
  media_type    TEXT DEFAULT 'text',      -- text | image | video
  content       TEXT,
  bg_color      TEXT,
  caption       TEXT,
  expires_at    DATETIME,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_wasl_stories_user ON wasl_stories(user_id);

CREATE TABLE IF NOT EXISTS wasl_story_views (
  story_id      TEXT NOT NULL,
  user_id       INTEGER NOT NULL,
  viewed_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (story_id, user_id)
);

-- ─── Scheduled messages ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wasl_scheduled_messages (
  id            TEXT PRIMARY KEY,
  room_id       TEXT NOT NULL,
  sender_id     INTEGER NOT NULL,
  body          TEXT NOT NULL,
  send_at       DATETIME NOT NULL,
  status        TEXT DEFAULT 'pending',   -- pending | sent | cancelled
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_wasl_sched_room ON wasl_scheduled_messages(room_id);

-- ─── Drafts (one per user+room) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wasl_drafts (
  room_id       TEXT NOT NULL,
  user_id       INTEGER NOT NULL,
  body          TEXT NOT NULL DEFAULT '',
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (room_id, user_id)
);

-- ─── Chat folders ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wasl_folders (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL,
  name          TEXT NOT NULL,
  icon          TEXT DEFAULT 'folder',
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS wasl_folder_rooms (
  folder_id     INTEGER NOT NULL,
  room_id       TEXT NOT NULL,
  PRIMARY KEY (folder_id, room_id)
);

-- ─── Starred / bookmarked messages ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wasl_starred (
  user_id       INTEGER NOT NULL,
  message_id    TEXT NOT NULL,
  starred_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, message_id)
);
CREATE TABLE IF NOT EXISTS wasl_bookmarks (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL,
  message_id    TEXT NOT NULL,
  note          TEXT,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ─── Pinned messages ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wasl_pinned (
  room_id       TEXT NOT NULL,
  message_id    TEXT NOT NULL,
  pinned_by     INTEGER,
  pinned_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (room_id, message_id)
);

-- ─── Message edit history + view-once ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS wasl_message_edits (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id    TEXT NOT NULL,
  prev_body     TEXT,
  edited_at     DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS wasl_message_meta (
  message_id      TEXT PRIMARY KEY,
  view_once       INTEGER DEFAULT 0,
  viewed          INTEGER DEFAULT 0,
  viewed_at       DATETIME,
  edited          INTEGER DEFAULT 0,
  thread_root_id  TEXT,
  deleted         INTEGER DEFAULT 0
);

-- ─── Read receipts ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wasl_read_receipts (
  message_id    TEXT NOT NULL,
  user_id       INTEGER NOT NULL,
  read_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (message_id, user_id)
);

-- ─── Screenshot-attempt logging ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wasl_screenshot_attempts (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id       TEXT,
  message_id    TEXT,
  user_id       INTEGER NOT NULL,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ─── Conversation-level state: archive/mute/settings/disappearing ─────────
CREATE TABLE IF NOT EXISTS wasl_room_state (
  room_id         TEXT NOT NULL,
  user_id         INTEGER NOT NULL,
  archived        INTEGER DEFAULT 0,
  muted           INTEGER DEFAULT 0,
  muted_until     DATETIME,
  wallpaper       TEXT,
  font_size       TEXT DEFAULT 'medium',
  PRIMARY KEY (room_id, user_id)
);
CREATE TABLE IF NOT EXISTS wasl_disappearing_settings (
  room_id       TEXT PRIMARY KEY,
  ttl_seconds   INTEGER DEFAULT 0,     -- 0 = off
  set_by        INTEGER,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS wasl_room_invites (
  code          TEXT PRIMARY KEY,
  room_id       TEXT NOT NULL,
  created_by    INTEGER,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at    DATETIME
);

-- ─── Contacts + phone numbers ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wasl_contacts (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id      INTEGER NOT NULL,
  user_id       INTEGER,
  nickname      TEXT,
  phone         TEXT,
  notes         TEXT,
  added_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(owner_id, user_id)
);
CREATE TABLE IF NOT EXISTS wasl_phone_numbers (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL,
  number        TEXT NOT NULL,
  label         TEXT,
  active        INTEGER DEFAULT 0,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, number)
);

-- ─── App lock ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wasl_app_lock (
  user_id       INTEGER PRIMARY KEY,
  enabled       INTEGER DEFAULT 0,
  pin_hash      TEXT,
  method        TEXT DEFAULT 'pin',   -- pin | biometric
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ─── Link preview cache ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wasl_link_previews (
  url           TEXT PRIMARY KEY,
  title         TEXT,
  description   TEXT,
  image         TEXT,
  site_name     TEXT,
  cached_at     DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ─── Threads (replies) ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wasl_threads (
  id            TEXT PRIMARY KEY,
  room_id       TEXT NOT NULL,
  root_message_id TEXT NOT NULL,
  reply_count   INTEGER DEFAULT 0,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ─── Polls ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wasl_polls (
  id            TEXT PRIMARY KEY,
  room_id       TEXT NOT NULL,
  creator_id    INTEGER NOT NULL,
  question      TEXT NOT NULL,
  options       TEXT NOT NULL,     -- JSON array of strings
  multiple      INTEGER DEFAULT 0,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS wasl_poll_votes (
  poll_id       TEXT NOT NULL,
  user_id       INTEGER NOT NULL,
  option_index  INTEGER NOT NULL,
  voted_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (poll_id, user_id, option_index)
);

-- ─── Receipt split ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wasl_receipt_splits (
  id            TEXT PRIMARY KEY,
  room_id       TEXT NOT NULL,
  creator_id    INTEGER NOT NULL,
  title         TEXT NOT NULL,
  total_amount  REAL NOT NULL,
  currency      TEXT DEFAULT 'EGP',
  participants  TEXT NOT NULL,   -- JSON: [{user_id, share, paid}]
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ─── Verify person ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wasl_verify_person (
  user_id       INTEGER PRIMARY KEY,
  status        TEXT DEFAULT 'unverified',  -- unverified | pending | verified | rejected
  id_doc_ref    TEXT,
  submitted_at  DATETIME,
  verified_at   DATETIME
);

-- ─── Business workspaces ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wasl_businesses (
  id            TEXT PRIMARY KEY,
  owner_id      INTEGER NOT NULL,
  name          TEXT NOT NULL,
  category      TEXT,
  description   TEXT,
  verified      INTEGER DEFAULT 0,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS wasl_business_members (
  business_id   TEXT NOT NULL,
  user_id       INTEGER NOT NULL,
  role          TEXT DEFAULT 'member',
  joined_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (business_id, user_id)
);
CREATE TABLE IF NOT EXISTS wasl_business_groups (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id   TEXT NOT NULL,
  name          TEXT NOT NULL,
  room_id       TEXT,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ─── Service providers ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wasl_service_providers (
  id            TEXT PRIMARY KEY,
  owner_id      INTEGER NOT NULL,
  name          TEXT NOT NULL,
  category      TEXT,
  description   TEXT,
  verified      INTEGER DEFAULT 0,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS wasl_sp_announcements (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  provider_id   TEXT NOT NULL,
  title         TEXT NOT NULL,
  body          TEXT NOT NULL,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS wasl_sp_announcement_state (
  announcement_id INTEGER NOT NULL,
  user_id         INTEGER NOT NULL,
  read            INTEGER DEFAULT 0,
  dismissed       INTEGER DEFAULT 0,
  PRIMARY KEY (announcement_id, user_id)
);

-- ─── AI helper cache (smart reply / summary / tone / action items) ───────
CREATE TABLE IF NOT EXISTS wasl_ai_cache (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  kind          TEXT NOT NULL,   -- smart-reply | summary | tone | action-items
  room_id       TEXT,
  input_hash    TEXT,
  output        TEXT,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ══════════════════════════ Demo seed rows ══════════════════════════════

INSERT OR IGNORE INTO wasl_stories (id, user_id, media_type, content, bg_color, caption, expires_at) VALUES
  ('story1', 1, 'text', 'Friday koshari run 🍚', '#0891b2', 'Cairo life', datetime('now', '+18 hours')),
  ('story2', 2, 'text', 'Golden hour on the Nile', '#7c3aed', NULL, datetime('now', '+20 hours')),
  ('story3', 5, 'text', 'New short film dropping soon 🎬', '#db2777', 'Coming soon', datetime('now', '+22 hours'));
INSERT OR IGNORE INTO wasl_story_views (story_id, user_id) VALUES ('story1', 2), ('story1', 3), ('story2', 1);

INSERT OR IGNORE INTO wasl_scheduled_messages (id, room_id, sender_id, body, send_at) VALUES
  ('sched1', '!direct-ahmed-layla:matrix.cirkle.app', 1, 'Reminder: koshari at 8pm!', datetime('now', '+2 hours'));

INSERT OR IGNORE INTO wasl_drafts (room_id, user_id, body) VALUES
  ('!group-cairo-coffee:matrix.cirkle.app', 1, 'Should we book the rooftop for—');

INSERT OR IGNORE INTO wasl_folders (id, user_id, name, icon) VALUES
  (1, 1, 'Work', 'briefcase'),
  (2, 1, 'Family', 'heart');
INSERT OR IGNORE INTO wasl_folder_rooms (folder_id, room_id) VALUES
  (1, '!group-jozour-eng:matrix.cirkle.app'),
  (2, '!direct-ahmed-layla:matrix.cirkle.app');

INSERT OR IGNORE INTO wasl_starred (user_id, message_id) VALUES (1, 'm2'), (2, 'm1');
INSERT OR IGNORE INTO wasl_bookmarks (user_id, message_id, note) VALUES (1, 'm4', 'check this cafe out');

INSERT OR IGNORE INTO wasl_pinned (room_id, message_id, pinned_by) VALUES
  ('!group-cairo-coffee:matrix.cirkle.app', 'm4', 2);

INSERT OR IGNORE INTO wasl_message_meta (message_id, view_once, thread_root_id) VALUES
  ('m6', 0, NULL), ('m7', 0, 'm6');

INSERT OR IGNORE INTO wasl_read_receipts (message_id, user_id) VALUES ('m1', 1), ('m2', 2);

INSERT OR IGNORE INTO wasl_disappearing_settings (room_id, ttl_seconds, set_by) VALUES
  ('!direct-ahmed-layla:matrix.cirkle.app', 0, 1);

INSERT OR IGNORE INTO wasl_contacts (owner_id, user_id, nickname, phone) VALUES
  (1, 2, 'Layla ☕', '+20-100-000-0002'),
  (1, 3, 'Omar (Backend)', '+20-100-000-0003');
INSERT OR IGNORE INTO wasl_phone_numbers (user_id, number, label, active) VALUES
  (1, '+20-100-000-0001', 'Personal', 1),
  (2, '+20-100-000-0002', 'Personal', 1);

INSERT OR IGNORE INTO wasl_app_lock (user_id, enabled, method) VALUES (1, 0, 'pin');

INSERT OR IGNORE INTO wasl_polls (id, room_id, creator_id, question, options) VALUES
  ('poll1', '!group-cairo-coffee:matrix.cirkle.app', 2, 'Where should we meet Friday?', '["Zamalek Ahwa","Downtown Cafe","Maadi Corniche"]');
INSERT OR IGNORE INTO wasl_poll_votes (poll_id, user_id, option_index) VALUES ('poll1', 1, 0), ('poll1', 4, 0), ('poll1', 2, 2);

INSERT OR IGNORE INTO wasl_receipt_splits (id, room_id, creator_id, title, total_amount, currency, participants) VALUES
  ('split1', '!group-cairo-coffee:matrix.cirkle.app', 2, 'Koshari night', 320.0, 'EGP',
   '[{"user_id":1,"share":80,"paid":true},{"user_id":2,"share":80,"paid":true},{"user_id":4,"share":80,"paid":false},{"user_id":5,"share":80,"paid":false}]');

INSERT OR IGNORE INTO wasl_verify_person (user_id, status, submitted_at, verified_at) VALUES
  (1, 'verified', datetime('now', '-30 days'), datetime('now', '-28 days')),
  (9, 'unverified', NULL, NULL);

INSERT OR IGNORE INTO wasl_businesses (id, owner_id, name, category, description, verified) VALUES
  ('biz1', 3, 'Jozour Engineering Co.', 'Technology', 'Backend infra & self-hosting consultancy.', 1);
INSERT OR IGNORE INTO wasl_business_members (business_id, user_id, role) VALUES
  ('biz1', 3, 'owner'), ('biz1', 7, 'admin');
INSERT OR IGNORE INTO wasl_business_groups (business_id, name, room_id) VALUES
  ('biz1', 'Support', '!group-jozour-eng:matrix.cirkle.app');

INSERT OR IGNORE INTO wasl_service_providers (id, owner_id, name, category, description, verified) VALUES
  ('sp1', 10, 'Cairo Weather Service', 'Utilities', 'Official weather broadcasts.', 1);
INSERT OR IGNORE INTO wasl_sp_announcements (provider_id, title, body) VALUES
  ('sp1', 'Dust storm advisory', 'Visibility reduced in Greater Cairo until 4pm today.');
