from __future__ import annotations

import base64
import json
import os
import signal
import shutil
import subprocess
import tempfile
import time
import urllib.request
from pathlib import Path

import websocket

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
ROOT = Path(__file__).resolve().parent
BASE_URL = os.environ.get("JELDEN_QA_URL", "http://127.0.0.1:8766/")
OUTPUT_DIR = Path(os.environ.get("JELDEN_QA_OUTPUT", str(ROOT.parent)))
OUTPUT_PREFIX = os.environ.get("JELDEN_QA_PREFIX", "qa-cdp")


def get_json(url: str):
    with urllib.request.urlopen(url, timeout=3) as response:
        return json.load(response)


def wait_debugger(profile: Path, proc: subprocess.Popen):
    deadline = time.time() + 15
    while time.time() < deadline:
        if proc.poll() is not None:
            raise RuntimeError(f"Chrome exited before CDP became ready: {proc.returncode}")
        try:
            active_port = profile / "DevToolsActivePort"
            if not active_port.exists():
                raise FileNotFoundError(active_port)
            port = int(active_port.read_text().splitlines()[0])
            get_json(f"http://127.0.0.1:{port}/json/version")
            return port
        except Exception:
            time.sleep(0.2)
    raise RuntimeError("Chrome debugging endpoint did not start")


def main():
    profile = tempfile.mkdtemp(prefix="jelden-cdp-")
    proc = subprocess.Popen(
        [
            CHROME,
            "--headless=new",
            "--disable-gpu",
            "--hide-scrollbars",
            "--remote-allow-origins=*",
            "--remote-debugging-port=0",
            f"--user-data-dir={profile}",
            "about:blank",
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        start_new_session=True,
    )
    try:
        port = wait_debugger(Path(profile), proc)
        tabs = get_json(f"http://127.0.0.1:{port}/json")
        page = next(tab for tab in tabs if tab.get("type") == "page")
        ws = websocket.create_connection(page["webSocketDebuggerUrl"], timeout=10)
        next_id = 0

        def call(method: str, **params):
            nonlocal next_id
            next_id += 1
            ident = next_id
            ws.send(json.dumps({"id": ident, "method": method, "params": params}))
            while True:
                msg = json.loads(ws.recv())
                if msg.get("id") == ident:
                    if "error" in msg:
                        raise RuntimeError(msg["error"])
                    return msg.get("result", {})

        call("Page.enable")
        call("Runtime.enable")

        results = {}
        for label, width, height, mobile, scale_factor in [
            ("desktop", 1440, 1100, False, 1),
            ("mobile", 390, 844, True, 1),
        ]:
            call(
                "Emulation.setDeviceMetricsOverride",
                width=width,
                height=height,
                deviceScaleFactor=scale_factor,
                mobile=mobile,
                screenWidth=width,
                screenHeight=height,
            )
            separator = "&" if "?" in BASE_URL else "?"
            call("Page.navigate", url=f"{BASE_URL}{separator}qa={OUTPUT_PREFIX}-{label}")
            time.sleep(1.3)
            expression = """JSON.stringify({
              ready: document.readyState,
              title: document.title,
              innerWidth: window.innerWidth,
              innerHeight: window.innerHeight,
              scrollWidth: document.documentElement.scrollWidth,
              scrollHeight: document.documentElement.scrollHeight,
              overflowers: [...document.querySelectorAll('body *')].map(el => ({
                tag: el.tagName,
                cls: typeof el.className === 'string' ? el.className : '',
                left: Math.round(el.getBoundingClientRect().left),
                right: Math.round(el.getBoundingClientRect().right),
                width: Math.round(el.getBoundingClientRect().width),
                text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 70)
              })).filter(x => x.right > window.innerWidth + 1 || x.left < -1).slice(0, 25),
              h1: document.querySelectorAll('h1').length,
              robots: document.querySelector('meta[name=robots]')?.content,
              menuDisplay: getComputedStyle(document.querySelector('[data-menu-toggle]')).display,
              failedImages: [...document.images].filter(i => !i.complete || i.naturalWidth === 0).map(i => i.src),
              heroVideos: [...document.querySelectorAll('[data-hero-video]')].map(v => ({
                currentSrc: v.currentSrc,
                readyState: v.readyState,
                paused: v.paused,
                muted: v.muted,
                playsInline: v.playsInline,
                error: v.error ? {code: v.error.code, message: v.error.message} : null,
                display: getComputedStyle(v).display
              })),
              mailto: document.querySelectorAll('a[href^=\"mailto:\"]').length,
              tel: document.querySelectorAll('a[href^=\"tel:\"]').length,
              telHrefs: [...document.querySelectorAll('a[href^=\"tel:\"]')].map(a => a.getAttribute('href')),
              vdsProof: document.querySelector('a[href=\"https://vds.de/zertifikate/zertifikat/3F853292\"]') !== null,
              profileProof: document.querySelector('.profile-proof') !== null,
              previewLanguage: /Designvariante|Variante 1/.test(document.body.innerText)
            })"""
            metrics = json.loads(call("Runtime.evaluate", expression=expression, returnByValue=True)["result"]["value"])
            if label == "mobile":
                interaction_expression = """(() => {
                  const menu = document.querySelector('[data-menu-toggle]');
                  const nav = document.querySelector('[data-nav]');
                  menu.click();
                  const menuOpen = menu.getAttribute('aria-expanded') === 'true' && nav.classList.contains('is-open') && document.body.classList.contains('menu-open');
                  menu.click();
                  const menuClosed = menu.getAttribute('aria-expanded') === 'false' && !nav.classList.contains('is-open');
                  const faq = [...document.querySelectorAll('[data-accordion] button')][1];
                  faq.click();
                  const faqOpen = faq.getAttribute('aria-expanded') === 'true';
                  document.querySelector('[data-legal=\"impressum\"]').click();
                  const legalOpen = document.querySelector('[data-legal-dialog]').open === true;
                  document.querySelector('[data-legal-close]').click();
                  return JSON.stringify({menuOpen, menuClosed, faqOpen, legalOpen});
                })()"""
                metrics["interactions"] = json.loads(call("Runtime.evaluate", expression=interaction_expression, returnByValue=True)["result"]["value"])
            shot = call("Page.captureScreenshot", format="png", captureBeyondViewport=False, fromSurface=True)
            OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
            (OUTPUT_DIR / f"{OUTPUT_PREFIX}-{label}.png").write_bytes(base64.b64decode(shot["data"]))
            layout = call("Page.getLayoutMetrics")["cssContentSize"]
            full = call(
                "Page.captureScreenshot",
                format="png",
                captureBeyondViewport=True,
                fromSurface=True,
                clip={"x": 0, "y": 0, "width": width, "height": layout["height"], "scale": 1},
            )
            (OUTPUT_DIR / f"{OUTPUT_PREFIX}-{label}-full.png").write_bytes(base64.b64decode(full["data"]))
            results[label] = {**metrics, "contentHeight": layout["height"]}

        print(json.dumps(results, ensure_ascii=False, indent=2))

        if results["desktop"]["innerWidth"] != 1440 or results["mobile"]["innerWidth"] != 390:
            raise SystemExit("viewport mismatch")
        if any(r["scrollWidth"] != r["innerWidth"] for r in results.values()):
            raise SystemExit("horizontal overflow")
        if any(r["failedImages"] for r in results.values()):
            raise SystemExit("failed images")
        if any(r["title"] != "Jelden Sachverständigenbüro | Prüfungen Elektrotechnik" for r in results.values()):
            raise SystemExit("final page title mismatch")
        if any(r["robots"] != "noindex,nofollow,noarchive" for r in results.values()):
            raise SystemExit("preview indexing guard mismatch")
        if any(r["mailto"] != 2 or r["tel"] != 2 for r in results.values()):
            raise SystemExit("contact link count mismatch")
        if any(any(href != "tel:+491607940038" for href in r["telHrefs"]) for r in results.values()):
            raise SystemExit("telephone link target mismatch")
        if any(not r["vdsProof"] or not r["profileProof"] or r["previewLanguage"] for r in results.values()):
            raise SystemExit("final content marker mismatch")
        if any(len(r["heroVideos"]) != 2 for r in results.values()):
            raise SystemExit("hero video count mismatch")
        if any(v["error"] for r in results.values() for v in r["heroVideos"]):
            raise SystemExit("hero video loading error")
        if any(not v["muted"] or not v["playsInline"] for r in results.values() for v in r["heroVideos"]):
            raise SystemExit("hero video autoplay safety attributes missing")
        if any(v["readyState"] < 2 or v["paused"] for r in results.values() for v in r["heroVideos"]):
            raise SystemExit("hero video autoplay did not start")
        if not all(results["mobile"]["interactions"].values()):
            raise SystemExit("interaction failure")

        call(
            "Emulation.setEmulatedMedia",
            media="screen",
            features=[{"name": "prefers-reduced-motion", "value": "reduce"}],
        )
        call("Page.navigate", url=f"{BASE_URL}{'&' if '?' in BASE_URL else '?'}qa={OUTPUT_PREFIX}-reduced-motion")
        time.sleep(1)
        reduced_motion = json.loads(
            call(
                "Runtime.evaluate",
                expression="""JSON.stringify({
                  matches: matchMedia('(prefers-reduced-motion: reduce)').matches,
                  videos: [...document.querySelectorAll('[data-hero-video]')].map(v => ({
                    paused: v.paused,
                    display: getComputedStyle(v).display
                  }))
                })""",
                returnByValue=True,
            )["result"]["value"]
        )
        results["reducedMotion"] = reduced_motion
        if not reduced_motion["matches"] or any(v["display"] != "none" or not v["paused"] for v in reduced_motion["videos"]):
            raise SystemExit("reduced motion fallback failure")
        ws.close()
    finally:
        try:
            os.killpg(proc.pid, signal.SIGTERM)
        except ProcessLookupError:
            pass
        shutil.rmtree(profile, ignore_errors=True)


if __name__ == "__main__":
    main()
