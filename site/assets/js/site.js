/*
 * D6 Studios page behaviour.
 *   Global (once): header state, mobile navigation, in-site navigation without full reloads.
 *   Per page (re-run after each navigation): section entrances, active nav link, decoding typewriter,
 *   rolling number spinners and section focus.
 * Text effects keep the final text in the DOM for assistive technology: untyped characters are only
 * transparent, and spinner digits carry a screen-reader copy of the original text.
 */
(function () {
  'use strict';

  var header = document.getElementById('header');
  var toggle = header && header.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');
  var mobileMQ = window.matchMedia('(max-width: 960px)');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;

  /* ================= Global: header ================= */
  function onScroll() {
    if (header) header.classList.toggle('is-scrolled', window.scrollY > 8);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  function setOpen(open, returnFocus) {
    if (!header || !toggle) return;
    header.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.querySelector('.sr-only').textContent = open ? 'Close menu' : 'Menu';
    document.documentElement.style.overflow = open ? 'hidden' : '';
    syncNavAccess();
    if (open) {
      var first = nav.querySelector('a');
      if (first) first.focus();
    } else if (returnFocus) {
      toggle.focus();
    }
  }
  function syncNavAccess() {
    // Keep the closed mobile menu out of the tab order and accessibility tree.
    if (!nav) return;
    var hide = mobileMQ.matches && !header.classList.contains('is-open');
    if (hide) nav.setAttribute('inert', ''); else nav.removeAttribute('inert');
  }
  if (toggle && nav) {
    toggle.addEventListener('click', function () { setOpen(!header.classList.contains('is-open'), false); });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a') && header.classList.contains('is-open')) setOpen(false, false);
    });
    document.addEventListener('keydown', function (e) {
      if (!header.classList.contains('is-open')) return;
      if (e.key === 'Escape') { setOpen(false, true); return; }
      if (e.key === 'Tab') {
        var items = [toggle].concat(Array.prototype.slice.call(nav.querySelectorAll('a, button')));
        var first = items[0], last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    var onMQ = function () { if (!mobileMQ.matches) setOpen(false, false); else syncNavAccess(); };
    if (mobileMQ.addEventListener) mobileMQ.addEventListener('change', onMQ); else mobileMQ.addListener(onMQ);
    syncNavAccess();
  }

  /* ================= Per page: text effects ================= */
  var GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/_-+#';
  var TYPE_SEL = [
    '.kicker', '.section-head h1', '.section-head h2', '.label', '.state', '.spec dt', '.facts .k',
    '.roster-head span', '.crumbs li', '.work .meta', '.mode-list h3', '.person .handle',
    '.gallery figcaption span', '.feature-text .bottom > span:first-child', '.pf-badge', '.subhead', '.hero .headline'
  ].join(',');
  var SPIN_SEL = '.idx, .roster .no, .entry .when';
  var REPLAY_SEL = '.section-head .kicker, .section-head h1, .section-head h2';

  function prepSpin(el) {
    if (el.getAttribute('data-fx')) return;
    el.setAttribute('data-fx', 'spin');
    var text = el.textContent;
    var sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = text;
    var vis = document.createElement('span');
    vis.setAttribute('aria-hidden', 'true');
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      if (ch >= '0' && ch <= '9') {
        var s = document.createElement('span');
        s.className = 'spin';
        s.setAttribute('data-d', ch);
        var ghost = document.createElement('span');
        ghost.className = 'spin-ghost';
        ghost.textContent = ch;
        var strip = document.createElement('span');
        strip.className = 'spin-strip';
        var digits = '';
        for (var r = 0; r < 20; r++) digits += '<span>' + (r % 10) + '</span>';
        strip.innerHTML = digits;
        s.appendChild(ghost);
        s.appendChild(strip);
        vis.appendChild(s);
      } else {
        vis.appendChild(document.createTextNode(ch));
      }
    }
    el.textContent = '';
    el.appendChild(sr);
    el.appendChild(vis);
  }
  function playSpin(el) {
    var spins = el.querySelectorAll('.spin');
    for (var i = 0; i < spins.length; i++) {
      var strip = spins[i].lastChild;
      var d = +spins[i].getAttribute('data-d');
      strip.style.transition = 'none';
      strip.style.transform = 'translateY(0)';
      void strip.offsetHeight;
      strip.style.transition = 'transform ' + (1.05 + i * 0.12) + 's cubic-bezier(.16,.84,.24,1) ' + (0.05 + i * 0.07) + 's';
      strip.style.transform = 'translateY(' + (-(10 + d) * 5) + '%)';
    }
  }

  function prepType(el) {
    if (el.getAttribute('data-fx')) return;
    el.setAttribute('data-fx', 'type');
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    var nodes = [], n;
    while ((n = walker.nextNode())) {
      if (!n.nodeValue.trim()) continue;
      if (n.parentNode.closest('.sr-only, [data-fx="spin"]')) continue;
      nodes.push(n);
    }
    var parts = [];
    nodes.forEach(function (node) {
      var wrap = document.createElement('span');
      wrap.className = 'tw';
      var on = document.createElement('span');
      var off = document.createElement('span');
      off.className = 'tw-off';
      off.textContent = node.nodeValue;
      wrap.appendChild(on);
      wrap.appendChild(off);
      node.parentNode.replaceChild(wrap, node);
      parts.push({ text: off.textContent, on: on, off: off, wrap: wrap });
    });
    el._tw = parts;
  }
  function setTyped(parts, count, scramble) {
    var left = count;
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i], len = p.text.length;
      var k = Math.max(0, Math.min(len, left));
      var shown = p.text.slice(0, k);
      if (scramble && k > 0 && left > 0 && left <= len) {
        var last = p.text.charAt(k - 1);
        if (last.trim()) shown = shown.slice(0, -1) + GLYPHS.charAt((Math.random() * GLYPHS.length) | 0);
      }
      p.on.textContent = shown;
      p.off.textContent = p.text.slice(k);
      left -= len;
    }
  }
  function playType(el) {
    var parts = el._tw;
    if (!parts || !parts.length) return;
    if (el._raf) cancelAnimationFrame(el._raf);
    var total = parts.reduce(function (a, p) { return a + p.text.length; }, 0);
    var duration = Math.max(260, Math.min(900, total * 34));
    var delay = el.matches('.section-head h1, .section-head h2') ? 160 : 60;
    var caret = el._caret || document.createElement('span');
    caret.className = 'tw-caret';
    caret.setAttribute('aria-hidden', 'true');
    el._caret = caret;
    setTyped(parts, 0, false);
    var start = performance.now() + delay;
    function step(now) {
      var t = (now - start) / duration;
      if (t < 0) { el._raf = requestAnimationFrame(step); return; }
      var eased = 1 - Math.pow(1 - Math.min(1, t), 1.6);
      var count = Math.round(eased * total);
      setTyped(parts, count, t < 1);
      var left = count;
      for (var i = 0; i < parts.length; i++) {
        if (left <= parts[i].text.length) { parts[i].wrap.insertBefore(caret, parts[i].off); break; }
        left -= parts[i].text.length;
      }
      if (t < 1) { el._raf = requestAnimationFrame(step); return; }
      el._raf = 0;
      setTyped(parts, total, false);
      setTimeout(function () { if (caret.parentNode) caret.parentNode.removeChild(caret); }, 650);
    }
    el._raf = requestAnimationFrame(step);
  }
  function hideType(el) {
    if (el._raf) { cancelAnimationFrame(el._raf); el._raf = 0; }
    if (el._tw) setTyped(el._tw, 0, false);
  }
  function play(el) {
    el._played = true;
    if (el._tw) playType(el);
    var s = el.getAttribute('data-fx') === 'spin' ? [el] : el.querySelectorAll('[data-fx="spin"]');
    Array.prototype.forEach.call(s, playSpin);
  }

  /* ================= Per page: init and cleanup ================= */
  var cleanups = [];
  function track(observer) { cleanups.push(function () { observer.disconnect(); }); return observer; }

  function initPage() {
    var main = document.getElementById('main');
    if (!main) return;
    main.setAttribute('data-path', location.pathname);

    // Section entrances.
    var revealEls = main.querySelectorAll('.reveal');
    if (hasIO && !reduceMotion) {
      var io = track(new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }));
      revealEls.forEach(function (el) { io.observe(el); });
    } else {
      revealEls.forEach(function (el) { el.classList.add('is-in'); });
    }

    // Active landing-page section in the nav.
    var links = nav ? nav.querySelectorAll('.nav-list a[href^="/#"]') : [];
    Array.prototype.forEach.call(links, function (l) { l.classList.remove('is-active'); });
    var onHome = location.pathname === '/' || /\/index\.html$/.test(location.pathname);
    if (onHome && links.length && hasIO) {
      var map = {};
      links.forEach(function (a) {
        var id = a.getAttribute('href').slice(2);
        if (document.getElementById(id)) map[id] = a;
      });
      var spy = track(new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          var a = map[en.target.id];
          if (!a) return;
          if (en.isIntersecting) {
            links.forEach(function (l) { l.classList.remove('is-active'); });
            a.classList.add('is-active');
          } else {
            a.classList.remove('is-active');
          }
        });
      }, { rootMargin: '-45% 0px -50% 0px' }));
      Object.keys(map).forEach(function (id) { spy.observe(document.getElementById(id)); });
    }

    if (!hasIO || reduceMotion) return;

    // Text effects.
    var spins = Array.prototype.slice.call(main.querySelectorAll(SPIN_SEL));
    spins.forEach(prepSpin);
    var types = Array.prototype.slice.call(main.querySelectorAll(TYPE_SEL));
    types.forEach(prepType);
    types.forEach(function (el) { if (el._tw) setTyped(el._tw, 0, false); });

    var once = track(new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        once.unobserve(en.target);
        play(en.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.2 }));
    var replay = track(new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var el = en.target;
        if (en.isIntersecting) {
          if (el._shown) return;
          el._shown = true;
          if (el.classList.contains('section-head')) el.classList.add('is-drawn');
          else play(el);
        } else {
          el._shown = false;
          if (el.classList.contains('section-head')) el.classList.remove('is-drawn');
          else hideType(el);
        }
      });
    }, { rootMargin: '-12% 0px -12% 0px', threshold: 0 }));
    types.concat(spins).forEach(function (el) {
      if (el.matches(REPLAY_SEL)) replay.observe(el);
      else if (!el.closest('.section-head .kicker')) once.observe(el);
    });
    main.querySelectorAll('.section-head').forEach(function (el) { replay.observe(el); });

    // Safety net: anything on screen that has not started yet plays now.
    var timer = setTimeout(function () {
      types.concat(spins).forEach(function (el) {
        if (el._played || el.closest('.section-head .kicker')) return;
        var r = el.getBoundingClientRect();
        if (r.bottom > 0 && r.top < window.innerHeight && r.width) play(el);
      });
    }, 1400);
    cleanups.push(function () { clearTimeout(timer); });

    // The section being viewed stays in focus while neighbours recede.
    var sections = main.querySelectorAll('.hero, .section.screen');
    document.documentElement.classList.toggle('has-focus-sections', sections.length > 1);
    if (sections.length > 1) {
      var focus = track(new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { en.target.classList.toggle('is-current', en.isIntersecting); });
      }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 }));
      sections.forEach(function (s) { focus.observe(s); });
    }
  }
  function teardownPage() {
    while (cleanups.length) cleanups.pop()();
  }

  /* ================= In-site navigation without full reloads ================= */
  // Same-site page links fetch the next page and swap <main>, so the screen never blanks between pages
  // and the animated background keeps running. URLs, history and direct visits work as normal pages.
  var canSwap = window.fetch && window.DOMParser && window.history && history.pushState;
  var swapping = false;

  function samePage(url) { return url.pathname === location.pathname; }
  function scrollToHash(hash, smooth) {
    var target = hash && hash.length > 1 ? document.getElementById(decodeURIComponent(hash.slice(1))) : null;
    if (target) target.scrollIntoView({ behavior: smooth && !reduceMotion ? 'smooth' : 'instant', block: 'start' });
    else window.scrollTo({ top: 0, behavior: smooth && !reduceMotion ? 'smooth' : 'instant' });
  }
  function updateNavCurrent(doc) {
    var fresh = doc.querySelectorAll('#site-nav .nav-list a');
    var live = nav ? nav.querySelectorAll('.nav-list a') : [];
    for (var i = 0; i < live.length && i < fresh.length; i++) {
      if (fresh[i].hasAttribute('aria-current')) live[i].setAttribute('aria-current', 'page');
      else live[i].removeAttribute('aria-current');
    }
  }
  function syncHead(doc) {
    document.title = doc.title;
    ['meta[name="description"]', 'link[rel="canonical"]', 'meta[property="og:title"]', 'meta[property="og:description"]',
      'meta[property="og:url"]', 'meta[property="og:image"]'].forEach(function (sel) {
      var a = document.head.querySelector(sel), b = doc.head.querySelector(sel);
      if (a && b) {
        if (b.hasAttribute('content')) a.setAttribute('content', b.getAttribute('content'));
        if (b.hasAttribute('href')) a.setAttribute('href', b.getAttribute('href'));
      }
    });
  }

  function navigate(url, push) {
    if (swapping) return;
    swapping = true;
    var main = document.getElementById('main');
    var leave = reduceMotion ? 0 : 220;
    main.classList.add('is-leaving');
    var fetched = fetch(url.pathname + url.search, { credentials: 'same-origin' }).then(function (r) {
      if (!r.ok || !/text\/html/.test(r.headers.get('content-type') || '')) throw new Error('not a page');
      return r.text();
    });
    Promise.all([fetched, new Promise(function (res) { setTimeout(res, leave); })]).then(function (out) {
      var doc = new DOMParser().parseFromString(out[0], 'text/html');
      var next = doc.getElementById('main');
      if (!next) throw new Error('no main');
      teardownPage();
      if (push) history.pushState({ d6: true }, '', url.href);
      syncHead(doc);
      updateNavCurrent(doc);
      document.documentElement.classList.remove('has-focus-sections');
      next.classList.add('is-entering');
      main.parentNode.replaceChild(next, main);
      scrollToHash(url.hash, false);
      initPage();
      if (window.D6Background && window.D6Background.observe) window.D6Background.observe(next);
      next.setAttribute('tabindex', '-1');
      next.focus({ preventScroll: true });
      requestAnimationFrame(function () { requestAnimationFrame(function () { next.classList.remove('is-entering'); }); });
      swapping = false;
    }).catch(function () {
      swapping = false;
      location.href = url.href; // fall back to a normal page load
    });
  }

  if (canSwap) {
    history.replaceState({ d6: true }, '', location.href);
    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest('a[href]');
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      var url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (!/\/$|\.html$/.test(url.pathname)) return; // only site pages, not images or files
      if (samePage(url)) {
        e.preventDefault();
        if (url.href !== location.href) history.pushState({ d6: true }, '', url.href);
        scrollToHash(url.hash, true);
        return;
      }
      e.preventDefault();
      navigate(url, true);
    });
    window.addEventListener('popstate', function () {
      var url = new URL(location.href);
      var main = document.getElementById('main');
      if (main && main.getAttribute('data-path') === url.pathname) { scrollToHash(url.hash, true); return; }
      navigate(url, false);
    });
  }

  initPage();
})();
