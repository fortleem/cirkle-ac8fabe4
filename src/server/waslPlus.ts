// Cirkle — Wasl feature parity routes ported from the standalone Wasl app.
// Mounted from src/server/api.ts via registerWaslPlus(api).
import type { Hono } from 'hono'
import type { Env } from './db'

export function registerWaslPlus(api: Hono<{ Bindings: Env }>) {
  void api
}
