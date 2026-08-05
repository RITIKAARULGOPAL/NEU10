/* ============================================================
   NEU10 DECK ENGINE
   Click / keyboard driven. No scrolling, ever.

   Slide contract
   --------------
   <section class="slide" id="s01" data-act="I"
            data-title="The Office Interior Design Bottleneck">
     <div class="slide-inner"> ... [data-beat="2"] ... </div>
   </section>

   - Beat count is inferred from the highest [data-beat] value.
     Override with data-beats="4" if a slide needs extra empty beats.
   - Elements with no [data-beat] are visible on slide entry.
   - Any control that must NOT advance the deck: data-no-advance.
   - Per-slide behaviour: Neu10.register('s01', { enter, beat, leave }).
   ============================================================ */

const Neu10 = (function () {
  'use strict';

  const ACTS = [
    { id: 'I',   name: 'The Bottleneck' },
    { id: 'II',  name: 'Why It Hasn’t Stuck' },
    { id: 'III', name: 'The Shift' },
    { id: 'IV',  name: 'Built For Interiors' },
    { id: 'V',   name: 'The Case' }
  ];

  /* Compact = phone / narrow portrait. In this mode the deck stops being a
     fixed-frame slideshow and becomes a swipeable card stack whose cards may
     scroll vertically. Desktop behaviour is untouched. */
  const COMPACT_Q = '(max-width: 820px)';

  const handlers = Object.create(null);
  const state = {
    i: 0,            // slide index
    beat: 1,         // current beat within slide (1-based)
    slides: [],      // slide meta
    playing: false,
    playTimer: null,
    playHold: 0,     // >0 means auto-advance is paused (e.g. video running)
    overview: false,
    booted: false,
    interacted: false,
    compact: false
  };

  function isCompact() {
    return window.matchMedia && window.matchMedia(COMPACT_Q).matches;
  }

  function syncCompact() {
    state.compact = isCompact();
    document.documentElement.toggleAttribute('data-compact', state.compact);
  }

  const DWELL_DEFAULT = 3400;

  /* ---------- registration ---------- */
  function register(id, hooks) { handlers[id] = hooks || {}; }

  /* ---------- setup ---------- */
  function boot() {
    if (state.booted) return;
    const nodes = Array.from(document.querySelectorAll('#deck .slide'));
    if (!nodes.length) { console.warn('[Neu10] no slides found'); return; }

    state.slides = nodes.map(function (el, idx) {
      const beatNodes = Array.from(el.querySelectorAll('[data-beat]'));
      let max = 1;
      beatNodes.forEach(function (b) {
        const n = parseInt(b.getAttribute('data-beat'), 10);
        if (!isNaN(n) && n > max) max = n;
      });
      const declared = parseInt(el.getAttribute('data-beats'), 10);
      if (!isNaN(declared) && declared > max) max = declared;
      if (!el.id) el.id = 's' + String(idx + 1).padStart(2, '0');
      return {
        el: el,
        id: el.id,
        act: el.getAttribute('data-act') || 'I',
        title: el.getAttribute('data-title') || el.id,
        beats: max,
        dwell: parseInt(el.getAttribute('data-dwell'), 10) || DWELL_DEFAULT
      };
    });

    syncCompact();

    // ?dev=1 turns on the overflow outline. Never on in the delivered file.
    if (/(\?|&)dev=1/.test(location.search)) {
      document.documentElement.setAttribute('data-dev', '1');
      /* On-screen readout, because a headless screenshot cannot show a console
         log — and disagreements between what a renderer measures and what it
         paints are exactly what this has to settle. */
      const hud = document.createElement('div');
      hud.id = 'dev-hud';
      // boot() already runs on DOMContentLoaded, so attach now — waiting for
      // that event again would never fire.
      document.body.appendChild(hud);
      setTimeout(function () {
        const bad = checkOverflow();
        const cur = state.slides[state.i];
        const mine = bad.filter(function (b) { return b.id === cur.id; })[0];
        hud.textContent = window.innerWidth + '×' + window.innerHeight +
          (state.compact ? ' compact' : ' wide') + ' | ' + cur.id +
          (mine ? ' overW:' + mine.overW + ' overH:' + mine.overH : ' fits');
        console.log(bad.length ? '[Neu10] OVERFLOW ' + JSON.stringify(bad)
                               : '[Neu10] no overflow at ' +
                                 window.innerWidth + 'x' + window.innerHeight);
      }, 500);
    }

    buildActRail();
    buildOverview();
    bindEvents();
    bindCompactNav();
    state.booted = true;

    // Deep link: #7  |  #7.4 (slide 7, beat 4)  |  #s07  |  #s07.4
    // The .beat form is what lets a slide be captured fully revealed.
    const h = (location.hash || '').replace('#', '');
    let start = 0, startBeat = 1;
    if (h) {
      const parts = h.split('.');
      const ref = parts[0];
      const byId = state.slides.findIndex(function (s) { return s.id === ref; });
      if (byId >= 0) start = byId;
      else if (/^\d+$/.test(ref)) start = clamp(parseInt(ref, 10) - 1, 0, state.slides.length - 1);
      if (parts[1] === 'end' || parts[1] === 'max') startBeat = state.slides[start].beats;
      else if (/^\d+$/.test(parts[1] || '')) startBeat = parseInt(parts[1], 10);
    }
    goto(start, startBeat, true);
  }

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  function buildActRail() {
    const rail = document.getElementById('act-rail');
    if (!rail) return;
    rail.innerHTML = '';
    ACTS.forEach(function (a) {
      const first = state.slides.findIndex(function (s) { return s.act === a.id; });
      if (first < 0) return;
      const b = document.createElement('button');
      b.className = 'act-item';
      b.dataset.act = a.id;
      b.dataset.target = String(first);
      b.innerHTML = '<span class="act-num">' + a.id + '</span>' +
                    '<span class="act-name">' + a.name + '</span>';
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        goto(parseInt(b.dataset.target, 10), 1);
      });
      rail.appendChild(b);
    });
  }

  function buildOverview() {
    const grid = document.getElementById('ov-grid');
    if (!grid) return;
    grid.innerHTML = '';
    ACTS.forEach(function (a) {
      const mine = state.slides
        .map(function (s, idx) { return { s: s, idx: idx }; })
        .filter(function (o) { return o.s.act === a.id; });
      if (!mine.length) return;
      const col = document.createElement('div');
      col.className = 'ov-act';
      const head = document.createElement('div');
      head.className = 'ov-act-head';
      head.textContent = a.id + ' · ' + a.name;
      col.appendChild(head);
      mine.forEach(function (o) {
        const btn = document.createElement('button');
        btn.className = 'ov-slide';
        btn.dataset.target = String(o.idx);
        btn.innerHTML = '<span>' + String(o.idx + 1).padStart(2, '0') + '</span>' +
                        '<em style="font-style:normal">' + o.s.title + '</em>';
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          closeOverview();
          goto(o.idx, 1);
        });
        col.appendChild(btn);
      });
      grid.appendChild(col);
    });
  }

  /* ---------- navigation ---------- */
  function goto(i, beat, silent) {
    i = clamp(i, 0, state.slides.length - 1);
    const prev = state.slides[state.i];
    const next = state.slides[i];
    const changed = !silent && prev !== next;

    if (changed && handlers[prev.id] && handlers[prev.id].leave) {
      try { handlers[prev.id].leave(prev.el); } catch (e) { console.error(e); }
    }

    state.i = i;
    state.beat = clamp(beat || 1, 1, next.beats);

    state.slides.forEach(function (s) {
      s.el.classList.toggle('is-active', s === next);
      if (s !== next) resetBeats(s);
    });
    // A scrollable card must always open at the top, never mid-slide.
    next.el.scrollTop = 0;

    applyBeats(next, state.beat);
    if (handlers[next.id] && handlers[next.id].enter) {
      try { handlers[next.id].enter(next.el, state.beat); } catch (e) { console.error(e); }
    }
    notifyBeat(next);
    paintChrome();
    if (history.replaceState) history.replaceState(null, '', '#' + (i + 1));
    if (state.playing) schedulePlay();
  }

  function resetBeats(s) {
    s.el.querySelectorAll('[data-beat].is-on').forEach(function (n) { n.classList.remove('is-on'); });
    s.el.querySelectorAll('.stagger.is-on').forEach(function (n) { n.classList.remove('is-on'); });
  }

  function applyBeats(s, upto) {
    s.el.querySelectorAll('[data-beat]').forEach(function (n) {
      const b = parseInt(n.getAttribute('data-beat'), 10);
      n.classList.toggle('is-on', !isNaN(b) && b <= upto);
    });
    s.el.querySelectorAll('.stagger').forEach(function (n) {
      const owner = n.closest('[data-beat]');
      n.classList.toggle('is-on', !owner || owner.classList.contains('is-on'));
    });
  }

  function notifyBeat(s) {
    const h = handlers[s.id];
    if (h && h.beat) { try { h.beat(s.el, state.beat); } catch (e) { console.error(e); } }
  }

  function next() {
    const s = state.slides[state.i];
    if (state.beat < s.beats) {
      state.beat++;
      applyBeats(s, state.beat);
      notifyBeat(s);
      paintChrome();
      if (state.playing) schedulePlay();
    } else if (state.i < state.slides.length - 1) {
      goto(state.i + 1, 1);
    } else if (state.playing) {
      stopPlay();
    }
  }

  function prev() {
    if (state.beat > 1) {
      state.beat--;
      applyBeats(state.slides[state.i], state.beat);
      notifyBeat(state.slides[state.i]);
      paintChrome();
    } else if (state.i > 0) {
      const target = state.slides[state.i - 1];
      goto(state.i - 1, target.beats);
    }
  }

  /* ---------- chrome ---------- */
  function paintChrome() {
    const s = state.slides[state.i];

    const title = document.getElementById('slide-title');
    if (title) title.textContent = s.title;

    const counter = document.getElementById('counter');
    if (counter) {
      counter.innerHTML = '<b>' + String(state.i + 1).padStart(2, '0') + '</b> / ' +
                          String(state.slides.length).padStart(2, '0');
    }

    const dots = document.getElementById('beat-dots');
    if (dots) {
      if (dots.children.length !== s.beats) {
        dots.innerHTML = '';
        for (let k = 0; k < s.beats; k++) {
          const d = document.createElement('i');
          d.className = 'beat-dot';
          dots.appendChild(d);
        }
      }
      Array.from(dots.children).forEach(function (d, k) {
        d.classList.toggle('is-on', k < state.beat);
      });
    }

    const actIdx = ACTS.findIndex(function (a) { return a.id === s.act; });
    document.querySelectorAll('.act-item').forEach(function (n) {
      const mine = ACTS.findIndex(function (a) { return a.id === n.dataset.act; });
      n.classList.toggle('is-current', mine === actIdx);
      n.classList.toggle('is-done', mine < actIdx);
    });

    const bar = document.getElementById('progress');
    if (bar) {
      const done = state.i + (state.beat / Math.max(s.beats, 1));
      bar.style.width = (done / state.slides.length * 100).toFixed(2) + 'vw';
    }

    document.querySelectorAll('.ov-slide').forEach(function (n) {
      n.classList.toggle('is-current', parseInt(n.dataset.target, 10) === state.i);
    });
  }

  /* ---------- play mode ---------- */
  function schedulePlay() {
    clearTimeout(state.playTimer);
    if (!state.playing || state.playHold > 0) return;
    const s = state.slides[state.i];
    state.playTimer = setTimeout(next, s.dwell);
  }
  function startPlay() {
    state.playing = true;
    document.getElementById('play-flag').classList.add('is-on');
    schedulePlay();
  }
  function stopPlay() {
    state.playing = false;
    clearTimeout(state.playTimer);
    document.getElementById('play-flag').classList.remove('is-on');
  }
  function togglePlay() { state.playing ? stopPlay() : startPlay(); }
  /* Slides (e.g. video beats) call these so play mode waits for them. */
  function holdPlay()    { state.playHold++; clearTimeout(state.playTimer); }
  function releasePlay() { state.playHold = Math.max(0, state.playHold - 1); schedulePlay(); }

  /* ---------- overview ---------- */
  function openOverview()  { state.overview = true;  document.getElementById('overview').classList.add('is-open'); }
  function closeOverview() { state.overview = false; document.getElementById('overview').classList.remove('is-open'); }
  function toggleOverview(){ state.overview ? closeOverview() : openOverview(); }

  /* ---------- events ---------- */
  function bindEvents() {
    document.addEventListener('click', function (e) {
      if (state.overview) return;
      // Never advance when the click lands on a control or the chrome.
      if (e.target.closest('[data-no-advance]')) return;
      if (e.target.closest('#chrome')) return;
      if (e.target.closest('a, button, input, select, textarea, label')) return;
      /* On a phone the card scrolls and the visuals are tappable, so
         tap-anywhere-to-advance causes constant accidental jumps. Compact mode
         advances by swipe or the explicit nav buttons instead. */
      if (state.compact) return;
      markInteracted();
      next();
    });

    document.addEventListener('contextmenu', function (e) {
      if (state.overview) return;
      e.preventDefault();
      markInteracted();
      prev();
    });

    document.addEventListener('keydown', function (e) {
      const k = e.key;
      if (k === 'Escape') { e.preventDefault(); toggleOverview(); return; }
      if (state.overview && k !== 'Escape') { closeOverview(); }

      if (k === 'ArrowRight' || k === 'ArrowDown' || k === ' ' ||
          k === 'PageDown' || k === 'Enter') {
        e.preventDefault(); markInteracted(); if (state.playing) stopPlay(); next();
      } else if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'PageUp' ||
                 k === 'Backspace') {
        e.preventDefault(); markInteracted(); if (state.playing) stopPlay(); prev();
      } else if (k === 'Home') { e.preventDefault(); goto(0, 1); }
      else if (k === 'End')   { e.preventDefault(); goto(state.slides.length - 1, 1); }
      else if (k === 'p' || k === 'P') { e.preventDefault(); markInteracted(); togglePlay(); }
      else if (k === 'f' || k === 'F') { e.preventDefault(); toggleFullscreen(); }
      else if (/^[1-5]$/.test(k)) {
        const act = ACTS[parseInt(k, 10) - 1];
        const idx = state.slides.findIndex(function (s) { return s.act === act.id; });
        if (idx >= 0) { e.preventDefault(); goto(idx, 1); }
      }
    });

    // Swipe for touch/pen, still no scrolling.
    let tx = 0, ty = 0;
    document.addEventListener('touchstart', function (e) {
      tx = e.touches[0].clientX; ty = e.touches[0].clientY;
    }, { passive: true });
    document.addEventListener('touchend', function (e) {
      const dx = e.changedTouches[0].clientX - tx;
      const dy = e.changedTouches[0].clientY - ty;
      if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy)) {
        markInteracted();
        dx < 0 ? next() : prev();
      }
    }, { passive: true });

    /* Desktop must never scroll. Compact mode MUST be allowed to — otherwise
       the card cannot be read — so both guards are gated on it. */
    window.addEventListener('wheel', function (e) {
      if (!state.compact) e.preventDefault();
    }, { passive: false });
    window.addEventListener('scroll', function () {
      if (!state.compact) window.scrollTo(0, 0);
    }, { passive: true });

    function onViewportChange() {
      const was = state.compact;
      syncCompact();
      if (was !== state.compact) {
        // Layout model changed under us; re-apply the current slide cleanly.
        goto(state.i, state.beat, true);
      }
      paintChrome();
      checkOverflow();
    }
    window.addEventListener('resize', onViewportChange);
    window.addEventListener('orientationchange', onViewportChange);
  }

  function bindCompactNav() {
    const wire = function (id, fn) {
      const b = document.getElementById(id);
      if (b) b.addEventListener('click', function (e) {
        e.stopPropagation();
        markInteracted();
        if (state.playing) stopPlay();
        fn();
      });
    };
    wire('m-prev', prev);
    wire('m-next', next);
    wire('m-index', toggleOverview);
  }

  function markInteracted() {
    if (state.interacted) return;
    state.interacted = true;
    const hint = document.getElementById('click-hint');
    if (hint) hint.classList.add('is-hidden');
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      (document.documentElement.requestFullscreen || function () {}).call(document.documentElement);
    } else {
      (document.exitFullscreen || function () {}).call(document);
    }
  }

  /* ---------- dev guard: flag slides whose content exceeds the frame ----------
     Measures .slide-inner's rendered box against the slide's content box.
     (scrollHeight/clientHeight cannot detect this: a centred grid item grows
     to fit its content rather than being clamped, so the two stay equal.)
     Beat-independent — [data-beat] elements stay in flow at every beat. */
  function checkOverflow() {
    const out = [];
    state.slides.forEach(function (s) {
      const inner = s.el.querySelector('.slide-inner');
      if (!inner) return;
      const was = s.el.classList.contains('is-active');
      if (!was) {
        s.el.style.visibility = 'hidden'; s.el.style.opacity = '0';
        s.el.classList.add('is-active');
      }
      const cs = getComputedStyle(s.el);
      const availH = s.el.clientHeight -
        parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      const availW = s.el.clientWidth -
        parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const r = inner.getBoundingClientRect();
      let overH = Math.round(r.height - availH);
      let overW = Math.round(r.width - availW);

      /* Measuring only the wrapper misses the common narrow-screen failure:
         .slide-inner fits, but its CHILDREN spill out of it and get clipped.
         Walk the descendants and compare against the slide's content box. */
      const boxL = s.el.getBoundingClientRect().left + parseFloat(cs.paddingLeft);
      const boxR = s.el.getBoundingClientRect().right - parseFloat(cs.paddingRight);
      let spill = 0;
      inner.querySelectorAll('*').forEach(function (n) {
        const b = n.getBoundingClientRect();
        if (b.width === 0 && b.height === 0) return;
        if (getComputedStyle(n).visibility === 'hidden') return;
        spill = Math.max(spill, b.right - boxR, boxL - b.left);
      });
      if (spill > 2) overW = Math.max(overW, Math.round(spill));

      /* In compact mode a slide is allowed to be taller than the frame —
         it scrolls. Horizontal spill is still always a defect. */
      if (document.documentElement.hasAttribute('data-compact')) overH = 0;
      const over = overH > 2 || overW > 2;
      s.el.dataset.overflow = over ? '1' : '0';
      if (over) out.push({ id: s.id, title: s.title, overH: overH, overW: overW });
      if (!was) {
        s.el.classList.remove('is-active');
        s.el.style.visibility = ''; s.el.style.opacity = '';
      }
    });
    return out;
  }

  /* Report every target presentation size in one call. */
  function audit() {
    return {
      viewport: [window.innerWidth, window.innerHeight],
      overflow: checkOverflow(),
      slides: state.slides.map(function (s, i) {
        return (i + 1) + ' ' + s.id + ' act' + s.act + ' beats:' + s.beats + ' — ' + s.title;
      })
    };
  }

  /* ---------- number count-up helper for stat beats ----------
     This deck's credibility rests on its figures, so the animation is
     never allowed to leave a wrong number on screen. The true value is
     written first and last, and a guard timer settles it even if rAF
     never fires (background tab, headless capture, throttled window).
     Callers must also put the TRUE value in the HTML, so the resting
     and no-JS states are correct too. */
  function countUp(el, to, opts) {
    opts = opts || {};
    const from = opts.from || 0;
    const dur = opts.dur || 1100;
    const suffix = opts.suffix || '';
    const prefix = opts.prefix || '';
    const dp = opts.dp || 0;
    const finalText = prefix + Number(to).toFixed(dp) + suffix;
    let done = false;

    function settle() { done = true; el.textContent = finalText; }

    const reduced = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || typeof requestAnimationFrame !== 'function' ||
        typeof performance === 'undefined') { settle(); return; }

    const guard = setTimeout(function () { if (!done) settle(); }, dur + 400);
    const t0 = performance.now();
    function frame(t) {
      if (done) return;
      const p = Math.min(1, (t - t0) / dur);
      if (p >= 1) { clearTimeout(guard); settle(); return; }
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = prefix + (from + (to - from) * e).toFixed(dp) + suffix;
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  return {
    register: register,
    boot: boot,
    next: next,
    prev: prev,
    goto: goto,
    holdPlay: holdPlay,
    releasePlay: releasePlay,
    togglePlay: togglePlay,
    checkOverflow: checkOverflow,
    audit: audit,
    countUp: countUp,
    state: state
  };
})();

document.addEventListener('DOMContentLoaded', function () { Neu10.boot(); });
