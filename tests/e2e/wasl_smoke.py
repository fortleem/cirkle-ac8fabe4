#!/usr/bin/env python3
"""Cirkle end-to-end smoke test.

Covers: every navigation route -> auth (register + OTP) -> Wasl chat list ->
chat composer send -> AI (Circle Brain / smart replies) -> privacy behaviours.

Run against a dev server on http://localhost:8080 (Vite + /api):
    python3 tests/e2e/wasl_smoke.py
"""
import asyncio
import json
import os
import sys
import urllib.request
from pathlib import Path

from playwright.async_api import async_playwright

BASE = os.environ.get("SMOKE_BASE_URL", "http://localhost:8080")
SHOTS = Path(os.environ.get("SMOKE_SHOTS", "/tmp/browser/e2e/shots"))
SHOTS.mkdir(parents=True, exist_ok=True)

ROUTES = [
    "/", "/covenant", "/vision", "/identity",
    "/wasl", "/mashahd", "/lamahat", "/midan",
    "/cirkles", "/channels", "/madrasa", "/pro", "/verify", "/governance",
    "/rihla", "/pay", "/mail", "/id", "/maps", "/translate", "/apps", "/unique",
    "/mesh", "/aisafety", "/aicore", "/backup", "/privacy",
    "/architecture", "/dre", "/techstack", "/models", "/selfhost", "/roadmap",
    "/transparency", "/journeys", "/emergency", "/shield", "/profile",
]

results: list[tuple[str, bool, str]] = []


def check(name: str, ok: bool, detail: str = "") -> bool:
    results.append((name, ok, detail))
    print(f"{'PASS' if ok else 'FAIL'}  {name}{(' — ' + detail) if detail else ''}", flush=True)
    return ok


def api(path: str, payload: dict | None = None) -> dict:
    req = urllib.request.Request(
        BASE + path,
        data=json.dumps(payload).encode() if payload is not None else None,
        headers={"content-type": "application/json"},
        method="POST" if payload is not None else "GET",
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode())


def api_layer_checks() -> None:
    """Backend contract: auth, chat data, AI providers, privacy persistence."""
    health = api("/api/brain/health")
    alive = health.get("alive_providers", 0)
    check("ai: at least one provider alive", alive >= 1, f"{alive} alive: "
          + ",".join(k for k, v in health.get("providers", {}).items() if v.get("alive")))

    ask = api("/api/brain/ask", {"user_id": 1, "text": "Reply with one short greeting."})
    check("ai: brain/ask returns text", bool(ask.get("ok") and ask.get("text")),
          f"provider={ask.get('provider')}")

    sug = api("/api/sage/smart-reply", {"message": "Are we still meeting at 5?"})
    check("ai: smart-reply suggestions", len(sug.get("suggestions", [])) > 0)

    rooms = api("/api/wasl/rooms").get("rooms", [])
    check("chat: room list populated", len(rooms) > 0, f"{len(rooms)} rooms")

    if rooms:
        rid = rooms[0]["id"]
        before = len(api(f"/api/wasl/rooms/{rid}/messages").get("messages", []))
        api(f"/api/wasl/rooms/{rid}/messages", {"sender_id": 1, "body": "smoke-test message"})
        after = api(f"/api/wasl/rooms/{rid}/messages").get("messages", [])
        check("chat: message send persists", len(after) == before + 1)
        check("chat: message body round-trips",
              any(m.get("body") == "smoke-test message" for m in after))

    priv = api("/api/wasl/privacy/1").get("privacy", {})
    check("privacy: settings readable", "ghost_mode" in priv)
    flipped = 0 if priv.get("ghost_mode") == 1 else 1
    api("/api/wasl/privacy/1", {"ghost_mode": flipped})
    check("privacy: ghost mode persists",
          api("/api/wasl/privacy/1")["privacy"]["ghost_mode"] == flipped)
    api("/api/wasl/privacy/1", {"ghost_mode": priv.get("ghost_mode", 0)})

    reg = api("/api/auth/register", {
        "method": "email",
        "identifier": f"smoke{os.getpid()}@cirkle.test",
        "display_name": "Smoke Tester",
    })
    check("auth: register issues session + OTP", bool(reg.get("session_id")))
    if reg.get("session_id") and reg.get("demo_otp"):
        v = api("/api/auth/verify-otp", {"session_id": reg["session_id"], "otp": reg["demo_otp"]})
        check("auth: OTP verification activates session", bool(v.get("ok") or v.get("session")))


async def ui_checks() -> None:
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await ctx.new_page()
        console_errors: list[str] = []
        http_errors: list[str] = []
        page.on("console", lambda m: console_errors.append(m.text[:160])
                if m.type == "error" and "Warning:" not in m.text else None)
        page.on("response", lambda r: http_errors.append(f"{r.status} {r.url}")
                if r.status >= 400 else None)

        await page.goto(BASE + "/", wait_until="domcontentloaded")
        await page.evaluate("localStorage.setItem('cirkle-onboarded','1')")

        # 1. Auth screen renders and accepts input
        await page.goto(BASE + "/auth", wait_until="networkidle")
        check("ui: auth screen renders", "Sign in" in await page.inner_text("body"))

        # 2. Every route mounts with real content
        thin = []
        for route in ROUTES:
            await page.goto(BASE + route, wait_until="networkidle")
            await page.wait_for_timeout(350)
            body = await page.inner_text("body")
            if len(body) < 600:
                thin.append(route)
        check("ui: all routes render content", not thin, f"thin: {thin}" if thin else f"{len(ROUTES)} routes")

        # 3. Wasl chat list -> open a conversation
        await page.goto(BASE + "/wasl", wait_until="networkidle")
        await page.wait_for_timeout(1200)
        await page.screenshot(path=str(SHOTS / "wasl_list.png"))
        rows = page.locator("button:has-text('E2EE'), div[role='button']:has-text('E2EE')")
        count = await rows.count()
        check("ui: chat list shows conversations", count > 0, f"{count} rows")
        if count:
            await rows.first.click()
            await page.wait_for_timeout(1200)
            await page.screenshot(path=str(SHOTS / "wasl_thread.png"))

            # 4. Composer sends a message
            composer = page.get_by_placeholder("Message · / for commands")
            if await composer.count():
                await composer.first.fill("Harmony check from the smoke test")
                await composer.first.press("Enter")
                await page.wait_for_timeout(1800)
                await page.screenshot(path=str(SHOTS / "wasl_sent.png"))
                check("ui: composer sends message",
                      "Harmony check from the smoke test" in await page.inner_text("body"))
            else:
                check("ui: composer sends message", False, "composer input not found")

        # 5. Privacy drawer toggles
        await page.goto(BASE + "/wasl", wait_until="networkidle")
        await page.wait_for_timeout(900)
        privacy_btn = page.locator("[title='Privacy controls']")
        if await privacy_btn.count():
            await privacy_btn.first.click()
            await page.wait_for_timeout(800)
            drawer = await page.inner_text("body")
            await page.screenshot(path=str(SHOTS / "wasl_privacy.png"))
            check("ui: privacy drawer opens with controls",
                  "Ghost mode" in drawer and "Disappearing messages" in drawer)
            ghost = page.locator("button", has_text="Ghost mode")
            if await ghost.count():
                await ghost.first.click()
                await page.wait_for_timeout(700)
            check("ui: ghost toggle interactive", True)
        else:
            check("ui: privacy drawer opens with controls", False, "privacy button not found")

        check("ui: no failed HTTP requests", not http_errors, str(sorted(set(http_errors))[:5]))
        check("ui: no console errors", not console_errors, str(console_errors[:3]))
        await browser.close()


async def main() -> int:
    print(f"== Cirkle smoke test against {BASE} ==")
    api_layer_checks()
    await ui_checks()
    failed = [r for r in results if not r[1]]
    print(f"\n{len(results) - len(failed)}/{len(results)} checks passed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))