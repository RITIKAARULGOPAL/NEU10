# Neu10 deck — slide fragment contract

Read this fully before writing a slide. Reference implementations:
`src/slides/01-bottleneck.html` (typographic + diagram) and
`src/slides/06-objects.html` (interactive). **Match their idiom.**

## Hard rules

1. **The deck never scrolls.** Every slide must fit inside `100vh × 100vw` at
   1280×720, 1440×900 and 1920×1080. If content doesn't fit, cut words or split
   it across another beat — never shrink below the type scale, never allow
   overflow. `Neu10.checkOverflow()` flags violations in the console.
2. **Copy is verbatim.** Use exactly the words given in your task. You may
   change line breaks, emphasis and order of presentation. You may not
   reword, add claims, add numbers, or invent examples.
3. **No new colours, fonts or sizes.** Use only the CSS variables and component
   classes in `src/tokens.css`. If you need something not there, compose it from
   existing tokens.
4. **No external resources.** No web fonts, no CDN, no remote images. Inline SVG
   only. The file must work offline from `file://`.
5. **Namespace all slide CSS** under the slide's own id: `#s03 .foo { }`.
   The build warns on un-namespaced selectors.
6. **One file per slide** in `src/slides/NN-name.html`. Never edit another
   slide's file, `tokens.css`, `engine.js`, `shell.html` or `build.py`.

## Fragment skeleton

```html
<section class="slide" id="s03" data-act="II"
         data-title="What the industry has been trying to solve">
  <div class="slide-inner">
    <p class="eyebrow eyebrow--loss">Act II &middot; Why it hasn't stuck</p>
    <h1 class="h1">Headline</h1>
    <p class="lede" data-beat="2">Revealed on beat 2.</p>
  </div>
</section>

<style>
  #s03 .my-thing { /* namespaced */ }
</style>

<script>
  Neu10.register('s03', {
    enter(el, beat) {},   // slide became active
    beat(el, n)    {},    // beat changed (also fires on enter)
    leave(el)      {}     // slide left — stop timers, pause video
  });
</script>
```

## Beats

- `[data-beat="n"]` — hidden until the slide reaches beat *n*. Elements with no
  `data-beat` are visible immediately (beat 1).
- Beat count is inferred from the highest `data-beat`. Add `data-beats="5"` only
  if you need a trailing beat with no new element.
- **Aim for 3–5 beats per slide.** One idea per beat. The audience has a short
  attention span: every click must pay out something visible.
- Stagger a list: wrap in `.stagger` and set `style="--i:0"`, `--i:1`, … on
  children.
- Autoplay dwell defaults to 3400ms; override with `data-dwell="5000"`.

## Interaction

- Clicking anywhere advances the deck. Any control the viewer should be able to
  operate **without** advancing must carry `data-no-advance`:
  `<button class="ctl" data-no-advance>CAD</button>`
- Use `Neu10.countUp(el, 90, {suffix:'%'})` for statistics.
- Video slides: call `Neu10.holdPlay()` when a video starts and
  `Neu10.releasePlay()` when it ends, so autoplay waits for it.

## Available component classes (tokens.css)

| Class | Use |
|---|---|
| `.eyebrow` `.eyebrow--loss` `.eyebrow--neu` | act label above headline; auto-draws a rule |
| `.h-display` `.h1` `.h2` `.h3` | display / headline / sub / small heading |
| `.lede` `.body` `.small` `.mono` `.footnote` | text roles |
| `.hi` `.hi-loss` `.hi-neu` | inline emphasis |
| `.tag .tag--live` `.tag--building` `.tag--planned` | capability status — **mandatory on every capability** |
| `.panel` `.panel--loss` `.panel--neu` `.panel-label` | boxed content |
| `.tick-list` (`--loss`/`--neu`) + `li[data-n]` | numbered lists |
| `.stat .stat-num` (`--sm`, `--loss`) `.stat-cap` `.stat-key` | statistics |
| `.video-frame` `.video-placeholder` | Act IV video beats |
| `.ctl` | interactive button |
| `.hint` | "try it" affordance |
| `.grid-2` `.grid-3` `.grid-4` `.grid-5` `.split` `.stack` `.stack-lg` `.row` `.spread` | layout |
| `.rule-h` | hairline divider |

## Colour semantics — do not mix freely

- **`--loss` / `--loss-bright` (orange-red)** = the old disconnected world:
  rework, repeated payment, version confusion, late discovery, cost on site.
  Acts I and II lean loss.
- **`--neu` / `--neu-bright` (blue)** = one model, resolution, forward
  motion. Acts III, IV and V lean neu.
- `--ok` green = LIVE only. `--warn` amber = BUILDING only.

This pairing carries the argument visually. A slide about the problem must not
be blue; a slide about the solution must not be orange.

## Honesty rules — non-negotiable

- Every capability shows `LIVE`, `BUILDING` or `PLANNED`.
  - **LIVE:** point cloud import, low learning curve, Windows, parametric
    modelling + natural-language query.
  - **BUILDING (Aug–Nov):** full space planning, import/export interoperability,
    detailed cost module, MEP integration, Mac + Linux.
  - **PLANNED (no dates):** full CD sheet generation, point-cloud-mesh → BIM
    object substitution, collaboration, clash detection, layout auto-generation
    from a brief, optimisation suggestions.
- Any percentage other than the 90% library figure is a directional estimate and
  must sit near a `.footnote` saying so. The 90% is the only observed number.
