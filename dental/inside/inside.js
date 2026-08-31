/* Websathi — inside the room.
   Everything here is an enhancement. Without it the pins are hidden and every
   note is simply a list; nothing sits behind a dead control. */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine   = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* Two hotspot groups, one behaviour. `key` is the data-attribute that ties
     a pin to its note, so adding a third group needs no new code. */
  [['tool', '#tool-readout'], ['part', '#part-readout']].forEach(function (pair) {
    var key = pair[0];
    var panel = document.querySelector(pair[1]);
    if (!panel) return;
    var pins = document.querySelectorAll('.pin[data-' + key + ']');
    var items = panel.querySelectorAll('.readout-item[data-' + key + ']');
    if (!pins.length || !items.length) return;

    document.documentElement.classList.add('js-tray');

    var show = function (val) {
      pins.forEach(function (p) {
        if (p.dataset[key] === val) p.setAttribute('aria-current', 'true');
        else p.removeAttribute('aria-current');
      });
      items.forEach(function (i) { i.classList.toggle('is-on', i.dataset[key] === val); });
    };
    pins.forEach(function (p) {
      var val = p.dataset[key];
      p.addEventListener('click', function () { show(val); });
      p.addEventListener('focus', function () { show(val); });
      if (fine) p.addEventListener('pointerenter', function () { show(val); });
    });
    show(pins[0].dataset[key]);
  });

  /* Announce the pins once, as their stage arrives. 60ms apart reads as a
     cascade; past ~80ms it starts to feel like the page is lagging. */
  if ('IntersectionObserver' in window && !reduce) {
    var stages = document.querySelectorAll('.tray-stage, .wide-stage');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.querySelectorAll('.pin').forEach(function (pin, i) {
          /* The transition is declared on ::before, which no script can reach.
             The delay rides across on a custom property instead. */
          pin.style.setProperty('--pin-delay', Math.min(i, 8) * 60 + 'ms');
        });
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { threshold: 0.3 });
    stages.forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll('.tray-stage, .wide-stage').forEach(function (el) { el.classList.add('is-in'); });
  }

  /* The hint's job ends the moment it is understood. */
  var hint = document.getElementById('scroll-hint');
  if (hint) window.addEventListener('scroll', function () {
    hint.setAttribute('data-done', 'true');
  }, { once: true, passive: true });

  /* Blur-up is not repeated here: this page loads assets/websathi.js, which
     already attaches to every .ph img. Two listeners doing one job. */
})();
