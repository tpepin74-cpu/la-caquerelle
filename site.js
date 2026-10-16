/* La Caquerelle — interactions du site (sans dépendance) */
(function () {
  'use strict';
  var TZ = 'Europe/Zurich';
  var PHONE = '032 426 66 56';
  var MAIL = 'lacaquerelle@bluewin.ch';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- Horaires ---------------- */
  var DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  var MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  var SUMMER = { 0: [['09:00', '22:30']], 1: [['09:00', '22:30']], 2: [['09:00', '22:30']], 3: [], 4: [], 5: [['09:00', '23:00']], 6: [['09:00', '23:00']] };
  var WINTER = { 0: [['09:00', '15:00'], ['18:00', '22:30']], 1: [['09:00', '14:30'], ['18:00', '22:30']], 2: [['09:00', '14:30'], ['18:00', '22:30']], 3: [], 4: [], 5: [['09:00', '23:00']], 6: [['09:00', '23:00']] };
  var SEASONS = [
    { from: '2026-04-02', to: '2026-11-26', days: SUMMER, name: 'été' },
    { from: '2026-11-27', to: '2027-03-31', days: WINTER, name: 'hiver' }
  ];
  var CLOSURES = [
    { from: '2026-09-16', to: '2026-10-01', label: 'vacances annuelles' },
    { from: '2026-12-24', to: '2026-12-26', label: 'fêtes de Noël' },
    { from: '2027-05-06', to: '2027-05-06', label: 'fermeture exceptionnelle' }
  ];
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function toMin(t) { var p = t.split(':'); return +p[0] * 60 + +p[1]; }
  function fmtT(t) { return t.replace(':', ' h ').replace(' h 00', ' h'); }
  function zNow() {
    try {
      var f = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
      var p = {}; f.formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
      return { date: p.year + '-' + p.month + '-' + p.day, min: (+p.hour % 24) * 60 + +p.minute, hour: +p.hour % 24 };
    } catch (e) {
      var d = new Date();
      return { date: d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()), min: d.getHours() * 60 + d.getMinutes(), hour: d.getHours() };
    }
  }
  function dow(date) { return new Date(date + 'T12:00:00Z').getUTCDay(); }
  function addDays(date, n) { var d = new Date(date + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function longDate(date) { var d = new Date(date + 'T12:00:00Z'); return DAYS[d.getUTCDay()] + ' ' + d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()]; }
  function dayInfo(date) {
    for (var i = 0; i < CLOSURES.length; i++) {
      if (date >= CLOSURES[i].from && date <= CLOSURES[i].to) return { intervals: [], reason: CLOSURES[i].label, known: true };
    }
    var season = null;
    for (var j = 0; j < SEASONS.length; j++) { if (date >= SEASONS[j].from && date <= SEASONS[j].to) season = SEASONS[j]; }
    var known = !!season;
    var days = season ? season.days : (date.slice(5) >= '04-02' && date.slice(5) <= '11-26' ? SUMMER : WINTER);
    var iv = days[dow(date)] || [];
    return { intervals: iv, reason: iv.length ? '' : 'fermeture hebdomadaire du mercredi et du jeudi', known: known, season: season ? season.name : '' };
  }
  function status() {
    var n = zNow();
    var today = dayInfo(n.date);
    for (var i = 0; i < today.intervals.length; i++) {
      var a = toMin(today.intervals[i][0]), b = toMin(today.intervals[i][1]);
      if (n.min >= a && n.min < b) return { open: true, text: 'Ouvert · jusqu’à ' + fmtT(today.intervals[i][1]) };
      if (n.min < a) return { open: false, text: 'Fermé · ouvre à ' + fmtT(today.intervals[i][0]) };
    }
    for (var k = 1; k < 30; k++) {
      var d = addDays(n.date, k), info = dayInfo(d);
      if (info.intervals.length) {
        var when = k === 1 ? 'demain' : DAYS[dow(d)];
        return { open: false, text: 'Fermé · ouvre ' + when + ' à ' + fmtT(info.intervals[0][0]) };
      }
    }
    return { open: false, text: 'Fermé' };
  }
  function nextOpenDate(from) {
    for (var k = 0; k < 40; k++) { var d = addDays(from, k); if (dayInfo(d).intervals.length) return d; }
    return from;
  }
  function paintStatus() {
    var s = status();
    document.querySelectorAll('[data-open-status]').forEach(function (el) {
      if (el.textContent !== s.text) el.textContent = s.text;
      el.setAttribute('data-state', s.open ? 'open' : 'closed');
    });
    var n = zNow(); var d = dow(n.date);
    document.querySelectorAll('[data-dow]').forEach(function (tr) { tr.classList.toggle('is-today', +tr.getAttribute('data-dow') === d && tr.closest('[data-season]') && tr.closest('[data-season]').getAttribute('data-season') === (dayInfo(n.date).season || 'été')); });
  }

  /* ---------------- En-tête & menu ---------------- */
  var header = document.querySelector('[data-header]');
  var ticking = false;
  function onScroll() {
    ticking = false;
    var y = window.scrollY;
    if (header) header.classList.toggle('is-solid', y > 40 || header.hasAttribute('data-solid'));
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();
  var burger = document.querySelector('[data-burger]');
  var overlay = document.getElementById('menu');
  function trapFocus(container, e) {
    var f = container.querySelectorAll('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  function closeMenu() { if (!overlay || overlay.hidden) return; overlay.hidden = true; burger && burger.setAttribute('aria-expanded', 'false'); document.documentElement.style.overflow = ''; }
  if (burger && overlay) {
    burger.addEventListener('click', function () { overlay.hidden = false; burger.setAttribute('aria-expanded', 'true'); document.documentElement.style.overflow = 'hidden'; var c = overlay.querySelector('[data-close]'); c && c.focus(); });
    overlay.querySelectorAll('[data-close], a').forEach(function (el) { el.addEventListener('click', closeMenu); });
    overlay.addEventListener('keydown', function (e) { if (e.key === 'Tab') trapFocus(overlay, e); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !overlay.hidden) { closeMenu(); burger.focus(); } });
    var mq = window.matchMedia('(min-width: 1181px)');
    var onMq = function () { if (mq.matches) closeMenu(); };
    mq.addEventListener ? mq.addEventListener('change', onMq) : mq.addListener(onMq);
  }
  /* langue du document (utile si la page est servie dans un gabarit tiers) */
  if (!/^fr/i.test(document.documentElement.lang || '')) document.documentElement.lang = 'fr-CH';

  /* ---------------- Onglets ---------------- */
  document.querySelectorAll('[data-tabs]').forEach(function (wrap) {
    var tabs = wrap.querySelectorAll('[role="tab"]');
    tabs.forEach(function (t) {
      t.addEventListener('click', function () {
        tabs.forEach(function (o) { o.setAttribute('aria-selected', o === t ? 'true' : 'false'); o.tabIndex = o === t ? 0 : -1; var p = document.getElementById(o.getAttribute('aria-controls')); if (p) p.hidden = o !== t; });
      });
      t.addEventListener('keydown', function (e) {
        var i = Array.prototype.indexOf.call(tabs, t);
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { var n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length]; n.click(); n.focus(); }
      });
    });
  });

  /* ---------------- Réservation chambre ---------------- */
  function roomType(p) { return p <= 2 ? 'Chambre double' : p === 3 ? 'Chambre à trois lits' : p === 4 ? 'Chambre familiale (4 lits)' : 'Plusieurs chambres'; }
  document.querySelectorAll('[data-room]').forEach(function (f) {
    var a = f.querySelector('[name=arrivee]'), d = f.querySelector('[name=depart]'), p = f.querySelector('[name=personnes]'), out = f.querySelector('[data-recap]');
    var n = zNow(); a.min = n.date; if (!a.value) a.value = addDays(n.date, 1);
    function sync() {
      if (!a.value) a.value = n.date;
      var minDep = addDays(a.value, 1); d.min = minDep; if (!d.value || d.value < minDep) d.value = addDays(a.value, 2);
      var nights = Math.round((new Date(d.value + 'T12:00:00Z') - new Date(a.value + 'T12:00:00Z')) / 864e5);
      var pers = +p.value;
      var html = '<span><strong>' + nights + ' nuit' + (nights > 1 ? 's' : '') + '</strong> · du ' + longDate(a.value) + ' au ' + longDate(d.value) + '</span><span><strong>' + roomType(pers) + '</strong></span>';
      if (pers > 4) html += '<span class="warn">Au-delà de 4 personnes, nous vous conseillons de nous appeler au ' + PHONE + '.</span>';
      out.innerHTML = html;
    }
    [a, d, p].forEach(function (el) { el.addEventListener('change', sync); });
    sync();
  });

  /* ---------------- Réservation table ---------------- */
  var SLOTS = ['11:30', '12:00', '12:30', '13:00', '13:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'];
  document.querySelectorAll('[data-table]').forEach(function (f) {
    var dt = f.querySelector('[name=date]'), tm = f.querySelector('[name=heure]'), pc = f.querySelector('[name=couverts]'), out = f.querySelector('[data-recap]');
    var n = zNow(); dt.min = n.date; if (!dt.value) dt.value = nextOpenDate(n.date);
    function fill() {
      var info = dayInfo(dt.value), prev = tm.value; tm.innerHTML = '';
      var ok = SLOTS.filter(function (s) { var m = toMin(s); return info.intervals.some(function (iv) { return m >= toMin(iv[0]) && m <= toMin(iv[1]) - 90; }); });
      if (dt.value === n.date) ok = ok.filter(function (s) { return toMin(s) > n.min + 30; });
      if (!ok.length) { var o = document.createElement('option'); o.textContent = '—'; o.value = ''; tm.appendChild(o); }
      ok.forEach(function (s) { var o = document.createElement('option'); o.value = s; o.textContent = fmtT(s); tm.appendChild(o); });
      if (ok.indexOf(prev) > -1) tm.value = prev; else if (ok.indexOf('19:00') > -1) tm.value = '19:00'; else if (ok.indexOf('12:00') > -1) tm.value = '12:00';
      return info;
    }
    function sync() {
      var info = fill(), c = +pc.value, html = '';
      if (!info.intervals.length) {
        var nx = nextOpenDate(dt.value);
        html = '<span class="warn">Le restaurant est fermé le ' + longDate(dt.value) + ' (' + info.reason + '). Prochaine ouverture : ' + longDate(nx) + '.</span>';
      } else {
        html = '<span><strong>' + longDate(dt.value) + (tm.value ? ' · ' + fmtT(tm.value) : '') + '</strong></span><span><strong>' + c + ' couvert' + (c > 1 ? 's' : '') + '</strong></span>';
        if (!info.known) html += '<span class="muted">Horaires de cette période à confirmer.</span>';
      }
      if (c >= 10) html += '<span>Dès 10 personnes : menu de groupe identique pour tous, à réserver 7 jours à l’avance. <a href="restaurant.html#groupes">Voir les menus</a></span>';
      out.innerHTML = html;
    }
    [dt, tm, pc].forEach(function (el) { el.addEventListener('change', sync); });
    sync();
  });

  /* ---------------- Copier ---------------- */
  function selectText(el) { try { var r = document.createRange(); r.selectNodeContents(el); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); } catch (e) { } }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-copy]'); if (!b) return;
    var target = b.getAttribute('data-copy'); var src = target.charAt(0) === '#' ? document.querySelector(target) : null; var text = src ? src.textContent : target;
    var done = function () { var t = b.textContent; b.textContent = 'Copié'; setTimeout(function () { b.textContent = t; }, 1600); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { if (src) selectText(src); });
    else if (src) selectText(src);
  });

  /* ---------------- Formulaires de demande ---------------- */
  document.querySelectorAll('form[data-compose]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;
      var fd = new FormData(form), lines = [], subj = form.getAttribute('data-subject') || 'Demande';
      form.querySelectorAll('[name]').forEach(function (el) {
        if (el.type === 'submit') return; var v = (fd.get(el.name) || '').toString().trim(); if (!v) return;
        var l = form.querySelector('label[for="' + el.id + '"]'); lines.push((l ? l.textContent.replace(/\s*\*$/, '') : el.name) + ' : ' + v);
      });
      var body = 'Bonjour,\n\n' + lines.join('\n') + '\n\nMerci et à bientôt.';
      var out = form.parentNode.querySelector('[data-compose-out]');
      if (!out) return;
      out.hidden = false;
      out.querySelector('pre').textContent = body;
      var mail = out.querySelector('[data-mailto]');
      mail.href = 'mailto:' + MAIL + '?subject=' + encodeURIComponent(subj) + '&body=' + encodeURIComponent(body);
      out.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' });
    });
  });

  /* ---------------- Filtres séjours ---------------- */
  document.querySelectorAll('[data-filters]').forEach(function (bar) {
    var chips = bar.querySelectorAll('.chip');
    chips.forEach(function (c) {
      c.addEventListener('click', function () {
        var f = c.getAttribute('data-f');
        chips.forEach(function (o) { o.setAttribute('aria-pressed', o === c ? 'true' : 'false'); });
        document.querySelectorAll('[data-tags]').forEach(function (s) { s.hidden = f !== 'tout' && s.getAttribute('data-tags').split(' ').indexOf(f) === -1; });
      });
    });
  });

  /* ================== Application mobile : feuilles modales ================== */
  var appMq = window.matchMedia('(max-width: 760px)');
  var openSheetEl = null;
  function setExpanded(id, v) {
    document.querySelectorAll('[data-sheet-open="' + id + '"][aria-expanded]').forEach(function (b) { b.setAttribute('aria-expanded', v ? 'true' : 'false'); });
  }
  function openSheet(d, trigger) {
    if (!d || typeof d.showModal !== 'function') return false;
    if (openSheetEl && openSheetEl !== d) { var prev = openSheetEl; trigger = prev._trigger || trigger; openSheetEl = null; prev.close(); }
    if (d.open) return true;
    d._trigger = trigger || null;
    d.classList.remove('is-closing'); d.style.transform = ''; d.style.transition = '';
    d.showModal();
    openSheetEl = d;
    document.documentElement.classList.add('sheet-open');
    setExpanded(d.id, true);
    var first = d.querySelector('[data-sheet-close]');
    if (first) first.focus({ preventScroll: true });
    return true;
  }
  function closeSheet(d, instant) {
    if (!d || !d.open || d.classList.contains('is-closing')) return;
    if (instant || reduce) { d.close(); return; }
    d.style.transform = ''; d.style.transition = '';
    d.classList.add('is-closing');
    var done = false;
    function fin() { if (done) return; done = true; d.removeEventListener('transitionend', onEnd); d.close(); }
    function onEnd(e) { if (e.target === d && e.propertyName === 'transform') fin(); }
    d.addEventListener('transitionend', onEnd);
    setTimeout(fin, 380);
  }
  /* Glisser vers le bas pour fermer, depuis la poignée et l'en-tête */
  function attachDrag(d, zone) {
    var startY = 0, lastY = 0, lastT = 0, vel = 0, dy = 0, pid = null;
    zone.addEventListener('pointerdown', function (e) {
      if ((e.button !== undefined && e.button !== 0) || e.target.closest('button, a, input, select, textarea')) return;
      pid = e.pointerId; startY = lastY = e.clientY; lastT = performance.now(); vel = 0; dy = 0;
      d.style.transition = 'none';
      try { zone.setPointerCapture(pid); } catch (err) { }
    });
    zone.addEventListener('pointermove', function (e) {
      if (pid === null || e.pointerId !== pid) return;
      var now = performance.now(), y = e.clientY - startY;
      dy = y > 0 ? y : y * 0.12; /* légère résistance vers le haut */
      vel = (e.clientY - lastY) / Math.max(1, now - lastT); lastY = e.clientY; lastT = now;
      d.style.transform = 'translateY(' + dy + 'px)';
    });
    function end() {
      if (pid === null) return;
      pid = null; d.style.transition = '';
      if (dy > d.offsetHeight * 0.28 || (dy > 24 && vel > 0.45)) closeSheet(d);
      else d.style.transform = '';
    }
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);
  }
  document.querySelectorAll('dialog.sheet').forEach(function (d) {
    d.querySelectorAll('[data-sheet-drag]').forEach(function (z) { attachDrag(d, z); });
    d.addEventListener('close', function () {
      d.classList.remove('is-closing'); d.style.transform = ''; d.style.transition = '';
      setExpanded(d.id, false);
      if (openSheetEl === d) openSheetEl = null;
      if (!openSheetEl) {
        document.documentElement.classList.remove('sheet-open');
        var t = d._trigger;
        if (t && document.contains(t) && t.getClientRects().length) t.focus({ preventScroll: true });
      }
    });
    d.addEventListener('cancel', function (e) { e.preventDefault(); closeSheet(d); });
    d.addEventListener('click', function (e) {
      if (e.target === d) {
        var r = d.getBoundingClientRect();
        if (e.clientY < r.top || e.clientY > r.bottom || e.clientX < r.left || e.clientX > r.right) closeSheet(d);
        return;
      }
      if (e.target.closest('[data-sheet-close]')) { closeSheet(d); return; }
      var a = e.target.closest('a[href]');
      if (a && !a.target && !/^(tel|mailto):/.test(a.getAttribute('href'))) closeSheet(d, true);
    });
  });
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-sheet-open]');
    if (!b) return;
    var d = document.getElementById(b.getAttribute('data-sheet-open'));
    if (d && openSheet(d, b)) e.preventDefault();
  });
  /* Carrousels sans lien : focalisables au clavier sur mobile uniquement */
  function scrollerA11y() {
    document.querySelectorAll('.cards, .gallery').forEach(function (el) {
      var needs = appMq.matches && !el.querySelector('a[href], button, input, select, textarea');
      if (needs && !el.hasAttribute('data-a11y')) {
        var sec = el.closest('section'), h = sec && sec.querySelector('h2');
        el.setAttribute('tabindex', '0'); el.setAttribute('role', 'region'); el.setAttribute('data-a11y', '');
        el.setAttribute('aria-label', (h ? h.textContent.replace(/\s+/g, ' ').trim() : 'Galerie') + ', faites défiler');
      } else if (!needs && el.hasAttribute('data-a11y')) {
        ['tabindex', 'role', 'aria-label', 'data-a11y'].forEach(function (k) { el.removeAttribute(k); });
      }
    });
  }
  scrollerA11y();
  /* Le clavier virtuel masque la barre d'onglets pendant la saisie */
  document.addEventListener('focusin', function (e) {
    var el = e.target;
    document.documentElement.classList.toggle('kb-open', appMq.matches && !el.closest('dialog') && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) && !/^(button|submit|checkbox|radio)$/.test(el.type || ''));
  });
  document.addEventListener('focusout', function () { setTimeout(function () { var a = document.activeElement; if (!a || !/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) document.documentElement.classList.remove('kb-open'); }, 60); });
  var onAppMq = function () { scrollerA11y(); if (!appMq.matches && openSheetEl) openSheetEl.close(); };
  appMq.addEventListener ? appMq.addEventListener('change', onAppMq) : appMq.addListener(onAppMq);

  paintStatus(); setInterval(paintStatus, 60000);
})();
