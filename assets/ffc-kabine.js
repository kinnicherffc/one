// Live-Daten aus der FFC Kabine (app.kinnicherffc.de) für die Webseite
// Einbinden: <div data-ffc="spiele|termine|naechste|ticker|social|abo|video"></div>
(function () {
  'use strict';
  var API = window.FFC_API || 'https://app.kinnicherffc.de';
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var get = function (p) { return fetch(API + p, { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); };
  var tz = { timeZone: 'Europe/Berlin' };
  var day = function (t) { return new Date(t).toLocaleDateString('de-DE', Object.assign({ day: '2-digit', month: '2-digit' }, tz)); };
  var wday = function (t) { return new Date(t).toLocaleDateString('de-DE', Object.assign({ weekday: 'short' }, tz)).replace('.', ''); };
  var logo = function (u, n) { return u ? '<img src="' + esc(u) + '" alt="" loading="lazy">' : '<span class="ph" aria-hidden="true">⚽</span>'; };
  var STAT = { live: '<span class="ffc-pill live">● LIVE</span>', halbzeit: '<span class="ffc-pill live">Halbzeit</span>', abgesagt: '<span class="ffc-pill off">abgesagt</span>' };

  function gameRow(g) {
    var mid = g.status === 'beendet' || g.status === 'live' || g.status === 'halbzeit' ? '<b>' + esc(g.score || '–:–') + '</b><small>' + (g.status === 'beendet' ? 'Endstand' : g.status === 'halbzeit' ? 'Halbzeit' : esc(g.minute) + '. Min.') + '</small>'
      : g.status === 'abgesagt' ? '<b>–</b><small>abgesagt</small>' : '<b>' + esc(g.time) + '</b><small>Uhr</small>';
    return '<div class="ffc-game"><div class="ffc-date"><small>' + esc(wday(g.start)) + '</small><b>' + esc(day(g.start)) + '</b></div>' +
      '<div class="ffc-match"><div class="ffc-team home">' + logo(g.homeLogo) + '<span>' + esc(g.home) + '</span></div><div class="ffc-team away">' + logo(g.awayLogo) + '<span>' + esc(g.away) + '</span></div><div class="ffc-mid">' + mid + '</div></div>' +
      '<div class="ffc-meta"><span class="ffc-pill team">' + esc(g.team) + '</span>' + (STAT[g.status] || '') + (g.stream ? '<span class="ffc-pill stream">▶ Livestream</span>' : '') + '<span class="ffc-pill">' + (g.venue === 'heim' ? 'Heimspiel' : 'Auswärts') + '</span>' + (g.comp ? '<span>' + esc(g.comp) + '</span>' : '') + (g.place ? '<span>📍 ' + esc(g.place) + '</span>' : '') + '</div></div>';
  }

  function spiele(el) {
    var team = el.getAttribute('data-team') || 'all', limit = +el.getAttribute('data-limit') || 30;
    var data = null;
    function draw() {
      var now = Date.now();
      var gs = data.games.filter(function (g) { return team === 'all' || g.team === team; });
      var up = gs.filter(function (g) { return g.status === 'live' || g.status === 'halbzeit' || (g.start > now - 3 * 3600e3 && g.status !== 'beendet' && g.status !== 'vorbei'); }).slice(0, limit);
      var past = gs.filter(function (g) { return g.status === 'beendet'; }).slice(-4).reverse();
      el.innerHTML = '<div class="ffc-tabs" role="group" aria-label="Mannschaft">' + [['all', 'Alle'], ['1a', '1a'], ['1b', '1b']].map(function (x) { return '<button type="button" data-t="' + x[0] + '" aria-pressed="' + (team === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div>' +
        '<div class="ffc-list">' + (up.length ? up.map(gameRow).join('') : '<div class="ffc-empty">Aktuell sind keine Spiele angesetzt.</div>') + '</div>' +
        (past.length ? '<h4 style="margin:18px 0 8px">Letzte Ergebnisse</h4><div class="ffc-list">' + past.map(gameRow).join('') + '</div>' : '');
      el.querySelectorAll('[data-t]').forEach(function (b) { b.addEventListener('click', function () { team = b.getAttribute('data-t'); draw(); }); });
    }
    get('/pub/spiele.json').then(function (d) { data = d; draw(); }).catch(function () { el.innerHTML = '<div class="ffc-empty">Spielplan gerade nicht erreichbar.</div>'; });
  }

  function termine(el) {
    var limit = +el.getAttribute('data-limit') || 8, withGames = +el.getAttribute('data-games') || 0;
    Promise.all([get('/pub/termine.json').catch(function () { return { termine: [] }; }), withGames ? get('/pub/spiele.json').catch(function () { return { games: [] }; }) : Promise.resolve({ games: [] })]).then(function (r) {
      var now = Date.now();
      var items = r[0].termine.map(function (t) { return { start: t.start, title: t.title, sub: t.when.replace(/^[^ ]+ [^ ]+ ?/, '') + (t.loc ? ' · ' + t.loc : ''), icon: t.cat === 'bewirtung' ? '🍽️' : t.cat === 'fest' ? '🎉' : t.cat === 'ausflug' ? '🚌' : '📅' }; });
      r[1].games.filter(function (g) { return g.start > now - 2 * 3600e3 && g.status !== 'beendet' && g.status !== 'vorbei'; }).slice(0, withGames).forEach(function (g) { items.push({ start: g.start, title: '⚽ ' + g.team + ': ' + g.home + ' – ' + g.away, sub: g.time + ' Uhr' + (g.place ? ' · ' + g.place : '') + (g.status === 'abgesagt' ? ' · abgesagt' : ''), icon: '' }); });
      items.sort(function (a, b) { return a.start - b.start; });
      items = items.slice(0, limit);
      el.innerHTML = items.length ? items.map(function (x) { return '<div class="ffc-termin"><div class="ffc-date"><small>' + esc(wday(x.start)) + '</small><b>' + esc(day(x.start)) + '</b></div><div class="t"><b>' + (x.icon ? x.icon + ' ' : '') + esc(x.title) + '</b><small>' + esc(x.sub) + '</small></div></div>'; }).join('') : '<div class="ffc-empty">Gerade stehen keine Termine an.</div>';
    }).catch(function () { el.innerHTML = '<div class="ffc-empty">Termine gerade nicht erreichbar.</div>'; });
  }

  function abo(el) {
    var all = API.replace(/^https:/, 'webcal:') + '/kalender.ics', sp = API.replace(/^https:/, 'webcal:') + '/spiele.ics';
    el.innerHTML = '<div class="ffc-abo"><a class="btn" href="' + all + '">📅 Kalender abonnieren (iPhone/Outlook)</a>' +
      '<a class="btn" href="https://calendar.google.com/calendar/r?cid=' + encodeURIComponent(all) + '" target="_blank" rel="noopener">Google Kalender</a>' +
      '<a class="btn" href="' + sp + '">Nur Spiele 1a/1b</a></div><p class="muted" style="font-size:13px;margin:8px 0 0">Enthält alle Spiele der 1a und 1b und die öffentlichen Fanclub-Termine. Aktualisiert sich automatisch.</p>';
  }

  // Liveticker: aktualisiert alle 15 s, optional Browser-Benachrichtigung bei Toren (solange die Seite offen ist)
  function ticker(el) {
    var seen = {}, first = true, notify = false;
    try { notify = localStorage.getItem('ffc-notify') === '1' && 'Notification' in window && Notification.permission === 'granted'; } catch (e) {}
    function board(g) {
      return '<div class="ffc-board"><div class="head"><span>' + esc(g.comp || '') + ' · ' + esc(g.team) + '</span><span>' + (g.status === 'beendet' ? 'Endstand' : g.status === 'halbzeit' ? 'Halbzeit' : g.status === 'live' ? '● LIVE · ' + esc(g.minute) + '. Min.' : esc(wday(g.start) + ' ' + day(g.start) + ' · ' + g.time + ' Uhr')) + '</span></div>' +
        '<div class="score"><div class="side">' + logo(g.homeLogo) + '<span>' + esc(g.home) + '</span></div><div class="res">' + esc(g.score || '–:–') + (g.status === 'geplant' ? '<small>Anpfiff ' + esc(g.time) + ' Uhr</small>' : '') + '</div><div class="side">' + logo(g.awayLogo) + '<span>' + esc(g.away) + '</span></div></div>' +
        (g.events && g.events.length ? '<ul class="ffc-events">' + g.events.slice().reverse().map(function (e) { return '<li class="' + e.side + '"><b>' + esc(e.min) + '.\'</b><span>⚽ ' + esc(e.score) + (e.name ? ' – ' + esc(e.name) : '') + '</span></li>'; }).join('') + '</ul>' : '') +
        (g.stream && (g.status === 'live' || g.status === 'halbzeit') ? '<p style="margin:12px 0 0"><a class="btn" href="livevideo.html">▶ Zum Livestream</a></p>' : '') + '</div>';
    }
    function load() {
      get('/pub/live.json').then(function (d) {
        var show = d.live.length ? d.live : d.next;
        // neue Tore melden
        d.live.forEach(function (g) { (g.events || []).forEach(function (e, i) { var k = g.id + '|' + i; if (!seen[k]) { seen[k] = 1; if (!first && notify) { try { new Notification('⚽ TOR ' + g.home + ' ' + e.score + ' ' + g.away, { body: (e.min + '. Minute') + (e.name ? ' – ' + e.name : ''), icon: API + '/pub/poster/sg_hd.png' }); } catch (x) {} } } }); });
        first = false;
        var nb = 'Notification' in window ? '<div class="ffc-notify"><button class="btn" type="button" id="ffc-nb">' + (notify ? '🔔 Benachrichtigung an' : '🔕 Bei Toren benachrichtigen') + '</button><span>funktioniert, solange diese Seite geöffnet ist · immer: <a href="https://whatsapp.com/channel/0029VaMg8M11t90lH7MP9n20" target="_blank" rel="noopener">WhatsApp-Kanal</a></span></div>' : '';
        el.innerHTML = nb + (show.length ? (d.live.length ? '' : '<p class="muted" style="margin:0 0 10px">Gerade läuft kein Spiel. Als Nächstes:</p>') + show.map(board).join('') : '<div class="ffc-empty">Gerade läuft kein Spiel und es ist keins angesetzt.</div>');
        var b = document.getElementById('ffc-nb');
        if (b) b.addEventListener('click', function () {
          if (notify) { notify = false; try { localStorage.setItem('ffc-notify', '0'); } catch (e) {} load(); return; }
          Notification.requestPermission().then(function (p) { notify = p === 'granted'; try { localStorage.setItem('ffc-notify', notify ? '1' : '0'); } catch (e) {} load(); });
        });
      }).catch(function () { el.innerHTML = '<div class="ffc-empty">Liveticker gerade nicht erreichbar.</div>'; });
    }
    load(); setInterval(load, 15000);
  }

  function social(el) {
    get('/pub/social.json').then(function (d) {
      var pages = (d.pages || []).filter(function (p) { return p.posts && p.posts.length; });
      el.innerHTML = pages.length ? pages.map(function (p) { return '<h3 style="margin:18px 0 10px">' + esc(p.name) + '</h3><div class="ffc-posts">' + p.posts.map(function (x) { return '<a class="ffc-post" href="' + esc(x.link) + '" target="_blank" rel="noopener">' + (x.img ? '<img src="' + esc(x.img) + '" alt="" loading="lazy">' : '') + '<div><small>' + esc(new Date(x.date).toLocaleDateString('de-DE', tz)) + '</small><p>' + esc(x.text) + '</p></div></a>'; }).join('') + '</div>'; }).join('')
        : '<div class="ffc-empty">Die neuesten Beiträge findest du direkt auf Facebook und Instagram.</div>';
    }).catch(function () { el.innerHTML = '<div class="ffc-empty">Beiträge gerade nicht erreichbar.</div>'; });
  }

  // Live-Video-Seite: nächstes übertragenes Spiel + Countdown + Player (window.ffcVideo(cb) liefert die Daten)
  window.ffcVideo = function (cb) { get('/pub/live.json').then(function (d) { cb(d.nextStream || null, d); }).catch(function () { cb(null, null); }); };

  var R = { spiele: spiele, termine: termine, abo: abo, ticker: ticker, social: social };
  function init() { document.querySelectorAll('[data-ffc]').forEach(function (el) { var f = R[el.getAttribute('data-ffc')]; if (f) f(el); }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
