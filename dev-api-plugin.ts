// Cirkle — dev-only Vite plugin that serves the Cloudflare Pages Functions API
// (`/api/*`, Hono router in src/server/api.ts) inside the Vite dev server,
// backed by a local sql.js SQLite database seeded from ./migrations + ./seed*.sql.
// In production the same router runs on Cloudflare Pages with a real D1 binding.
import fs from "node:fs";
import path from "node:path";
import type { Plugin, ViteDevServer } from "vite";

const DB_SNAPSHOT = path.resolve("/tmp/cirkle-dev-d1.sqlite");

type SqlJsDb = any;

function createD1(db: SqlJsDb, persist: () => void) {
  const norm = (params: unknown[]) =>
    params.map((p) => (p === undefined ? null : typeof p === "boolean" ? (p ? 1 : 0) : p));

  const query = (sql: string, params: unknown[]) => {
    const stmt = db.prepare(sql);
    try {
      if (params.length) stmt.bind(norm(params));
      const rows: any[] = [];
      while (stmt.step()) rows.push(stmt.getAsObject());
      return rows;
    } finally {
      stmt.free();
    }
  };

  const makeStatement = (sql: string, params: unknown[] = []): any => ({
    bind: (...next: unknown[]) => makeStatement(sql, next),
    all: async <T = any>() => ({ results: query(sql, params) as T[], success: true, meta: {} }),
    first: async (column?: string) => {
      const row = query(sql, params)[0];
      if (!row) return null;
      return column ? row[column] : row;
    },
    raw: async () => query(sql, params).map((r) => Object.values(r)),
    run: async () => {
      db.run(sql, norm(params));
      persist();
      const id = query("SELECT last_insert_rowid() AS id", [])[0]?.id ?? 0;
      return {
        success: true,
        results: [],
        meta: { changes: db.getRowsModified(), last_row_id: id, duration: 0 },
      };
    },
  });

  return {
    prepare: (sql: string) => makeStatement(sql),
    batch: async (statements: any[]) => Promise.all(statements.map((s) => s.all())),
    exec: async (sql: string) => {
      db.exec(sql);
      persist();
      return { count: 0, duration: 0 };
    },
  };
}

async function bootDatabase() {
  const initSqlJs = (await import("sql.js")).default as any;
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_SNAPSHOT)) {
    const db = new SQL.Database(fs.readFileSync(DB_SNAPSHOT));
    return { SQL, db, fresh: false };
  }

  const db = new SQL.Database();
  const migrationsDir = path.resolve("migrations");
  const files = fs.existsSync(migrationsDir)
    ? fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort()
    : [];
  for (const file of files) {
    try {
      db.exec(fs.readFileSync(path.join(migrationsDir, file), "utf8"));
    } catch (err) {
      console.warn(`[dev-api] migration ${file} partially applied:`, (err as Error).message);
    }
  }
  for (const seed of ["seed.sql", "seed_v12.sql"]) {
    const seedPath = path.resolve(seed);
    if (!fs.existsSync(seedPath)) continue;
    try {
      db.exec(fs.readFileSync(seedPath, "utf8"));
    } catch (err) {
      console.warn(`[dev-api] seed ${seed} partially applied:`, (err as Error).message);
    }
  }
  console.log(`[dev-api] local D1 ready (${files.length} migrations + seeds)`);
  return { SQL, db, fresh: true };
}

export function devApiPlugin(): Plugin {
  let ready: Promise<{ env: Record<string, unknown> }> | null = null;

  const init = async () => {
    const { db } = await bootDatabase();
    let timer: NodeJS.Timeout | null = null;
    const persist = () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        try {
          fs.writeFileSync(DB_SNAPSHOT, Buffer.from(db.export()));
        } catch {
          /* snapshot is best-effort */
        }
      }, 400);
    };
    const env: Record<string, unknown> = {
      DB: createD1(db, persist),
      GROQ_API_KEY: process.env.GROQ_API_KEY,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      HF_API_KEY: process.env.HF_API_KEY,
    };
    return { env };
  };

  return {
    name: "cirkle-dev-api",
    apply: "serve",
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith("/api/")) return next();
        try {
          ready ??= init();
          const { env } = await ready;
          const mod = await server.ssrLoadModule("/src/server/api.ts");
          const { Hono } = await server.ssrLoadModule("hono");
          const app = new Hono();
          app.route("/api", mod.api);

          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk as Buffer);
          const body = chunks.length ? Buffer.concat(chunks) : undefined;

          const request = new Request(`http://localhost${req.url}`, {
            method: req.method,
            headers: req.headers as any,
            body: req.method === "GET" || req.method === "HEAD" ? undefined : body,
          });
          const response = await app.fetch(request, env, {
            waitUntil: () => {},
            passThroughOnException: () => {},
          } as any);

          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (err) {
          console.error("[dev-api] error", err);
          res.statusCode = 500;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify({ error: "dev_api_error", detail: (err as Error).message }));
        }
      });
    },
  };
}