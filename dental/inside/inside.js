/* Websathi — inside the room.
   Everything here is an enhancement. Without it every instrument note is
   simply visible as a list, and nothing is hidden behind a script. */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine   = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  var stage = document.querySelector('.tray-stage');
  var pins  = document.querySelectorAll('.pin');
  var items = document.querySelectorAll('.readout-item');
  if (!stage || !pins.length) return;

  /* Only now, with the code that drives it running, does the readout collapse
     from a list into a single swapping panel. */
  document.documentElement.classList.add('js-tray');

  var show = function (key) {
    pins.forEach(function (p) {
      if (p.dataset.tool === key) p.setAttribute('aria-current', 'true');
      else p.removeAttribute('aria-current');
    });
    items.forEach(function (i) { i.classList.toggle('is-on', i.dataset.tool === key); });
  };

  pins.forEach(function (p) {
    var key = p.dataset.tool;
    p.addEventListener('click', function () { show(key); });
    p.addEventListener('focus', function () { show(key); });
    if (fine) p.addEventListener('pointerenter', function () { show(key); });
  });

  show(pins[0].dataset.tool);

  if (reduce) return;
  /* Blur-up for the two photographs. Cached images can finish before this
     runs and never fire load, so complete ones are marked immediately. */
  document.querySelectorAll('.ph img').forEach(function (img) {
    if (img.complete && img.naturalWidth) { img.classList.add('is-loaded'); return; }
    img.addEventListener('load',  function () { img.classList.add('is-loaded'); }, { once: true });
    img.addEventListener('error', function () { img.classList.add('is-loaded'); }, { once: true });
  });
})();
