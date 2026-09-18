// Cirkle — Mashahd feature parity routes ported from the standalone Mashahd app.
// Mounted from src/server/api.ts via registerMashahdPlus(api).
import type { Hono } from 'hono'
import type { Env } from './db'

export function registerMashahdPlus(api: Hono<{ Bindings: Env }>) {
  void api
}
