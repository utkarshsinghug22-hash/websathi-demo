/* Websathi — shared behaviour for the demo sites.

   Two jobs only: make the mobile menu work, and reveal sections on scroll.
   Both degrade to a fully usable page if this file never loads. */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- mobile navigation ------------------------------------------- */
  var toggle = document.querySelector('.nav-toggle');
  var links = document.querySelector('.nav-links');

  if (toggle && links) {
    var setOpen = function (open) {
      toggle.setAttribute('aria-expanded', String(open));
      links.setAttribute('data-open', String(open));
    };

    setOpen(false);

    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });

    /* Tapping a link navigates within the page, so the panel has to close
       itself — otherwise it covers the section it just jumped to. */
    links.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setOpen(false);
    });
  }


  /* ---- image blur-up ------------------------------------------------ */
  /* Cached images can finish before this runs and never fire `load`, so
     complete images are marked immediately rather than waiting for an event
     that already happened. */
  document.querySelectorAll('.ph img').forEach(function (img) {
    if (img.complete && img.naturalWidth) { img.classList.add('is-loaded'); return; }
    img.addEventListener('load', function () { img.classList.add('is-loaded'); }, { once: true });
    img.addEventListener('error', function () { img.classList.add('is-loaded'); }, { once: true });
  });

  /* ---- marquee: run only while visible ------------------------------ */
  var strips = document.querySelectorAll('.strip-inner');
  if (strips.length && 'IntersectionObserver' in window) {
    var stripIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        e.target.setAttribute('data-idle', e.isIntersecting ? 'false' : 'true');
      });
    });
    strips.forEach(function (el) { stripIO.observe(el); });
  }

  /* ---- scroll reveal ------------------------------------------------ */
  /* The hidden state is added here rather than in the stylesheet. If this
     script fails to parse, `js-reveal` is never set and every section stays
     visible — the page degrades to no animation instead of no content. */
  var targets = document.querySelectorAll('[data-reveal]');
  if (!targets.length || reduced || !('IntersectionObserver' in window)) return;

  document.documentElement.classList.add('js-reveal');

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;

      /* Stagger siblings by their position within the group. 60ms reads as
         a cascade; beyond ~80ms it starts to feel like the page is slow. */
      var group = entry.target.parentElement;
      var index = group ? Array.prototype.indexOf.call(
        group.querySelectorAll(':scope > [data-reveal]'), entry.target) : 0;

      entry.target.style.transitionDelay = Math.min(index, 5) * 60 + 'ms';
      entry.target.classList.add('is-in');
      observer.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });

  targets.forEach(function (el) { observer.observe(el); });
})();
