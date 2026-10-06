/* Visual Provenance site script. No dependencies. Progressive enhancement:
   every feature is driven by data-* attributes or class names, all content
   stays in the HTML, and the page is fully readable without this file.

   Hooks
     [data-tabs]                      tabs / pipeline tabs / source-render demo
     nav.toc, .toc-details            Contents rail: scroll-spy + mobile disclosure
     img[data-zoom] (optional data-zoom-src)   lightbox via native <dialog>
     [data-quiz] .quiz-item[data-answer] button[data-guess]
     .filters [data-filter] / [data-q-toggle], details.q[data-theme], .filters-status
   Also: adds the `js` class to <html>, opens/closes <details> for print.   */
(function () {
  'use strict';

  var doc = document, root = doc.documentElement;
  root.classList.add('js');

  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };
  var reduceMotion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var behavior = function () { return reduceMotion.matches ? 'auto' : 'smooth'; };

  /* ---------------------------------------------------------------- Tabs */
  // Roving tabindex, <- -> Home End, aria-selected, hash-aware.
  function initTabs(box) {
    var tablist = $('[role="tablist"]', box);
    if (!tablist) return;
    var tabs = $$('[role="tab"]', tablist);
    var panels = tabs.map(function (t) { return doc.getElementById(t.getAttribute('aria-controls')); });

    function select(i, focus) {
      tabs.forEach(function (t, j) {
        var on = j === i;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        if (panels[j]) panels[j].hidden = !on;
      });
      if (focus) tabs[i].focus();
    }
    // On a phone the strip scrolls sideways: keep the chosen tab visible.
    function reveal(i) {
      if (tablist.scrollWidth > tablist.clientWidth + 2 && tabs[i].scrollIntoView) {
        try { tabs[i].scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: behavior() }); } catch (e) { tabs[i].scrollIntoView(); }
      }
    }
    // Which tab does the address-bar hash point at (the tab, its panel, or something inside the panel)?
    function hashIndex() {
      var h = decodeURIComponent((location.hash || '').slice(1)), found = -1;
      if (!h) return -1;
      tabs.forEach(function (t, i) {
        var p = panels[i], el = doc.getElementById(h);
        if (t.id === h || (p && (p.id === h || (el && p.contains(el))))) found = i;
      });
      return found;
    }
    var start = 0;
    tabs.forEach(function (t, i) { if (t.getAttribute('aria-selected') === 'true') start = i; });
    var hi = hashIndex();
    if (hi >= 0) start = hi;
    select(start, false);

    tabs.forEach(function (t, i) { t.addEventListener('click', function () { select(i, false); reveal(i); }); });
    window.addEventListener('hashchange', function () {
      var j = hashIndex();
      if (j < 0) return;
      select(j, false);
      reveal(j);
      var el = doc.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (el && el.scrollIntoView) el.scrollIntoView({ behavior: behavior(), block: 'start' });
    });
    tablist.addEventListener('keydown', function (e) {
      var i = tabs.indexOf(doc.activeElement);
      if (i < 0) return;
      var n = tabs.length, to = -1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') to = (i + 1) % n;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') to = (i - 1 + n) % n;
      else if (e.key === 'Home') to = 0;
      else if (e.key === 'End') to = n - 1;
      if (to < 0) return;
      e.preventDefault();
      select(to, true);
      reveal(to);
    });
  }
  $$('[data-tabs]').forEach(initTabs);

  /* -------------------------------------------- Contents rail (scroll-spy) */
  var toc = $('nav.toc');
  if (toc) {
    var details = $('.toc-details', toc);
    var summary = details && $('summary', details);
    var wide = window.matchMedia ? window.matchMedia('(min-width: 1200px)') : { matches: true };

    // Rail (>= 1200px): disclosure forced open and not toggleable.
    // Below: starts collapsed, closes again after you pick a link.
    function syncToc() {
      if (!details) return;
      if (wide.matches) { details.open = true; if (summary) summary.tabIndex = -1; }
      else if (summary) summary.removeAttribute('tabindex');
    }
    if (details) {
      if (!wide.matches) details.open = false;
      syncToc();
      if (wide.addEventListener) wide.addEventListener('change', function () { if (!wide.matches) details.open = false; syncToc(); });
      if (summary) summary.addEventListener('click', function (e) { if (wide.matches) e.preventDefault(); });
      toc.addEventListener('click', function (e) {
        if (!wide.matches && e.target.closest && e.target.closest('a')) details.open = false;
      });
    }

    var links = $$('a[href^="#"]', toc).filter(function (a) { return a.getAttribute('href').length > 1; });
    var targets = links.map(function (a) { return doc.getElementById(decodeURIComponent(a.getAttribute('href').slice(1))); });
    var ticking = false;

    var spy = function () {
      ticking = false;
      var line = window.innerHeight * 0.3, cur = -1;
      for (var i = 0; i < targets.length; i++) {
        if (targets[i] && targets[i].getBoundingClientRect().top <= line) cur = i;
      }
      links.forEach(function (a, i) {
        if (i === cur) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
      });
      // keep the highlighted item visible inside a scrolling rail
      if (cur >= 0 && wide.matches && toc.scrollHeight > toc.clientHeight + 2) {
        var a = links[cur], top = a.offsetTop - toc.offsetTop;
        if (top < toc.scrollTop || top > toc.scrollTop + toc.clientHeight - 40) toc.scrollTop = Math.max(0, top - 60);
      }
    };
    var onScroll = function () { if (!ticking) { ticking = true; window.requestAnimationFrame(spy); } };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    spy();
  }

  /* ------------------------------------------------------------- Lightbox */
  var dlg = null, lastTrigger = null;
  function buildDialog() {
    dlg = doc.createElement('dialog');
    dlg.className = 'lightbox';
    dlg.setAttribute('aria-label', 'Enlarged image');
    dlg.innerHTML = '<button type="button" class="lightbox-close" aria-label="Close enlarged image">Close ✕</button>' +
      '<img alt=""><p class="lightbox-cap"></p>';
    doc.body.appendChild(dlg);
    $('.lightbox-close', dlg).addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });   // backdrop
    dlg.addEventListener('close', function () {
      if (lastTrigger && doc.contains(lastTrigger)) lastTrigger.focus();
      lastTrigger = null;
    });
  }
  function openZoom(img, trigger) {
    if (!dlg) buildDialog();
    if (typeof dlg.showModal !== 'function') { window.open(img.getAttribute('data-zoom-src') || img.currentSrc || img.src, '_blank', 'noopener'); return; }
    var fig = img.closest('figure'), cap = fig && $('figcaption', fig), big = $('img', dlg);
    big.src = img.getAttribute('data-zoom-src') || img.currentSrc || img.src;
    big.alt = img.alt || '';
    var clone = cap ? cap.cloneNode(true) : null;
    if (clone) $$('.zoom-btn', clone).forEach(function (b) { b.parentNode.removeChild(b); });
    // Keep the caption's links (the source link stays clickable); the markup comes from this page itself.
    var capEl = $('.lightbox-cap', dlg);
    if (clone) { capEl.innerHTML = clone.innerHTML; $$('[id]', capEl).forEach(function (n) { n.removeAttribute('id'); }); }
    else capEl.textContent = img.alt || '';
    lastTrigger = trigger || (fig && $('.zoom-btn', fig)) || img;
    dlg.showModal();
  }
  $$('img[data-zoom]').forEach(function (img) {
    img.addEventListener('click', function () { openZoom(img, null); });
    // Keyboard / screen-reader route: a real button in the caption.
    var fig = img.closest('figure'), cap = fig && $('figcaption', fig);
    if (cap && !$('.zoom-btn', fig)) {
      var b = doc.createElement('button');
      b.type = 'button'; b.className = 'zoom-btn';
      b.textContent = 'Enlarge ↗';
      b.setAttribute('aria-label', 'Enlarge image: ' + (img.alt || 'figure').slice(0, 80));
      b.addEventListener('click', function () { openZoom(img, b); });
      // Gallery frames: the button sits under the caption, so every button in a row lines up.
      (fig.classList.contains('shot') ? fig : cap).appendChild(b);
    }
  });

  /* ------------------------------------------------ Video (click to load) */
  /* A poster image with a play button. Only when the reader presses play does the page create an
     iframe for YouTube's privacy-enhanced embed (youtube-nocookie.com) inside a modal <dialog>;
     closing the dialog removes the iframe, which stops playback. Without JS or <dialog> support the
     caption's plain "Watch on YouTube" link still works. */
  var vdlg = null, vTrigger = null;
  function buildVideoDialog() {
    vdlg = doc.createElement('dialog');
    vdlg.className = 'lightbox lightbox--video';
    vdlg.setAttribute('aria-label', 'Video player');
    vdlg.innerHTML = '<button type="button" class="lightbox-close" aria-label="Close video">Close ✕</button>' +
      '<div class="video-wrap"></div><p class="lightbox-cap"></p>';
    doc.body.appendChild(vdlg);
    $('.lightbox-close', vdlg).addEventListener('click', function () { vdlg.close(); });
    vdlg.addEventListener('click', function (e) { if (e.target === vdlg) vdlg.close(); });   // backdrop
    vdlg.addEventListener('close', function () {
      $('.video-wrap', vdlg).textContent = '';                       // removing the iframe stops playback
      if (vTrigger && doc.contains(vTrigger)) vTrigger.focus();
      vTrigger = null;
    });
  }
  function openVideo(btn) {
    var id = btn.getAttribute('data-yt-id') || '';
    if (!/^[\w-]{6,20}$/.test(id)) return;
    if (typeof HTMLDialogElement === 'undefined' || !doc.createElement('dialog').showModal) {
      window.open('https://www.youtube.com/watch?v=' + id, '_blank', 'noopener');
      return;
    }
    if (!vdlg) buildVideoDialog();
    var frame = doc.createElement('iframe');
    frame.title = btn.getAttribute('data-yt-title') || 'Video player';
    frame.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen');
    frame.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    frame.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) + '?autoplay=1&rel=0&playsinline=1';
    var wrap = $('.video-wrap', vdlg);
    wrap.textContent = '';
    wrap.appendChild(frame);
    var fig = btn.closest('figure'), cap = fig && $('figcaption', fig), capEl = $('.lightbox-cap', vdlg);
    if (cap) {
      capEl.innerHTML = cap.innerHTML;                               // markup comes from this page itself
      $$('[id]', capEl).forEach(function (n) { n.removeAttribute('id'); });
      $$('.yt-note', capEl).forEach(function (n) { n.parentNode.removeChild(n); });
      var watch = doc.createElement('a');
      watch.href = 'https://www.youtube.com/watch?v=' + encodeURIComponent(id);
      watch.rel = 'noopener'; watch.textContent = 'Watch on YouTube ↗';
      capEl.appendChild(doc.createTextNode(' '));
      capEl.appendChild(watch);
    } else capEl.textContent = '';
    vTrigger = btn;
    vdlg.showModal();
  }
  $$('[data-yt-id]').forEach(function (btn) { btn.addEventListener('click', function () { openVideo(btn); }); });

  /* ----------------------------------------------------------------- Quiz */
  $$('[data-quiz]').forEach(function (quiz) {
    $$('.quiz-item', quiz).forEach(function (item) {
      var answer = item.getAttribute('data-answer');
      var reveal = $('.quiz-reveal', item);
      var buttons = $$('button[data-guess]', item);
      buttons.forEach(function (b) {
        b.addEventListener('click', function () {
          var guess = b.getAttribute('data-guess');
          buttons.forEach(function (x) {
            x.disabled = true;
            if (x === b) x.classList.add('is-picked');
            if (x.getAttribute('data-guess') === answer) x.classList.add('is-answer');
          });
          if (reveal) {
            var right = buttons.filter(function (x) { return x.getAttribute('data-guess') === answer; })[0];
            if (!$('.quiz-result', reveal)) {
              var p = doc.createElement('p');
              p.className = 'quiz-result';
              p.textContent = 'You chose “' + b.textContent.trim() + '”. The source credits it as “' +
                (right ? right.textContent.trim() : answer) + '”.';
              reveal.insertBefore(p, reveal.firstChild);
            }
            reveal.hidden = false;
            reveal.setAttribute('role', 'status');
          }
        });
      });
    });
  });

  /* ------------------------------------ Questions: filters + deep links */
  var qs = $$('details.q');
  if (qs.length) {
    var fbtns = $$('.filters [data-filter]');
    var status = $('.filters-status');
    var current = 'all';

    var applyFilter = function (theme) {
      current = theme;
      var shown = 0;
      qs.forEach(function (q) {
        var ok = theme === 'all' || q.getAttribute('data-theme') === theme;
        q.hidden = !ok;
        if (ok) shown++;
      });
      fbtns.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-filter') === theme ? 'true' : 'false'); });
      if (status) status.textContent = 'Showing ' + shown + ' of ' + qs.length + ' questions';
      if (typeof syncTog === 'function') syncTog();
    };
    fbtns.forEach(function (b) { b.addEventListener('click', function () { applyFilter(b.getAttribute('data-filter')); }); });

    var openFromHash = function (scroll) {
      var id = decodeURIComponent((location.hash || '').slice(1));
      var q = id && doc.getElementById(id);
      if (!q || !q.matches || !q.matches('details.q')) return;
      if (q.hidden) applyFilter('all');
      q.open = true;
      if (scroll) q.scrollIntoView({ behavior: behavior(), block: 'start' });
    };
    window.addEventListener('hashchange', function () { openFromHash(true); });
    openFromHash(true);

    // Optional "Expand all / Collapse all". The label always follows the real state.
    var tog = $('[data-q-toggle]');
    var syncTog = function () {
      if (tog) tog.textContent = qs.some(function (q) { return !q.hidden && !q.open; }) ? 'Expand all' : 'Collapse all';
    };

    // A person's click on one question writes its id into the address bar so it can be shared
    // (and removes it again on close). Bulk changes and filtering never touch the address bar.
    qs.forEach(function (q) {
      var sum = $('summary', q);
      if (sum) sum.addEventListener('click', function () { q.setAttribute('data-user-toggle', '1'); });
      q.addEventListener('toggle', function () {
        var byUser = q.hasAttribute('data-user-toggle');
        q.removeAttribute('data-user-toggle');
        syncTog();
        if (!byUser || !q.id || !(window.history && history.replaceState)) return;
        if (q.open && location.hash !== '#' + q.id) history.replaceState(null, '', '#' + q.id);
        else if (!q.open && location.hash === '#' + q.id) history.replaceState(null, '', location.pathname + location.search);
      });
    });

    if (tog) tog.addEventListener('click', function () {
      var open = qs.some(function (q) { return !q.hidden && !q.open; });
      qs.forEach(function (q) { if (!q.hidden) q.open = open; });
      // Collapsing everything must not leave a stale #q-N in the address bar (a reload would reopen it).
      if (!open && /^#q-/.test(location.hash) && window.history && history.replaceState) history.replaceState(null, '', location.pathname + location.search);
      syncTog();
    });
    applyFilter('all');
    syncTog();
  }

  /* ---------------------------------------------------------------- Print */
  // <details> cannot be forced open by CSS, so open them while printing.
  var wasClosed = [];
  window.addEventListener('beforeprint', function () {
    // Lazy images that have not loaded yet would print blank.
    $$('img[loading="lazy"]').forEach(function (im) { im.loading = 'eager'; });
    wasClosed = $$('details:not([open])');
    wasClosed.forEach(function (d) { d.open = true; });
  });
  window.addEventListener('afterprint', function () {
    wasClosed.forEach(function (d) { d.open = false; });
    wasClosed = [];
  });
})();
