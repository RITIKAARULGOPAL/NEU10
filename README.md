# Neu10 — interactive product pitch

**Open `NEU10-Deck.html`.** Double-click it. No server, no internet, no install.
Zip the whole `Neu10` folder to send it — the deck plus the `assets` folder is
all it needs.

## Driving it

The deck never scrolls. Everything is clicks.

| Input | Does |
|---|---|
| **Click anywhere** / `→` / `Space` | next beat, then next screen |
| Right-click / `←` | back |
| `Esc` | index of all screens — click any to jump |
| `P` | autoplay, hands-free (~4 min); any arrow key stops it |
| `F` | fullscreen |
| `1`–`5` | jump to Act I–V |

Each screen reveals in **beats**, so one click always pays out something. The
dots at bottom-right show beats remaining on the current screen.

Interactive bits — the CAD/Neu10 toggle, the plan elements, *Move the wall*, the
*when was it found* track — can be clicked directly without advancing the deck.
Poke at them if he asks a question.

## The three videos

Drop them in `assets/` using the exact filenames in `assets/README.txt`. No
rebuild needed. Until then those screens show labelled placeholders and the deck
still runs end to end.

## Structure

Five acts, fifteen screens.

- **I — The bottleneck.** The cycle every office project runs, and the fact that
  one change gets paid for six times.
- **II — Why it hasn't stuck.** BIM promised one model; the tools became the
  obstacle. Two kinds of firms, both stuck.
- **III — The shift.** One change updates every output. The model knows what
  things are. Clashes resolved in design, not execution.
- **IV — Built for interiors.** AI harness, point cloud, documentation and
  costing, adoption barriers.
- **V — The case.** Business impact, why Officebanao, roadmap, close.

## On a phone

Below **820px wide** the deck switches to *compact* mode — a swipeable card
stack rather than a fixed 16:9 frame. Desktop is untouched and still never
scrolls.

- **Swipe** left/right, or use the **← / Next →** bar at the bottom. Tapping the
  card does *not* advance, because the card scrolls and its visuals are
  tappable — that would cause constant accidental jumps.
- **A card scrolls vertically** if its content is taller than the screen. This is
  the one deliberate departure from the no-scrolling rule, and it is what lets
  every visual survive on a phone.
- **All the interactions work by touch** — the CAD/NEU10 toggle, the plan
  elements, *Move the wall*, the when-was-it-found track. Controls are 44px
  minimum.
- **Index** in the bottom bar is the same screen list as `Esc` on desktop.

The earlier narrow-screen rules "fixed" small viewports by `display:none`-ing the
interactive plan, all three videos and the cost track. That was backwards — on a
phone those are the most persuasive things on the screen. They now stay, and the
layout gives them full card width instead.

Heights use `dvh`, so Safari's collapsing URL bar doesn't crop the deck.

## The name and the logo

**NEU10** = *NEU* (new, in German) + *10* (BIM's **tenth dimension**).

The dimension ladder runs 3D → 10D, which is **eight** rungs. So the name means
*reaching* the tenth dimension — never write "the ten dimensions" anywhere in
this deck, because someone will count. Valid phrasings: "up to 10D", "from 3D to
10D", "BIM's tenth dimension".

Casing is two-tier: **NEU10** for the mark, control labels and standalone display
headlines; **Neu10** inside running sentences, so an all-caps token with a digit
doesn't shout mid-paragraph.

The brand mark lives in **`src/wordmark.svg`** and is injected into the chrome at
build time — swapping the logo is a one-file change and never touches
`shell.html`. Source artwork is archived in `assets/logo-neu10-*.pdf`.

Two brand tokens, and the distinction matters:

- `--brand: #361674` — the exact violet from the logo. **Too dark to read on
  this deck's near-black ground.** Keep it for the mark on light backgrounds.
- `--brand-lift: #8B6BFF` — same hue, raised luminance. This is what the three
  "E" bars use in the chrome, and what anything on the dark ground should use.

## Honesty device

Every capability carries a status tag: **LIVE**, **BUILDING** (Aug–Nov) or
**PLANNED** (no dates). This is deliberate — the deck makes strong claims about
clash detection, automated CD and Mac/Linux, none of which ship today. The tag is
what lets those claims be made safely. Don't remove them.

Percentages other than the 90% parametric-library figure are directional
estimates and are footnoted as such. The 90% is the only observed number.

## Editing

Sources live in `src/`. One file per screen in `src/slides/`.

```bash
python build.py
```

That concatenates `src/shell.html` + `src/tokens.css` + `src/engine.js` +
`src/slides/*.html` into the single portable `NEU10-Deck.html`. Slide `<style>`
and `<script>` blocks are hoisted automatically so the engine is always defined
before a slide registers against it.

- `src/tokens.css` — the design system. Colours, type scale, components.
  `--loss` (orange) is the old disconnected world; `--neu` (blue) is one
  model. That pairing carries the argument, so don't mix them freely.
- `src/engine.js` — navigation, beats, autoplay, index, overflow guard.
- `SLIDE_CONTRACT.md` — the rules any new screen must follow.

Add `?dev=1` to the URL to outline any screen whose content overflows the
viewport, and log the overflow to the console.

Deep links: `#7` opens screen 7, `#7.3` opens it at beat 3.
