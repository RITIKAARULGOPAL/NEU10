#!/usr/bin/env python3
"""
Neu10 deck build.

Concatenates src/shell.html + src/tokens.css + src/engine.js + src/slides/*.html
into a single portable NEU10-Deck.html that runs from file:// with no server.

Slide fragments are self-contained (markup + optional <style> + optional
<script>Neu10.register(...)</script>). The build HOISTS those blocks:
  <style>  -> into <head>, after tokens.css
  <script> -> to the very end of <body>, after engine.js
so that Neu10 is always defined before a slide registers against it.

Usage:  python build.py
"""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "src"
SLIDES_DIR = SRC / "slides"
OUT = ROOT / "NEU10-Deck.html"

STYLE_RE = re.compile(r"<style[^>]*>(.*?)</style>", re.S | re.I)
SCRIPT_RE = re.compile(r"<script[^>]*>(.*?)</script>", re.S | re.I)


def fail(msg):
    print("  BUILD FAILED: " + msg)
    sys.exit(1)


def main():
    shell = (SRC / "shell.html").read_text(encoding="utf-8")
    tokens = (SRC / "tokens.css").read_text(encoding="utf-8")
    engine = (SRC / "engine.js").read_text(encoding="utf-8")

    files = sorted(SLIDES_DIR.glob("*.html")) if SLIDES_DIR.is_dir() else []
    if not files:
        fail("no slide fragments in src/slides/")

    bodies, styles, scripts = [], [], []
    report = []

    for f in files:
        raw = f.read_text(encoding="utf-8")

        css_blocks = STYLE_RE.findall(raw)
        js_blocks = SCRIPT_RE.findall(raw)
        body = SCRIPT_RE.sub("", STYLE_RE.sub("", raw)).strip()

        # --- validate the slide contract ---
        if 'class="slide"' not in body:
            fail(f"{f.name}: root element must carry class=\"slide\"")
        sid = re.search(r'id="([^"]+)"', body)
        act = re.search(r'data-act="([^"]+)"', body)
        title = re.search(r'data-title="([^"]+)"', body)
        if not sid:
            fail(f"{f.name}: slide needs an id (e.g. id=\"s01\")")
        if not act:
            fail(f"{f.name}: slide needs data-act (I..V)")
        if not title:
            fail(f"{f.name}: slide needs data-title")

        beats = [int(n) for n in re.findall(r'data-beat="(\d+)"', body)]
        declared = re.search(r'data-beats="(\d+)"', body)
        nbeats = max(beats + [int(declared.group(1))] if declared else (beats or [1]))

        # Slide CSS must be namespaced to its own id, or it will leak.
        for css in css_blocks:
            for sel in re.findall(r"(?m)^\s*([.#][A-Za-z][\w\-\s,.:>()\[\]=\"']*)\{", css):
                if f"#{sid.group(1)}" not in sel and not sel.strip().startswith("@"):
                    print(f"  ! {f.name}: un-namespaced selector '{sel.strip()}' "
                          f"— should be scoped under #{sid.group(1)}")

        bodies.append(f"\n<!-- ==== {f.name} ==== -->\n{body}\n")
        if css_blocks:
            styles.append(f"\n/* ==== {f.name} ==== */\n" + "\n".join(c.strip() for c in css_blocks))
        if js_blocks:
            scripts.append(f"\n/* ==== {f.name} ==== */\n" + "\n".join(j.strip() for j in js_blocks))

        report.append((f.name, sid.group(1), act.group(1), nbeats, title.group(1)))

    out = shell
    out = out.replace("/*<!--INJECT:TOKENS-->*/", tokens + "\n" + "\n".join(styles))
    out = out.replace("/*<!--INJECT:ENGINE-->*/", engine)
    out = out.replace("<!--INJECT:SLIDES-->", "".join(bodies))
    out = out.replace(
        "<!--INJECT:SLIDE_SCRIPTS-->",
        ("<script>\n" + "\n".join(scripts) + "\n</script>") if scripts else "",
    )

    # Brand mark. Kept as its own file so swapping the logo never touches the
    # shell; falls back to the wordmark as text if the asset is missing.
    mark_file = SRC / "wordmark.svg"
    mark = mark_file.read_text(encoding="utf-8").strip() if mark_file.exists() else "NEU10"
    out = out.replace("<!--INJECT:WORDMARK-->", mark)

    for marker in ("INJECT:TOKENS", "INJECT:ENGINE", "INJECT:SLIDES",
                   "INJECT:SLIDE_SCRIPTS", "INJECT:WORDMARK"):
        if marker in out:
            fail(f"marker {marker} was not substituted")

    OUT.write_text(out, encoding="utf-8")

    total_beats = sum(r[3] for r in report)
    print(f"  built {OUT.name}  ({len(out) / 1024:.0f} KB)")
    print(f"  {len(report)} slides / {total_beats} beats")
    print()
    print("  #   id    act  beats  title")
    print("  " + "-" * 74)
    for n, (fname, sid, act, nb, title) in enumerate(report, 1):
        print(f"  {n:>2}  {sid:<5} {act:<4} {nb:^5}  {title[:48]}")


if __name__ == "__main__":
    main()
