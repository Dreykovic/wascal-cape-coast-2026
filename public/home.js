/* =====================================================================
   WASCAL 6th batch · Cape Coast 2026 — script du one-page (module ES, aucun build).
   - Scroll NATIF : aucune interception molette / clavier / tactile.
   - Animations : CSS (animation-timeline) quand le navigateur sait faire ; sinon repli
     IntersectionObserver qui pose .in-view. Le tracé des symboles Adinkra est déclenché par
     .in-view dans tous les navigateurs. Rien de tout ça si prefers-reduced-motion: reduce.
   - Données : GET /api/journey-stages (parcours), GET /api/gallery (galerie),
     GET /api/survey-status (lien sondage du pied de page).
   ===================================================================== */
import * as ADK from '/adinkra.js?v=1';
import { esc } from '/shared.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const html = document.documentElement;

const RM = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const supports = (q) => !!(window.CSS && CSS.supports && CSS.supports(q));
const HAS_VIEW_TL = supports('animation-timeline: view()');
const HAS_SCROLL_TL = supports('animation-timeline: scroll()');
const HAS_IO = 'IntersectionObserver' in window;

html.classList.add('js');

/* ---------- Adinkra : API du module, avec repli si une fonction manque encore ---------- */
const NS = 'http://www.w3.org/2000/svg';
const adinkraSVG = typeof ADK.adinkraSVG === 'function'
  ? ADK.adinkraSVG
  : (key, className = '') => `<svg class="adk${className ? ' ' + className : ''}" data-adinkra="${key}"></svg>`;

function fallbackHydrate(root = document) {
  const table = ADK.ADINKRA || {};
  root.querySelectorAll('[data-adinkra]').forEach((svg) => {
    const s = table[svg.dataset.adinkra];
    if (!s || svg.dataset.ready) return;
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', s.fr + ' — ' + s.sens);
    const title = document.createElementNS(NS, 'title');
    title.textContent = s.fr + ' — ' + s.sens;
    svg.appendChild(title);
    s.d.forEach((d, i) => {
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', d);
      p.setAttribute('pathLength', '1');
      p.style.setProperty('--p', i);
      svg.appendChild(p);
    });
    svg.dataset.ready = '1';
  });
}
const hydrateAll = typeof ADK.hydrateAll === 'function' ? ADK.hydrateAll : fallbackHydrate;

/* ---------- Mouvement : classes de pilotage (posées seulement si utiles) ---------- */
const MOTION = !RM && HAS_IO;
let traceIO = null;
let revealIO = null;

function setupMotion() {
  if (!MOTION) return;
  try {
    traceIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('in-view');
        traceIO.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    html.classList.add('trace-on');

    if (!HAS_VIEW_TL) {
      revealIO = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add('in-view');
          revealIO.unobserve(e.target);
        });
      }, { rootMargin: '0px 0px -10% 0px' });
      html.classList.add('io');
    }
  } catch (err) {
    // Jamais de contenu masqué si le repli échoue.
    html.classList.remove('trace-on', 'io');
    traceIO = revealIO = null;
  }
}

/** À rappeler après chaque rendu dynamique (parcours, galerie). */
function watch(root = document) {
  hydrateAll(root);
  $$('[data-stagger]', root).forEach((g) => {
    [...g.children].forEach((c, i) => c.style.setProperty('--i', i));
  });
  if (traceIO) {
    $$('svg.adk:not(.adk-stamp):not(.adk-loading), .stage-node, .ring', root)
      .forEach((el) => { if (!el.classList.contains('in-view')) traceIO.observe(el); });
  }
  if (revealIO) {
    $$('.rv, .cloth', root)
      .forEach((el) => { if (!el.classList.contains('in-view')) revealIO.observe(el); });
  }
}

/* ---------- Étoffe Adinkra : carrés tamponnés entre les sections ---------- */
function weaveCloths() {
  $$('[data-cloth]').forEach((cloth) => {
    const keys = cloth.dataset.cloth.split(/\s+/).filter(Boolean);
    const row = $('.cloth-row', cloth);
    if (!keys.length || !row) return;
    let out = '';
    for (let i = 0; i < 34; i++) out += `<span class="cloth-cell">${adinkraSVG(keys[i % keys.length], 'adk-stamp')}</span>`;
    row.innerHTML = out;
  });
}

/* ---------- Couleurs : texte lisible sur une couleur d'étiquette ---------- */
function luminance(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}
const contrast = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const INK = '#231a10';
const L_INK = luminance(INK);
const L_PAPER = luminance('#fffaf0');
/** Encre ou blanc, selon ce qui contraste le mieux avec le fond. */
function onColor(bg) {
  const L = luminance(bg);
  if (L == null) return '#fff';
  return contrast(L, L_INK) >= contrast(L, 1) ? INK : '#fff';
}
/** La couleur elle-même si elle se lit sur le papier (≥ 3:1, élément graphique), sinon l'encre. */
function graphicOnPaper(c) {
  const L = luminance(c);
  return L != null && contrast(L, L_PAPER) >= 3 ? c : INK;
}

/* ---------- États chargement / vide / erreur ---------- */
function setState(box, kind, msg, key) {
  if (!box) return;
  if (kind === 'none') { box.hidden = true; box.innerHTML = ''; return; }
  box.hidden = false;
  box.classList.toggle('state--error', kind === 'error');
  box.innerHTML = adinkraSVG(key, kind === 'loading' ? 'adk-loading' : '') + `<p>${esc(msg)}</p>`;
  const svg = $('svg', box);
  if (svg) svg.setAttribute('aria-hidden', 'true');
  hydrateAll(box);
  if (kind !== 'loading') watch(box);
}

const getJSON = (url) => fetch(url, { headers: { Accept: 'application/json' } }).then((r) => {
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
});

/* =====================================================================
   PARCOURS — étapes du séjour (GET /api/journey-stages), gérées depuis /admin.
   ===================================================================== */
const STAGE_KEYS = ['sankofa', 'nkyinkyim', 'aya', 'neaonnim', 'esenetekrema', 'akomantoso', 'dwennimmen',
  'nyamedua', 'duafe', 'funtunfunefu', 'gyenyame', 'akoma', 'nsoromma', 'adinkrahene'];
/** Symbole déterministe par étape : dépend de son id (stable si l'ordre change). */
function stageKey(s, i) {
  const seed = Number.isFinite(+s.id) ? +s.id : i;
  const n = STAGE_KEYS.length;
  return STAGE_KEYS[(((seed * 5) % n) + n) % n];
}

function loadStages() {
  const tl = $('#stagesShelf');
  if (!tl) return Promise.resolve();
  const list = $('.tl-list', tl);
  const state = $('[data-state]', tl);

  return getJSON('/api/journey-stages').then((d) => {
    if (!d || !d.ok) throw new Error('réponse invalide');
    const stages = d.stages || [];
    if (!stages.length) {
      list.innerHTML = '';
      setState(state, 'empty', "Le parcours n'a pas encore été rempli — reviens bientôt !", 'nkyinkyim');
      drawLine();
      return;
    }
    list.innerHTML = stages.map((s, i) => {
      const tag = s.tagColor ? '<span class="k" style="background:' + esc(s.tagColor) + ';color:' + onColor(s.tagColor) + '">' + esc(s.tagName || '') + '</span>' : '';
      const when = s.date_label ? '<span class="when">' + esc(s.date_label) + '</span>' : '';
      const body = s.body ? '<p>' + esc(s.body) + '</p>' : '';
      const nodeColor = s.tagColor ? esc(s.tagColor) : INK;
      const side = i % 2 ? 'rv-r' : 'rv-l';
      return '<li class="stage">' +
        '<div class="stage-node" aria-hidden="true" style="--nc:' + nodeColor + ';--nc-text:' + esc(graphicOnPaper(s.tagColor)) + '">' + adinkraSVG(stageKey(s, i)) + '</div>' +
        '<article class="stage-card rv ' + side + '">' +
          (tag || when ? '<div class="stage-top">' + tag + when + '</div>' : '') +
          '<h3>' + esc(s.title) + '</h3>' + body +
        '</article></li>';
    }).join('');
    setState(state, 'none');
    watch(list);
    drawLine();
  }).catch(() => {
    list.innerHTML = '';
    setState(state, 'error', 'Impossible de charger le parcours pour le moment.', 'nkyinkyim');
    drawLine();
  });
}

/* Ligne Nkyinkyim : un chemin qui serpente d'une étape à l'autre, recalculé au redimensionnement. */
let lineInk = null;
function drawLine() {
  const tl = $('#stagesShelf');
  if (!tl) return;
  const svg = $('.tl-line', tl);
  const ghost = $('.tl-ghost', tl);
  lineInk = $('.tl-ink', tl);
  const nodes = $$('.stage-node', tl);
  if (!nodes.length) { ghost.setAttribute('d', ''); lineInk.setAttribute('d', ''); return; }

  const W = tl.clientWidth;
  const H = tl.clientHeight;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const box = tl.getBoundingClientRect();
  const pts = nodes.map((n) => {
    const r = n.getBoundingClientRect();
    return { x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2 };
  });
  const amp = Math.max(12, Math.min(30, pts[0].x - 6));
  const f = (v) => Math.round(v * 10) / 10;
  let prev = { x: pts[0].x, y: 0 };
  let d = `M${f(prev.x)} 0`;
  const seg = (p, i) => {
    const s = (i % 2 ? 1 : -1) * amp;
    const dy = p.y - prev.y;
    d += ` C${f(prev.x + s)} ${f(prev.y + dy * 0.4)} ${f(p.x + s)} ${f(p.y - dy * 0.4)} ${f(p.x)} ${f(p.y)}`;
    prev = p;
  };
  pts.forEach(seg);
  seg({ x: prev.x, y: H }, pts.length);
  ghost.setAttribute('d', d);
  lineInk.setAttribute('d', d);
  updateScrollFallbacks();
}

/* =====================================================================
   GALERIE — albums (GET /api/gallery), gérés depuis /admin ; lightbox en <dialog>.
   ===================================================================== */
const CAMERA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>';
const FOLDER = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h6l2 3h10v9H3z"/></svg>';

function setupGallery() {
  const shelf = $('#galShelf');
  if (!shelf) return Promise.resolve();
  const wrap = shelf.closest('.gal-wrap');
  const state = $('[data-state]', wrap);
  const nav = $('.gal-nav', wrap);
  let ALBUMS = [];

  /* --- lightbox --- */
  const lb = $('#lb');
  const lImg = $('img', lb);
  const lCap = $('.lcap', lb);
  let cur = [], ci = 0, opener = null, curTitle = '';
  const show = () => {
    const p = cur[ci];
    lImg.src = p.src;
    lImg.alt = p.cap || curTitle;
    lCap.textContent = (p.cap || '') + (cur.length > 1 ? '  ·  ' + (ci + 1) + '/' + cur.length : '');
  };
  const onClosed = () => { lImg.removeAttribute('src'); if (opener && opener.focus) opener.focus(); };
  const openAlb = (ai, btn) => {
    const a = ALBUMS[ai] || {};
    cur = a.photos || [];
    if (!cur.length) return;
    ci = 0; curTitle = a.title || ''; opener = btn;
    lb.setAttribute('aria-label', 'Album « ' + curTitle + ' »');
    $$('.lnav', lb).forEach((b) => { b.hidden = cur.length < 2; });
    show();
    if (typeof lb.showModal === 'function') lb.showModal(); else lb.setAttribute('open', '');
  };
  const closeAlb = () => {
    if (typeof lb.close === 'function') { if (lb.open) lb.close(); } else { lb.removeAttribute('open'); onClosed(); }
  };
  const step = (dlt) => { ci = (ci + dlt + cur.length) % cur.length; show(); };
  lb.addEventListener('close', onClosed);
  $('.lx', lb).addEventListener('click', closeAlb);
  $('.lprev', lb).addEventListener('click', () => step(-1));
  $('.lnext', lb).addEventListener('click', () => step(1));
  lb.addEventListener('click', (e) => { if (e.target === lb || e.target.tagName === 'FIGURE') closeAlb(); });
  lb.addEventListener('keydown', (e) => {
    // Repli sans showModal (vieux Safari) : Échap n'est pas géré nativement.
    if (e.key === 'Escape' && typeof lb.showModal !== 'function') { closeAlb(); return; }
    if (cur.length < 2) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
  });
  shelf.addEventListener('click', (e) => {
    const c = e.target.closest('.cover[data-alb]');
    if (c) openAlb(+c.getAttribute('data-alb'), c);
  });

  /* --- bande défilante : boutons précédent / suivant --- */
  const prevB = $('.gal-prev', nav), nextB = $('.gal-next', nav);
  const syncNav = () => {
    const over = shelf.scrollWidth > shelf.clientWidth + 4;
    nav.hidden = !over;
    if (!over) return;
    prevB.disabled = shelf.scrollLeft <= 4;
    nextB.disabled = shelf.scrollLeft + shelf.clientWidth >= shelf.scrollWidth - 4;
  };
  const by = (dir) => shelf.scrollBy({ left: dir * shelf.clientWidth * 0.85, behavior: RM ? 'auto' : 'smooth' });
  prevB.addEventListener('click', () => by(-1));
  nextB.addEventListener('click', () => by(1));
  shelf.addEventListener('scroll', syncNav, { passive: true });
  window.addEventListener('resize', syncNav, { passive: true });

  function render() {
    shelf.innerHTML = ALBUMS.map((a, ai) => {
      const n = a.photos.length, hasDrive = a.drive && a.drive !== '#';
      const cnt = n ? (n + ' photo' + (n > 1 ? 's' : '')) : 'En attente de clichés';
      const badge = n ? '<span class="badge" aria-hidden="true">' + CAMERA + n + '</span>' : '';
      const cover = n
        ? '<button type="button" class="cover" data-alb="' + ai + '" aria-label="Ouvrir l\'album « ' + esc(a.title) + ' » en plein écran (' + cnt + ')">' +
            '<span class="gph" aria-hidden="true">' + adinkraSVG('duafe') + '<small>Chargement…</small></span>' +
            '<img src="' + esc(a.photos[0].src) + '" alt="" loading="lazy" decoding="async"></button>'
        : '<div class="cover" aria-hidden="true"><span class="gph">' + adinkraSVG('duafe') + '<small>Photos à venir</small></span></div>';
      return '<li><article class="card alb">' + badge + cover +
        '<div class="cbar" style="background:' + esc(a.color) + '"></div>' +
        '<div class="meta"><h3>' + esc(a.title) + '</h3>' +
        '<span class="cnt">' + cnt + '</span>' +
        (hasDrive
          ? '<a class="drv" href="' + esc(a.drive) + '" target="_blank" rel="noopener">' + FOLDER + 'Album Drive<span class="sr-only"> : ' + esc(a.title) + ' (nouvel onglet)</span></a>'
          : '') +
        '</div></article></li>';
    }).join('');
    $$('.cover img', shelf).forEach((img) => img.addEventListener('error', () => {
      const small = img.previousElementSibling && img.previousElementSibling.querySelector('small');
      if (small) small.textContent = 'Photo manquante';
      img.remove();
    }));
    watch(shelf);
    syncNav();
  }

  return getJSON('/api/gallery').then((d) => {
    if (!d || !d.ok) throw new Error('réponse invalide');
    ALBUMS = (d.albums || []).map((a) => ({ title: a.title, color: a.color || '#e85d1b', drive: a.drive_url || '#', photos: a.photos || [] }));
    if (ALBUMS.length) { render(); setState(state, 'none'); }
    else { shelf.innerHTML = ''; setState(state, 'empty', 'Les albums arrivent bientôt — reviens après nos prochaines sorties !', 'duafe'); }
    const all = $('#galAll'), u = (d.drive_all || '').trim();
    if (all) {
      const box = all.closest('.galall');
      if (u) { all.href = u; all.target = '_blank'; all.rel = 'noopener'; if (box) box.hidden = false; }
      else if (box) box.hidden = true;
    }
  }).catch(() => {
    shelf.innerHTML = '';
    setState(state, 'error', 'Impossible de charger la galerie pour le moment.', 'duafe');
  });
}

/* =====================================================================
   Navigation : menu repliable, section courante, ancres partageables
   ===================================================================== */
function setupNav() {
  const head = $('.site-head');
  const btn = $('.nav-toggle', head);
  const toc = $('#toc');
  const setOpen = (open) => {
    head.classList.toggle('nav-open', open);
    btn.setAttribute('aria-expanded', String(open));
  };
  btn.addEventListener('click', () => setOpen(btn.getAttribute('aria-expanded') !== 'true'));
  toc.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && head.classList.contains('nav-open')) { setOpen(false); btn.focus(); }
  });
  document.addEventListener('click', (e) => { if (!head.contains(e.target)) setOpen(false); });
  // Safari/iOS < 14 : MediaQueryList n'a que addListener.
  const mq = window.matchMedia && window.matchMedia('(min-width: 1000px)');
  const onMq = (m) => { if (m.matches) setOpen(false); };
  if (mq && mq.addEventListener) mq.addEventListener('change', onMq);
  else if (mq && mq.addListener) mq.addListener(onMq);

  if (!HAS_IO) return;
  const links = $$('a', toc);
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const id = e.target.id;
      links.forEach((a) => a.setAttribute('aria-current', a.hash === '#' + id ? 'true' : 'false'));
      if (!userMoved) return;
      const next = id === 'accueil' ? location.pathname + location.search : '#' + id;
      if ((id === 'accueil' && location.hash) || (id !== 'accueil' && location.hash !== '#' + id)) {
        history.replaceState(history.state, '', next);
      }
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('main > section[id]').forEach((s) => spy.observe(s));
}

/* L'utilisateur a-t-il déjà bougé ? (sert à ne pas écraser l'ancre d'arrivée) */
let userMoved = false;
['wheel', 'touchmove', 'keydown', 'pointerdown'].forEach((ev) =>
  window.addEventListener(ev, () => { userMoved = true; }, { once: true, passive: true }));

/* ---------- Replis de scroll : barre de progression + ligne du parcours ---------- */
const NEED_PROGRESS_FALLBACK = !RM && !HAS_SCROLL_TL;
const NEED_LINE_FALLBACK = !RM && !HAS_VIEW_TL;
let ticking = false;
function updateScrollFallbacks() {
  if (NEED_PROGRESS_FALLBACK) {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const bar = $('.progress');
    if (bar) bar.style.setProperty('--progress', max > 0 ? Math.min(1, window.scrollY / max).toFixed(4) : '0');
  }
  if (NEED_LINE_FALLBACK && lineInk && lineInk.getAttribute('d')) {
    const r = lineInk.ownerSVGElement.getBoundingClientRect();
    const p = r.height ? Math.min(1, Math.max(0, (window.innerHeight / 2 - r.top) / r.height)) : 1;
    lineInk.style.strokeDasharray = '1';
    lineInk.style.strokeDashoffset = String(1 - p);
  }
}
function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => { ticking = false; updateScrollFallbacks(); });
}

/* ---------- Chiffres du hero : vraie valeur dans le HTML, décompte purement visuel ----------
   Le chiffre animé est aria-hidden ; un <span class="sr-only"> statique porte la valeur lue. */
function countUp() {
  if (RM || window.scrollY > window.innerHeight / 2) return;
  $$('.hero [data-count]').forEach((el) => {
    const target = +el.dataset.count;
    if (!Number.isFinite(target)) return;
    let start = null;
    const dur = 1100;
    el.textContent = '0';
    const tick = (now) => {
      if (start === null) start = now;
      const p = Math.min((now - start) / dur, 1);
      el.textContent = String(Math.round((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    setTimeout(() => requestAnimationFrame(tick), 350);
  });
}

/* ---------- Liens sondage (festival + pied de page), seulement si le sondage est ouvert ---------- */
function setupSurvey() {
  const links = $$('[data-survey], #surveyLink');
  if (!links.length) return;
  getJSON('/api/survey-status').then((d) => {
    if (d && d.ok && d.open) links.forEach((a) => { a.hidden = false; });
  }).catch(() => {});
}

/* =====================================================================
   Démarrage
   ===================================================================== */
const initialHash = location.hash;

/* Chaque étape isolée : un échec (vieux navigateur…) ne doit jamais priver la page de son contenu. */
const safe = (fn) => { try { fn(); } catch (err) { console.error(err); } };
safe(setupMotion);
safe(weaveCloths);
safe(() => watch(document));
safe(setupNav);
safe(countUp);
safe(setupSurvey);

if (NEED_PROGRESS_FALLBACK || NEED_LINE_FALLBACK) {
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  updateScrollFallbacks();
}

const tlBox = $('#stagesShelf');
if (tlBox && 'ResizeObserver' in window) {
  let raf = 0;
  new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(drawLine); }).observe(tlBox);
}
if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawLine);

Promise.allSettled([loadStages(), setupGallery()]).then(() => {
  // Arrivée sur une ancre (#galerie…) : le contenu chargé au-dessus a pu décaler la page.
  if (!initialHash || userMoved) return;
  let target = null;
  try { target = document.getElementById(decodeURIComponent(initialHash.slice(1))); } catch (e) { /* ancre invalide */ }
  if (target) target.scrollIntoView({ block: 'start' });
});
