// Cirkle — Mashahd feature parity routes ported from the standalone Mashahd app.
// Mounted from src/server/api.ts via registerMashahdPlus(api).
import type { Hono } from 'hono'
import type { Env } from './db'
import { all, first, run } from './db'
import { groqChat, googleGenaiChat, SAGE_SYSTEM } from './ai'

function newId(prefix: string) {
  return prefix + Date.now().toString(36) + Math.floor(Math.random() * 10000).toString(36)
}

async function aiText(env: Env, prompt: string, system = SAGE_SYSTEM): Promise<string> {
  const g = await groqChat(env.GROQ_API_KEY, [{ role: 'system', content: system }, { role: 'user', content: prompt }])
  if (g.ok) return g.text
  const gem = await googleGenaiChat(env.GEMINI_API_KEY, [{ role: 'system', content: system }, { role: 'user', content: prompt }])
  if (gem.ok) return gem.text
  return ''
}

export function registerMashahdPlus(api: Hono<{ Bindings: Env }>) {
  // ══════════════════════════ Playlists ══════════════════════════
  api.get('/mashahd/playlists', async (c) => {
    const owner = c.req.query('owner_id') || '1'
    const rows = await all(c.env.DB, `SELECT * FROM playlists WHERE owner_id = ? ORDER BY updated_at DESC`, owner)
    return c.json({ playlists: rows })
  })

  api.post('/mashahd/playlists', async (c) => {
    const b = await c.req.json<{ owner_id: number; title: string; description?: string; visibility?: string; folder_id?: string }>()
    const id = newId('pl')
    await run(c.env.DB, `INSERT INTO playlists (id, owner_id, folder_id, title, description, visibility) VALUES (?,?,?,?,?,?)`,
      id, b.owner_id, b.folder_id ?? null, b.title, b.description ?? '', b.visibility ?? 'public')
    return c.json({ ok: true, id })
  })

  api.get('/mashahd/playlists/:id', async (c) => {
    const id = c.req.param('id')
    const pl = await first(c.env.DB, `SELECT * FROM playlists WHERE id = ?`, id)
    if (!pl) return c.json({ error: 'not_found' }, 404)
    const items = await all(c.env.DB, `
      SELECT pi.*, v.title AS video_title, v.thumbnail_cid, v.duration_sec
      FROM playlist_items pi JOIN videos v ON v.id = CAST(pi.video_id AS INTEGER)
      WHERE pi.playlist_id = ? ORDER BY pi.position ASC`, id)
    return c.json({ playlist: pl, items })
  })

  api.post('/mashahd/playlists/:id/items', async (c) => {
    const id = c.req.param('id')
    const b = await c.req.json<{ video_id: string }>()
    const pos = await first<{ n: number }>(c.env.DB, `SELECT COUNT(*) AS n FROM playlist_items WHERE playlist_id = ?`, id)
    await run(c.env.DB, `INSERT INTO playlist_items (id, playlist_id, video_id, position) VALUES (?,?,?,?)`,
      newId('pli'), id, b.video_id, pos?.n ?? 0)
    await run(c.env.DB, `UPDATE playlists SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`, id)
    return c.json({ ok: true })
  })

  api.get('/mashahd/playlist-folders', async (c) => {
    const owner = c.req.query('owner_id') || '1'
    const rows = await all(c.env.DB, `SELECT * FROM playlist_folders WHERE owner_id = ?`, owner)
    return c.json({ folders: rows })
  })

  api.post('/mashahd/playlist-folders', async (c) => {
    const b = await c.req.json<{ owner_id: number; name: string }>()
    const id = newId('plf')
    await run(c.env.DB, `INSERT INTO playlist_folders (id, owner_id, name) VALUES (?,?,?)`, id, b.owner_id, b.name)
    return c.json({ ok: true, id })
  })

  api.get('/mashahd/smart-playlists', async (c) => {
    const owner = c.req.query('owner_id') || '1'
    const rows = await all(c.env.DB, `SELECT * FROM smart_playlists WHERE owner_id = ?`, owner)
    return c.json({ smart_playlists: rows })
  })

  api.post('/mashahd/smart-playlists', async (c) => {
    const b = await c.req.json<{ owner_id: number; title: string; rules: any }>()
    const id = newId('spl')
    await run(c.env.DB, `INSERT INTO smart_playlists (id, owner_id, title, rules_json) VALUES (?,?,?,?)`,
      id, b.owner_id, b.title, JSON.stringify(b.rules ?? {}))
    return c.json({ ok: true, id })
  })

  api.get('/mashahd/smart-playlists/:id/resolve', async (c) => {
    const id = c.req.param('id')
    const sp = await first<any>(c.env.DB, `SELECT * FROM smart_playlists WHERE id = ?`, id)
    if (!sp) return c.json({ error: 'not_found' }, 404)
    let rules: any = {}
    try { rules = JSON.parse(sp.rules_json) } catch { /* ignore */ }
    let sql = `SELECT v.*, u.handle, u.display_name FROM videos v JOIN users u ON u.id = v.uploader_id WHERE 1=1`
    const params: any[] = []
    if (rules.city) { sql += ` AND v.city = ?`; params.push(rules.city) }
    if (rules.min_views) { sql += ` AND v.views >= ?`; params.push(rules.min_views) }
    sql += ` ORDER BY ${rules.sort === 'views' ? 'v.views' : 'v.published_at'} DESC LIMIT 25`
    const videos = await all(c.env.DB, sql, ...params)
    return c.json({ smart_playlist: sp, videos })
  })

  // ══════════════════════════ Clips ══════════════════════════
  api.get('/mashahd/clips', async (c) => {
    const videoId = c.req.query('video_id')
    const sql = videoId
      ? `SELECT * FROM clips WHERE video_id = ? ORDER BY created_at DESC`
      : `SELECT * FROM clips ORDER BY created_at DESC LIMIT 30`
    const rows = videoId ? await all(c.env.DB, sql, videoId) : await all(c.env.DB, sql)
    return c.json({ clips: rows })
  })

  api.post('/mashahd/clips', async (c) => {
    const b = await c.req.json<{ video_id: string; creator_id: number; title: string; start_sec: number; end_sec: number }>()
    const id = newId('clip')
    await run(c.env.DB, `INSERT INTO clips (id, video_id, creator_id, title, start_sec, end_sec) VALUES (?,?,?,?,?,?)`,
      id, b.video_id, b.creator_id, b.title, b.start_sec, b.end_sec)
    return c.json({ ok: true, id })
  })

  api.get('/mashahd/clips/:id', async (c) => {
    const row = await first(c.env.DB, `SELECT * FROM clips WHERE id = ?`, c.req.param('id'))
    if (!row) return c.json({ error: 'not_found' }, 404)
    await run(c.env.DB, `UPDATE clips SET views = views + 1 WHERE id = ?`, c.req.param('id'))
    return c.json({ clip: row })
  })

  // ══════════════════════════ Continue watching ══════════════════════════
  api.get('/mashahd/continue-watching', async (c) => {
    const uid = c.req.query('user_id') || '1'
    const rows = await all(c.env.DB, `
      SELECT cw.*, v.title, v.thumbnail_cid, v.duration_sec
      FROM continue_watching cw JOIN videos v ON v.id = CAST(cw.video_id AS INTEGER)
      WHERE cw.user_id = ? AND cw.completed = 0 ORDER BY cw.updated_at DESC LIMIT 20`, uid)
    return c.json({ continue_watching: rows })
  })

  api.post('/mashahd/continue-watching', async (c) => {
    const b = await c.req.json<{ user_id: number; video_id: string; position_sec: number; completed?: boolean }>()
    await run(c.env.DB, `
      INSERT INTO continue_watching (user_id, video_id, position_sec, completed) VALUES (?,?,?,?)
      ON CONFLICT(user_id, video_id) DO UPDATE SET position_sec = excluded.position_sec, completed = excluded.completed, updated_at = CURRENT_TIMESTAMP`,
      b.user_id, b.video_id, b.position_sec, b.completed ? 1 : 0)
    return c.json({ ok: true })
  })

  // ══════════════════════════ Feeds ══════════════════════════
  api.get('/mashahd/feed/for-you', async (c) => {
    const uid = c.req.query('user_id') || '1'
    const profile = await first<any>(c.env.DB, `SELECT * FROM interest_profiles WHERE user_id = ?`, uid)
    const videos = await all(c.env.DB, `
      SELECT v.*, u.handle, u.display_name, u.verified FROM videos v JOIN users u ON u.id = v.uploader_id
      ORDER BY v.views DESC, v.published_at DESC LIMIT 20`)
    return c.json({ videos, interest_profile: profile ?? null })
  })

  api.get('/mashahd/feed/discovery', async (c) => {
    const videos = await all(c.env.DB, `
      SELECT v.*, u.handle, u.display_name FROM videos v JOIN users u ON u.id = v.uploader_id
      ORDER BY RANDOM() LIMIT 15`)
    return c.json({ videos })
  })

  api.get('/mashahd/feed/diversity', async (c) => {
    const videos = await all(c.env.DB, `
      SELECT v.*, u.handle, u.display_name, u.country FROM videos v JOIN users u ON u.id = v.uploader_id
      GROUP BY u.country ORDER BY v.published_at DESC LIMIT 15`)
    return c.json({ videos })
  })

  // ══════════════════════════ Interest profiles / recs ══════════════════════════
  api.get('/mashahd/interest-profiles', async (c) => {
    const uid = c.req.query('user_id') || '1'
    let row = await first(c.env.DB, `SELECT * FROM interest_profiles WHERE user_id = ?`, uid)
    if (!row) {
      await run(c.env.DB, `INSERT OR IGNORE INTO interest_profiles (user_id) VALUES (?)`, uid)
      row = await first(c.env.DB, `SELECT * FROM interest_profiles WHERE user_id = ?`, uid)
    }
    return c.json({ interest_profile: row })
  })

  api.post('/mashahd/recommendation-feedback', async (c) => {
    const b = await c.req.json<{ user_id: number; video_id: string; reason: string; note?: string }>()
    await run(c.env.DB, `
      INSERT INTO recommendation_feedback (user_id, video_id, reason, note) VALUES (?,?,?,?)
      ON CONFLICT(user_id, video_id) DO UPDATE SET reason = excluded.reason, note = excluded.note`,
      b.user_id, b.video_id, b.reason, b.note ?? '')
    await run(c.env.DB, `INSERT INTO recommendation_changelog (user_id, change_type, detail) VALUES (?, 'feedback', ?)`,
      b.user_id, `${b.reason} on video ${b.video_id}`)
    return c.json({ ok: true })
  })

  api.get('/mashahd/recommendation-changelog', async (c) => {
    const uid = c.req.query('user_id') || '1'
    const rows = await all(c.env.DB, `SELECT * FROM recommendation_changelog WHERE user_id = ? ORDER BY created_at DESC LIMIT 30`, uid)
    return c.json({ changelog: rows })
  })

  api.post('/mashahd/reset-recommendations', async (c) => {
    const b = await c.req.json<{ user_id: number }>()
    await run(c.env.DB, `DELETE FROM recommendation_feedback WHERE user_id = ?`, b.user_id)
    await run(c.env.DB, `UPDATE interest_profiles SET categories_json = '{}', updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`, b.user_id)
    await run(c.env.DB, `INSERT INTO recommendation_changelog (user_id, change_type, detail) VALUES (?, 'reset', 'User reset recommendations')`, b.user_id)
    return c.json({ ok: true })
  })

  // ══════════════════════════ Blocks ══════════════════════════
  api.get('/mashahd/blocks', async (c) => {
    const uid = c.req.query('user_id') || '1'
    const rows = await all(c.env.DB, `SELECT * FROM user_blocks WHERE user_id = ?`, uid)
    return c.json({ blocks: rows })
  })

  api.post('/mashahd/blocks', async (c) => {
    const b = await c.req.json<{ user_id: number; block_type: string; block_value: string }>()
    await run(c.env.DB, `INSERT OR IGNORE INTO user_blocks (user_id, block_type, block_value) VALUES (?,?,?)`,
      b.user_id, b.block_type, b.block_value)
    return c.json({ ok: true })
  })

  api.post('/mashahd/blocks/delete', async (c) => {
    const b = await c.req.json<{ user_id: number; block_type: string; block_value: string }>()
    await run(c.env.DB, `DELETE FROM user_blocks WHERE user_id = ? AND block_type = ? AND block_value = ?`,
      b.user_id, b.block_type, b.block_value)
    return c.json({ ok: true })
  })

  // ══════════════════════════ Preferences ══════════════════════════
  api.get('/mashahd/preferences', async (c) => {
    const uid = c.req.query('user_id') || '1'
    let row = await first(c.env.DB, `SELECT * FROM watch_preferences WHERE user_id = ?`, uid)
    if (!row) { await run(c.env.DB, `INSERT OR IGNORE INTO watch_preferences (user_id) VALUES (?)`, uid); row = await first(c.env.DB, `SELECT * FROM watch_preferences WHERE user_id = ?`, uid) }
    return c.json({ preferences: row })
  })

  api.post('/mashahd/preferences', async (c) => {
    const b = await c.req.json<any>()
    await run(c.env.DB, `
      INSERT INTO watch_preferences (user_id, preferred_quality, preferred_speed, autoplay_next, disable_shorts, home_mode, reduced_motion)
      VALUES (?,?,?,?,?,?,?)
      ON CONFLICT(user_id) DO UPDATE SET preferred_quality=excluded.preferred_quality, preferred_speed=excluded.preferred_speed,
        autoplay_next=excluded.autoplay_next, disable_shorts=excluded.disable_shorts, home_mode=excluded.home_mode,
        reduced_motion=excluded.reduced_motion, updated_at=CURRENT_TIMESTAMP`,
      b.user_id, b.preferred_quality ?? 'auto', b.preferred_speed ?? 1, b.autoplay_next ? 1 : 0,
      b.disable_shorts ? 1 : 0, b.home_mode ?? 'smart', b.reduced_motion ? 1 : 0)
    return c.json({ ok: true })
  })

  api.get('/mashahd/notification-preferences', async (c) => {
    const uid = c.req.query('user_id') || '1'
    let row = await first(c.env.DB, `SELECT * FROM notification_preferences_mashahd WHERE user_id = ?`, uid)
    if (!row) { await run(c.env.DB, `INSERT OR IGNORE INTO notification_preferences_mashahd (user_id) VALUES (?)`, uid); row = await first(c.env.DB, `SELECT * FROM notification_preferences_mashahd WHERE user_id = ?`, uid) }
    return c.json({ notification_preferences: row })
  })

  api.post('/mashahd/notification-preferences', async (c) => {
    const b = await c.req.json<any>()
    await run(c.env.DB, `
      INSERT INTO notification_preferences_mashahd (user_id, new_videos, comments, subscribers, tips, mentions, email_enabled, push_enabled)
      VALUES (?,?,?,?,?,?,?,?)
      ON CONFLICT(user_id) DO UPDATE SET new_videos=excluded.new_videos, comments=excluded.comments, subscribers=excluded.subscribers,
        tips=excluded.tips, mentions=excluded.mentions, email_enabled=excluded.email_enabled, push_enabled=excluded.push_enabled, updated_at=CURRENT_TIMESTAMP`,
      b.user_id, b.new_videos ? 1 : 0, b.comments ? 1 : 0, b.subscribers ? 1 : 0, b.tips ? 1 : 0, b.mentions ? 1 : 0,
      b.email_enabled ? 1 : 0, b.push_enabled ? 1 : 0)
    return c.json({ ok: true })
  })

  // ══════════════════════════ Premium ══════════════════════════
  api.get('/mashahd/premium', async (c) => {
    const tiers = await all(c.env.DB, `SELECT * FROM premium_tiers`)
    const uid = c.req.query('user_id')
    const sub = uid ? await first(c.env.DB, `SELECT * FROM premium_subscriptions WHERE user_id = ? ORDER BY started_at DESC LIMIT 1`, uid) : null
    return c.json({ tiers, subscription: sub })
  })

  api.post('/mashahd/premium', async (c) => {
    const b = await c.req.json<{ user_id: number; tier_id: string }>()
    await run(c.env.DB, `INSERT INTO premium_subscriptions (user_id, tier_id) VALUES (?,?)`, b.user_id, b.tier_id)
    return c.json({ ok: true })
  })

  // ══════════════════════════ Sessions / catalog / analytics ══════════════════════════
  api.get('/mashahd/sessions', async (c) => {
    const uid = c.req.query('user_id') || '1'
    const rows = await all(c.env.DB, `SELECT * FROM mashahd_sessions WHERE user_id = ? ORDER BY started_at DESC LIMIT 20`, uid)
    return c.json({ sessions: rows })
  })

  api.post('/mashahd/sessions', async (c) => {
    const b = await c.req.json<{ user_id: number; video_id?: string; device?: string }>()
    const id = newId('sess')
    await run(c.env.DB, `INSERT INTO mashahd_sessions (id, user_id, video_id, device) VALUES (?,?,?,?)`,
      id, b.user_id, b.video_id ?? null, b.device ?? 'web')
    return c.json({ ok: true, id })
  })

  api.get('/mashahd/catalog', async (c) => {
    const category = c.req.query('category')
    const lang = c.req.query('language')
    let sql = `SELECT v.*, u.handle, u.display_name, c.name AS channel_name FROM videos v
      JOIN users u ON u.id = v.uploader_id LEFT JOIN channels c ON c.owner_id = v.uploader_id WHERE 1=1`
    const params: any[] = []
    if (category) { sql += ` AND v.city = ?`; params.push(category) }
    if (lang) { sql += ` AND v.language = ?`; params.push(lang) }
    sql += ` ORDER BY v.published_at DESC LIMIT 50`
    const rows = await all(c.env.DB, sql, ...params)
    return c.json({ catalog: rows })
  })

  api.get('/mashahd/analytics', async (c) => {
    const uid = c.req.query('user_id') || '1'
    const totalViews = await first<{ n: number }>(c.env.DB, `
      SELECT COALESCE(SUM(v.views),0) AS n FROM videos v WHERE v.uploader_id = ?`, uid)
    const totalLikes = await first<{ n: number }>(c.env.DB, `
      SELECT COALESCE(SUM(v.likes),0) AS n FROM videos v WHERE v.uploader_id = ?`, uid)
    const videoCount = await first<{ n: number }>(c.env.DB, `SELECT COUNT(*) AS n FROM videos WHERE uploader_id = ?`, uid)
    return c.json({ analytics: { total_views: totalViews?.n ?? 0, total_likes: totalLikes?.n ?? 0, video_count: videoCount?.n ?? 0 } })
  })

  // ══════════════════════════ Support / transparency / data export ══════════════════════════
  api.get('/mashahd/support', async (c) => {
    const uid = c.req.query('user_id') || '1'
    const rows = await all(c.env.DB, `SELECT * FROM support_tickets WHERE user_id = ? ORDER BY created_at DESC`, uid)
    return c.json({ tickets: rows })
  })

  api.post('/mashahd/support', async (c) => {
    const b = await c.req.json<{ user_id: number; subject: string; body: string }>()
    await run(c.env.DB, `INSERT INTO support_tickets (user_id, subject, body) VALUES (?,?,?)`, b.user_id, b.subject, b.body)
    return c.json({ ok: true })
  })

  api.get('/mashahd/decisions', async (c) => {
    const rows = await all(c.env.DB, `SELECT * FROM transparency_decisions ORDER BY created_at DESC LIMIT 30`)
    return c.json({ decisions: rows })
  })

  api.post('/mashahd/data-export', async (c) => {
    const b = await c.req.json<{ user_id: number }>()
    await run(c.env.DB, `INSERT INTO data_export_requests (user_id, status, download_url) VALUES (?, 'ready', ?)`,
      b.user_id, `/exports/mashahd_user_${b.user_id}.json`)
    return c.json({ ok: true })
  })

  api.get('/mashahd/data-export', async (c) => {
    const uid = c.req.query('user_id') || '1'
    const rows = await all(c.env.DB, `SELECT * FROM data_export_requests WHERE user_id = ? ORDER BY created_at DESC`, uid)
    return c.json({ requests: rows })
  })

  // ══════════════════════════ Sync / user-state ══════════════════════════
  api.get('/mashahd/user-state', async (c) => {
    const uid = c.req.query('user_id') || '1'
    const cw = await all(c.env.DB, `SELECT video_id FROM continue_watching WHERE user_id = ?`, uid)
    const prefs = await first(c.env.DB, `SELECT * FROM watch_preferences WHERE user_id = ?`, uid)
    const blocks = await all(c.env.DB, `SELECT * FROM user_blocks WHERE user_id = ?`, uid)
    return c.json({ user_state: { continue_watching: cw, preferences: prefs, blocks } })
  })

  api.post('/mashahd/sync', async (c) => {
    const b = await c.req.json<{ user_id: number }>().catch(() => ({ user_id: 1 }))
    return c.json({ ok: true, synced_at: new Date().toISOString(), user_id: b.user_id })
  })

  // ══════════════════════════ Video extras ══════════════════════════
  api.get('/mashahd/videos/:id/chapters', async (c) => {
    const rows = await all(c.env.DB, `SELECT * FROM video_chapters WHERE video_id = ? ORDER BY start_sec ASC`, c.req.param('id'))
    return c.json({ chapters: rows })
  })

  api.post('/mashahd/videos/:id/chapters', async (c) => {
    const id = c.req.param('id')
    const b = await c.req.json<{ title: string; start_sec: number }>()
    await run(c.env.DB, `INSERT INTO video_chapters (video_id, title, start_sec) VALUES (?,?,?)`, id, b.title, b.start_sec)
    return c.json({ ok: true })
  })

  api.get('/mashahd/videos/:id/polls', async (c) => {
    const rows = await all(c.env.DB, `SELECT * FROM video_polls WHERE video_id = ? ORDER BY created_at DESC`, c.req.param('id'))
    const withVotes = await Promise.all(rows.map(async (p: any) => {
      const votes = await all(c.env.DB, `SELECT option_idx, COUNT(*) AS n FROM video_poll_votes WHERE poll_id = ? GROUP BY option_idx`, p.id)
      return { ...p, options: JSON.parse(p.options_json || '[]'), votes }
    }))
    return c.json({ polls: withVotes })
  })

  api.post('/mashahd/videos/:id/polls', async (c) => {
    const id = c.req.param('id')
    const b = await c.req.json<{ question: string; options: string[] }>()
    const pollId = newId('poll')
    await run(c.env.DB, `INSERT INTO video_polls (id, video_id, question, options_json) VALUES (?,?,?,?)`,
      pollId, id, b.question, JSON.stringify(b.options ?? []))
    return c.json({ ok: true, id: pollId })
  })

  api.post('/mashahd/polls/:id/vote', async (c) => {
    const pollId = c.req.param('id')
    const b = await c.req.json<{ user_id: number; option_idx: number }>()
    await run(c.env.DB, `INSERT OR REPLACE INTO video_poll_votes (poll_id, user_id, option_idx) VALUES (?,?,?)`,
      pollId, b.user_id, b.option_idx)
    return c.json({ ok: true })
  })

  api.get('/mashahd/videos/:id/qa', async (c) => {
    const rows = await all(c.env.DB, `SELECT * FROM video_qa WHERE video_id = ? ORDER BY created_at DESC`, c.req.param('id'))
    return c.json({ qa: rows })
  })

  api.post('/mashahd/videos/:id/qa', async (c) => {
    const id = c.req.param('id')
    const b = await c.req.json<{ user_id: number; question: string }>()
    await run(c.env.DB, `INSERT INTO video_qa (video_id, user_id, question) VALUES (?,?,?)`, id, b.user_id, b.question)
    return c.json({ ok: true })
  })

  api.post('/mashahd/qa/:id/answer', async (c) => {
    const b = await c.req.json<{ answer: string; answered_by: number }>()
    await run(c.env.DB, `UPDATE video_qa SET answer = ?, answered_by = ? WHERE id = ?`, b.answer, b.answered_by, c.req.param('id'))
    return c.json({ ok: true })
  })

  api.get('/mashahd/videos/:id/corrections', async (c) => {
    const rows = await all(c.env.DB, `SELECT * FROM video_corrections WHERE video_id = ? ORDER BY created_at DESC`, c.req.param('id'))
    return c.json({ corrections: rows })
  })

  api.post('/mashahd/videos/:id/corrections', async (c) => {
    const id = c.req.param('id')
    const b = await c.req.json<{ user_id: number; text: string }>()
    await run(c.env.DB, `INSERT INTO video_corrections (video_id, user_id, text) VALUES (?,?,?)`, id, b.user_id, b.text)
    return c.json({ ok: true })
  })

  api.get('/mashahd/videos/:id/context', async (c) => {
    const id = c.req.param('id')
    const relationships = await all(c.env.DB, `SELECT * FROM video_relationships WHERE video_id = ?`, id)
    const corrections = await all(c.env.DB, `SELECT * FROM video_corrections WHERE video_id = ? AND status = 'approved'`, id)
    const quality = await first(c.env.DB, `SELECT * FROM video_quality_signals WHERE video_id = ?`, id)
    const disclosures = await all(c.env.DB, `SELECT * FROM ad_disclosures WHERE video_id = ?`, id)
    return c.json({ context: { relationships, corrections, quality, disclosures } })
  })

  api.get('/mashahd/videos/:id/relationships', async (c) => {
    const rows = await all(c.env.DB, `
      SELECT r.*, v.title, v.thumbnail_cid FROM video_relationships r
      JOIN videos v ON v.id = CAST(r.related_video_id AS INTEGER) WHERE r.video_id = ?`, c.req.param('id'))
    return c.json({ relationships: rows })
  })

  api.get('/mashahd/videos/:id/quality-signals', async (c) => {
    const row = await first(c.env.DB, `SELECT * FROM video_quality_signals WHERE video_id = ?`, c.req.param('id'))
    return c.json({ quality_signals: row ?? { video_id: c.req.param('id'), watch_completion_pct: 0, clickbait_score: 0, misinfo_flags: 0 } })
  })

  api.get('/mashahd/videos/:id/ad-disclosures', async (c) => {
    const rows = await all(c.env.DB, `SELECT * FROM ad_disclosures WHERE video_id = ?`, c.req.param('id'))
    return c.json({ ad_disclosures: rows })
  })

  api.post('/mashahd/videos/:id/ad-disclosures', async (c) => {
    const id = c.req.param('id')
    const b = await c.req.json<{ disclosure_type: string; sponsor?: string }>()
    await run(c.env.DB, `INSERT INTO ad_disclosures (video_id, disclosure_type, sponsor) VALUES (?,?,?)`, id, b.disclosure_type, b.sponsor ?? '')
    return c.json({ ok: true })
  })

  api.get('/mashahd/videos/:id/rights-claims', async (c) => {
    const rows = await all(c.env.DB, `SELECT * FROM rights_claims WHERE video_id = ? ORDER BY created_at DESC`, c.req.param('id'))
    return c.json({ rights_claims: rows })
  })

  api.post('/mashahd/videos/:id/rights-claims', async (c) => {
    const id = c.req.param('id')
    const b = await c.req.json<{ claimant: string; claim_type?: string }>()
    await run(c.env.DB, `INSERT INTO rights_claims (video_id, claimant, claim_type) VALUES (?,?,?)`, id, b.claimant, b.claim_type ?? 'copyright')
    return c.json({ ok: true })
  })

  api.get('/mashahd/rights-claims/:id/disputes', async (c) => {
    const rows = await all(c.env.DB, `SELECT * FROM rights_claim_disputes WHERE claim_id = ?`, c.req.param('id'))
    return c.json({ disputes: rows })
  })

  api.post('/mashahd/rights-claims/:id/disputes', async (c) => {
    const claimId = c.req.param('id')
    const b = await c.req.json<{ user_id: number; reason: string }>()
    await run(c.env.DB, `INSERT INTO rights_claim_disputes (claim_id, user_id, reason) VALUES (?,?,?)`, claimId, b.user_id, b.reason)
    return c.json({ ok: true })
  })

  api.post('/mashahd/videos/:id/share', async (c) => {
    const id = c.req.param('id')
    const b = await c.req.json<{ sharer_id: number; platform?: string }>()
    await run(c.env.DB, `INSERT INTO video_shares (video_id, sharer_id, platform) VALUES (?,?,?)`, id, b.sharer_id, b.platform ?? 'copy_link')
    const n = await first<{ n: number }>(c.env.DB, `SELECT COUNT(*) AS n FROM video_shares WHERE video_id = ?`, id)
    return c.json({ ok: true, share_count: n?.n ?? 0 })
  })

  api.post('/mashahd/videos/:id/live-to-vod', async (c) => {
    const id = c.req.param('id')
    await run(c.env.DB, `
      INSERT INTO live_to_vod (video_id, vod_video_id, status) VALUES (?, ?, 'ready')
      ON CONFLICT(video_id) DO UPDATE SET status = 'ready'`, id, id)
    await run(c.env.DB, `UPDATE videos SET is_live = 0 WHERE id = ?`, id)
    return c.json({ ok: true, status: 'ready' })
  })

  api.get('/mashahd/videos/:id/live-to-vod', async (c) => {
    const row = await first(c.env.DB, `SELECT * FROM live_to_vod WHERE video_id = ?`, c.req.param('id'))
    return c.json({ live_to_vod: row })
  })

  // ══════════════════════════ Channel studio ══════════════════════════
  api.get('/mashahd/channels/:id/studio', async (c) => {
    const id = c.req.param('id')
    const channel = await first(c.env.DB, `SELECT * FROM channels WHERE id = ?`, id)
    const videos = await all(c.env.DB, `SELECT id, title, views, likes FROM videos WHERE uploader_id = (SELECT owner_id FROM channels WHERE id = ?) ORDER BY published_at DESC LIMIT 10`, id)
    const roles = await all(c.env.DB, `SELECT * FROM channel_roles WHERE channel_id = ?`, id)
    const revenue = await all(c.env.DB, `SELECT * FROM channel_revenue WHERE channel_id = ?`, id)
    return c.json({ studio: { channel, videos, roles, revenue } })
  })

  api.get('/mashahd/channels/:id/roles', async (c) => {
    const rows = await all(c.env.DB, `SELECT * FROM channel_roles WHERE channel_id = ?`, c.req.param('id'))
    return c.json({ roles: rows })
  })

  api.post('/mashahd/channels/:id/roles', async (c) => {
    const id = c.req.param('id')
    const b = await c.req.json<{ user_id: number; role: string }>()
    await run(c.env.DB, `INSERT OR REPLACE INTO channel_roles (channel_id, user_id, role) VALUES (?,?,?)`, id, b.user_id, b.role)
    return c.json({ ok: true })
  })

  api.get('/mashahd/channels/:id/revenue', async (c) => {
    const rows = await all(c.env.DB, `SELECT * FROM channel_revenue WHERE channel_id = ? ORDER BY created_at DESC`, c.req.param('id'))
    const total = rows.reduce((s: number, r: any) => s + (r.amount_minor || 0), 0)
    return c.json({ revenue: rows, total_minor: total })
  })

  api.get('/mashahd/channels/:id/distribution', async (c) => {
    const id = c.req.param('id')
    const rows = await all(c.env.DB, `
      SELECT v.language, COUNT(*) AS n, COALESCE(SUM(v.views),0) AS views
      FROM videos v WHERE v.uploader_id = (SELECT owner_id FROM channels WHERE id = ?)
      GROUP BY v.language`, id)
    return c.json({ distribution: rows })
  })

  api.get('/mashahd/channels/:id/export', async (c) => {
    const id = c.req.param('id')
    const channel = await first(c.env.DB, `SELECT * FROM channels WHERE id = ?`, id)
    const videos = await all(c.env.DB, `SELECT * FROM videos WHERE uploader_id = (SELECT owner_id FROM channels WHERE id = ?)`, id)
    return c.json({ export: { channel, videos, exported_at: new Date().toISOString() } })
  })

  api.post('/mashahd/channels/:id/subscribe', async (c) => {
    const id = c.req.param('id')
    const b = await c.req.json<{ user_id: number; notify?: boolean }>()
    await run(c.env.DB, `INSERT OR REPLACE INTO channel_subscriptions (channel_id, user_id, notify) VALUES (?,?,?)`,
      id, b.user_id, b.notify === false ? 0 : 1)
    await run(c.env.DB, `UPDATE channels SET subscriber_count = subscriber_count + 1 WHERE id = ?`, id)
    return c.json({ ok: true })
  })

  api.get('/mashahd/channels/:id/subscribe', async (c) => {
    const id = c.req.param('id')
    const uid = c.req.query('user_id') || '1'
    const row = await first(c.env.DB, `SELECT * FROM channel_subscriptions WHERE channel_id = ? AND user_id = ?`, id, uid)
    return c.json({ subscribed: !!row })
  })

  // ══════════════════════════ AI video tools ══════════════════════════
  async function loadVideo(env: Env, id: string) {
    return first<any>(env.DB, `SELECT v.*, u.display_name FROM videos v JOIN users u ON u.id = v.uploader_id WHERE v.id = ?`, id)
  }

  api.post('/ai/summarize', async (c) => {
    const b = await c.req.json<{ video_id: string }>()
    const video = await loadVideo(c.env, b.video_id)
    if (!video) return c.json({ error: 'not_found' }, 404)
    const cached = await first<any>(c.env.DB, `SELECT * FROM ai_video_artifacts WHERE video_id = ? AND kind = 'summary' ORDER BY created_at DESC LIMIT 1`, b.video_id)
    if (cached) return c.json({ summary: cached.content, cached: true })
    const text = await aiText(c.env, `Summarize this video in 3 concise bullet points for viewers. Title: "${video.title}". Description: "${video.description}".`)
    const summary = text || `${video.title} — ${video.description}`.slice(0, 400)
    await run(c.env.DB, `INSERT INTO ai_video_artifacts (video_id, kind, content) VALUES (?, 'summary', ?)`, b.video_id, summary)
    return c.json({ summary, cached: false })
  })

  api.post('/ai/chapters', async (c) => {
    const b = await c.req.json<{ video_id: string }>()
    const video = await loadVideo(c.env, b.video_id)
    if (!video) return c.json({ error: 'not_found' }, 404)
    const existing = await all(c.env.DB, `SELECT * FROM video_chapters WHERE video_id = ? ORDER BY start_sec ASC`, b.video_id)
    if (existing.length) return c.json({ chapters: existing, cached: true })
    const dur = video.duration_sec || 300
    const n = Math.max(2, Math.min(5, Math.floor(dur / 120)))
    const chapters = Array.from({ length: n }).map((_, i) => ({ title: `Part ${i + 1}`, start_sec: Math.floor((dur / n) * i) }))
    for (const ch of chapters) {
      await run(c.env.DB, `INSERT INTO video_chapters (video_id, title, start_sec, ai_generated) VALUES (?,?,?,1)`, b.video_id, ch.title, ch.start_sec)
    }
    return c.json({ chapters, cached: false })
  })

  api.post('/ai/transcript', async (c) => {
    const b = await c.req.json<{ video_id: string }>()
    const video = await loadVideo(c.env, b.video_id)
    if (!video) return c.json({ error: 'not_found' }, 404)
    const cached = await first<any>(c.env.DB, `SELECT * FROM ai_video_artifacts WHERE video_id = ? AND kind = 'transcript'`, b.video_id)
    if (cached) return c.json({ transcript: cached.content, cached: true })
    const text = await aiText(c.env, `Generate a short plausible spoken transcript (4-6 lines) for a video titled "${video.title}" about: ${video.description}`)
    const transcript = text || `[Transcript unavailable — AI provider not configured] ${video.title}`
    await run(c.env.DB, `INSERT INTO ai_video_artifacts (video_id, kind, content) VALUES (?, 'transcript', ?)`, b.video_id, transcript)
    return c.json({ transcript, cached: false })
  })

  api.post('/ai/translate', async (c) => {
    const b = await c.req.json<{ video_id: string; target_lang: string }>()
    const video = await loadVideo(c.env, b.video_id)
    if (!video) return c.json({ error: 'not_found' }, 404)
    const text = await aiText(c.env, `Translate this to ${b.target_lang}: Title: "${video.title}". Description: "${video.description}".`)
    const translated = text || `[${b.target_lang}] ${video.title}`
    await run(c.env.DB, `INSERT INTO ai_video_artifacts (video_id, kind, lang, content) VALUES (?, 'translate', ?, ?)`, b.video_id, b.target_lang, translated)
    return c.json({ translated })
  })

  api.post('/ai/tone', async (c) => {
    const b = await c.req.json<{ text: string; tone: string }>()
    const text = await aiText(c.env, `Rewrite this text in a ${b.tone} tone: "${b.text}"`)
    return c.json({ result: text || b.text })
  })

  api.post('/ai/search-in-video', async (c) => {
    const b = await c.req.json<{ video_id: string; query: string }>()
    const chapters = await all<any>(c.env.DB, `SELECT * FROM video_chapters WHERE video_id = ?`, b.video_id)
    const matches = chapters.filter((ch) => ch.title.toLowerCase().includes(b.query.toLowerCase()))
    return c.json({ matches: matches.length ? matches : chapters.slice(0, 1) })
  })

  api.post('/ai/advanced-search', async (c) => {
    const b = await c.req.json<{ query: string; language?: string; min_duration?: number; max_duration?: number }>()
    let sql = `SELECT v.*, u.handle, u.display_name FROM videos v JOIN users u ON u.id = v.uploader_id WHERE (v.title LIKE ? OR v.description LIKE ?)`
    const params: any[] = [`%${b.query}%`, `%${b.query}%`]
    if (b.language) { sql += ` AND v.language = ?`; params.push(b.language) }
    if (b.min_duration) { sql += ` AND v.duration_sec >= ?`; params.push(b.min_duration) }
    if (b.max_duration) { sql += ` AND v.duration_sec <= ?`; params.push(b.max_duration) }
    sql += ` ORDER BY v.views DESC LIMIT 25`
    const rows = await all(c.env.DB, sql, ...params)
    return c.json({ results: rows })
  })

  api.post('/ai/starters', async (c) => {
    const b = await c.req.json<{ video_id: string }>()
    const video = await loadVideo(c.env, b.video_id)
    const text = await aiText(c.env, `Give 3 short conversation-starter questions for a viewer to ask about a video titled "${video?.title ?? ''}"`)
    const starters = text ? text.split(/\n+/).filter(Boolean).slice(0, 3) : [
      `What did you think of "${video?.title ?? 'this video'}"?`,
      'What was the most surprising moment?',
      'Would you recommend this to a friend?',
    ]
    return c.json({ starters })
  })

  api.get('/ai/trending-digest', async (c) => {
    const videos = await all<any>(c.env.DB, `SELECT v.id, v.title, v.views FROM videos v ORDER BY v.views DESC LIMIT 5`)
    const text = await aiText(c.env, `Write a 3-sentence "what's trending today" digest for these videos: ${videos.map((v) => v.title).join(', ')}`)
    return c.json({ digest: text || `Trending now: ${videos.map((v) => v.title).join(', ')}`, videos })
  })

  api.post('/ai/multi-video-research', async (c) => {
    const b = await c.req.json<{ video_ids: string[]; question: string }>()
    const videos = await Promise.all((b.video_ids || []).map((id) => loadVideo(c.env, id)))
    const context = videos.filter(Boolean).map((v: any) => `- ${v.title}: ${v.description}`).join('\n')
    const text = await aiText(c.env, `Given these videos:\n${context}\n\nAnswer this question using only this context: ${b.question}`)
    return c.json({ answer: text || 'AI provider not configured — showing raw context.', context })
  })

  api.post('/ai/oracle', async (c) => {
    const b = await c.req.json<{ question: string }>()
    const text = await aiText(c.env, b.question, SAGE_SYSTEM)
    return c.json({ answer: text || 'Oracle is unavailable right now — please try again shortly.' })
  })
}
