  // ============================================================
  // Scroll progress engine — publishes a 0→1 CSS var per [data-progress]
  // element as it travels through the viewport. CSS reads it via
  // scale/translate for a continuous grow-in reveal. The page no longer
  // fires native 'scroll' events (see the heavy-scroll engine below),
  // so this just exposes an update function that engine calls every frame.
  // ============================================================
  window.__updateProgressVars = (function(){
    function clamp(v){ return Math.min(1, Math.max(0, v)); }

    function computeProgress(el, finishPct){
      var rect = el.getBoundingClientRect();
      var vh = window.innerHeight;
      var finishY = (finishPct / 100) * vh; // element's top reaches this point → progress = 1
      return clamp((vh - rect.top) / (vh - finishY));
    }

    var nodes = Array.prototype.slice.call(document.querySelectorAll('[data-progress]'));

    var lastVals = [];
    return function update(){
      var vh = window.innerHeight, vals = new Array(nodes.length), i, el;
      for(i = 0; i < nodes.length; i++){            // phase 1: reads only
        el = nodes[i];
        var finishPct = parseFloat(el.dataset.progressFinish);
        if(isNaN(finishPct)) finishPct = 25;
        var rect = el.getBoundingClientRect();
        vals[i] = clamp((vh - rect.top) / (vh - (finishPct / 100) * vh)).toFixed(4);
      }
      for(i = 0; i < nodes.length; i++){            // phase 2: writes only, skip unchanged
        if(lastVals[i] === vals[i]) continue;
        lastVals[i] = vals[i];
        nodes[i].style.setProperty(nodes[i].dataset.progressVar || '--progress', vals[i]);
      }
    };
  })();

  // ============================================================
  // Services / Why-Romaha media alignment — computes static resting-position
  // offsets (desktop only) so:
  //   • accent-left's top sits a small gap below the label text
  //   • the square's center aligns with accent-left's bottom
  //   • accent-right's top aligns with the square's center
  // These are separate from the scroll-progress entrance animation;
  // both are combined in the CSS translate() for each element.
  // ============================================================
  (function(){
    var GAP = 20;        // px, gap between label text and accent-left
    var CARD_GAP = 28;   // px, gap between a shifted text column and the box below it

    function align(root){
      var label = root.querySelector('.dossier__label');
      var accL = root.querySelector('.media-accent--left');
      var accR = root.querySelector('.media-accent--right');
      var square = root.querySelector('.media-block');
      var card1 = root.querySelector('.ga-card1');
      var card3 = root.querySelector('.ga-card3');
      if(!label || !accL || !accR || !square) return;

      var isDesktop = window.matchMedia('(min-width: 861px)').matches;
      if(!isDesktop){
        accL.style.setProperty('--shift-left', '0px');
        accR.style.setProperty('--shift-right', '0px');
        square.style.setProperty('--shift-square', '0px');
        if(card1) card1.style.setProperty('--shift-card1', '0px');
        if(card3) card3.style.setProperty('--shift-card3', '0px');
        return;
      }

      // Reset before measuring so stale offsets don't skew the read.
      accL.style.setProperty('--shift-left', '0px');
      accR.style.setProperty('--shift-right', '0px');
      square.style.setProperty('--shift-square', '0px');
      if(card1) card1.style.setProperty('--shift-card1', '0px');
      if(card3) card3.style.setProperty('--shift-card3', '0px');

      // The entrance animation's own scale/translate (driven by
      // --progress-*) is still live at measurement time and shifts/shrinks
      // the boxes, which corrupts getBoundingClientRect(). Neutralize it
      // on all three elements for the duration of the read, then restore,
      // so we measure their true static (resting) layout position.
      var els = [accL, accR, square];
      var prevScale = els.map(function(el){ return el.style.scale; });
      var prevTranslate = els.map(function(el){ return el.style.translate; });
      els.forEach(function(el){
        el.style.setProperty('scale', '1');
        el.style.setProperty('translate', '0px 0px');
      });

      var labelBottom = label.getBoundingClientRect().bottom;
      var accLRect = accL.getBoundingClientRect();
      var shiftLeft = (labelBottom + GAP) - accLRect.top;

      var newAccLBottom = accLRect.bottom + shiftLeft;

      var sqRect = square.getBoundingClientRect();
      var shiftSquare = (newAccLBottom - sqRect.height / 2) - sqRect.top;

      var accRRect = accR.getBoundingClientRect();
      var shiftRight = newAccLBottom - accRRect.top;

      // "01" / "03" text columns: pull each down until its own bottom
      // sits CARD_GAP above the top edge of the box it now sits over
      // (the square's / accent-right's fully shifted, max-scale resting
      // position, i.e. the same targets just computed above) — never up
      // past its natural spot, so it can't ride up over the row above it.
      if(card1){
        var finalSquareTop = sqRect.top + shiftSquare;
        var card1Rect = card1.getBoundingClientRect();
        var shiftCard1 = Math.max(0, (finalSquareTop - CARD_GAP) - card1Rect.bottom);
        card1.style.setProperty('--shift-card1', shiftCard1 + 'px');
      }
      if(card3){
        var finalAccRTop = newAccLBottom;
        var card3Rect = card3.getBoundingClientRect();
        var shiftCard3 = Math.max(0, (finalAccRTop - CARD_GAP) - card3Rect.bottom);
        card3.style.setProperty('--shift-card3', shiftCard3 + 'px');
      }

      // The shifted composition can extend past the grid's own natural
      // (untransformed) bottom edge — translate repositions boxes
      // visually but never changes the container's layout height, so
      // without this the next section could sit underneath the shifted
      // accent-right block. Reserve that overflow as real margin.
      var naturalBottom = Math.max(accLRect.bottom, sqRect.bottom, accRRect.bottom);
      var visualBottom = Math.max(
        accLRect.bottom + shiftLeft,
        sqRect.bottom + shiftSquare,
        accRRect.bottom + shiftRight
      );
      var bottomOverflow = Math.max(0, visualBottom - naturalBottom);

      // Restore the entrance transform now that measuring is done.
      els.forEach(function(el, i){
        el.style.scale = prevScale[i];
        el.style.translate = prevTranslate[i];
      });

      accL.style.setProperty('--shift-left', shiftLeft + 'px');
      square.style.setProperty('--shift-square', shiftSquare + 'px');
      accR.style.setProperty('--shift-right', shiftRight + 'px');

      var dossier = root.querySelector('.dossier--services, .dossier--why, .dossier--process');
      if(dossier) dossier.style.setProperty('--comp-bottom-space', bottomOverflow + 'px');
    }

    function alignAll(){
      ['#services', '#why', '#process'].forEach(function(sel){
        var section = document.querySelector(sel);
        if(section) align(section);
      });
    }

    var resizeTimer;
    function scheduleAlign(){
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(alignAll, 120);
    }

    window.addEventListener('load', alignAll);
    window.addEventListener('resize', scheduleAlign);
    if(document.fonts && document.fonts.ready){ document.fonts.ready.then(alignAll); }
    document.addEventListener('DOMContentLoaded', alignAll);
  })();


  // Background video loop with fade
  (function () {
    var video = document.getElementById('bgVideo');
    var FADE_DURATION = 1.2;
    var PAUSE_DURATION = 1000;
    var fadeStarted = false;

    function playFromStart() {
      video.currentTime = 0;
      video.play();
      requestAnimationFrame(function () {
        video.classList.add('bg-video-active');
      });
    }

    video.addEventListener('loadeddata', function () {
      video.play();
      requestAnimationFrame(function () {
        video.classList.add('bg-video-active');
      });
    });

    video.addEventListener('timeupdate', function () {
      var timeLeft = video.duration - video.currentTime;
      if (timeLeft <= FADE_DURATION && timeLeft > 0 && !fadeStarted) {
        fadeStarted = true;
        video.classList.remove('bg-video-active');
      }
    });

    video.addEventListener('ended', function () {
      video.pause();
      video.classList.remove('bg-video-active');
      fadeStarted = false;
      setTimeout(function () {
        playFromStart();
      }, PAUSE_DURATION);
    });
  })();

  // ============================================================
  // HEAVY (inertial) SCROLL
  // Native scrolling is disabled (html/body overflow:hidden). Instead,
  // wheel/touch/key input moves a TARGET scroll value and #scroll-container
  // eases toward it every frame via translate3d — the technique used by
  // the "желаемый скролл" reference, tuned to the same weight as the
  // site-wide engine in main.js and the even-heavier profile scroller in
  // about.js: exponential easing normalized to elapsed time (dt), so it
  // feels the same on a 60Hz and a 120Hz screen, plus device-pixel
  // snapping so settled text doesn't shimmer. The same loop also drives
  // the per-media parallax (желаемый парралакс) and the entrance
  // scale-in (--progress-*), since those no longer get native scroll
  // events either.
  // ============================================================
  (function(){
    var scrollContainer = document.getElementById('scroll-container');
    if(!scrollContainer) return;

    var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    var EASE_60 = reduceMotion ? 1 : 0.05; // share of the remaining distance covered per 60fps frame — lower = heavier/more viscous (about.js's own "viscous" profile scroller uses 0.04)
    var TOUCH_GAIN = 1.6;                  // finger px -> target px, same weight as about.js's viscous scroller
    var FLING_MS = 220, FLING_MIN = 0.1, FLING_MAX = 1300; // release velocity (px/ms) carries the target a little further

    var targetScrollY = 0;
    var currentScrollY = 0;
    var maxScroll = 0;
    var raf = null, last = 0;

    function clamp(v, min, max){ return Math.min(max, Math.max(min, v)); }

    function calculateDimensions(){
      if(typeof updateRevealClearance === 'function') updateRevealClearance();
      var contentHeight = scrollContainer.scrollHeight;
      maxScroll = Math.max(0, contentHeight - window.innerHeight);
      targetScrollY = clamp(targetScrollY, 0, maxScroll);
      updateRevealLockStart();
      updateHeroLayout();
      updateSqLayout(true);
      sortGates();
      updateRevealTopOffset();
      cacheGeometry();
      if(typeof updateSq === 'function'){ updateSq(); kick(); }
    }

    // ---- Scroll-jacked video reveals (sections 01, 02, 03) ----
    // Each section with a .section-reveal box gets its own gate. Scrolling
    // down, the page travels to the gate, then further input opens the video
    // (grows from its top-right corner) and assembles the label letters
    // instead of moving the page; after full opening a short hold is
    // swallowed, then the page continues. Scrolling up reverses everything.
    // Reveals are processed in document order (down) / reverse order (up).
    var revealMQ = window.matchMedia('(max-width: 860px)');
    var revealDesktopMQ = window.matchMedia('(min-width: 861px)');
    var REVEAL_DISTANCE = 460; // was 1840 — 4x faster total: media window opening + text assembly
    var MOBILE_REVEAL_START_OFFSET = 80;
    var REVEAL_HOLD = 130; // was 520 — scaled down 4x together with REVEAL_DISTANCE
    var REVEAL_ARRIVE_TOL = 40;
    var REVEAL_TITLE_GAP = 28;
    var AW = 24, AH = 58, LIGHT_ON = 0.52, LIGHT_OFF = 0.44;

    function splitIntoChars(el){
      if(!el || el.__split) return;
      el.__split = true;
      var text = el.textContent;
      el.textContent = '';
      text.split(/(\s+)/).forEach(function(part){
        if(part === '') return;
        if(/^\s+$/.test(part)){ el.appendChild(document.createTextNode(part)); return; }
        var wordSpan = document.createElement('span');
        wordSpan.className = '-s-word';
        for(var i = 0; i < part.length; i++){
          var charSpan = document.createElement('span');
          charSpan.className = '-s-char';
          charSpan.textContent = part[i];
          charSpan.style.setProperty('--char-random', (Math.random() * 20 - 10).toFixed(3));
          wordSpan.appendChild(charSpan);
        }
        el.appendChild(wordSpan);
      });
    }

    var reveals = ['services', 'why', 'process'].map(function(id){
      var section = document.getElementById(id);
      var el = section ? section.querySelector('.section-reveal') : null;
      if(!el) return null;
      var r = {
        section: section, el: el,
        label: section.querySelector('.dossier__label'),
        dossier: section.querySelector('.dossier'),
        wrap: section.querySelector('.wrap'),
        title: section.querySelector('.section__title'),
        video: el.querySelector('video'),
        frame: el.querySelector('.section-reveal__frame'),
        progress: 0, display: 0, completed: false, lockStart: 0, hold: 0,
        chars: [], broken: false
      };
      if(r.label){
        splitIntoChars(r.label.querySelector('b'));
        splitIntoChars(r.label.querySelector('.dossier__label-text'));
        r.chars = Array.prototype.slice.call(r.label.querySelectorAll('.-s-char'));
      }
      r.canvas = document.createElement('canvas');
      r.canvas.width = AW; r.canvas.height = AH;
      r.ctx = r.canvas.getContext('2d', { willReadFrequently: true });
      if(r.video){
        r.video.addEventListener('error', function(){
          if(r.video.getAttribute('crossorigin') !== null){
            r.video.removeAttribute('crossorigin');
            r.video.setAttribute('src', r.video.getAttribute('src'));
            r.video.load();
            var pp = r.video.play(); if(pp && pp.catch) pp.catch(function(){});
            r.broken = true;
            r.section.classList.add('no-sample');
          }
        });
      }
      return r;
    }).filter(Boolean);


    // ---- Square video takeover gates (sections 01, 02, 03) ----
    // Same gate model as the reveals above. Scrolling down, the page travels
    // to the point where a section's square video reaches its max size (its
    // --progress-square hits 1), then the page is PINNED and input drives
    // three phases instead of moving the page:
    //   grow (SQ_GROW px)  ->  column 04 scrolls (computed px)  ->  shrink (SQ_SHRINK px)
    // After the shrink the video is the square again and the pin is released.
    // Scrolling up reverses everything. q.display (0..1) is the smoothed
    // position along the whole sequence; fa / fb are the phase boundaries.
    // Each section has its own overlay (.sq-takeover[data-sq-for]) with its
    // own copy of the video and its own column 04 text.
    var SQ_GROW = 700, SQ_SHRINK = 700;   // px of scroll input per phase
    var SQ_DIM = 0.55;                    // darkening of the fullscreen video
    var SQ_HOLD = 600;                    // px of scroll input while the full-screen video holds the text
    // text reveal (as the hero of productionportugal): every line is covered by a white bar that
    // wipes in from the left, the text appears under it, and the bar leaves to the right
    var SQ_WIPE_FILL = 0.24, SQ_WIPE_REVEAL = 0.28, SQ_WIPE_STAGGER = 0.05, SQ_RULE_DUR = 0.6;
    function sqBez(x1, y1, x2, y2){                      // cubic-bezier easing, like CSS
      return function(x){
        if(x <= 0) return 0; if(x >= 1) return 1;
        var t = x, i, cx, dx;
        for(i = 0; i < 8; i++){
          cx = 3*x1*t*(1-t)*(1-t) + 3*x2*t*t*(1-t) + t*t*t - x;
          dx = 3*x1*(1-t)*(1-t) + 6*(x2-x1)*(1-t)*t + 3*(1-x2)*t*t;
          if(Math.abs(cx) < 1e-5 || !dx) break;
          t -= cx / dx;
        }
        t = t < 0 ? 0 : (t > 1 ? 1 : t);
        return 3*y1*t*(1-t)*(1-t) + 3*y2*t*t*(1-t) + t*t*t;
      };
    }
    var sqWipeEase = sqBez(0.76, 0, 0.24, 1);
    var sqList = [];
    [].slice.call(document.querySelectorAll('.sq-takeover[data-sq-for]')).forEach(function(el){
      var section = document.getElementById(el.getAttribute('data-sq-for'));
      var block = section ? section.querySelector('.media-block') : null;
      var vid = el.querySelector('video'), col = el.querySelector('.sq-col');
      if(!block || !vid || !col) return;
      var q = {
        block: block, el: el, vid: vid, dim: el.querySelector('.sq-takeover__dim'), col: col,
        progress: 0, display: 0, completed: false, hold: 0,
        holdMax: 0, dist: SQ_GROW + SQ_HOLD + SQ_SHRINK, waitDisplay: true,
        fa: 0.25, fb: 0.75, colH: 600,
        lockStart: 1e9, x: 0, y: 0, w: 0, h: 0, on: false
      };
      // text of column 04: split into lines (see sqBuildLines), shown by a timed wipe
      q.numEl   = col.querySelector('.sq-col__num');
      q.titleEls = [].slice.call(col.querySelectorAll('.sq-t'));
      q.leadEl  = col.querySelector('.sq-col__text');
      q.rule    = col.querySelector('.sq-rule');
      q.itemEls = [].slice.call(col.querySelectorAll('.sq-it'));
      q.lines = []; q.ruleS = 0; q.ruleLast = -1;
      q.tx = 0; q.txTarget = 0; q.txTotal = 0; q.txLast = 0;
      sqList.push(q);
    });


    // ---- Hero gate: the hero is PINNED at the top. The title is revealed by the
    // intro animation on open (see the HERO INTRO script); scroll input then
    // blurs everything out and the hero is released. Same gate model as the square
    // takeovers: the page doesn't move while heroG.progress goes 0 -> 1.
    var HERO_VH = 1.8, HERO_MIN = 1500;      // pinned length: max(1500px, 1.8 x viewport height)
    var heroG = { progress: 0, display: 0, completed: false, hold: 0, holdMax: 0,
                  dist: HERO_MIN, waitDisplay: true, lockStart: 0 };
    var heroEl = document.querySelector('.hero');
    var heroWords = [].slice.call(document.querySelectorAll('.hero__title .hw')).map(function(el){ return { el: el, last: '' }; });
    var heroDivider = heroEl ? { el: heroEl.querySelector('.hero__divider'), last: '' } : null;
    var heroRow = heroEl ? { el: heroEl.querySelector('.hero__footer-row'), last: '' } : null;
    if(heroEl && heroWords.length) heroEl.classList.add('hero-gated');
    function updateHeroLayout(){ heroG.dist = Math.max(HERO_MIN, Math.round(HERO_VH * window.innerHeight)); }
    function heroPut(blk, a, out, scaleX){
      if(!blk || !blk.el) return;
      var p = smooth01(a), op = p * (1 - out);
      var bl = reduceMotion ? 0 : (1 - p) * 12 + out * 10;
      var ty = reduceMotion ? 0 : (1 - p) * 26 - out * 14;
      var key = op.toFixed(3) + '|' + bl.toFixed(1) + '|' + ty.toFixed(1);
      if(key === blk.last) return;
      blk.last = key;
      blk.el.style.opacity = op.toFixed(3);
      blk.el.style.filter = bl > 0.05 ? 'blur(' + bl.toFixed(1) + 'px)' : 'none';
      blk.el.style.transform = scaleX ? 'scaleX(' + p.toFixed(3) + ')' : 'translate3d(0,' + ty.toFixed(1) + 'px,0)';
    }
    function updateHero(){
      if(!heroWords.length) return;
      var t = heroG.display, i, n = heroWords.length;
      var out = smooth01((t - 0.04) / 0.80);                 // scroll gradually blurs everything out
      for(i = 0; i < n; i++) heroPut(heroWords[i], 1, out);  // words are already in place
      heroPut(heroDivider, 1, out, true);
      heroPut(heroRow, 1, out);
    }

    var gates = reveals.concat(sqList);
    function sortGates(){ gates.sort(function(a, b){ return a.lockStart - b.lockStart; }); }
    function sqEngaged(q){ return (q.progress > 0 && q.progress < 1) || (q.display > 0.0005 && q.display < 0.9995); }

    // ---- column 04 text: lines + wipe ----
    // Every line becomes  .sq-line > (.sq-line__c content + .sq-line__m mask).
    // Titles / number are one line each; the lead and the points are split
    // into the lines the browser actually wraps them to (re-done on resize).
    function sqMakeLine(el, block){
      var c = document.createElement('span'), m = document.createElement('span');
      c.className = 'sq-line__c'; m.className = 'sq-line__m';
      return { el: el, c: c, m: m, s: 0, key: '' };
    }
    function sqBuildLines(q){
      var seq = [], t;
      if(q.numEl) seq.push({ el: q.numEl, multi: false });
      q.titleEls.forEach(function(el){ seq.push({ el: el, multi: false }); });
      if(q.leadEl) seq.push({ el: q.leadEl, multi: true });
      seq.push({ rule: true });
      q.itemEls.forEach(function(el){ seq.push({ el: el, multi: true }); });

      q.lines = [];
      var slot = 0;
      seq.forEach(function(it){
        if(it.rule){ q.ruleS = SQ_WIPE_STAGGER * slot; slot++; return; }
        var el = it.el;
        if(el.__sqHTML === undefined) el.__sqHTML = el.innerHTML;
        el.innerHTML = el.__sqHTML;                          // start from the pristine markup
        el.classList.remove('sq-line', 'is-revealed');

        if(!it.multi){                                       // one line = the element itself
          var L = sqMakeLine(el);
          while(el.firstChild) L.c.appendChild(el.firstChild);
          el.classList.add('sq-line');
          el.appendChild(L.c); el.appendChild(L.m);
          L.s = SQ_WIPE_STAGGER * slot++;
          q.lines.push(L);
          return;
        }

        // multi-line: words -> measure -> regroup per visual line
        var toks = [];
        [].slice.call(el.childNodes).forEach(function(n){
          if(n.nodeType === 3){
            n.textContent.split(/(\s+)/).forEach(function(p){
              if(!p) return;
              toks.push(/^\s+$/.test(p) ? { sp: true } : { txt: p });
            });
          } else toks.push({ node: n });
        });
        el.textContent = '';
        var words = [];
        toks.forEach(function(k){
          if(k.sp){ el.appendChild(document.createTextNode(' ')); return; }
          var w = document.createElement('span');
          w.className = 'sq-w';
          if(k.node) w.appendChild(k.node); else w.textContent = k.txt;
          el.appendChild(w); words.push(w);
        });
        var groups = [], top = null;
        words.forEach(function(w){
          var y = Math.round(w.getBoundingClientRect().top);
          if(top === null || Math.abs(y - top) > 3){ groups.push([]); top = y; }
          groups[groups.length - 1].push(w);
        });
        el.textContent = '';
        groups.forEach(function(g){
          var L = sqMakeLine(null);
          var ln = document.createElement('span');
          ln.className = 'sq-line sq-ln';
          g.forEach(function(w, i){ if(i) L.c.appendChild(document.createTextNode(' ')); L.c.appendChild(w); });
          ln.appendChild(L.c); ln.appendChild(L.m);
          el.appendChild(ln);
          L.el = ln;
          L.s = SQ_WIPE_STAGGER * slot++;
          q.lines.push(L);
        });
      });

      var end = SQ_RULE_DUR + q.ruleS;
      q.lines.forEach(function(L){ end = Math.max(end, L.s + SQ_WIPE_FILL + SQ_WIPE_REVEAL); });
      q.txTotal = end;
      q.tx = 0; q.txTarget = 0; q.ruleLast = -1;
      if(q.rule) q.rule.style.transform = '';
    }

    // q.tx = seconds along the wipe timeline (0 .. txTotal); lines are a pure function of it,
    // so scrolling back plays the very same wipe in reverse
    function sqApplyText(q){
      var F = SQ_WIPE_FILL, R = SQ_WIPE_REVEAL, tx = q.tx;
      q.col.style.visibility = tx > 0 ? 'visible' : 'hidden';
      q.lines.forEach(function(L){
        var u = tx - L.s, sc, org, vis;
        if(u <= 0){ sc = 0; org = 'left'; vis = false; }
        else if(u < F){ sc = sqWipeEase(u / F); org = 'left'; vis = false; }
        else if(u < F + R){ sc = 1 - sqWipeEase((u - F) / R); org = 'right'; vis = true; }
        else { sc = 0; org = 'right'; vis = true; }
        var key = sc.toFixed(3) + org + vis;
        if(key === L.key) return;
        L.key = key;
        L.m.style.transform = 'scaleX(' + sc.toFixed(3) + ')';
        L.m.style.transformOrigin = org + ' center';
        L.c.style.visibility = vis ? 'visible' : 'hidden';
        (L.el).classList.toggle('is-revealed', vis);
      });
      if(q.rule){
        var rl = Math.round(sqWipeEase((tx - q.ruleS) / SQ_RULE_DUR) * 1000) / 1000;
        if(rl !== q.ruleLast){ q.ruleLast = rl; q.rule.style.transform = 'scaleX(' + rl + ')'; }
      }
    }

    // Static (resting) geometry of each square inside #scroll-container and of
    // its column 04. offset* ignore the entrance scale/translate, so the
    // block's --shift-square is added by hand; at progress 1 its scale is 1.
    // full === false skips the (costlier) per-word measuring.
    function updateSqLayout(full){
      var vh = window.innerHeight;
      sqList.forEach(function(q){
        if(sqEngaged(q)) return;                // never move a gate mid-takeover
        var x = 0, y = 0, n = q.block;
        while(n && n !== scrollContainer){ x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
        var shift = parseFloat(q.block.style.getPropertyValue('--shift-square')) || 0;
        var finish = parseFloat(q.block.dataset.progressFinish);
        if(isNaN(finish)) finish = 25;
        q.x = x; q.y = y + shift;
        q.w = q.block.offsetWidth; q.h = q.block.offsetHeight;
        q.lockStart = q.y - (finish / 100) * vh;

        if(full !== false){
          sqBuildLines(q);
          q.colH = q.col.offsetHeight;
        }
        var travel = SQ_HOLD;   // full-screen video holds the text for this much scroll input
        q.dist = SQ_GROW + travel + SQ_SHRINK;
        q.fa = SQ_GROW / q.dist;
        q.fb = (SQ_GROW + travel) / q.dist;
      });
    }

    function revealOn(){ return reveals.length > 0 && (revealMQ.matches || revealDesktopMQ.matches); }

    // Adaptive label colour: letters over light parts of the video turn dark.
    function updateAdaptive(r){
      if(!r.video || !r.chars.length) return;
      var p = r.display, i;
      var active = revealOn() && p > 0.01 && r.video.readyState >= 2 && !r.broken;
      if(!active){
        for(i = 0; i < r.chars.length; i++){
          if(r.chars[i].__light){ r.chars[i].__light = false; r.chars[i].classList.remove('on-light'); }
        }
        return;
      }
      var vw = r.video.videoWidth, vh = r.video.videoHeight;
      if(!vw || !vh) return;
      var boxAspect = AW / AH, vidAspect = vw / vh, sx = 0, sy = 0, sw = vw, sh = vh;
      if(vidAspect > boxAspect){ sw = vh * boxAspect; sx = (vw - sw) / 2; }
      else { sh = vw / boxAspect; sy = (vh - sh) / 2; }
      var data;
      try{
        r.ctx.drawImage(r.video, sx, sy, sw, sh, 0, 0, AW, AH);
        data = r.ctx.getImageData(0, 0, AW, AH).data;
      }catch(err){
        r.broken = true; r.section.classList.add('no-sample'); return;
      }
      var b = r.el.getBoundingClientRect();
      var fr = r.frame.getBoundingClientRect();
      var x0 = b.right - b.width * p, y0 = b.top;
      var visH = b.height * p;
      var n = r.chars.length, rects = new Array(n), j;
      for(j = 0; j < n; j++) rects[j] = r.chars[j].getBoundingClientRect();   // all reads first
      var changes = [];
      for(j = 0; j < n; j++){
        var el = r.chars[j], rc = rects[j];
        var cx = (rc.left + rc.right) / 2, cy = (rc.top + rc.bottom) / 2;
        var light = false;
        if(cx >= x0 && cx <= b.right && cy >= y0 && cy <= y0 + visH && fr.width > 0 && fr.height > 0){
          var u = Math.min(AW - 1, Math.max(0, Math.floor((cx - fr.left) / fr.width * AW)));
          var v = Math.min(AH - 1, Math.max(0, Math.floor((cy - fr.top) / fr.height * AH)));
          var sum = 0, cnt = 0;
          for(var dy = -1; dy <= 1; dy++){
            for(var dx = -1; dx <= 1; dx++){
              var uu = u + dx, vv = v + dy;
              if(uu < 0 || vv < 0 || uu >= AW || vv >= AH) continue;
              var k = (vv * AW + uu) * 4;
              sum += (0.2126 * data[k] + 0.7152 * data[k + 1] + 0.0722 * data[k + 2]) / 255;
              cnt++;
            }
          }
          var lum = sum / cnt;
          light = el.__light ? lum > LIGHT_OFF : lum > LIGHT_ON;
        }
        if(el.__light !== light) changes.push(el, light);
      }
      for(j = 0; j < changes.length; j += 2){                                  // then all writes
        changes[j].__light = changes[j + 1];
        changes[j].classList.toggle('on-light', changes[j + 1]);
      }
    }
    var adaptTick = 0, touchingNow = false;
    window.addEventListener('touchstart', function(){ touchingNow = true; }, { passive: true });
    window.addEventListener('touchend', function(){ touchingNow = false; }, { passive: true });
    window.addEventListener('touchcancel', function(){ touchingNow = false; }, { passive: true });
    setInterval(function(){
      // one reveal per tick (staggered) and only if its video box is on screen
      adaptTick = (adaptTick + 1) % reveals.length;
      var r = reveals[adaptTick];
      var b = r.el.getBoundingClientRect();
      var onScreen = b.bottom > 0 && b.top < window.innerHeight;
      if(!onScreen){ if(r.__wasOn){ r.__wasOn = false; updateAdaptiveOff(r); } return; }
      r.__wasOn = true;
      // skip while the page is in fast motion: keeps the scroll frames clean
      if(Math.abs(targetScrollY - currentScrollY) > 1.5 || touchingNow) return;
      updateAdaptive(r);
    }, 90);
    function updateAdaptiveOff(r){
      for(var i = 0; i < r.chars.length; i++){
        if(r.chars[i].__light){ r.chars[i].__light = false; r.chars[i].classList.remove('on-light'); }
      }
    }

    function updateRevealLockStart(){
      reveals.forEach(function(r){
        if(revealDesktopMQ.matches && r.dossier){
          var dRect = r.dossier.getBoundingClientRect();
          r.lockStart = dRect.top + currentScrollY - window.innerHeight * 0.5;
        } else if(r.label){
          var rect = r.label.getBoundingClientRect();
          r.lockStart = rect.bottom + currentScrollY - window.innerHeight + MOBILE_REVEAL_START_OFFSET;
        } else {
          r.lockStart = r.section.offsetTop;
        }
      });
    }

    // Keeps the tall reveal video (top-right, absolutely positioned) from
    // running over the accent videos below it on tablet-width portrait screens.
    var REVEAL_CLEAR_GAP = 24;
    function updateRevealClearance(){
      if(typeof reveals === 'undefined') return;
      reveals.forEach(function(r){
        if(!r || !r.dossier) return;
        if(!revealMQ.matches){ r.dossier.style.removeProperty('--reveal-clear'); return; }
        var accR = r.dossier.querySelector('.media-accent--right');
        if(!accR) return;
        r.dossier.style.setProperty('--reveal-clear', '0px');   // measure the un-pushed layout
        // offsetTop / offsetHeight ignore the scale/translate entrance animations
        var revealBottom = r.el.offsetTop + r.el.offsetHeight;
        var clear = Math.max(0, revealBottom + REVEAL_CLEAR_GAP - accR.offsetTop);
        r.dossier.style.setProperty('--reveal-clear', Math.ceil(clear) + 'px');
      });
    }

    function updateRevealTopOffset(){
      reveals.forEach(function(r){
        if(!revealDesktopMQ.matches || !r.wrap || !r.title){
          r.el.style.removeProperty('--reveal-top-offset');
          return;
        }
        var titleBottom = r.title.getBoundingClientRect().bottom;
        var wrapTop = r.wrap.getBoundingClientRect().top;
        r.el.style.setProperty('--reveal-top-offset', ((titleBottom - wrapTop) + REVEAL_TITLE_GAP).toFixed(1) + 'px');
      });
    }

    function setRevealProgress(r, p){ r.progress = clamp(p, 0, 1); kick(); }
    function holdOf(r){ return r.holdMax != null ? r.holdMax : REVEAL_HOLD; }
    function distOf(r){ return r.dist || REVEAL_DISTANCE; }

    function stepDown(r, delta){
      if(delta <= 0) return delta;
      var H = holdOf(r), D = distOf(r);
      if(!r.completed){
        var toGate = r.lockStart - targetScrollY;
        if(toGate > 0){
          var move = Math.min(delta, toGate);
          targetScrollY = clamp(targetScrollY + move, 0, maxScroll);
          delta -= move;
        }
        if(delta > 0 && targetScrollY >= r.lockStart - 0.5 && currentScrollY < r.lockStart - REVEAL_ARRIVE_TOL){
          delta = 0;
        }
        if(delta > 0 && targetScrollY >= r.lockStart - 0.5){
          var remaining = (1 - r.progress) * D;
          var consume = Math.min(delta, remaining);
          setRevealProgress(r, r.progress + consume / D);
          delta -= consume;
          if(r.progress >= 1) r.completed = true;
        }
      }
      // fullscreen takeover: stay pinned until the video has visually finished growing
      if(delta > 0 && r.completed && r.waitDisplay && r.display < 0.98 && targetScrollY <= r.lockStart + 0.5){
        delta = 0;
      }
      if(delta > 0 && r.completed && r.hold < H && targetScrollY <= r.lockStart + 0.5){
        if(r.display < 0.95){ delta = 0; }
      }
      if(delta > 0 && r.completed && r.hold < H && targetScrollY <= r.lockStart + 0.5){
        var holdTake = Math.min(delta, H - r.hold);
        r.hold += holdTake;
        delta -= holdTake;
        if(r.hold >= H) delta = 0;
      }
      return delta;
    }

    function stepUp(r, delta){
      if(delta >= 0) return delta;
      var D = distOf(r);
      if((r.progress > 0 || r.hold > 0) && targetScrollY > r.lockStart + 0.5){
        var moveUp = Math.min(-delta, targetScrollY - r.lockStart);
        targetScrollY = clamp(targetScrollY - moveUp, 0, maxScroll);
        delta += moveUp;
      }
      if((r.hold > 0 || r.progress > 0) && targetScrollY <= r.lockStart + 0.5 && currentScrollY > r.lockStart + REVEAL_ARRIVE_TOL){
        delta = 0;
      }
      if(delta < 0 && r.hold > 0 && targetScrollY <= r.lockStart + 0.5){
        var holdBack = Math.min(-delta, r.hold);
        r.hold -= holdBack;
        delta += holdBack;
      }
      if(delta < 0 && r.progress > 0 && targetScrollY <= r.lockStart + 0.5){
        var consumeUp = Math.min(-delta, r.progress * D);
        setRevealProgress(r, r.progress - consumeUp / D);
        delta += consumeUp;
        if(r.progress < 1){ r.completed = false; r.hold = 0; }
      }
      if(delta < 0 && r.progress <= 0 && r.display > 0.02 && targetScrollY <= r.lockStart + 0.5){
        delta = 0;
      }
      return delta;
    }

    function handleScrollInput(delta){
      if(delta === 0 || window.__heroIntro) return;      // intro in progress: input only skips it
      var i;
      if(revealOn()){
        if(!sqList.some(sqEngaged)){ updateSqLayout(false); sortGates(); }
        if(delta > 0){ for(i = 0; i < gates.length; i++) delta = stepDown(gates[i], delta); }
        else { for(i = gates.length - 1; i >= 0; i--) delta = stepUp(gates[i], delta); }
      }
      targetScrollY = clamp(targetScrollY + delta, 0, maxScroll);
    }

    // After a jump (anchor link / Home / End): gates above the new position
    // count as already opened, gates below as closed.
    function syncRevealsToTarget(){
      updateSqLayout(true);
      sortGates();
      gates.forEach(function(r){
        if(r.lockStart < targetScrollY - 1){ r.progress = 1; r.completed = true; r.hold = holdOf(r); }
        else { r.progress = 0; r.completed = false; r.hold = 0; }
      });
      kick();
    }

    // ---- Pull-down-to-reload, at the very top, on touch ----
    // Real browser pull-to-refresh can't fire here: it needs the document
    // itself to be the scroller, and html/body are overflow:hidden so this
    // engine can drive #scroll-container instead. So the same gesture is
    // rebuilt by hand: while already at the top, a downward drag rubber-
    // bands the whole container a little (visual confirmation the pull
    // registered) and past a threshold it reloads the page — release
    // before the threshold and it springs back with no reload.
    var PULL_THRESHOLD = 76;  // px of actual finger travel to trigger reload
    var PULL_MAX = 130;       // px, visual cap on the rubber-band offset
    var PULL_RESISTANCE = 0.5;
    var pullOffset = 0, pullOffsetTarget = 0;
    var pulling = false, pullStartY = 0, reloadTriggered = false;

    // ---- Media parallax (mirrors the "желаемый парралакс" reference) ----
    var mediaNodes = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]')).map(function(el){
      return { el: el, frame: el.querySelector('.media-window__frame') };
    }).filter(function(m){ return m.frame; });

    var OVERFLOW_FRACTION = 0.2; // matches the 10%/10% top/bottom in CSS

    var appliedY = 0;
    function cacheGeometry(){
      mediaNodes.forEach(function(m){
        var r = m.el.getBoundingClientRect();
        m.top = r.top + appliedY; m.h = r.height; m.last = null;
      });
      reveals.forEach(function(rv){
        var r = rv.el.getBoundingClientRect();
        rv.top = r.top + appliedY; rv.h = r.height; rv.last = null;
      });
    }
    function parallaxFor(n, y, vh){
      var t = n.top - y;                                   // current viewport top, no layout read
      if(t > vh + 60 || t + n.h < -60) return;             // off screen: skip
      var tt = 2 * ((t + n.h * 0.5) / vh - 0.5);
      var off = Math.round(-0.4 * OVERFLOW_FRACTION * n.h * tt * 10) / 10;
      if(off === n.last) return;
      n.last = off;
      n.frame.style.transform = 'translate3d(0,' + off + 'px,0)';
    }
    function updateMediaParallax(y){
      var vh = window.innerHeight, i;
      for(i = 0; i < reveals.length; i++) if(reveals[i].frame) parallaxFor(reveals[i], y, vh);
      for(i = 0; i < mediaNodes.length; i++) parallaxFor(mediaNodes[i], y, vh);
    }

    // Drives the fixed takeover layer from sq.display (position along the
    // whole sequence). e = how "full" the video is (0 = the square's own box,
    // 1 = whole viewport), t = progress of column 04's scroll. No layout reads:
    // the square's resting box and the word positions are cached in sq.*.
    function smooth01(x){ x = x < 0 ? 0 : (x > 1 ? 1 : x); return x * x * (3 - 2 * x); }

    function updateSq(){ sqList.forEach(updateSqOne); }

    function updateSqOne(sq){
      var d = sq.display;
      var on = d > 0.0005 && d < 0.9995;   // at 0 and 1 the real square is back in place

      if(on !== sq.on){
        sq.on = on;
        sq.el.classList.toggle('is-on', on);
        sq.block.style.visibility = on ? 'hidden' : '';   // original square steps aside
        if(on){
          var src = sq.block.querySelector('video');
          try{
            if(src && sq.vid.readyState >= 1 && Math.abs(sq.vid.currentTime - src.currentTime) > 0.15) sq.vid.currentTime = src.currentTime;
          }catch(err){}
          var pp = sq.vid.play(); if(pp && pp.catch) pp.catch(function(){});
        } else {
          sq.vid.pause();
          sq.col.style.visibility = 'hidden';
        }
      }
      if(!on){
        if(sq.tx !== 0){ sq.tx = 0; sq.txTarget = 0; sqApplyText(sq); }
        return;
      }

      var vw = window.innerWidth, vh = window.innerHeight;
      var A = sq.fa, B = sq.fb;
      var e = smooth01(d / A) * (1 - smooth01((d - B) / (1 - B)));
      var t = Math.min(1, Math.max(0, (d - A) / (B - A)));

      var by = sq.y - appliedY;
      var st = sq.el.style;
      st.left   = (sq.x * (1 - e)).toFixed(2) + 'px';
      st.top    = (by * (1 - e)).toFixed(2) + 'px';
      st.width  = (sq.w + (vw - sq.w) * e).toFixed(2) + 'px';
      st.height = (sq.h + (vh - sq.h) * e).toFixed(2) + 'px';

      // match the square's own parallax crop (its frame is 120% tall) and relax it to plain cover
      var pn = null, j;
      for(j = 0; j < mediaNodes.length; j++){ if(mediaNodes[j].el === sq.block){ pn = mediaNodes[j]; break; } }
      var k2 = 1 - e, par = (pn && pn.last) || 0;
      sq.vid.style.top = (-10 * k2).toFixed(2) + '%';
      sq.vid.style.height = (100 + 20 * k2).toFixed(2) + '%';
      sq.vid.style.transform = 'translate3d(0,' + (par * k2).toFixed(2) + 'px,0)';
      if(sq.dim) sq.dim.style.opacity = (SQ_DIM * e).toFixed(3);

      // column 04 text: once the video has grown to the full screen the lines wipe in
      // (timed, not tied to scroll) and then stay still. Scrolling on (the shrink phase)
      // wipes them out again while the video shrinks back into the square.
      var wantText = d >= A - 0.002 && d <= B;
      sq.txTarget = wantText ? sq.txTotal : 0;
      var now = performance.now(), dtq = Math.min(60, sq.txLast ? now - sq.txLast : 16);
      sq.txLast = now;
      if(sq.tx !== sq.txTarget){
        if(reduceMotion) sq.tx = sq.txTarget;
        else {
          var stp = (sq.tx < sq.txTarget ? 1 : 1.8) * dtq / 1000;   // out is quicker than in
          sq.tx = sq.tx < sq.txTarget ? Math.min(sq.txTarget, sq.tx + stp) : Math.max(sq.txTarget, sq.tx - stp);
        }
        sqApplyText(sq);
      }
      if(sq.tx <= 0) return;

      // static, vertically centred; on short screens the column is scaled down to fit
      var availH = vh - 96 - 32;
      var kf = sq.colH > availH ? Math.max(0.55, availH / sq.colH) : 1;
      var cy = Math.max(96, (vh - sq.colH * kf) / 2);
      sq.col.style.transform = 'translate3d(0,' + cy.toFixed(1) + 'px,0) scale(' + kf.toFixed(3) + ')';
    }

    function kick(){ if(raf === null){ last = 0; raf = requestAnimationFrame(animate); } }

    function animate(now){
      var dt = last ? Math.min(50, now - last) : 16.667;
      last = now;
      var k = 1 - Math.pow(1 - EASE_60, dt / 16.667);

      var diff = targetScrollY - currentScrollY;
      if(Math.abs(diff) < 0.1) currentScrollY = targetScrollY; else currentScrollY += diff * k;

      sqList.forEach(function(q){
        var sd = q.progress - q.display;
        if(Math.abs(sd) < 0.0015) q.display = q.progress; else q.display += sd * (k * 1.2);
      });

      var hd = heroG.progress - heroG.display;
      if(Math.abs(hd) < 0.0015) heroG.display = heroG.progress; else heroG.display += hd * (k * 1.2);

      var pullDiff = pullOffsetTarget - pullOffset;
      if(Math.abs(pullDiff) < 0.1) pullOffset = pullOffsetTarget; else pullOffset += pullDiff * k;

      reveals.forEach(function(r){
        var rd = r.progress - r.display;
        if(Math.abs(rd) < 0.0015) r.display = r.progress; else r.display += rd * (k * 1.2);
        if(r.display !== r.written){
          r.written = r.display;
          var v = r.display.toFixed(4);
          r.el.style.setProperty('--reveal-progress', v);
          r.section.style.setProperty('--reveal-progress', v);
        }
      });

      var dpr = window.devicePixelRatio || 1;
      var y = Math.round((currentScrollY - pullOffset) * dpr) / dpr;
      scrollContainer.style.transform = 'translate3d(0,' + (-y).toFixed(2) + 'px,0)';

      if(window.__updateProgressVars) window.__updateProgressVars();
      appliedY = y;
      updateMediaParallax(y);
      updateSq();
      updateHero();

      if(heroG.display !== heroG.progress || currentScrollY !== targetScrollY || pullOffset !== pullOffsetTarget || reveals.some(function(r){ return r.display !== r.progress; }) || sqList.some(function(q){ return q.display !== q.progress || q.tx !== q.txTarget; })){
        raf = requestAnimationFrame(animate);
      } else {
        raf = null; last = 0;
      }
    }

    function contactOpen(){ var c = document.documentElement.classList; return c.contains('contact-open') || c.contains('menu-open'); }
    window.addEventListener('wheel', function(e){
      if(contactOpen()) return;          // let the form scroll natively
      e.preventDefault();
      handleScrollInput(e.deltaY);
      kick();
    }, { passive: false });

    var touchY = 0, touchVelocity = 0, touchLastT = 0;
    window.addEventListener('touchstart', function(e){
      if(e.touches.length !== 1 || contactOpen()) return;
      touchY = e.touches[0].clientY;
      pullStartY = touchY;
      pulling = currentScrollY <= 0.5 && heroG.progress <= 0.001;
      reloadTriggered = false;
      touchVelocity = 0;
      touchLastT = performance.now();
    }, { passive: true });

    window.addEventListener('touchmove', function(e){
      if(!e.touches.length || contactOpen()) return;
      var y = e.touches[0].clientY;

      if(pulling){
        if(reloadTriggered){ if(e.cancelable) e.preventDefault(); return; }
        var raw = y - pullStartY; // positive = finger dragged down
        if(raw <= 0){
          pulling = false; // finger reversed upward: hand off to normal scrolling below
        } else {
          if(e.cancelable) e.preventDefault();
          pullOffsetTarget = Math.min(PULL_MAX, raw * PULL_RESISTANCE);
          kick();
          if(raw >= PULL_THRESHOLD){
            reloadTriggered = true;
            setTimeout(function(){ window.location.reload(); }, 80);
          }
          touchY = y;
          return;
        }
      }

      var now = performance.now();
      var dt = Math.max(1, now - touchLastT);
      var deltaY = (touchY - y) * TOUCH_GAIN;
      touchVelocity = touchVelocity * 0.7 + (deltaY / dt) * 0.3; // smoothed release velocity, gained-px/ms
      touchLastT = now;
      handleScrollInput(deltaY);
      touchY = y;
      if(e.cancelable) e.preventDefault();
      kick();
    }, { passive: false });

    function touchEnd(){
      if(pulling && !reloadTriggered){
        pullOffsetTarget = 0; // spring back
      } else if(!pulling){
        var v = (performance.now() - touchLastT > 80) ? 0 : touchVelocity; // finger rested before lifting: no fling
        if(Math.abs(v) > FLING_MIN) handleScrollInput(Math.max(-FLING_MAX, Math.min(FLING_MAX, v * FLING_MS)));
      }
      pulling = false;
      kick();
    }
    window.addEventListener('touchend', touchEnd, { passive: true });
    window.addEventListener('touchcancel', touchEnd, { passive: true });

    // Keyboard scrolling (space/page/arrow/home/end) so the page stays
    // navigable without a wheel or touch surface.
    window.addEventListener('keydown', function(e){
      if(contactOpen()) return;
      var vh = window.innerHeight;
      var step = null;
      switch(e.key){
        case 'ArrowDown': step = 80; break;
        case 'ArrowUp': step = -80; break;
        case 'PageDown': step = vh * 0.9; break;
        case 'PageUp': step = -vh * 0.9; break;
        case ' ': step = e.shiftKey ? -vh * 0.9 : vh * 0.9; break;
        case 'Home': targetScrollY = 0; syncRevealsToTarget(); return;
        case 'End': targetScrollY = maxScroll; syncRevealsToTarget(); return;
        default: return;
      }
      if(document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) return;
      e.preventDefault();
      handleScrollInput(step);
      kick();
    }, { passive: false });

    // Internal anchor links (#top, #services, ...) jump by moving the
    // target scroll position instead of relying on native anchor scroll.
    document.addEventListener('click', function(e){
      var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
      if(!a) return;
      var id = a.getAttribute('href').slice(1);
      if(!id) return;
      var target = document.getElementById(id);
      if(!target) return;
      e.preventDefault();
      var rect = target.getBoundingClientRect();
      targetScrollY = clamp(currentScrollY + rect.top, 0, maxScroll);
      syncRevealsToTarget();
    });

    window.addEventListener('resize', calculateDimensions);
    if(document.fonts && document.fonts.ready){ document.fonts.ready.then(calculateDimensions); }
    window.addEventListener('load', calculateDimensions);

    calculateDimensions();
    updateHero();
    kick();
  })();
;
(function(){
  'use strict';
  if(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // selector -> mode. Long copy animates by word, short headings by letter.
  var targets = [
    ['.section__title', 'chars'],
    ['.card__title', 'words'],
    ['.card__text', 'words', true]
  ];

  function build(el, mode, soft){
    if(soft) el.classList.add('ta-soft');
    var text = el.textContent.trim().replace(/\s+/g, ' ');
    el.setAttribute('aria-label', text);
    if(el.querySelector('.hw')){
      // pre-split title: each .hw span is one animated unit, layout stays intact
      var hws = [].slice.call(el.querySelectorAll('.hw'));
      hws.forEach(function(u, i){ u.classList.add('ta-unit'); u.style.setProperty('--i', i); });
      var st = Math.min(80, 1000 / hws.length);
      el.style.setProperty('--stagger', st.toFixed(1) + 'ms');
      el.__taDuration = hws.length * st + 1000;
      el.setAttribute('aria-label', text);
      el.classList.add('ta-ready');
      return;
    }
    el.textContent = '';
    var frag = document.createDocumentFragment();
    var words = text.split(' '), units = [], idx = 0;
    words.forEach(function(w, wi){
      var wordSpan = document.createElement('span');
      wordSpan.className = 'ta-word';
      wordSpan.setAttribute('aria-hidden', 'true');
      var parts = mode === 'chars' ? w.split('') : [w];
      parts.forEach(function(p){
        var u = document.createElement('span');
        u.className = 'ta-unit';
        u.style.setProperty('--i', idx++);
        u.textContent = p;
        wordSpan.appendChild(u);
        units.push(u);
      });
      frag.appendChild(wordSpan);
      if(wi < words.length - 1) frag.appendChild(document.createTextNode(' '));
    });
    el.appendChild(frag);
    // total stagger capped so long paragraphs still finish in about a second
    var stagger = Math.min(mode === 'chars' ? 45 : 55, 1000 / Math.max(1, units.length));
    el.style.setProperty('--stagger', stagger.toFixed(1) + 'ms');
    el.__taDuration = units.length * stagger + 1000;
    el.classList.add('ta-ready');
  }

  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(en){
      if(!en.isIntersecting) return;
      var el = en.target;
      io.unobserve(el);
      el.classList.add('ta-in');
      setTimeout(function(){ el.classList.add('ta-done'); }, el.__taDuration);
    });
  }, { threshold: 0.2, rootMargin: '0px 0px -8% 0px' });

  targets.forEach(function(t){
    document.querySelectorAll(t[0]).forEach(function(el){
      build(el, t[1], t[2]);
      io.observe(el);
    });
  });
})();

;
(function(){
'use strict';

/* ---------- helpers ---------- */
let M=false;
const P=(d,m)=>M?m:d;
const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;');
const INK='#f3f1ec';

/* scramble line: diagonal "\" mask sweeps across the text */
const sc=(t,o={})=>{
  const L=t.length, i=o.i||0, sg=o.sg||.07, s0=o.s??.5, d=o.d||.04, e=o.e||.9, m=o.m||2;
  return `<span class="sc" style="--length:${L};--stagger-index:${i};--stagger:${sg}s;--start-delay:${s0}s;--max-duration:.7s;--duration-per-char:${d}s;--easing-steps-factor:${e};--easing-steps:${Math.max(1,Math.trunc(L*e))};--mask-offset-factor:${m};${o.st||''}"><span class="sb">${esc(t)}</span><span class="sm" aria-hidden="true" style="--maskText:'${'\\\\'.repeat(L)}'"></span></span>`;
};
/* typewriter: characters appear one by one */
const tw=(t,s,st=.04,x='')=>`<span class="tw" style="--st:${st}s;--sd:${s}s;--n:${t.length};${x}">${[...t].map((c,i)=>`<span class="tc" style="--i:${i}">${c===' '?'&nbsp;':esc(c)}</span>`).join('')}</span>`;

/* brand slash — same parallelogram as the reference, used as a "/" from a URL */
const SL=`<svg class="sl" viewBox="0 0 211 315"><path d="M52.54 0H0l157.459 315h52.623z" fill="${INK}"/></svg>`;
const SLo=`<svg class="sl" viewBox="-2 -2 215 319" overflow="visible"><path d="M52.54 0H0l157.459 315h52.623z" fill="none" stroke="${INK}" stroke-width="1.5"/></svg>`;
const SLp=`<svg viewBox="0 0 211 315"><path d="M52.54 0H0l157.459 315h52.623z" fill="${INK}"/></svg>`;
const slashLoader=w=>{let p='';for(let i=0;i<40;i++)p+=`M${(i*8.2).toFixed(1)} ${i%5?7:0}h1.6v${i%5?12:19}h-1.6z`;return `<svg width="${w}" height="${w/17.32}" viewBox="0 0 329 19" fill="${INK}"><path d="${p}"/></svg>`};

/* justified word row */
function rw3(s,ws){const ml=[0,P(8,6),P(8,6),P(10,8),P(18,14)];return `<div class="j">${ws.map((w,i)=>tw(w,s+i*.05,.04,i?`margin-left:${ml[i]}px`:'')).join('')}</div>`}

/* ---------- geometry (filled by fit) ---------- */
let SW=1440,SH=810,OX=0,OY=0,CW=1440,CH=810;

/* ================= SLIDE 1 — manifesto ================= */
function buildK1(){
  const para=P(
    ['Custom websites for Tbilisi businesses and','beyond. Hand-written code, not bloated','templates. A fixed scope and honest','timelines. SEO built in from day one,','not bolted on after launch.'],
    ['Custom websites for Tbilisi','businesses and beyond. Hand-written','code, not bloated templates. A fixed','scope and honest timelines. SEO','built in from day one, not bolted','on after launch.']);
  const lh=P(21,16), gap=3, n=para.length, H=n*lh+(n-1)*gap, pad=14, bw=16, h=H+pad*2;
  const bk=side=>`<svg class="a br" style="${side}:-22px;top:${-pad}px" width="${bw}" height="${h}" viewBox="0 0 ${bw} ${h}"><path pathLength="1" d="${side==='left'?`M${bw-.75} .75H.75V${h-.75}H${bw-.75}`:`M.75 .75H${bw-.75}V${h-.75}H.75`}"/></svg>`;
  const X=P([40,385,730,1075],[20,139.3,258.7]), hl=P(90,48), fz=P(104,44);
  const HL=P([['Built fast.',0,200],['Found first.',1,200],['Made to sell.',0,900,'var(--accent)']],
             [['Built fast.',0,200],['Found first.',0,200],['Made to sell.',0,900,'var(--accent)']]);
  const hd=HL.map((l,i)=>`<div class="a" style="left:${X[l[1]]}px;top:${P(130,112)+i*hl}px;height:${hl}px;line-height:${hl}px;font-family:var(--display);font-size:${fz}px;font-weight:${l[2]};letter-spacing:${l[2]>500?'-.05em':'-.035em'};${l[3]?'color:'+l[3]:''}">${sc(l[0],{i,sg:.12,s:.7,e:2,m:4})}</div>`).join('');
  const svc=['WEB DEVELOPMENT','UI/UX & DESIGN','SEO'];
  return `<div class="kv k1" data-i="0">
  ${hd}
  <div class="a" style="left:${P(1075,44)}px;top:${P(490,350)}px">
    <div style="position:relative;font-size:${P(12,11.5)}px;font-weight:800;line-height:${lh}px;letter-spacing:0">
      ${bk('left')}${bk('right')}
      <div style="display:flex;flex-direction:column;gap:${gap}px">${para.map((t,i)=>sc(t,{i,sg:.09,s:1.1,e:.4,m:15})).join('')}</div>
    </div>
  </div>
  <div class="a" style="left:${P(730,195)}px;top:${P(690,CH-100)}px">
    <div style="font-size:11.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-faint);margin-bottom:10px">${sc('Services',{s:.5,d:.03})}</div>
    ${svc.map((t,i)=>`<div style="font-size:12.3px;font-weight:800;letter-spacing:.02em;text-transform:uppercase;line-height:1.15">${sc(t,{s:.7+i*.12,d:.02})}</div>`).join('')}
  </div>
  ${M?'':`<div class="a ld" style="left:1075px;top:692px">${slashLoader(325)}</div>`}
  </div>`;
}

/* ================= SLIDE 3 — big type ================= */
function bigLine(cls,t1,t2,sd,di,w1,w2,arrow,wa,wb){
  return `<div class="tb ${cls}"><div class="ln" style="--di:${di}">${tw(t1,w1,.05,`font-weight:${wa}`)}${tw(t2,w2,.05,`font-weight:${wb}${arrow?';color:var(--accent)':''}`)}</div></div>`;
}
function buildK5(){
  const lines=P(
    ['One small team, start to finish: strategy,','design, code and SEO. No handoffs, no','templates, no surprises. Just a site that','loads fast and ranks.'],
    ['One small team, start to finish:','strategy, design, code and SEO.','No handoffs, no templates, no','surprises. Just a site that loads','fast and ranks.']);
  return `<div class="kv k5" data-i="2"><div class="k5col">
  ${bigLine('l1','Web','sites',.55,1,.6,.8,false,900,200)}
  ${bigLine('l2','that','grow',.6,0,.5,.7,true,200,900)}
  <div class="st" style="margin-top:${P(64,34)}px;width:${P(1360,350)}px;font-size:${P(15,10)}px;font-weight:800">
    <div class="mono" style="width:${P(345,52)}px;font-size:${P(10,8.5)}px;color:var(--accent);visibility:hidden">${sc(P('02 — HOW WE WORK','02'),{s:.2})}</div>
    <div style="display:flex;flex-direction:column;gap:3px">${lines.map((t,i)=>sc(t,{i,sg:.04,s:.2})).join('')}</div>
  </div>
  </div></div>`;
}
/* fit the big words to the canvas once the real font is available */
function fitBig(el){
  const col=el.querySelector('.k5col'),l1=el.querySelector('.tb.l1'),l2=el.querySelector('.tb.l2');
  const target=P(1360,350);
  l1.style.fontSize='100px';
  const F1=Math.min(target/l1.offsetWidth*100,P(260,999));
  l1.style.fontSize=F1+'px';
  const OFF=P(345,119.3); l2.style.marginLeft=OFF+'px'; let F2=F1*P(.62,.8);
  l2.style.fontSize=F2+'px';
  if(l2.offsetWidth>target-OFF){F2*=(target-OFF)/l2.offsetWidth;l2.style.fontSize=F2+'px'}
  l2.style.marginTop=(F1*P(-.01,.02))+'px';
  col.style.left=P(40,20)+'px';
  col.style.top='0px';
  const H=col.offsetHeight;
  let top=Math.max(P(60,100),(CH-H)/2-P(0,10));
  if(!M){const base=top+F1*.764,snap=40+90*Math.round((base-40)/90);top+=snap-base}   /* baseline of line 1 sits on a grid row */
  col.style.top=top+'px';
  /* design-tool selection box around the headline */
  const BW=Math.max(l1.offsetWidth,OFF+l2.offsetWidth);
  let sel=col.querySelector('.sel');
  if(!sel){sel=document.createElement('div');sel.className='sel';sel.innerHTML='<i class="h a1"></i><i class="h a2"></i><i class="h a3"></i><i class="h a4"></i><span class="chip c1"></span><span class="chip c2"></span>';col.appendChild(sel)}
  const a=l1.offsetTop,b=l2.offsetTop+l2.offsetHeight;
  sel.style.cssText=`left:-14px;top:${a-14}px;width:${BW+28}px;height:${b-a+28}px`;
  sel.querySelector('.c1').textContent=`H1 · ${Math.round(F1)}PX · 900/200`;
  sel.querySelector('.c2').textContent=`${Math.round(BW)} × ${Math.round(b-a)}`;
}

/* ================= SLIDE 5 — zooming type grid (rebuilt from the original Lottie timeline) ================= */
const ZD=[100.0, 99.8, 99.1, 97.5, 94.0, 85.2, 76.3, 72.8, 71.2, 70.5, 70.3, 70.3, 70.3, 70.3, 70.3, 70.3, 70.3, 70.3, 70.3, 70.3, 70.3, 71.0, 73.5, 79.1, 91.3, 122.1, 153.0, 165.2, 170.8, 173.3, 174.0, 173.3, 170.8, 165.2, 153.0, 122.1, 91.3, 79.1, 73.5, 71.0, 70.3, 70.5, 71.2, 72.8, 76.3, 85.2, 94.0, 97.5, 99.1, 99.8, 100.0], ZM=[100.0, 99.9, 99.3, 98.1, 95.5, 88.9, 82.2, 79.6, 78.4, 77.8, 77.7, 77.7, 77.7, 77.7, 77.7, 77.7, 77.7, 77.7, 77.7, 77.7, 77.7, 77.9, 78.7, 80.5, 84.4, 94.1, 103.9, 107.8, 109.6, 110.4, 110.6, 110.4, 109.6, 107.8, 103.9, 94.1, 84.4, 80.5, 78.7, 77.9, 77.7, 77.8, 78.4, 79.6, 82.2, 88.9, 95.5, 98.1, 99.3, 99.9, 100.0];
function bez(x1,y1,x2,y2){const cx=3*x1,bx=3*(x2-x1)-cx,ax=1-cx-bx,cy=3*y1,by=3*(y2-y1)-cy,ay=1-cy-by;
  const X=t=>((ax*t+bx)*t+cx)*t,Y=t=>((ay*t+by)*t+cy)*t,dX=t=>(3*ax*t+2*bx)*t+cx;
  return x=>{let t=x;for(let i=0;i<8;i++){const e=X(t)-x;if(Math.abs(e)<1e-5)break;const d=dX(t);if(Math.abs(d)<1e-6)break;t-=e/d}return Y(Math.min(1,Math.max(0,t)))}}
const E4=bez(.76,0,.24,1);
/* keyframe sampler: keys = [[frame,value],...] (60 fps timeline of the original) */
function kv(k,f,ez=E4){
  const n=k.length;
  if(f<=k[0][0])return k[0][1];
  if(f>=k[n-1][0])return k[n-1][1];
  for(let i=0;i<n-1;i++){const a=k[i],b=k[i+1];if(f<=b[0]){const u=(f-a[0])/(b[0]-a[0]);return a[1]+(b[1]-a[1])*ez(u)}}
}
const lin=u=>u;
const opK=f0=>[[f0,0],[f0+5,1],[f0+10,0],[f0+15,1],[f0+20,0],[f0+25,1],[435+f0,1],[440+f0,0],[445+f0,1],[450+f0,0],[455+f0,1],[460+f0,0]];
const LZ={
  /* left group: sits bottom-left, swaps to the right + jumps to the top */
  L:[
    {logo:1,t:'',f0:0,x:[[120,-336.5],[180,70],[240,70],[300,-336.5]],y:[[60,-192.2],[120,82.8],[300,82.8],[360,-192.2]]},
    {t:'WE BUILD',w:300,f0:3,x:[[60,-336.5],[120,-336.5],[180,-7],[240,-7],[300,-336.5]],y:[[0,131.8]]},
    {t:'WEBSITES',w:900,f0:6,x:[[60,-294.5],[120,-340],[180,-30.9],[240,-30.9],[300,-338],[360,-338],[419,-294.5]],y:[[0,181.8]]},
    {t:'THAT GROW',w:300,f0:9,x:[[60,-269.5],[120,-338],[180,20],[240,20],[300,-338],[360,-338],[419,-269.5]],y:[[0,231.8]]}
  ],
  /* right group: sits top-right (right-aligned), swaps flush-left + drops to the bottom */
  R:[
    {t:'DESIGN',w:900,f0:9,dx:[[60,-59.2],[120,0],[360,0],[419,-62.7]],y:[[0,-192.2]]},
    {t:'BUILD',w:300,f0:6,dx:[[60,-35.2],[120,0],[360,0],[419,-35.2]],y:[[0,-142.2]]},
    {t:'RANK',w:900,f0:3,dx:[[0,0]],y:[[0,-92.2]]},
    {t:'TBILISI',w:300,f0:0,dx:[[0,0]],y:[[60,232.8],[120,-41.2],[300,-41.2],[360,232.8]]}
  ]
};
LZ.L.forEach(l=>l.ok=opK(l.f0));LZ.R.forEach(l=>l.ok=opK(l.f0));
const KB=[[180,0],[240,-275],[300,-275],[360,0]], KT=[[180,0],[240,273.4],[300,273.4],[360,0]], KP=[[120,0],[180,1],[240,1],[300,0]], SLOK=opK(12), RE=333;
let lzEl=null, lzW=[], raf=0, t0=0;

function buildK2(){return `<div class="kv k2" data-i="4"><div class="lz"></div></div>`}
function lzTiles(){
  const out=[];
  if(M){
    const px=380,py=254.5,K=Math.ceil(((SH/2)/.77-121)/py)+1,C=OX>2?Math.max(1,Math.ceil(((SW/2)/.77-180)/px)):0;
    for(let k=-K;k<=K;k++)for(let c=-C;c<=C;c++)out.push([c*px,-90.5+k*py]);
  }else{
    const px=691,py=466,C=Math.max(1,Math.ceil(((SW/2)/.7-345)/px)),R=Math.max(1,Math.ceil(((SH/2)/.7-233)/py));
    for(let r=-R;r<=R;r++)for(let c=-C;c<=C;c++)out.push([c*px,r*py]);
  }
  return out;
}
function fillLZ(el){
  lzEl=el.querySelector('.lz');
  lzEl.style.left=CW/2+'px';lzEl.style.top=CH/2+'px';
  const all=[...LZ.L,...LZ.R];
  const tile=([x,y])=>`<div class="tl" style="left:${x}px;top:${y}px;transform:scale(${P(1,.521)})">${all.map((l,i)=>`<div class="tx" data-i="${i}" style="font-weight:${l.w||800};transform:translate(var(--x${i}),var(--y${i}));opacity:var(--o${i})">${l.logo?'<i class="logo"></i>':esc(l.t)}</div>`).join('')}</div>`;
  lzEl.innerHTML=lzTiles().map(tile).join('');
  lzW=[...lzEl.querySelector('.tl').querySelectorAll('.tx')].map(e=>e.offsetWidth);
}
function lzSet(f){
  const zs=M?ZM:ZD;let z=1;
  if(f>=60&&f<360){const u=(f-60)/6,i=Math.floor(u),r=u-i;z=(zs[i]+(zs[i+1]-zs[i])*r)/100}
  const s=lzEl.style, dyB=kv(KB,f), dyT=kv(KT,f), pw=kv(KP,f);
  s.setProperty('--z',z);
  LZ.L.forEach((l,i)=>{
    s.setProperty('--x'+i,kv(l.x,f)+'px');
    s.setProperty('--y'+i,(kv(l.y,f)+dyB-45.4)+'px');
    s.setProperty('--o'+i,kv(l.ok,f,lin));
  });
  LZ.R.forEach((l,j)=>{
    const i=4+j,x0=RE-(lzW[i]||200);
    s.setProperty('--x'+i,(x0+kv(l.dx,f)+pw*(-338-x0))+'px');
    s.setProperty('--y'+i,(kv(l.y,f)+dyT-45.4)+'px');
    s.setProperty('--o'+i,kv(l.ok,f,lin));
  });
  s.setProperty('--o8',kv(SLOK,f,lin));
}
function lzFrame(now){
  const f=Math.min(479,(now-t0)*.06);
  lzSet(f);
  if(f<479)raf=requestAnimationFrame(lzFrame);
}
function startLZ(el){
  cancelAnimationFrame(raf);
  fillLZ(el);
  t0=performance.now();
  lzFrame(t0);
}

/* ================= layout-guide grid (12-col web grid, rulers, registration marks) ================= */
function gridHTML(i){
  const f=n=>+n.toFixed(1);
  const cs=P([40,385,730,1075],[20,139.3,258.7]), y0=P(40,30), y1=P(760,CH-30);
  let V=cs.concat(P(1400,370)), Hs;
  if(M)Hs=[[y0,112,332,y1],[y0,CH-303,CH-184,y1],[y0,CH/2,y1],[y0,CH*.14,CH*.6,y1],[y0,CH/2,y1]][i];
  else Hs=[[40,130,400,490,690,760],[40,130,553,720,760],[40,400,760],[40,130,205,420,760],[40,400,760]][i];
  if(i===4)V=P([40,720,1400],[20,195,370]);
  const p=(d,o,c='')=>`<path${c?` class="${c}"`:''} pathLength="1" stroke-opacity="${o}" d="${d}"/>`;
  let s='',d='';
  V.forEach(x=>s+=p(`M${f(x+OX)} 0V${f(SH)}`,.5));
  Hs.forEach(y=>s+=p(`M0 ${f(y+OY)}H${f(SW)}`,.28));
  V.forEach(x=>Hs.forEach(y=>d+=`M${f(x+OX-6)} ${f(y+OY)}h12M${f(x+OX)} ${f(y+OY-6)}v12`));
  s+=p(d,.95,'x');
  return `<div class="gr"><svg viewBox="0 0 ${f(SW)} ${f(SH)}" preserveAspectRatio="none">${s}</svg></div>`;
}
const EASE='cubic-bezier(.77,0,0,.99)';
const gp=(s,f)=>s.querySelectorAll('.gr svg').forEach(v=>[...v.children].forEach(f));
const gridReset=s=>gp(s,p=>{p.style.transition='none';p.style.strokeDashoffset=1});
const gridIn=s=>gp(s,(p,i)=>{p.style.transition=`stroke-dashoffset .95s ${EASE} ${i*.035}s`;p.style.strokeDashoffset=0});
const gridOut=s=>gp(s,(p,i)=>{p.style.transition=`stroke-dashoffset .7s ${EASE} ${i*.012}s`;p.style.strokeDashoffset=1});

/* ================= engine ================= */
const hero=document.getElementById('top'),stage=document.getElementById('stage'),cv=document.getElementById('cv'),ov=document.getElementById('ov'),v=document.getElementById('bgVideo');
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const isM=()=>(hero.clientWidth||innerWidth)<=860;
let slides=[],T=[],mode=null,order=[0,2,4],pi=0;
const w=(f,ms)=>T.push(setTimeout(f,ms));
const HOLD=[6500,5000,6000,5500,8000], LEAVE=1100;

function fit(){
  const W=hero.clientWidth||innerWidth, H=hero.clientHeight||innerHeight;
  let s;
  if(M){
    s=W/390; let sh=H/s;
    if(sh<680){s=H/680;sh=680}
    SW=W/s; SH=sh; CW=390; CH=sh; OX=(SW-CW)/2; OY=0;
  }else{
    s=Math.min(W/1440,H/810);
    SW=W/s; SH=H/s; CW=1440; CH=810; OX=(SW-CW)/2; OY=(SH-CH)/2;
  }
  const st=stage.style;
  st.width=SW+'px'; st.height=SH+'px'; st.transform=`scale(${s})`;
  st.setProperty('--sw',SW+'px'); st.setProperty('--sh',SH+'px'); st.setProperty('--shn',SH);
  st.setProperty('--ox',OX+'px'); st.setProperty('--oy',OY+'px');
  cv.style.cssText=`left:${OX}px;top:${OY}px;width:${CW}px;height:${CH}px`;
}
function hudHTML(){ return ''; }
function hudSet(){ const h=document.getElementById('hud'); if(h)h.classList.add('on'); }
function build(){
  cv.innerHTML=buildK1()+'<div class="kv"></div>'+buildK5()+'<div class="kv"></div>'+buildK2();
  slides=[...cv.querySelectorAll(':scope > .kv')];
  slides.forEach((s,i)=>s.insertAdjacentHTML('afterbegin',gridHTML(i)));
}
function regrid(){
  slides.forEach((s,i)=>{
    const o=s.querySelector('.gr'); if(o)o.remove();
    s.insertAdjacentHTML('afterbegin',gridHTML(i));
    if(s.classList.contains('on'))gp(s,p=>{p.style.transition='none';p.style.strokeDashoffset=0});
  });
  if(cur===4){fillLZ(slides[4]);lzFrame(performance.now()-(t0?performance.now()-t0:0))}
}
let cur=-1;
function show(idx){
  cur=idx;
  const el=slides[idx];
  slides.forEach(e=>e.classList.remove('on','is-active','is-leaving'));
  stage.dataset.index=idx;
  hudSet(idx);
  el.classList.add('on');
  cancelAnimationFrame(raf);
  if(idx===2)fitBig(el);
  if(idx===4)startLZ(el);
  gridReset(el); void el.offsetWidth;
  requestAnimationFrame(()=>requestAnimationFrame(()=>{gridIn(el);el.classList.add('is-active')}));
  if(RM)return;
  w(()=>{
    pi=(pi+1)%order.length;
    const next=order[pi];
    gridOut(el);el.classList.add('is-leaving');
    w(()=>show(next),LEAVE);
  },HOLD[idx]);
}
function start(){
  T.forEach(clearTimeout);T=[];cancelAnimationFrame(raf);
  M=isM(); mode=M;
  stage.classList.toggle('m',M);
  fit(); build();
  slides.forEach(e=>e.classList.remove('on','is-active','is-leaving'));
  stage.dataset.index=0;
  pi=0;
  if(RM){ov.className='ov gone';show(2);return}
  ov.className='ov';void ov.offsetWidth;
  ov.classList.add('go');
  w(()=>ov.classList.add('lv'),2000);
  w(()=>show(order[0]),2420);
  w(()=>ov.classList.add('gone'),2800);
}

let rt;
addEventListener('resize',()=>{
  clearTimeout(rt);
  rt=setTimeout(()=>{
    if(mode!==isM())start();
    else{fit();regrid()}
  },150);
});

/* wait for the fonts so the big words are measured with the real glyphs */
const fonts=document.fonts&&document.fonts.load
  ? Promise.allSettled(['800 1em "Neue Montreal"','800 1em Inter','500 1em "JetBrains Mono"'].map(f=>document.fonts.load(f)))
  : Promise.resolve();
Promise.race([fonts,new Promise(r=>setTimeout(r,1500))]).then(start);

window.restartHero=start;
})();