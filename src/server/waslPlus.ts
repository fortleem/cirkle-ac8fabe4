// Cirkle — Wasl feature parity routes ported from the standalone Wasl app.
// Mounted from src/server/api.ts via registerWaslPlus(api).
import type { Hono } from 'hono'
import { all, first, run, type Env } from './db'
import { generateSmartReplies, sageChat, type SageMsg } from './ai'

const rid = (p: string) => p + Date.now().toString(36) + Math.floor(Math.random() * 1000)

export function registerWaslPlus(api: Hono<{ Bindings: Env }>) {
  // ─── Stories ────────────────────────────────────────────────────────
  api.get('/wasl-plus/stories', async (c) => {
    const rows = await all(c.env.DB, `
      SELECT s.*, u.handle, u.display_name,
        (SELECT COUNT(*) FROM wasl_story_views v WHERE v.story_id = s.id) AS view_count
      FROM wasl_stories s JOIN users u ON u.id = s.user_id
      WHERE s.expires_at IS NULL OR s.expires_at > CURRENT_TIMESTAMP
      ORDER BY s.created_at DESC`)
    return c.json({ stories: rows })
  })
  api.post('/wasl-plus/stories', async (c) => {
    const b = await c.req.json<{ user_id: number; media_type?: string; content?: string; bg_color?: string; caption?: string }>()
    const id = rid('story')
    await run(c.env.DB,
      `INSERT INTO wasl_stories (id, user_id, media_type, content, bg_color, caption, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now', '+24 hours'))`,
      id, b.user_id, b.media_type ?? 'text', b.content ?? '', b.bg_color ?? '#0891b2', b.caption ?? null)
    return c.json({ ok: true, id })
  })
  api.post('/wasl-plus/stories/:id/view', async (c) => {
    const id = c.req.param('id')
    const b = await c.req.json<{ user_id: number }>()
    await run(c.env.DB, 'INSERT OR IGNORE INTO wasl_story_views (story_id, user_id) VALUES (?, ?)', id, b.user_id)
    return c.json({ ok: true })
  })
  api.get('/wasl-plus/stories/:id/views', async (c) => {
    const rows = await all(c.env.DB,
      `SELECT v.*, u.handle, u.display_name FROM wasl_story_views v JOIN users u ON u.id = v.user_id WHERE v.story_id = ? ORDER BY v.viewed_at DESC`,
      c.req.param('id'))
    return c.json({ views: rows })
  })

  // ─── Scheduled messages ───────────────────────────────────────────────
  api.get('/wasl-plus/scheduled-messages', async (c) => {
    const uid = Number(c.req.query('user_id') ?? 0)
    const rows = await all(c.env.DB, `SELECT * FROM wasl_scheduled_messages WHERE sender_id = ? ORDER BY send_at ASC`, uid)
    return c.json({ scheduled: rows })
  })
  api.post('/wasl-plus/scheduled-messages', async (c) => {
    const b = await c.req.json<{ room_id: string; sender_id: number; body: string; send_at: string }>()
    const id = rid('sched')
    await run(c.env.DB, `INSERT INTO wasl_scheduled_messages (id, room_id, sender_id, body, send_at) VALUES (?, ?, ?, ?, ?)`,
      id, b.room_id, b.sender_id, b.body, b.send_at)
    return c.json({ ok: true, id })
  })
  api.post('/wasl-plus/scheduled-messages/:id/cancel', async (c) => {
    await run(c.env.DB, `UPDATE wasl_scheduled_messages SET status = 'cancelled' WHERE id = ?`, c.req.param('id'))
    return c.json({ ok: true })
  })
  api.post('/wasl-plus/scheduled-messages/process', async (c) => {
    const due = await all<{ id: string; room_id: string; sender_id: number; body: string }>(c.env.DB,
      `SELECT * FROM wasl_scheduled_messages WHERE status = 'pending' AND send_at <= CURRENT_TIMESTAMP`)
    let sent = 0
    for (const m of due) {
      const mid = rid('m')
      await run(c.env.DB, 'INSERT INTO messages (id, room_id, sender_id, body, status, is_encrypted) VALUES (?, ?, ?, ?, 1, 1)', mid, m.room_id, m.sender_id, m.body)
      await run(c.env.DB, `UPDATE wasl_scheduled_messages SET status = 'sent' WHERE id = ?`, m.id)
      sent++
    }
    return c.json({ ok: true, sent })
  })

  // ─── Drafts ────────────────────────────────────────────────────────────
  api.get('/wasl-plus/drafts', async (c) => {
    const uid = Number(c.req.query('user_id') ?? 0)
    const rows = await all(c.env.DB, `SELECT * FROM wasl_drafts WHERE user_id = ?`, uid)
    return c.json({ drafts: rows })
  })
  api.post('/wasl-plus/drafts/:room_id', async (c) => {
    const roomId = c.req.param('room_id')
    const b = await c.req.json<{ user_id: number; body: string }>()
    if (!b.body) {
      await run(c.env.DB, 'DELETE FROM wasl_drafts WHERE room_id = ? AND user_id = ?', roomId, b.user_id)
      return c.json({ ok: true, deleted: true })
    }
    await run(c.env.DB, `INSERT INTO wasl_drafts (room_id, user_id, body) VALUES (?, ?, ?)
      ON CONFLICT(room_id, user_id) DO UPDATE SET body = excluded.body, updated_at = CURRENT_TIMESTAMP`, roomId, b.user_id, b.body)
    return c.json({ ok: true })
  })

  // ─── Chat folders ─────────────────────────────────────────────────────
  api.get('/wasl-plus/folders', async (c) => {
    const uid = Number(c.req.query('user_id') ?? 0)
    const folders = await all(c.env.DB, `SELECT * FROM wasl_folders WHERE user_id = ?`, uid)
    for (const f of folders as any[]) {
      f.room_ids = (await all<{ room_id: string }>(c.env.DB, `SELECT room_id FROM wasl_folder_rooms WHERE folder_id = ?`, f.id)).map(r => r.room_id)
    }
    return c.json({ folders })
  })
  api.post('/wasl-plus/folders', async (c) => {
    const b = await c.req.json<{ user_id: number; name: string; icon?: string }>()
    const r = await run(c.env.DB, `INSERT INTO wasl_folders (user_id, name, icon) VALUES (?, ?, ?)`, b.user_id, b.name, b.icon ?? 'folder')
    return c.json({ ok: true, id: r.meta?.last_row_id })
  })
  api.post('/wasl-plus/folders/:id/conversations', async (c) => {
    const fid = Number(c.req.param('id'))
    const b = await c.req.json<{ room_id: string; remove?: boolean }>()
    if (b.remove) await run(c.env.DB, 'DELETE FROM wasl_folder_rooms WHERE folder_id = ? AND room_id = ?', fid, b.room_id)
    else await run(c.env.DB, 'INSERT OR IGNORE INTO wasl_folder_rooms (folder_id, room_id) VALUES (?, ?)', fid, b.room_id)
    return c.json({ ok: true })
  })
  api.post('/wasl-plus/folders/:id/delete', async (c) => {
    const fid = Number(c.req.param('id'))
    await run(c.env.DB, 'DELETE FROM wasl_folder_rooms WHERE folder_id = ?', fid)
    await run(c.env.DB, 'DELETE FROM wasl_folders WHERE id = ?', fid)
    return c.json({ ok: true })
  })

  // ─── Starred / bookmarks ────────────────────────────────────────────────
  api.get('/wasl-plus/starred', async (c) => {
    const uid = Number(c.req.query('user_id') ?? 0)
    const rows = await all(c.env.DB, `
      SELECT s.*, m.body, m.room_id, m.sender_id, m.created_at AS message_created_at
      FROM wasl_starred s JOIN messages m ON m.id = s.message_id
      WHERE s.user_id = ? ORDER BY s.starred_at DESC`, uid)
    return c.json({ starred: rows })
  })
  api.post('/wasl-plus/starred', async (c) => {
    const b = await c.req.json<{ user_id: number; message_id: string; remove?: boolean }>()
    if (b.remove) await run(c.env.DB, 'DELETE FROM wasl_starred WHERE user_id = ? AND message_id = ?', b.user_id, b.message_id)
    else await run(c.env.DB, 'INSERT OR IGNORE INTO wasl_starred (user_id, message_id) VALUES (?, ?)', b.user_id, b.message_id)
    return c.json({ ok: true })
  })
  api.get('/wasl-plus/bookmarks', async (c) => {
    const uid = Number(c.req.query('user_id') ?? 0)
    const rows = await all(c.env.DB, `
      SELECT b.*, m.body, m.room_id, m.sender_id
      FROM wasl_bookmarks b JOIN messages m ON m.id = b.message_id
      WHERE b.user_id = ? ORDER BY b.created_at DESC`, uid)
    return c.json({ bookmarks: rows })
  })
  api.post('/wasl-plus/bookmarks', async (c) => {
    const b = await c.req.json<{ user_id: number; message_id: string; note?: string }>()
    const r = await run(c.env.DB, `INSERT INTO wasl_bookmarks (user_id, message_id, note) VALUES (?, ?, ?)`, b.user_id, b.message_id, b.note ?? null)
    return c.json({ ok: true, id: r.meta?.last_row_id })
  })
  api.post('/wasl-plus/bookmarks/:id/delete', async (c) => {
    await run(c.env.DB, 'DELETE FROM wasl_bookmarks WHERE id = ?', c.req.param('id'))
    return c.json({ ok: true })
  })

  // ─── Pinned messages ────────────────────────────────────────────────────
  api.get('/wasl-plus/rooms/:id/pinned', async (c) => {
    const rows = await all(c.env.DB, `
      SELECT p.*, m.body, m.sender_id, m.created_at AS message_created_at
      FROM wasl_pinned p JOIN messages m ON m.id = p.message_id
      WHERE p.room_id = ? ORDER BY p.pinned_at DESC`, c.req.param('id'))
    return c.json({ pinned: rows })
  })
  api.post('/wasl-plus/messages/:id/pin', async (c) => {
    const mid = c.req.param('id')
    const b = await c.req.json<{ room_id: string; user_id: number; unpin?: boolean }>()
    if (b.unpin) await run(c.env.DB, 'DELETE FROM wasl_pinned WHERE room_id = ? AND message_id = ?', b.room_id, mid)
    else await run(c.env.DB, 'INSERT OR IGNORE INTO wasl_pinned (room_id, message_id, pinned_by) VALUES (?, ?, ?)', b.room_id, mid, b.user_id)
    return c.json({ ok: true })
  })

  // ─── Message edit + history + view-once + read receipts ────────────────
  api.post('/wasl-plus/messages/:id/edit', async (c) => {
    const mid = c.req.param('id')
    const b = await c.req.json<{ body: string }>()
    const msg = await first<{ body: string }>(c.env.DB, 'SELECT body FROM messages WHERE id = ?', mid)
    if (!msg) return c.json({ error: 'not_found' }, 404)
    await run(c.env.DB, 'INSERT INTO wasl_message_edits (message_id, prev_body) VALUES (?, ?)', mid, msg.body)
    await run(c.env.DB, 'UPDATE messages SET body = ? WHERE id = ?', b.body, mid)
    await run(c.env.DB, `INSERT INTO wasl_message_meta (message_id, edited) VALUES (?, 1)
      ON CONFLICT(message_id) DO UPDATE SET edited = 1`, mid)
    return c.json({ ok: true })
  })
  api.get('/wasl-plus/messages/:id/edits', async (c) => {
    const rows = await all(c.env.DB, 'SELECT * FROM wasl_message_edits WHERE message_id = ? ORDER BY edited_at ASC', c.req.param('id'))
    return c.json({ edits: rows })
  })
  api.post('/wasl-plus/messages/:id/view-once', async (c) => {
    const mid = c.req.param('id')
    const b = await c.req.json<{ mark?: boolean; view?: boolean }>()
    if (b.mark) {
      await run(c.env.DB, `INSERT INTO wasl_message_meta (message_id, view_once) VALUES (?, 1)
        ON CONFLICT(message_id) DO UPDATE SET view_once = 1`, mid)
    }
    if (b.view) {
      await run(c.env.DB, `INSERT INTO wasl_message_meta (message_id, view_once, viewed, viewed_at) VALUES (?, 1, 1, CURRENT_TIMESTAMP)
        ON CONFLICT(message_id) DO UPDATE SET viewed = 1, viewed_at = CURRENT_TIMESTAMP`, mid)
    }
    const meta = await first(c.env.DB, 'SELECT * FROM wasl_message_meta WHERE message_id = ?', mid)
    return c.json({ ok: true, meta })
  })
  api.post('/wasl-plus/messages/:id/read-receipts', async (c) => {
    const mid = c.req.param('id')
    const b = await c.req.json<{ user_id: number }>()
    await run(c.env.DB, 'INSERT OR IGNORE INTO wasl_read_receipts (message_id, user_id) VALUES (?, ?)', mid, b.user_id)
    return c.json({ ok: true })
  })
  api.get('/wasl-plus/messages/:id/read-receipts', async (c) => {
    const rows = await all(c.env.DB, `
      SELECT r.*, u.handle, u.display_name FROM wasl_read_receipts r JOIN users u ON u.id = r.user_id
      WHERE r.message_id = ? ORDER BY r.read_at ASC`, c.req.param('id'))
    return c.json({ receipts: rows })
  })

  // ─── Screenshot-attempt logging ─────────────────────────────────────────
  api.post('/wasl-plus/screenshot-attempts', async (c) => {
    const b = await c.req.json<{ room_id?: string; message_id?: string; user_id: number }>()
    await run(c.env.DB, 'INSERT INTO wasl_screenshot_attempts (room_id, message_id, user_id) VALUES (?, ?, ?)',
      b.room_id ?? null, b.message_id ?? null, b.user_id)
    return c.json({ ok: true })
  })
  api.get('/wasl-plus/rooms/:id/screenshot-attempts', async (c) => {
    const rows = await all(c.env.DB, `
      SELECT s.*, u.handle, u.display_name FROM wasl_screenshot_attempts s JOIN users u ON u.id = s.user_id
      WHERE s.room_id = ? ORDER BY s.created_at DESC`, c.req.param('id'))
    return c.json({ attempts: rows })
  })

  // ─── Conversation state: archive / mute / settings / disappearing / invite / members / export / search ─
  api.get('/wasl-plus/rooms/:id/state', async (c) => {
    const uid = Number(c.req.query('user_id') ?? 0)
    const row = await first(c.env.DB, 'SELECT * FROM wasl_room_state WHERE room_id = ? AND user_id = ?', c.req.param('id'), uid)
    return c.json({ state: row ?? { room_id: c.req.param('id'), user_id: uid, archived: 0, muted: 0 } })
  })
  api.post('/wasl-plus/rooms/:id/archive', async (c) => {
    const roomId = c.req.param('id')
    const b = await c.req.json<{ user_id: number; archived?: boolean }>()
    await run(c.env.DB, `INSERT INTO wasl_room_state (room_id, user_id, archived) VALUES (?, ?, ?)
      ON CONFLICT(room_id, user_id) DO UPDATE SET archived = excluded.archived`, roomId, b.user_id, b.archived ? 1 : 0)
    return c.json({ ok: true })
  })
  api.post('/wasl-plus/rooms/:id/mute', async (c) => {
    const roomId = c.req.param('id')
    const b = await c.req.json<{ user_id: number; muted?: boolean; muted_until?: string }>()
    await run(c.env.DB, `INSERT INTO wasl_room_state (room_id, user_id, muted, muted_until) VALUES (?, ?, ?, ?)
      ON CONFLICT(room_id, user_id) DO UPDATE SET muted = excluded.muted, muted_until = excluded.muted_until`,
      roomId, b.user_id, b.muted ? 1 : 0, b.muted_until ?? null)
    return c.json({ ok: true })
  })
  api.post('/wasl-plus/chat-settings/:id', async (c) => {
    const roomId = c.req.param('id')
    const b = await c.req.json<{ user_id: number; wallpaper?: string; font_size?: string }>()
    await run(c.env.DB, `INSERT INTO wasl_room_state (room_id, user_id, wallpaper, font_size) VALUES (?, ?, ?, ?)
      ON CONFLICT(room_id, user_id) DO UPDATE SET wallpaper = COALESCE(excluded.wallpaper, wasl_room_state.wallpaper), font_size = COALESCE(excluded.font_size, wasl_room_state.font_size)`,
      roomId, b.user_id, b.wallpaper ?? null, b.font_size ?? null)
    return c.json({ ok: true })
  })
  api.get('/wasl-plus/rooms/:id/invite', async (c) => {
    const rows = await all(c.env.DB, 'SELECT * FROM wasl_room_invites WHERE room_id = ?', c.req.param('id'))
    return c.json({ invites: rows })
  })
  api.post('/wasl-plus/rooms/:id/invite', async (c) => {
    const roomId = c.req.param('id')
    const b = await c.req.json<{ user_id: number }>()
    const code = rid('inv').slice(0, 12)
    await run(c.env.DB, `INSERT INTO wasl_room_invites (code, room_id, created_by, expires_at) VALUES (?, ?, ?, datetime('now','+7 days'))`,
      code, roomId, b.user_id)
    return c.json({ ok: true, code, link: `cirkle://wasl/join/${code}` })
  })
  api.post('/wasl-plus/rooms/join', async (c) => {
    const b = await c.req.json<{ code: string; user_id: number }>()
    const inv = await first<{ room_id: string }>(c.env.DB, 'SELECT room_id FROM wasl_room_invites WHERE code = ?', b.code)
    if (!inv) return c.json({ error: 'invalid_code' }, 404)
    await run(c.env.DB, 'INSERT OR IGNORE INTO room_members (room_id, user_id) VALUES (?, ?)', inv.room_id, b.user_id)
    return c.json({ ok: true, room_id: inv.room_id })
  })
  api.get('/wasl-plus/rooms/:id/members', async (c) => {
    const rows = await all(c.env.DB, `
      SELECT rm.*, u.handle, u.display_name, u.verified FROM room_members rm JOIN users u ON u.id = rm.user_id
      WHERE rm.room_id = ?`, c.req.param('id'))
    return c.json({ members: rows })
  })
  api.get('/wasl-plus/rooms/:id/export', async (c) => {
    const roomId = c.req.param('id')
    const msgs = await all(c.env.DB, `
      SELECT m.*, u.handle, u.display_name FROM messages m JOIN users u ON u.id = m.sender_id
      WHERE m.room_id = ? ORDER BY m.created_at ASC`, roomId)
    return c.json({ room_id: roomId, exported_at: new Date().toISOString(), messages: msgs })
  })
  api.get('/wasl-plus/rooms/:id/search', async (c) => {
    const q = c.req.query('q') ?? ''
    const rows = await all(c.env.DB, `
      SELECT m.*, u.handle, u.display_name FROM messages m JOIN users u ON u.id = m.sender_id
      WHERE m.room_id = ? AND m.body LIKE ? ORDER BY m.created_at DESC LIMIT 50`, c.req.param('id'), `%${q}%`)
    return c.json({ results: rows })
  })
  api.get('/wasl-plus/disappearing/:room_id', async (c) => {
    const row = await first(c.env.DB, 'SELECT * FROM wasl_disappearing_settings WHERE room_id = ?', c.req.param('room_id'))
    return c.json({ settings: row ?? { room_id: c.req.param('room_id'), ttl_seconds: 0 } })
  })
  api.post('/wasl-plus/disappearing/:room_id', async (c) => {
    const roomId = c.req.param('room_id')
    const b = await c.req.json<{ ttl_seconds: number; user_id: number }>()
    await run(c.env.DB, `INSERT INTO wasl_disappearing_settings (room_id, ttl_seconds, set_by) VALUES (?, ?, ?)
      ON CONFLICT(room_id) DO UPDATE SET ttl_seconds = excluded.ttl_seconds, set_by = excluded.set_by, updated_at = CURRENT_TIMESTAMP`,
      roomId, b.ttl_seconds, b.user_id)
    return c.json({ ok: true })
  })

  // ─── Contacts + phone numbers ─────────────────────────────────────────
  api.get('/wasl-plus/contacts', async (c) => {
    const uid = Number(c.req.query('user_id') ?? 0)
    const rows = await all(c.env.DB, `
      SELECT ct.*, u.handle, u.display_name, u.verified FROM wasl_contacts ct LEFT JOIN users u ON u.id = ct.user_id
      WHERE ct.owner_id = ? ORDER BY ct.added_at DESC`, uid)
    return c.json({ contacts: rows })
  })
  api.post('/wasl-plus/contacts', async (c) => {
    const b = await c.req.json<{ owner_id: number; user_id?: number; nickname?: string; phone?: string; notes?: string }>()
    const r = await run(c.env.DB, `INSERT INTO wasl_contacts (owner_id, user_id, nickname, phone, notes) VALUES (?, ?, ?, ?, ?)`,
      b.owner_id, b.user_id ?? null, b.nickname ?? null, b.phone ?? null, b.notes ?? null)
    return c.json({ ok: true, id: r.meta?.last_row_id })
  })
  api.post('/wasl-plus/contacts/:id/delete', async (c) => {
    await run(c.env.DB, 'DELETE FROM wasl_contacts WHERE id = ?', c.req.param('id'))
    return c.json({ ok: true })
  })
  api.get('/wasl-plus/contacts/export', async (c) => {
    const uid = Number(c.req.query('user_id') ?? 0)
    const rows = await all(c.env.DB, 'SELECT * FROM wasl_contacts WHERE owner_id = ?', uid)
    return c.json({ contacts: rows, exported_at: new Date().toISOString() })
  })
  api.post('/wasl-plus/contacts/import', async (c) => {
    const b = await c.req.json<{ owner_id: number; contacts: { nickname?: string; phone?: string }[] }>()
    let imported = 0
    for (const ct of b.contacts ?? []) {
      const matched = ct.phone
        ? await first<{ id: number }>(c.env.DB, 'SELECT id FROM users WHERE email LIKE ?', `%${ct.phone.slice(-4)}%`)
        : null
      await run(c.env.DB, `INSERT OR IGNORE INTO wasl_contacts (owner_id, user_id, nickname, phone) VALUES (?, ?, ?, ?)`,
        b.owner_id, matched?.id ?? null, ct.nickname ?? null, ct.phone ?? null)
      imported++
    }
    return c.json({ ok: true, imported })
  })
  api.get('/wasl-plus/phone-numbers', async (c) => {
    const uid = Number(c.req.query('user_id') ?? 0)
    const rows = await all(c.env.DB, 'SELECT * FROM wasl_phone_numbers WHERE user_id = ?', uid)
    return c.json({ numbers: rows })
  })
  api.post('/wasl-plus/phone-numbers', async (c) => {
    const b = await c.req.json<{ user_id: number; number: string; label?: string }>()
    const r = await run(c.env.DB, `INSERT INTO wasl_phone_numbers (user_id, number, label) VALUES (?, ?, ?)`, b.user_id, b.number, b.label ?? null)
    return c.json({ ok: true, id: r.meta?.last_row_id })
  })
  api.post('/wasl-plus/phone-numbers/:id/activate', async (c) => {
    const num = await first<{ user_id: number }>(c.env.DB, 'SELECT user_id FROM wasl_phone_numbers WHERE id = ?', c.req.param('id'))
    if (!num) return c.json({ error: 'not_found' }, 404)
    await run(c.env.DB, 'UPDATE wasl_phone_numbers SET active = 0 WHERE user_id = ?', num.user_id)
    await run(c.env.DB, 'UPDATE wasl_phone_numbers SET active = 1 WHERE id = ?', c.req.param('id'))
    return c.json({ ok: true })
  })
  api.post('/wasl-plus/phone-numbers/:id/delete', async (c) => {
    await run(c.env.DB, 'DELETE FROM wasl_phone_numbers WHERE id = ?', c.req.param('id'))
    return c.json({ ok: true })
  })

  // ─── App lock ────────────────────────────────────────────────────────
  api.get('/wasl-plus/app-lock/:user_id', async (c) => {
    const row = await first(c.env.DB, 'SELECT user_id, enabled, method, updated_at FROM wasl_app_lock WHERE user_id = ?', c.req.param('user_id'))
    return c.json({ lock: row ?? { user_id: Number(c.req.param('user_id')), enabled: 0, method: 'pin' } })
  })
  api.post('/wasl-plus/app-lock/:user_id', async (c) => {
    const uid = Number(c.req.param('user_id'))
    const b = await c.req.json<{ enabled: boolean; pin?: string; method?: string }>()
    await run(c.env.DB, `INSERT INTO wasl_app_lock (user_id, enabled, pin_hash, method) VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET enabled = excluded.enabled, pin_hash = COALESCE(excluded.pin_hash, wasl_app_lock.pin_hash), method = excluded.method, updated_at = CURRENT_TIMESTAMP`,
      uid, b.enabled ? 1 : 0, b.pin ? String(b.pin) : null, b.method ?? 'pin')
    return c.json({ ok: true })
  })

  // ─── Link preview ────────────────────────────────────────────────────
  api.post('/wasl-plus/link-preview', async (c) => {
    const b = await c.req.json<{ url: string }>()
    const cached = await first(c.env.DB, 'SELECT * FROM wasl_link_previews WHERE url = ?', b.url)
    if (cached) return c.json({ preview: cached, cached: true })
    let title = b.url, description = '', image = '', site_name = ''
    try {
      const u = new URL(b.url)
      site_name = u.hostname.replace('www.', '')
      title = site_name.charAt(0).toUpperCase() + site_name.slice(1)
      description = `Link preview for ${b.url}`
    } catch { /* keep defaults */ }
    await run(c.env.DB, `INSERT INTO wasl_link_previews (url, title, description, image, site_name) VALUES (?, ?, ?, ?, ?)`,
      b.url, title, description, image, site_name)
    return c.json({ preview: { url: b.url, title, description, image, site_name }, cached: false })
  })

  // ─── Threads ──────────────────────────────────────────────────────────
  api.get('/wasl-plus/threads/:room_id', async (c) => {
    const rows = await all(c.env.DB, `
      SELECT t.*, m.body AS root_body, m.sender_id AS root_sender_id FROM wasl_threads t
      JOIN messages m ON m.id = t.root_message_id WHERE t.room_id = ? ORDER BY t.created_at DESC`, c.req.param('room_id'))
    return c.json({ threads: rows })
  })
  api.post('/wasl-plus/threads', async (c) => {
    const b = await c.req.json<{ room_id: string; root_message_id: string }>()
    const id = rid('thread')
    await run(c.env.DB, `INSERT INTO wasl_threads (id, room_id, root_message_id) VALUES (?, ?, ?)`, id, b.room_id, b.root_message_id)
    await run(c.env.DB, `INSERT INTO wasl_message_meta (message_id, thread_root_id) VALUES (?, ?)
      ON CONFLICT(message_id) DO UPDATE SET thread_root_id = excluded.thread_root_id`, b.root_message_id, b.root_message_id)
    return c.json({ ok: true, id })
  })
  api.get('/wasl-plus/threads/:id/messages', async (c) => {
    const thread = await first<{ room_id: string; root_message_id: string }>(c.env.DB, 'SELECT * FROM wasl_threads WHERE id = ?', c.req.param('id'))
    if (!thread) return c.json({ error: 'not_found' }, 404)
    const rows = await all(c.env.DB, `
      SELECT m.*, u.handle, u.display_name FROM messages m JOIN users u ON u.id = m.sender_id
      JOIN wasl_message_meta mm ON mm.message_id = m.id
      WHERE mm.thread_root_id = ? ORDER BY m.created_at ASC`, thread.root_message_id)
    return c.json({ thread, messages: rows })
  })
  api.post('/wasl-plus/threads/:id/messages', async (c) => {
    const thread = await first<{ room_id: string; root_message_id: string }>(c.env.DB, 'SELECT * FROM wasl_threads WHERE id = ?', c.req.param('id'))
    if (!thread) return c.json({ error: 'not_found' }, 404)
    const b = await c.req.json<{ sender_id: number; body: string }>()
    const mid = rid('m')
    await run(c.env.DB, 'INSERT INTO messages (id, room_id, sender_id, body, status, is_encrypted) VALUES (?, ?, ?, ?, 1, 1)',
      mid, thread.room_id, b.sender_id, b.body)
    await run(c.env.DB, 'INSERT INTO wasl_message_meta (message_id, thread_root_id) VALUES (?, ?)', mid, thread.root_message_id)
    await run(c.env.DB, 'UPDATE wasl_threads SET reply_count = reply_count + 1 WHERE id = ?', c.req.param('id'))
    return c.json({ ok: true, id: mid })
  })

  // ─── Polls ────────────────────────────────────────────────────────────
  api.get('/wasl-plus/polls/:room_id', async (c) => {
    const polls = await all<any>(c.env.DB, 'SELECT * FROM wasl_polls WHERE room_id = ? ORDER BY created_at DESC', c.req.param('room_id'))
    for (const p of polls) {
      const votes = await all<{ option_index: number; user_id: number }>(c.env.DB, 'SELECT option_index, user_id FROM wasl_poll_votes WHERE poll_id = ?', p.id)
      p.options = JSON.parse(p.options)
      p.votes = votes
    }
    return c.json({ polls })
  })
  api.post('/wasl-plus/polls', async (c) => {
    const b = await c.req.json<{ room_id: string; creator_id: number; question: string; options: string[]; multiple?: boolean }>()
    const id = rid('poll')
    await run(c.env.DB, `INSERT INTO wasl_polls (id, room_id, creator_id, question, options, multiple) VALUES (?, ?, ?, ?, ?, ?)`,
      id, b.room_id, b.creator_id, b.question, JSON.stringify(b.options), b.multiple ? 1 : 0)
    return c.json({ ok: true, id })
  })
  api.post('/wasl-plus/polls/:id/vote', async (c) => {
    const pid = c.req.param('id')
    const b = await c.req.json<{ user_id: number; option_index: number }>()
    const poll = await first<{ multiple: number }>(c.env.DB, 'SELECT multiple FROM wasl_polls WHERE id = ?', pid)
    if (!poll) return c.json({ error: 'not_found' }, 404)
    if (!poll.multiple) await run(c.env.DB, 'DELETE FROM wasl_poll_votes WHERE poll_id = ? AND user_id = ?', pid, b.user_id)
    await run(c.env.DB, 'INSERT OR IGNORE INTO wasl_poll_votes (poll_id, user_id, option_index) VALUES (?, ?, ?)', pid, b.user_id, b.option_index)
    return c.json({ ok: true })
  })

  // ─── Receipt split ──────────────────────────────────────────────────────
  api.get('/wasl-plus/receipt-split/:room_id', async (c) => {
    const rows = await all<any>(c.env.DB, 'SELECT * FROM wasl_receipt_splits WHERE room_id = ? ORDER BY created_at DESC', c.req.param('room_id'))
    for (const r of rows) r.participants = JSON.parse(r.participants)
    return c.json({ splits: rows })
  })
  api.post('/wasl-plus/receipt-split', async (c) => {
    const b = await c.req.json<{ room_id: string; creator_id: number; title: string; total_amount: number; currency?: string; participants: { user_id: number; share: number }[] }>()
    const id = rid('split')
    const participants = b.participants.map(p => ({ ...p, paid: false }))
    await run(c.env.DB, `INSERT INTO wasl_receipt_splits (id, room_id, creator_id, title, total_amount, currency, participants) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      id, b.room_id, b.creator_id, b.title, b.total_amount, b.currency ?? 'EGP', JSON.stringify(participants))
    return c.json({ ok: true, id })
  })
  api.post('/wasl-plus/receipt-split/:id/mark-paid', async (c) => {
    const sid = c.req.param('id')
    const b = await c.req.json<{ user_id: number }>()
    const split = await first<{ participants: string }>(c.env.DB, 'SELECT participants FROM wasl_receipt_splits WHERE id = ?', sid)
    if (!split) return c.json({ error: 'not_found' }, 404)
    const parts = JSON.parse(split.participants).map((p: any) => p.user_id === b.user_id ? { ...p, paid: true } : p)
    await run(c.env.DB, 'UPDATE wasl_receipt_splits SET participants = ? WHERE id = ?', JSON.stringify(parts), sid)
    return c.json({ ok: true, participants: parts })
  })

  // ─── Verify person ──────────────────────────────────────────────────────
  api.get('/wasl-plus/verify-person/:user_id', async (c) => {
    const row = await first(c.env.DB, 'SELECT * FROM wasl_verify_person WHERE user_id = ?', c.req.param('user_id'))
    return c.json({ status: row ?? { user_id: Number(c.req.param('user_id')), status: 'unverified' } })
  })
  api.post('/wasl-plus/verify-person', async (c) => {
    const b = await c.req.json<{ user_id: number; id_doc_ref?: string }>()
    await run(c.env.DB, `INSERT INTO wasl_verify_person (user_id, status, id_doc_ref, submitted_at) VALUES (?, 'pending', ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id) DO UPDATE SET status = 'pending', id_doc_ref = excluded.id_doc_ref, submitted_at = CURRENT_TIMESTAMP`,
      b.user_id, b.id_doc_ref ?? null)
    // Auto-approve for demo purposes after submission (simulates review)
    await run(c.env.DB, `UPDATE wasl_verify_person SET status = 'verified', verified_at = CURRENT_TIMESTAMP WHERE user_id = ?`, b.user_id)
    return c.json({ ok: true, status: 'verified' })
  })

  // ─── Business workspaces ─────────────────────────────────────────────
  api.get('/wasl-plus/business', async (c) => {
    const rows = await all(c.env.DB, `
      SELECT b.*, u.handle AS owner_handle, u.display_name AS owner_name,
        (SELECT COUNT(*) FROM wasl_business_members m WHERE m.business_id = b.id) AS member_count
      FROM wasl_businesses b JOIN users u ON u.id = b.owner_id ORDER BY b.created_at DESC`)
    return c.json({ businesses: rows })
  })
  api.post('/wasl-plus/business', async (c) => {
    const b = await c.req.json<{ owner_id: number; name: string; category?: string; description?: string }>()
    const id = rid('biz')
    await run(c.env.DB, `INSERT INTO wasl_businesses (id, owner_id, name, category, description) VALUES (?, ?, ?, ?, ?)`,
      id, b.owner_id, b.name, b.category ?? null, b.description ?? null)
    await run(c.env.DB, `INSERT OR IGNORE INTO wasl_business_members (business_id, user_id, role) VALUES (?, ?, 'owner')`, id, b.owner_id)
    return c.json({ ok: true, id })
  })
  api.get('/wasl-plus/business/search', async (c) => {
    const q = c.req.query('q') ?? ''
    const rows = await all(c.env.DB, `SELECT * FROM wasl_businesses WHERE name LIKE ? OR category LIKE ? LIMIT 30`, `%${q}%`, `%${q}%`)
    return c.json({ results: rows })
  })
  api.get('/wasl-plus/business/:id', async (c) => {
    const biz = await first(c.env.DB, 'SELECT * FROM wasl_businesses WHERE id = ?', c.req.param('id'))
    if (!biz) return c.json({ error: 'not_found' }, 404)
    return c.json({ business: biz })
  })
  api.get('/wasl-plus/business/:id/members', async (c) => {
    const rows = await all(c.env.DB, `
      SELECT m.*, u.handle, u.display_name FROM wasl_business_members m JOIN users u ON u.id = m.user_id
      WHERE m.business_id = ?`, c.req.param('id'))
    return c.json({ members: rows })
  })
  api.post('/wasl-plus/business/:id/members', async (c) => {
    const b = await c.req.json<{ user_id: number; role?: string }>()
    await run(c.env.DB, `INSERT OR IGNORE INTO wasl_business_members (business_id, user_id, role) VALUES (?, ?, ?)`,
      c.req.param('id'), b.user_id, b.role ?? 'member')
    return c.json({ ok: true })
  })
  api.get('/wasl-plus/business/:id/groups', async (c) => {
    const rows = await all(c.env.DB, 'SELECT * FROM wasl_business_groups WHERE business_id = ?', c.req.param('id'))
    return c.json({ groups: rows })
  })
  api.post('/wasl-plus/business/:id/groups', async (c) => {
    const b = await c.req.json<{ name: string; room_id?: string }>()
    const r = await run(c.env.DB, `INSERT INTO wasl_business_groups (business_id, name, room_id) VALUES (?, ?, ?)`,
      c.req.param('id'), b.name, b.room_id ?? null)
    return c.json({ ok: true, id: r.meta?.last_row_id })
  })

  // ─── Service providers ───────────────────────────────────────────────
  api.get('/wasl-plus/service-providers', async (c) => {
    const rows = await all(c.env.DB, 'SELECT * FROM wasl_service_providers ORDER BY created_at DESC')
    return c.json({ providers: rows })
  })
  api.post('/wasl-plus/service-providers/register', async (c) => {
    const b = await c.req.json<{ owner_id: number; name: string; category?: string; description?: string }>()
    const id = rid('sp')
    await run(c.env.DB, `INSERT INTO wasl_service_providers (id, owner_id, name, category, description) VALUES (?, ?, ?, ?, ?)`,
      id, b.owner_id, b.name, b.category ?? null, b.description ?? null)
    return c.json({ ok: true, id })
  })
  api.get('/wasl-plus/service-providers/announcements', async (c) => {
    const providerId = c.req.query('provider_id')
    const rows = providerId
      ? await all(c.env.DB, 'SELECT * FROM wasl_sp_announcements WHERE provider_id = ? ORDER BY created_at DESC', providerId)
      : await all(c.env.DB, 'SELECT * FROM wasl_sp_announcements ORDER BY created_at DESC LIMIT 50')
    return c.json({ announcements: rows })
  })
  api.post('/wasl-plus/service-providers/broadcast', async (c) => {
    const b = await c.req.json<{ provider_id: string; title: string; body: string }>()
    const r = await run(c.env.DB, `INSERT INTO wasl_sp_announcements (provider_id, title, body) VALUES (?, ?, ?)`, b.provider_id, b.title, b.body)
    return c.json({ ok: true, id: r.meta?.last_row_id })
  })
  api.post('/wasl-plus/service-providers/announcements/:id/read', async (c) => {
    const b = await c.req.json<{ user_id: number }>()
    await run(c.env.DB, `INSERT INTO wasl_sp_announcement_state (announcement_id, user_id, read) VALUES (?, ?, 1)
      ON CONFLICT(announcement_id, user_id) DO UPDATE SET read = 1`, c.req.param('id'), b.user_id)
    return c.json({ ok: true })
  })
  api.post('/wasl-plus/service-providers/announcements/:id/dismiss', async (c) => {
    const b = await c.req.json<{ user_id: number }>()
    await run(c.env.DB, `INSERT INTO wasl_sp_announcement_state (announcement_id, user_id, dismissed) VALUES (?, ?, 1)
      ON CONFLICT(announcement_id, user_id) DO UPDATE SET dismissed = 1`, c.req.param('id'), b.user_id)
    return c.json({ ok: true })
  })

  // ─── Users search ────────────────────────────────────────────────────
  api.get('/wasl-plus/users/search', async (c) => {
    const q = c.req.query('q') ?? ''
    const rows = await all(c.env.DB, `
      SELECT id, handle, display_name, verified, city, country FROM users
      WHERE handle LIKE ? OR display_name LIKE ? LIMIT 20`, `%${q}%`, `%${q}%`)
    return c.json({ users: rows })
  })

  // ─── AI helpers (reusing src/server/ai.ts) ────────────────────────────
  api.post('/wasl-plus/ai/smart-reply', async (c) => {
    const b = await c.req.json<{ message: string; context?: string; room_id?: string }>()
    const suggestions = await generateSmartReplies(c.env, b.message, b.context)
    await run(c.env.DB, `INSERT INTO wasl_ai_cache (kind, room_id, output) VALUES ('smart-reply', ?, ?)`, b.room_id ?? null, JSON.stringify(suggestions))
    return c.json({ suggestions })
  })
  api.post('/wasl-plus/ai/summary', async (c) => {
    const b = await c.req.json<{ room_id: string; messages?: { display_name: string; body: string }[] }>()
    let msgs = b.messages
    if (!msgs) {
      msgs = await all(c.env.DB, `
        SELECT u.display_name, m.body FROM messages m JOIN users u ON u.id = m.sender_id
        WHERE m.room_id = ? ORDER BY m.created_at DESC LIMIT 40`, b.room_id)
      msgs.reverse()
    }
    const transcript = msgs.map(m => `${m.display_name}: ${m.body}`).join('\n')
    const sysMsg: SageMsg[] = [
      { role: 'system', content: 'Summarize this chat conversation in 2-4 concise bullet points. Be neutral and factual.' },
      { role: 'user', content: transcript || 'No messages yet.' },
    ]
    const res = await sageChat(c.env, sysMsg, { max_tokens: 220, temperature: 0.3 })
    const summary = res.ok ? res.text : 'Not enough context to summarize yet.'
    await run(c.env.DB, `INSERT INTO wasl_ai_cache (kind, room_id, output) VALUES ('summary', ?, ?)`, b.room_id, summary)
    return c.json({ summary })
  })
  api.post('/wasl-plus/ai/tone', async (c) => {
    const b = await c.req.json<{ text: string; target_tone?: string }>()
    const sysMsg: SageMsg[] = [
      { role: 'system', content: `Rewrite the user's message in a ${b.target_tone ?? 'friendly and professional'} tone, preserving meaning and length. Return only the rewritten text.` },
      { role: 'user', content: b.text },
    ]
    const res = await sageChat(c.env, sysMsg, { max_tokens: 200, temperature: 0.5 })
    return c.json({ rewritten: res.ok ? res.text : b.text })
  })
  api.post('/wasl-plus/ai/action-items', async (c) => {
    const b = await c.req.json<{ room_id: string; messages?: { display_name: string; body: string }[] }>()
    let msgs = b.messages
    if (!msgs) {
      msgs = await all(c.env.DB, `
        SELECT u.display_name, m.body FROM messages m JOIN users u ON u.id = m.sender_id
        WHERE m.room_id = ? ORDER BY m.created_at DESC LIMIT 40`, b.room_id)
      msgs.reverse()
    }
    const transcript = msgs.map(m => `${m.display_name}: ${m.body}`).join('\n')
    const sysMsg: SageMsg[] = [
      { role: 'system', content: 'Extract action items / to-dos from this chat. Return ONLY a JSON array of short strings. If none, return [].' },
      { role: 'user', content: transcript || 'No messages.' },
    ]
    const res = await sageChat(c.env, sysMsg, { json: true, max_tokens: 200, temperature: 0.2 })
    let items: string[] = []
    if (res.ok) { try { items = JSON.parse(res.text) } catch { items = [] } }
    await run(c.env.DB, `INSERT INTO wasl_ai_cache (kind, room_id, output) VALUES ('action-items', ?, ?)`, b.room_id, JSON.stringify(items))
    return c.json({ items })
  })
}
