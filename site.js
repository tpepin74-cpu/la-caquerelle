/* La Caquerelle — interactions du site (sans dépendance) */
(function () {
  'use strict';
  var TZ = 'Europe/Zurich';
  var LINKS = {
    rooms: 'https://booking.juratroislacs.ch/TDS00020010000457519/tbooking/?lang=fr',
    table: 'https://www.mylocalina.ch/widget/?id=2bb7ca5d-07d8-4615-83be-13c94adc9818',
    mdt: 'https://maisondutourisme.ch/fr/reservation',
    crac: 'https://www.musee-crac.ch/',
    carte: 'https://www.lacaquerelle.com/file/si2528241/download/carte%20d%27automne%202026-fi36719952.pdf',
    groupes: 'https://www.lacaquerelle.com/file/si2528241/download/Propositions%20de%20menu%20pour%20groupe%202026-fi36671766.pdf',
    maps: 'https://www.google.com/maps/search/?api=1&query=47.379887%2C7.2109573',
    jurapass: 'https://www.j3l.ch/en/Z10855/jura-pass'
  };
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
  var fabEl = document.querySelector('[data-cg-fab]');
  var ticking = false;
  function onScroll() {
    ticking = false;
    var y = window.scrollY;
    if (header) header.classList.toggle('is-solid', y > 40 || header.hasAttribute('data-solid'));
    if (fabEl) fabEl.classList.toggle('is-away', y < window.innerHeight * 0.6);
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

  /* ================== Concierge ================== */
  var SEJOURS = {
    doubs: { t: 'Au fil du Doubs', s: 'Saint-Ursanne, canoë, collégiale', img: 'doubs' },
    damassine: { t: 'La route de la Damassine', s: 'Distilleries, vergers, Porrentruy', img: 'damassine' },
    chasse: { t: 'La saison de la chasse', s: 'Menu de chasse, tir à l’arc 3D', img: 'archerie' },
    'st-martin': { t: 'La St-Martin en Ajoie', s: '13–16 novembre 2026', img: 'stmartin' },
    'franches-montagnes': { t: 'Franches-Montagnes au pas des chevaux', s: 'Balades, attelage, Gruère', img: 'chevaux' },
    dinosaures: { t: 'Sur les traces des dinosaures', s: 'Empreintes, grottes, Préhisto-Parc', img: 'dinosaures' },
    hiver: { t: 'Hiver blanc', s: 'Raquettes, traîneau, Tête de Moine', img: 'hiver' },
    randonnee: { t: 'Randonnée depuis la porte', s: 'Boucles vers le Doubs et les crêtes', img: 'rando' },
    legendes: { t: 'Les légendes du col', s: 'Musée CRAC, Sentinelle, sorcières', img: 'legende' }
  };
  var MATRIX = {
    couple: { automne: ['chasse', 'damassine', 'legendes'], hiver: ['hiver', 'st-martin', 'legendes'], ete: ['doubs', 'franches-montagnes', 'randonnee'] },
    famille: { automne: ['dinosaures', 'chasse', 'legendes'], hiver: ['hiver', 'legendes', 'dinosaures'], ete: ['dinosaures', 'doubs', 'franches-montagnes'] },
    amis: { automne: ['st-martin', 'chasse', 'damassine'], hiver: ['st-martin', 'hiver', 'damassine'], ete: ['doubs', 'randonnee', 'franches-montagnes'] },
    solo: { automne: ['randonnee', 'legendes', 'damassine'], hiver: ['hiver', 'legendes', 'randonnee'], ete: ['randonnee', 'doubs', 'legendes'] }
  };
  var ctx = {};
  function hoursHtml() {
    var n = zNow(), s = status(), info = dayInfo(n.date);
    return '<p><strong>' + s.text + '</strong> (heure suisse).</p><p>Jusqu’au 26 novembre 2026 : lundi, mardi et dimanche 9 h – 22 h 30 · vendredi et samedi 9 h – 23 h.<br>Dès le 27 novembre : lundi et mardi 9 h – 14 h 30 et 18 h – 22 h 30 · vendredi et samedi 9 h – 23 h · dimanche 9 h – 15 h et 18 h – 22 h 30.</p><p>Fermé le mercredi et le jeudi, ainsi que les 24, 25 et 26 décembre 2026.</p>';
  }
  var MAIN = [
    { l: 'Réserver une chambre', go: 'room' }, { l: 'Réserver une table', go: 'table' }, { l: 'Une idée de séjour', go: 'sejour' },
    { l: 'Organiser un événement', go: 'event' }, { l: 'Découvrir la carte', go: 'carte' }, { l: 'Activités sur place', go: 'activites' }, { l: 'Infos pratiques', go: 'infos' }
  ];
  var BACK = { l: 'Autre chose', go: 'menu' };
  var NODES = {
    start: function () {
      var h = zNow().hour, g = h < 5 || h >= 18 ? 'Bonsoir' : 'Bonjour';
      return { m: '<p>' + g + ' et bienvenue à La Caquerelle.</p><p>Je suis le concierge de la maison. Dites-moi ce qui vous ferait plaisir, je vous oriente en quelques questions.</p>', chips: MAIN };
    },
    menu: function () { return { m: '<p>Avec plaisir. Que puis-je préparer pour vous ?</p>', chips: MAIN }; },
    room: function () {
      return { m: '<p>Nos 9 chambres sont toutes équipées d’une douche et d’un WC, d’une télévision à écran plat et du wifi offert. Le parking est gratuit.</p><p>Combien serez-vous ?</p>',
        chips: [{ l: '1 ou 2 personnes', go: 'room2' }, { l: '3 personnes', go: 'room3' }, { l: '4 personnes', go: 'room4' }, { l: 'Plus de 4', go: 'room5' }] };
    },
    room2: function () { return roomReply('une <strong>chambre double</strong>'); },
    room3: function () { return roomReply('une <strong>chambre à trois lits</strong>'); },
    room4: function () { return roomReply('notre <strong>chambre familiale</strong> (deux lits et un lit superposé)'); },
    room5: function () {
      return { m: '<p>Pour un groupe, le plus simple est de nous appeler au <strong>' + PHONE + '</strong> : nous composerons la répartition idéale entre nos chambres doubles, triples et familiales.</p>',
        ctas: [{ l: 'Voir les disponibilités', h: LINKS.rooms, x: 1 }, { l: 'Demande de groupe', h: 'evenements.html#demande' }], chips: [{ l: 'Réserver aussi une table', go: 'table' }, BACK] };
    },
    table: function () {
      var s = status();
      return { m: '<p><strong>' + s.text + '</strong>.</p><p>Le restaurant compte 80 couverts en salle, une salle de 25 places et une terrasse ombragée. Il est fermé le mercredi et le jeudi.</p><p>Vous pouvez réserver en ligne en quelques secondes, ou nous appeler au <strong>' + PHONE + '</strong>.</p>',
        ctas: [{ l: 'Réserver en ligne', h: LINKS.table, x: 1, brass: 1 }, { l: 'Choisir date et heure', h: 'reserver.html#table' }], chips: [{ l: 'Nous serons 10 ou plus', go: 'groupe' }, { l: 'Voir les horaires', go: 'hours' }, { l: 'Découvrir la carte', go: 'carte' }, BACK] };
    },
    groupe: function () {
      return { m: '<p>Dès 10 personnes, vous composez un <strong>menu identique pour tous</strong> parmi nos propositions de groupe (entrées, viandes, poissons, desserts maison), à réserver au moins <strong>7 jours à l’avance</strong>.</p>',
        ctas: [{ l: 'Menus de groupe (PDF)', h: LINKS.groupes, x: 1 }, { l: 'Faire une demande', h: 'evenements.html#demande', brass: 1 }], chips: [{ l: 'Organiser un événement', go: 'event' }, BACK] };
    },
    hours: function () { return { m: hoursHtml(), ctas: [{ l: 'Réserver une table', h: LINKS.table, x: 1, brass: 1 }], chips: [BACK] }; },
    sejour: function () {
      return { m: '<p>J’ai neuf idées de séjour autour de la maison. Avec qui voyagez-vous ?</p>',
        chips: [{ l: 'En couple', go: 'w:couple' }, { l: 'En famille', go: 'w:famille' }, { l: 'Entre amis', go: 'w:amis' }, { l: 'En solo', go: 'w:solo' }] };
    },
    season: function () {
      return { m: '<p>Et à quelle saison ?</p>', chips: [{ l: 'Automne', go: 's:automne' }, { l: 'Hiver', go: 's:hiver' }, { l: 'Printemps – été', go: 's:ete' }] };
    },
    reco: function () {
      var list = (MATRIX[ctx.who] || MATRIX.couple)[ctx.season || 'automne'];
      var cards = list.map(function (k) { var s = SEJOURS[k]; return '<a class="cg-card" href="sejours.html#' + k + '"><img src="' + s.img + '-640.webp" alt="" loading="lazy" width="84" height="64"><span><b>' + s.t + '</b><span>' + s.s + '</span></span></a>'; }).join('');
      return { m: '<p>Voici ce que je vous suggère :</p>', html: '<div class="cg-sugg">' + cards + '</div>',
        ctas: [{ l: 'Réserver ma chambre', h: LINKS.rooms, x: 1, brass: 1 }, { l: 'Tous les séjours', h: 'sejours.html' }], chips: [{ l: 'Changer de saison', go: 'season' }, BACK] };
    },
    event: function () {
      return { m: '<p>Quelle occasion souhaitez-vous célébrer ?</p>', chips: [{ l: 'Un mariage', go: 'e:mariage' }, { l: 'Un anniversaire, une fête de famille', go: 'e:fete' }, { l: 'Un séminaire, un repas d’entreprise', go: 'e:seminaire' }, { l: 'Une sortie de groupe', go: 'groupe' }] };
    },
    'e:mariage': function () {
      return { m: '<p>Nos salles sous les plafonds peints accueillent jusqu’à <strong>80 convives</strong>, et nos 9 chambres permettent à vos proches de rester dormir au col. Le menu se compose avec la cuisine, à partir de nos propositions de groupe.</p>',
        ctas: [{ l: 'Faire une demande', h: 'evenements.html#demande', brass: 1 }, { l: 'Voir les salles', h: 'evenements.html#salles' }], chips: [{ l: 'Bloquer des chambres', go: 'room5' }, BACK] };
    },
    'e:fete': function () {
      return { m: '<p>Pour une fête de famille, la grande salle reçoit jusqu’à 80 personnes et la petite salle 25. Les enfants profitent des deux grandes places de jeux et du swingolf juste à côté.</p>',
        ctas: [{ l: 'Faire une demande', h: 'evenements.html#demande', brass: 1 }, { l: 'Menus de groupe (PDF)', h: LINKS.groupes, x: 1 }], chips: [BACK] };
    },
    'e:seminaire': function () {
      return { m: '<p>Nous disposons de <strong>deux salles de conférence équipées</strong> (wifi, projecteur, écran), d’un restaurant pour les pauses et repas, et de 9 chambres. Pour souder l’équipe : tir à l’arc 3D, swingolf ou footgolf au départ de la maison.</p>',
        ctas: [{ l: 'Demande de séminaire', h: 'evenements.html#demande', brass: 1 }, { l: 'Activités de groupe', h: 'activites.html' }], chips: [BACK] };
    },
    carte: function () {
      return { m: '<p>C’est la saison de la chasse. Quelques plats de notre <strong>carte d’automne 2026</strong> :</p><ul><li>Menu de chasse, trois plats — CHF 52.–</li><li>Noisettes de chevreuil, sauce chasseur, spätzlis maison — CHF 42.–</li><li>Trio de gibier (chevreuil, sanglier, cerf) — CHF 40.–</li><li>Cordon bleu chasseur maison — CHF 35.–</li><li>Raviolis maison au potimarron, beurre de sauge — CHF 26.–</li></ul><p>Des plats végétariens et un menu enfants sont toujours proposés.</p>',
        ctas: [{ l: 'Toute la carte', h: 'restaurant.html#carte' }, { l: 'Carte en PDF', h: LINKS.carte, x: 1 }, { l: 'Réserver une table', h: LINKS.table, x: 1, brass: 1 }], chips: [{ l: 'Végétarien ?', go: 'vege' }, BACK] };
    },
    vege: function () {
      return { m: '<p>Oui : raviolis maison au potimarron (CHF 26.–), croûte aux chanterelles fraîches (CHF 25.–) et assiette de garnitures de chasse avec spätzlis maison (CHF 26.–). Pour toute allergie, dites-le simplement en réservant.</p>', chips: [{ l: 'Réserver une table', go: 'table' }, BACK] };
    },
    activites: function () {
      return { m: '<p>Au départ de la maison : <strong>swingolf</strong> 9 trous, <strong>tir à l’arc 3D</strong> en forêt et <strong>footgolf</strong> 9 trous (adulte CHF 20.–, enfant 12.–, sur réservation auprès de la Maison du Tourisme, 032 461 00 00). Et aussi la pétanque (boules au restaurant), deux grandes places de jeux et le <strong>Musée CRAC</strong> dans l’ancienne chapelle.</p>',
        ctas: [{ l: 'Toutes les activités', h: 'activites.html' }, { l: 'Réserver une activité', h: LINKS.mdt, x: 1 }], chips: [{ l: 'Une idée de séjour', go: 'sejour' }, BACK] };
    },
    infos: function () {
      return { m: '<p>Que souhaitez-vous savoir ?</p>', chips: [{ l: 'Horaires', go: 'hours' }, { l: 'Accès et parking', go: 'acces' }, { l: 'Animaux', go: 'animaux' }, { l: 'Wifi et équipements', go: 'wifi' }, { l: 'Musée CRAC', go: 'musee' }, { l: 'Vous contacter', go: 'contact' }] };
    },
    acces: function () {
      return { m: '<p>Nous sommes au <strong>col de La Caquerelle</strong>, La Caquerelle 8, 2954 Asuel (canton du Jura), à environ 10 minutes de Saint-Ursanne, 15 minutes de Porrentruy et de Delémont, 20 minutes de Saignelégier. Parking gratuit devant la maison.</p>',
        ctas: [{ l: 'Itinéraire', h: LINKS.maps, x: 1 }, { l: 'Plan d’accès', h: 'contact.html#acces' }], chips: [BACK] };
    },
    animaux: function () { return { m: '<p>Pour venir avec votre animal, merci de nous le demander au préalable au <strong>' + PHONE + '</strong> ou par e-mail : nous vous dirons ce qui est possible selon la chambre.</p>', chips: [{ l: 'Vous contacter', go: 'contact' }, BACK] }; },
    wifi: function () { return { m: '<p>Wifi gratuit dans l’hôtel, télévision à écran plat dans les chambres, douche et WC privatifs, parking gratuit, terrasse, places de jeux et deux salles de conférence équipées.</p>', chips: [{ l: 'Réserver une chambre', go: 'room' }, BACK] }; },
    musee: function () {
      return { m: '<p>Le <strong>Musée CRAC</strong> occupe l’ancienne chapelle Saint-Joseph (1893), juste à côté. On y voit les vestiges de la Sentinelle des Rangiers et la bannière des seigneurs d’Asuel perdue à Sempach en 1386. Ouvert tous les jours de 8 h 30 à 20 h 30 ; adulte CHF 6.–, gratuit pour les moins de 10 ans ; paiement par carte ou TWINT.</p>',
        ctas: [{ l: 'Site du musée', h: LINKS.crac, x: 1 }, { l: 'Notre histoire', h: 'historique.html' }], chips: [BACK] };
    },
    contact: function () {
      return { m: '<p>Téléphone : <strong>' + PHONE + '</strong><br>E-mail : <strong>' + MAIL + '</strong><br>Adresse : La Caquerelle 8, 2954 Asuel</p>', ctas: [{ l: 'Page contact', h: 'contact.html' }], chips: [BACK] };
    },
    legende: function () {
      return { m: '<p>On raconte que le col, entre la Roche au Vilain et le Roc de l’Autel, était un rendez-vous de sorcières : leurs sabbats, les « hautes chasses », s’y tenaient dans un fracas de hurlements. Le nom de Caquerelle en viendrait. Rassurez-vous : de nos jours, les sorcières ont bien changé.</p>',
        ctas: [{ l: 'Lire notre histoire', h: 'historique.html' }], chips: [{ l: 'Séjour « Légendes du col »', go: 'goto:legendes' }, BACK] };
    },
    prix: function () {
      return { m: '<p>Les tarifs des chambres varient selon la date et le nombre de personnes : le moteur de réservation officiel affiche les prix et disponibilités en temps réel. Au restaurant, les plats de la carte d’automne vont de CHF 23.– à 42.–, le menu de chasse est à CHF 52.–.</p>',
        ctas: [{ l: 'Prix et disponibilités', h: LINKS.rooms, x: 1, brass: 1 }, { l: 'La carte', h: 'restaurant.html#carte' }], chips: [BACK] };
    },
    fallback: function () {
      return { m: '<p>Je n’ai pas toutes les réponses, mais la famille Petignat, si : appelez le <strong>' + PHONE + '</strong> ou écrivez à <strong>' + MAIL + '</strong>.</p><p>Ou choisissez un sujet :</p>', chips: MAIN };
    }
  };
  function roomReply(what) {
    return { m: '<p>Je vous conseille ' + what + '. Les prix et disponibilités s’affichent en temps réel sur notre moteur de réservation officiel (Jura &amp; Trois-Lacs).</p><p>Une nuit dans un hôtel jurassien vous donne aussi droit au <strong>JURA-PASS</strong> : transports publics de la zone Vagabond et réductions sur de nombreuses activités.</p>',
      ctas: [{ l: 'Voir les disponibilités', h: LINKS.rooms, x: 1, brass: 1 }, { l: 'Découvrir les chambres', h: 'hotel.html#chambres' }], chips: [{ l: 'Une idée de séjour', go: 'sejour' }, { l: 'Réserver aussi une table', go: 'table' }, BACK] };
  }
  var INTENTS = [
    [/(dormir|chambre|nuit|h[oô]tel|zimmer|room|stay|lit\b|s[ée]journer chez)/i, 'room'],
    [/(table|manger|d[iî]ner|d[ée]jeuner|souper|r[ée]server au resto|essen|lunch|dinner)/i, 'table'],
    [/(mariage|noce|se marier)/i, 'e:mariage'],
    [/(s[ée]minaire|entreprise|conf[ée]rence|r[ée]union|team)/i, 'e:seminaire'],
    [/(anniversaire|f[eê]te de famille|bapt[eê]me|communion|jubil)/i, 'e:fete'],
    [/(banquet|f[eê]te|r[ée]ception|[ée]v[ée]nement)/i, 'event'],
    [/(groupe|10 personnes|sortie)/i, 'groupe'],
    [/(v[ée]g[ée]|v[ée]gan|sans viande)/i, 'vege'],
    [/(carte|menu|plat|chasse|gibier|chevreuil|cuisine|manger quoi|sp[äa]tzli|cordon)/i, 'carte'],
    [/(horaire|ouvert|ferm[ée]|heure|aujourd|ce soir|demain)/i, 'hours'],
    [/(acc[eè]s|venir|route|itin[ée]raire|parking|adresse|o[uù] (ê|e)tes|train|bus|gps)/i, 'acces'],
    [/(chien|chat|animal|animaux)/i, 'animaux'],
    [/(wifi|wi-fi|internet|t[ée]l[ée]|[ée]quipement)/i, 'wifi'],
    [/(prix|tarif|co[uû]te|combien)/i, 'prix'],
    [/(mus[ée]e|sentinelle|crac|chapelle)/i, 'musee'],
    [/(sorci[eè]re|l[ée]gende|histoire|1906|famille petignat)/i, 'legende'],
    [/(enfant|famille|dinosaure|jeux|grotte)/i, 'w:famille'],
    [/(hiver|neige|raquette|ski|tra[iî]neau)/i, 'goto:hiver'],
    [/(damassine|eau-de-vie|distiller|porrentruy)/i, 'goto:damassine'],
    [/(doubs|cano[eë]|kayak|saint-ursanne|st-ursanne|p[eê]che)/i, 'goto:doubs'],
    [/(cheval|chevaux|franches|saignel[ée]gier|march[ée]-concours)/i, 'goto:franches-montagnes'],
    [/(rando|marche|balade|v[ée]lo|vtt|sentier)/i, 'goto:randonnee'],
    [/(st-martin|saint-martin)/i, 'goto:st-martin'],
    [/(golf|swin|arc|footgolf|p[ée]tanque|activit)/i, 'activites'],
    [/(s[ée]jour|week-end|weekend|id[ée]e|escapade)/i, 'sejour'],
    [/(contact|t[ée]l[ée]phone|appeler|mail|joindre)/i, 'contact'],
    [/(bonjour|salut|hello|bonsoir|coucou)/i, 'menu']
  ];
  function goto(key) {
    var s = SEJOURS[key];
    return { m: '<p>Excellente idée. Voici le séjour que nous avons imaginé :</p>', html: '<div class="cg-sugg"><a class="cg-card" href="sejours.html#' + key + '"><img src="' + s.img + '-640.webp" alt="" loading="lazy" width="84" height="64"><span><b>' + s.t + '</b><span>' + s.s + '</span></span></a></div>',
      ctas: [{ l: 'Réserver ma chambre', h: LINKS.rooms, x: 1, brass: 1 }], chips: [{ l: 'D’autres idées', go: 'sejour' }, BACK] };
  }
  function resolve(go) {
    if (go.indexOf('w:') === 0) { ctx.who = go.slice(2); return NODES.season(); }
    if (go.indexOf('s:') === 0) { ctx.season = go.slice(2); return NODES.reco(); }
    if (go.indexOf('goto:') === 0) return goto(go.slice(5));
    return (NODES[go] || NODES.fallback)();
  }
  var MONO = '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5c-1 2 0 4 2 5M9 6c-2 1-3 3-2 5M21 5c1 2 0 4-2 5M23 6c2 1 3 3 2 5"/><path d="M13 10c-2 0-3 2-3 4 0 3 3 6 6 9 3-3 6-6 6-9 0-2-1-4-3-4-1 0-2 .5-3 1.5C15 10.5 14 10 13 10z"/><circle cx="13.5" cy="15" r=".6" fill="currentColor"/><circle cx="18.5" cy="15" r=".6" fill="currentColor"/></svg>';
  function buildConcierge(host, opts) {
    host.innerHTML = '<div class="concierge" role="region" aria-label="Votre concierge en ligne"><div class="cg-head"><span class="cg-mono">' + MONO + '</span><span class="cg-title"><b>Votre concierge en ligne</b><span>La Caquerelle · répond tout de suite</span></span>' + (opts.onClose ? '<button class="cg-close" type="button" aria-label="Fermer votre concierge en ligne">×</button>' : '') + '</div><div class="cg-log" role="log" aria-live="polite"></div><form class="cg-form"><label class="sr-only" for="cg-in-' + opts.id + '">Votre question</label><input id="cg-in-' + opts.id + '" type="text" autocomplete="off" placeholder="Posez votre question…" maxlength="200"><button type="submit">Envoyer</button></form></div>';
    var log = host.querySelector('.cg-log'), form = host.querySelector('.cg-form'), input = form.querySelector('input');
    if (opts.onClose) host.querySelector('.cg-close').addEventListener('click', opts.onClose);
    function scroll() { log.scrollTop = log.scrollHeight; }
    function clearChips() { log.querySelectorAll('.cg-chips').forEach(function (c) { c.remove(); }); }
    function bot(r) {
      var typing = document.createElement('div'); typing.className = 'msg msg--bot typing'; typing.setAttribute('aria-hidden', 'true'); typing.innerHTML = '<i></i><i></i><i></i>'; log.appendChild(typing); scroll();
      setTimeout(function () {
        typing.remove();
        var m = document.createElement('div'); m.className = 'msg msg--bot'; m.innerHTML = r.m; log.appendChild(m);
        if (r.html) { var h = document.createElement('div'); h.className = 'cg-sugg'; h.innerHTML = r.html; log.appendChild(h.firstChild); }
        if (r.ctas) { var c = document.createElement('div'); c.className = 'cg-ctas'; r.ctas.forEach(function (x) { var a = document.createElement('a'); a.className = 'btn btn--sm ' + (x.brass ? 'btn--brass' : 'btn--light'); a.href = x.h; a.textContent = x.l; if (x.x) { a.target = '_blank'; a.rel = 'noopener'; a.classList.add('ext'); } c.appendChild(a); }); log.appendChild(c); }
        if (r.chips) { var ch = document.createElement('div'); ch.className = 'cg-chips'; r.chips.forEach(function (x) { var b = document.createElement('button'); b.type = 'button'; b.className = 'cg-chip'; b.textContent = x.l; b.addEventListener('click', function () { user(x.l); clearChips(); bot(resolve(x.go)); }); ch.appendChild(b); }); log.appendChild(ch); }
        scroll();
      }, reduce ? 0 : 300);
    }
    function user(t) { var m = document.createElement('div'); m.className = 'msg msg--user'; m.textContent = t; log.appendChild(m); scroll(); }
    form.addEventListener('submit', function (e) {
      e.preventDefault(); var t = input.value.trim(); if (!t) return; input.value = ''; user(t); clearChips();
      var go = 'fallback'; for (var i = 0; i < INTENTS.length; i++) { if (INTENTS[i][0].test(t)) { go = INTENTS[i][1]; break; } }
      if (go === 'w:famille') { ctx.who = 'famille'; go = 'season'; }
      bot(resolve(go));
    });
    bot(NODES.start());
    return host;
  }
  document.querySelectorAll('[data-concierge-inline]').forEach(function (h, i) { buildConcierge(h, { id: 'in' + i }); });
  var fab = document.querySelector('[data-cg-fab]');
  if (fab) {
    var pop = null;
    fab.addEventListener('click', function () {
      if (!pop) {
        pop = document.createElement('div'); pop.className = 'cg-pop'; pop.id = 'cg-pop'; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', 'Votre concierge en ligne'); document.body.appendChild(pop);
        fab.setAttribute('aria-controls', 'cg-pop');
        buildConcierge(pop, { id: 'pop', onClose: function () { pop.hidden = true; fab.setAttribute('aria-expanded', 'false'); fab.focus(); } });
      } else { pop.hidden = false; }
      fab.setAttribute('aria-expanded', 'true');
      var inp = pop.querySelector('input'); inp && setTimeout(function () { inp.focus(); }, 50);
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && pop && !pop.hidden) { pop.hidden = true; fab.setAttribute('aria-expanded', 'false'); fab.focus(); } });
  }

  /* ================== Application mobile : feuilles modales ================== */
  var appMq = window.matchMedia('(max-width: 760px)');
  var openSheetEl = null;
  function setExpanded(id, v) {
    document.querySelectorAll('[data-sheet-open="' + id + '"][aria-expanded]').forEach(function (b) { b.setAttribute('aria-expanded', v ? 'true' : 'false'); });
  }
  function ensureSheetConcierge(d) {
    var host = d.querySelector('[data-cg-sheet]');
    if (!host || host.firstChild) return;
    buildConcierge(host, { id: 'sh', onClose: function () { closeSheet(d); } });
    var head = host.querySelector('.cg-head');
    if (head) attachDrag(d, head);
  }
  function openSheet(d, trigger) {
    if (!d || typeof d.showModal !== 'function') return false;
    if (openSheetEl && openSheetEl !== d) { var prev = openSheetEl; trigger = prev._trigger || trigger; openSheetEl = null; prev.close(); }
    if (d.open) return true;
    d._trigger = trigger || null;
    d.classList.remove('is-closing'); d.style.transform = ''; d.style.transition = '';
    if (d.id === 'sheet-cg') ensureSheetConcierge(d);
    d.showModal();
    openSheetEl = d;
    document.documentElement.classList.add('sheet-open');
    setExpanded(d.id, true);
    var first = d.querySelector('[data-sheet-close], .cg-close');
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
