/* Websathi showcase — behaviour.
   Everything here is an enhancement. With this file removed the page still
   reads: the stack sits open, the annotations are visible, nothing is hidden
   behind a script that might not run. */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine   = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* Nothing is hidden until the script is running and reduced motion is off.
     If either is untrue the page keeps its default, fully visible state. */
  if (!reduce && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('js-motion');
  }

  /* ---- scroll hint --------------------------------------------------- */
  /* Retire it on the first scroll of any size. Passive + once, so it costs
     nothing on a phone and never fires again. */
  var hint = document.getElementById('scroll-hint');
  if (hint) {
    window.addEventListener('scroll', function () {
      hint.setAttribute('data-done', 'true');
    }, { once: true, passive: true });
  }

  /* ---- connector geometry ------------------------------------------- */
  /* Each line's length is measured from the DOM and written back as --len,
     so stroke-dasharray matches the real diagonal at any viewport width.
     Hardcoding it would leave a gap or an early finish on some screens. */
  document.querySelectorAll('.anatomy-svg line').forEach(function (l) {
    var dx = l.x2.baseVal.value - l.x1.baseVal.value;
    var dy = l.y2.baseVal.value - l.y1.baseVal.value;
    l.style.setProperty('--len', Math.hypot(dx, dy).toFixed(1));
  });

  /* ---- one observer runs both timed sections ------------------------ */
  var staged = document.querySelectorAll('.anatomy-stage, .stack');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add(e.target.classList.contains('stack') ? 'is-open' : 'is-live');
        io.unobserve(e.target);
      });
    }, { threshold: 0.35 });
    staged.forEach(function (el) { io.observe(el); });
  } else {
    staged.forEach(function (el) {
      el.classList.add(el.classList.contains('stack') ? 'is-open' : 'is-live');
    });
  }

  /* ---- annotation stagger ------------------------------------------- */
  /* 90ms — slower than a UI cascade because this one is explanatory: the
     order it draws in is the information. */
  document.querySelectorAll('.anatomy-stage').forEach(function (stage) {
    stage.querySelectorAll('.hot-label').forEach(function (el, i) {
      el.style.transitionDelay = (260 + i * 90) + 'ms';
    });
    stage.querySelectorAll('.anatomy-svg line').forEach(function (el, i) {
      el.style.transitionDelay = (i * 90) + 'ms';
    });
    stage.querySelectorAll('.anatomy-svg circle').forEach(function (el, i) {
      el.style.transitionDelay = (180 + i * 90) + 'ms';
    });
  });

  /* ---- stage viewer -------------------------------------------------- */
  /* Hover on a pointer, click or tap everywhere else. The same handler serves
     keyboard focus, so the pile is operable without a mouse at all. */
  document.querySelectorAll('.explode-grid').forEach(function (grid) {
    var layers = grid.querySelectorAll('.layer');
    var shots  = grid.querySelectorAll('.shot');
    if (!layers.length || !shots.length) return;

    /* Collapse the grid into a single swapping panel only now that the code
       driving it is definitely running. Reduced motion still gets the swap —
       it is the answer to a tap, not decoration — just without the movement. */
    document.documentElement.classList.add('js-stage');

    var show = function (key) {
      layers.forEach(function (l) {
        if (l.dataset.stage === key) l.setAttribute('aria-current', 'true');
        else l.removeAttribute('aria-current');
      });
      shots.forEach(function (s) { s.classList.toggle('is-active', s.dataset.stage === key); });
    };

    layers.forEach(function (l) {
      var key = l.dataset.stage;
      l.addEventListener('click', function () { show(key); });
      l.addEventListener('focus', function () { show(key); });
      if (fine) l.addEventListener('pointerenter', function () { show(key); });
    });
  });

  if (reduce || !fine) return;   /* everything below is pointer-only */

  /* ---- pointer tilt -------------------------------------------------- */
  /* Written as a full transform string on the element itself. Driving a
     child's transform from a CSS variable on the parent would recalculate
     styles for every child on each pointer move. */
  document.querySelectorAll('.tilt').forEach(function (el) {
    var frame = null, rect = null;

    var apply = function (e) {
      frame = null;
      if (!rect) return;
      var px = (e.clientX - rect.left) / rect.width  - 0.5;
      var py = (e.clientY - rect.top)  / rect.height - 0.5;
      el.style.transform =
        'perspective(900px) rotateY(' + (px * 11).toFixed(2) + 'deg) rotateX(' +
        (-py * 11).toFixed(2) + 'deg) translate3d(0,0,0)';
    };

    el.addEventListener('pointerenter', function () { rect = el.getBoundingClientRect(); });
    el.addEventListener('pointermove', function (e) {
      /* Coalesce to one write per frame; pointermove fires far more often. */
      if (frame) return;
      frame = requestAnimationFrame(function () { apply(e); });
    });
    el.addEventListener('pointerleave', function () {
      if (frame) { cancelAnimationFrame(frame); frame = null; }
      el.style.transform = '';   /* the 420ms transition carries it home */
    });
  });
})();
