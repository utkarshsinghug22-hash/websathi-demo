/* ============================================================================
   VELLUM — behaviour.

   Everything here is an enhancement. With this file removed the page still
   reads: the hero shows its still photograph, every section is visible, the
   gallery is a set of links, and the consultation form is an ordinary form.
   Nothing is hidden behind a script that might not run.
   ========================================================================= */
(function () {
  'use strict';

  window.__vellumReady = true;

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine   = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var root   = document.documentElement;

  /* ---- blur-up ------------------------------------------------------- */
  /* Cached images can finish before this runs and never fire `load`, so a
     complete image is marked immediately rather than waiting for an event
     that already happened. */
  function watch(img) {
    if (img.complete && img.naturalWidth) { img.classList.add('on'); return; }
    img.addEventListener('load', function () { img.classList.add('on'); }, { once: true });
    img.addEventListener('error', function () { img.classList.add('on'); }, { once: true });
  }
  document.querySelectorAll('img[data-blur]').forEach(watch);

  /* ---- header ------------------------------------------------------- */
  var hdr = document.querySelector('.hdr');
  var onScroll = function () { hdr.dataset.stuck = String(scrollY > 24); };
  onScroll();
  addEventListener('scroll', onScroll, { passive: true });

  /* ---- mobile nav ---------------------------------------------------- */
  var burger = document.querySelector('.burger');
  var nav = document.getElementById('nav');
  if (burger && nav) {
    var setNav = function (open) {
      burger.setAttribute('aria-expanded', String(open));
      nav.dataset.open = String(open);
      document.body.dataset.locked = String(open);
      /* The panel covers the page when open, so everything behind it is taken
         out of the tab order rather than left reachable but invisible. */
      document.querySelectorAll('main, footer').forEach(function (el) {
        if (open) el.setAttribute('inert', ''); else el.removeAttribute('inert');
      });
    };
    setNav(false);
    burger.addEventListener('click', function () {
      setNav(burger.getAttribute('aria-expanded') !== 'true');
    });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setNav(false); });
    addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.dataset.open === 'true') { setNav(false); burger.focus(); }
    });
    matchMedia('(min-width:901px)').addEventListener('change', function (e) {
      if (e.matches) setNav(false);
    });
  }

  /* ---- scroll reveal -------------------------------------------------- */
  /* The hidden state is added here, not in the stylesheet. If this file fails
     to parse, `js-rev` is never set and every section stays visible — the page
     degrades to no animation instead of no content. */
  var revTargets = document.querySelectorAll('[data-rev],[data-rev-line]');
  if (revTargets.length && !reduce && 'IntersectionObserver' in window) {
    root.classList.add('js-rev');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var group = e.target.parentElement;
        var i = group ? Array.prototype.indexOf.call(
          group.querySelectorAll(':scope > [data-rev],:scope > [data-rev-line]'), e.target) : 0;
        /* 70ms reads as a cascade; past ~90ms it starts to feel like the page
           is lagging rather than arriving. Capped so a long list never crawls. */
        e.target.style.transitionDelay = Math.min(i, 5) * 70 + 'ms';
        e.target.classList.add('in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
    revTargets.forEach(function (el) { io.observe(el); });
  }

  /* ---- custom cursor -------------------------------------------------- */
  /* Pointer devices only, and never under reduced motion. It is decoration:
     the native cursor is restored the moment either is untrue. */
  if (fine && !reduce) {
    var cur = document.querySelector('.cur');
    if (cur) {
      root.classList.add('cursor-on');
      var cx = -100, cy = -100, tx = -100, ty = -100, frame = null;
      addEventListener('pointermove', function (e) {
        tx = e.clientX; ty = e.clientY;
        if (!frame) frame = requestAnimationFrame(tick);
      }, { passive: true });
      function tick() {
        frame = null;
        /* Interpolated rather than pinned to the pointer — a cursor that
           tracks exactly reads as a bug, one that lags slightly reads as
           weight. */
        cx += (tx - cx) * 0.18; cy += (ty - cy) * 0.18;
        cur.style.transform = 'translate3d(' + (cx - 17) + 'px,' + (cy - 17) + 'px,0)';
        if (Math.abs(tx - cx) > 0.1 || Math.abs(ty - cy) > 0.1) frame = requestAnimationFrame(tick);
      }
      document.querySelectorAll('.piece').forEach(function (el) {
        el.addEventListener('pointerenter', function () { cur.dataset.x = 'true'; cur.textContent = 'View'; });
        el.addEventListener('pointerleave', function () { cur.dataset.x = 'false'; cur.textContent = ''; });
      });
      addEventListener('pointerleave', function () { cur.style.opacity = '0'; });
      addEventListener('pointerenter', function () { cur.style.opacity = '1'; });
    }
  }

  /* ---- lightbox ------------------------------------------------------- */
  /* <dialog> rather than a hand-rolled overlay: it gets focus trapping, Escape
     and inertness of the page behind it from the platform, correctly, free. */
  var lb = document.getElementById('lightbox');
  var pieces = Array.prototype.slice.call(document.querySelectorAll('.piece'));
  if (lb && pieces.length) {
    var lbImg = lb.querySelector('#lb-img');
    var lbTitle = lb.querySelector('#lb-title');
    var lbMeta = lb.querySelector('#lb-meta');
    var idx = 0, opener = null;

    var fig = lb.querySelector('.lb-fig');
    var swapT = null;

    function paint(p) {
      var img = p.querySelector('img');
      lbImg.src = img.currentSrc || img.src;
      lbImg.alt = img.alt;
      lbTitle.textContent = p.dataset.title || '';
      lbMeta.textContent = p.dataset.meta || '';
    }

    /* `animate` is false on open: the dialog is already animating in, and a
       crossfade inside an entrance is two animations arguing. */
    function show(i, animate) {
      idx = (i + pieces.length) % pieces.length;
      var p = pieces[idx];

      if (!animate || reduce) { clearTimeout(swapT); fig.dataset.swapping = 'false'; paint(p); return; }

      /* Spamming next must retarget, not queue. The pending swap is dropped and
         the opacity transition carries on from wherever it currently is. */
      clearTimeout(swapT);
      fig.dataset.swapping = 'true';
      swapT = setTimeout(function () {
        paint(p);
        var reveal = function () { fig.dataset.swapping = 'false'; };
        /* Wait for the new file to be drawable, or it fades in on nothing. A
           cached image is already complete and never fires load. */
        if (lbImg.complete && lbImg.naturalWidth) reveal();
        else {
          lbImg.addEventListener('load', reveal, { once: true });
          lbImg.addEventListener('error', reveal, { once: true });
        }
      }, 140);
    }
    function open(i, from) {
      opener = from || null;
      show(i, false);
      if (typeof lb.showModal === 'function') lb.showModal(); else lb.setAttribute('open', '');
    }
    pieces.forEach(function (p, i) {
      p.setAttribute('role', 'button');
      p.setAttribute('tabindex', '0');
      p.addEventListener('click', function () { open(i, p); });
      p.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(i, p); }
      });
    });
    lb.querySelector('.lb-next').addEventListener('click', function () { show(idx + 1, true); });
    lb.querySelector('.lb-prev').addEventListener('click', function () { show(idx - 1, true); });
    lb.querySelector('.lb-x').addEventListener('click', function () { lb.close(); });
    lb.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); show(idx + 1, true); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); show(idx - 1, true); }
    });
    /* Clicking the backdrop closes, but only the backdrop — a click that began
       on the photograph and drifted must not dismiss it. */
    lb.addEventListener('click', function (e) { if (e.target === lb) lb.close(); });
    lb.addEventListener('close', function () {
      clearTimeout(swapT); fig.dataset.swapping = 'false';
      if (opener) opener.focus();
    });
  }

  /* ---- consultation --------------------------------------------------- */
  var mdl = document.getElementById('consult');
  if (mdl) {
    var form = mdl.querySelector('form');
    var body = mdl.querySelector('#consult-body');
    var done = mdl.querySelector('#consult-done');
    var lastFocus = null;

    document.querySelectorAll('[data-consult]').forEach(function (b) {
      b.addEventListener('click', function () {
        lastFocus = b;
        body.hidden = false; done.hidden = true;
        body.dataset.leaving = 'false'; done.dataset.entering = 'false';
        var box0 = mdl.querySelector('.mdl');
        box0.style.transition = ''; box0.style.height = '';
        if (form) form.reset();
        if (typeof mdl.showModal === 'function') mdl.showModal(); else mdl.setAttribute('open', '');
        var first = mdl.querySelector('input,select,textarea');
        if (first && fine) setTimeout(function () { first.focus(); }, 60);
      });
    });
    mdl.querySelectorAll('[data-close]').forEach(function (b) {
      b.addEventListener('click', function () { mdl.close(); });
    });
    mdl.addEventListener('click', function (e) { if (e.target === mdl) mdl.close(); });
    mdl.addEventListener('close', function () { if (lastFocus) lastFocus.focus(); });

    if (form) {
      form.addEventListener('submit', function (e) {
        /* Nothing is sent anywhere. This is a concept site: the interaction is
           demonstrated, the data never leaves the page. */
        e.preventDefault();
        if (!form.reportValidity()) return;

        var box = mdl.querySelector('.mdl');
        if (reduce) {
          body.hidden = true; done.hidden = false;
          done.querySelector('h2').focus();
          return;
        }

        var h0 = box.getBoundingClientRect().height;
        body.dataset.leaving = 'true';
        setTimeout(function () {
          body.hidden = true;
          /* Start state set before it is shown, then cleared on the next frame —
             otherwise it paints settled for one frame and jumps backwards. */
          done.dataset.entering = 'true';
          done.hidden = false;

          box.style.height = 'auto';
          var h1 = box.getBoundingClientRect().height;
          box.style.height = h0 + 'px';
          void box.offsetHeight;
          box.style.transition = 'height 300ms cubic-bezier(.22,1,.36,1)';
          box.style.height = h1 + 'px';

          /* A forced reflow commits the start state, then the flag is cleared in
             the same tick. requestAnimationFrame would read more naturally, but
             it is throttled whenever the page is not compositing — and a dropped
             frame there leaves the confirmation sitting at opacity 0 for good. */
          void done.offsetHeight;
          done.dataset.entering = 'false';
          done.querySelector('h2').focus();

          setTimeout(function () {
            box.style.transition = ''; box.style.height = '';
          }, 320);
        }, 160);
      });
    }
  }

  /* ---- hero: WebGL ---------------------------------------------------- */
  /* A displaced plane carrying the hero photograph. Not a rotating object for
     the sake of having 3D — the depth belongs to the image itself: the surface
     drifts as if under skin, the camera answers the pointer, and a grain and
     vignette are composited in the same pass so they sit *in* the picture
     rather than on top of it.

     Skipped entirely for reduced motion, for coarse pointers, and for anything
     without WebGL — all of which keep the still photograph underneath. */
  var canvas = document.getElementById('gl');
  var lowPower = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4;
  if (canvas && !reduce && fine && !lowPower && window.innerWidth > 900) {
    import('./vendor/three.module.min.js').then(function (THREE) {
      var gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!gl) return;

      var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false, alpha: true });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
      var scene = new THREE.Scene();
      var camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
      camera.position.z = 3.1;

      var uni = {
        uTex:    { value: null },
        uTime:   { value: 0 },
        uMouse:  { value: new THREE.Vector2(0, 0) },
        uCover:  { value: new THREE.Vector2(1, 1) },
        uIn:     { value: 0 }
      };

      var mat = new THREE.ShaderMaterial({
        transparent: true,
        uniforms: uni,
        vertexShader: [
          'varying vec2 vUv;',
          'uniform float uTime;',
          'uniform vec2 uMouse;',
          'void main(){',
          '  vUv = uv;',
          '  vec3 p = position;',
          /* Two long, slow waves at different frequencies. Slow enough that it
             reads as breath rather than water. */
          '  float w = sin(p.x*1.6 + uTime*0.32)*0.045 + sin(p.y*2.1 - uTime*0.24)*0.035;',
          /* A gentle lift toward the pointer, so the surface answers it. */
          '  float d = 1.0 - clamp(length(p.xy - vec2(uMouse.x*1.2, uMouse.y*0.8))*0.55, 0.0, 1.0);',
          '  p.z += w + d*d*0.14;',
          '  gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.0);',
          '}'
        ].join('\n'),
        fragmentShader: [
          'varying vec2 vUv;',
          'uniform sampler2D uTex;',
          'uniform vec2 uCover;',
          'uniform vec2 uMouse;',
          'uniform float uTime;',
          'uniform float uIn;',
          'float hash(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }',
          'void main(){',
          /* object-fit:cover, done in the shader so the plane can stay square
             while the photograph keeps its own aspect at any viewport. */
          '  vec2 uv = (vUv - 0.5) * uCover + 0.5;',
          /* A whisper of chromatic separation that grows toward the edges —
             the look of a fast lens, not an RGB-split gimmick. */
          '  float e = length(vUv-0.5);',
          '  vec2 off = (uMouse*0.006 + e*0.004) * vec2(1.0,-1.0);',
          '  float r = texture2D(uTex, uv + off).r;',
          '  float g = texture2D(uTex, uv).g;',
          '  float b = texture2D(uTex, uv - off).b;',
          '  vec3 col = vec3(r,g,b);',
          /* Grain in the same pass, so it sits in the image. */
          '  float n = hash(vUv*vec2(900.0,900.0) + fract(uTime)*13.0);',
          '  col += (n-0.5)*0.055;',
          /* Vignette, and a floor so the frame never goes fully black. */
          '  col *= smoothstep(1.05, 0.28, e);',
          '  col = max(col, vec3(0.012));',
          /* Entrance: the photograph resolves out of the dark rather than
             cutting in. */
          '  gl_FragColor = vec4(col * uIn, 1.0);',
          '}'
        ].join('\n')
      });

      var mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2, 64, 64), mat);
      scene.add(mesh);

      var IMG_W = 1024, IMG_H = 1365;
      function resize() {
        var w = canvas.clientWidth, h = canvas.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        /* Scale the plane to exactly fill the frustum at z=0, then solve the
           cover ratio for the texture. */
        var vh = 2 * Math.tan((camera.fov * Math.PI / 180) / 2) * camera.position.z;
        var vw = vh * camera.aspect;
        mesh.scale.set(vw / 2, vh / 2, 1);
        var target = w / h, src = IMG_W / IMG_H;
        if (target > src) uni.uCover.value.set(1, src / target);
        else uni.uCover.value.set(target / src, 1);
      }

      new THREE.TextureLoader().load('img/tex-1024.jpg', function (tex) {
        tex.minFilter = THREE.LinearFilter;
        tex.generateMipmaps = false;
        uni.uTex.value = tex;
        root.classList.add('gl-on');
        resize();
        var t0 = performance.now();
        var mx = 0, my = 0;
        addEventListener('pointermove', function (e) {
          mx = (e.clientX / innerWidth) * 2 - 1;
          my = -((e.clientY / innerHeight) * 2 - 1);
        }, { passive: true });

        var running = true;
        /* The hero is one screen tall; there is no reason to keep compositing
           it behind four more. */
        if ('IntersectionObserver' in window) {
          new IntersectionObserver(function (es) { running = es[0].isIntersecting; })
            .observe(canvas);
        }
        (function loop(now) {
          requestAnimationFrame(loop);
          if (!running) return;
          var t = (now - t0) / 1000;
          uni.uTime.value = t;
          uni.uIn.value = Math.min(1, t / 1.1);
          /* 0.09, against the cursor ring's 0.18. The image is a large surface
             and should trail the hand — but at the old 0.045 it lagged roughly
             four times behind the ring chasing the same pointer, which reads as
             the page struggling rather than as weight. Half is deliberate. */
          uni.uMouse.value.x += (mx - uni.uMouse.value.x) * 0.09;
          uni.uMouse.value.y += (my - uni.uMouse.value.y) * 0.09;
          camera.position.x = uni.uMouse.value.x * 0.09;
          camera.position.y = uni.uMouse.value.y * 0.06;
          camera.lookAt(0, 0, 0);
          renderer.render(scene, camera);
        })(performance.now());
      });

      addEventListener('resize', resize, { passive: true });
      resize();
    }).catch(function () { /* no WebGL module: the still photograph stands */ });
  }
})();
