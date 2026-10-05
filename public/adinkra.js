/* Adinkra — symboles ghanéens (traits stylisés, dessinés en SVG).
   Usage : <svg class="adk" data-adinkra="sankofa"></svg> ; le module remplit le SVG et
   l'animation de tracé se déclenche quand la slide parente devient .active (voir index.html). */
export const ADINKRA = {
  sankofa: { fr: 'Sankofa', sens: "Revenir chercher ce qu'on a oublié : apprendre du passé pour avancer.",
    d: ['M50 90C20 68 8 46 21 30C31 18 46 22 50 35C54 22 69 18 79 30C92 46 80 68 50 90Z',
        'M21 30C8 24 12 8 25 10C34 12 34 23 28 25', 'M79 30C92 24 88 8 75 10C66 12 66 23 72 25'] },
  gyenyame: { fr: 'Gye Nyame', sens: "« Sauf Dieu » : la puissance et la foi qui nous dépassent.",
    d: ['M50 8C28 8 28 36 50 42C72 48 72 72 50 92', 'M50 42C36 48 22 60 28 76C32 84 44 82 44 73',
        'M50 58C64 52 78 40 72 24C68 16 57 18 57 27'] },
  dwennimmen: { fr: 'Dwennimmen', sens: "Les cornes du bélier : la force qui sait rester humble.",
    d: ['M50 22C30 12 10 28 17 48C22 62 40 62 40 50C40 42 30 40 28 48',
        'M50 22C70 12 90 28 83 48C78 62 60 62 60 50C60 42 70 40 72 48',
        'M50 22V84', 'M34 72H66', 'M38 84H62'] },
  funtunfunefu: { fr: 'Funtunfunefu', sens: "Les crocodiles siamois : un seul ventre, deux têtes — l'unité dans la diversité.",
    d: ['M18 50C18 28 50 28 50 50C50 72 82 72 82 50', 'M82 50C82 28 50 28 50 50C50 72 18 72 18 50',
        'M18 50L8 42', 'M18 50L8 58', 'M82 50L92 42', 'M82 50L92 58'] },
  adinkrahene: { fr: 'Adinkrahene', sens: "Le chef des symboles : le leadership, la grandeur d'âme.",
    d: ['M10 50a40 40 0 1 0 80 0a40 40 0 1 0 -80 0', 'M24 50a26 26 0 1 0 52 0a26 26 0 1 0 -52 0',
        'M38 50a12 12 0 1 0 24 0a12 12 0 1 0 -24 0'] },
  nyamedua: { fr: 'Nyame Dua', sens: "L'arbre de Dieu : la protection et la présence bienveillante.",
    d: ['M50 90V30', 'M50 30L30 12', 'M50 30L70 12', 'M50 54L26 40', 'M50 54L74 40', 'M32 90H68'] },
  duafe: { fr: 'Duafe', sens: "Le peigne : la beauté, le soin, la tendresse.",
    d: ['M28 18H72V40H28Z', 'M34 40V84', 'M42 40V84', 'M50 40V84', 'M58 40V84', 'M66 40V84'] },
  aya: { fr: 'Aya', sens: "La fougère : l'endurance et la persévérance — 16 semaines, on tient.",
    d: ['M50 92V10', 'M50 30L34 18', 'M50 30L66 18', 'M50 48L30 34', 'M50 48L70 34',
        'M50 66L26 50', 'M50 66L74 50'] },
};

const NS = 'http://www.w3.org/2000/svg';

function hydrate(svg) {
  const s = ADINKRA[svg.dataset.adinkra];
  if (!s || svg.dataset.ready) return;
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', s.fr + ' — ' + s.sens);
  s.d.forEach((d, i) => {
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', d);
    p.setAttribute('pathLength', '1');
    p.style.setProperty('--p', i);
    svg.appendChild(p);
  });
  svg.dataset.ready = '1';
}

document.querySelectorAll('[data-adinkra]').forEach(hydrate);

/* Frise : la légende suit le survol / le tap / le focus clavier. */
document.querySelectorAll('.adk-frieze').forEach((fr) => {
  const cap = fr.querySelector('.adk-cap');
  const show = (el) => {
    const s = ADINKRA[el.dataset.adinkra];
    if (s && cap) cap.innerHTML = '<b>' + s.fr + '</b> — ' + s.sens;
  };
  fr.querySelectorAll('[data-adinkra]').forEach((el) => {
    el.setAttribute('tabindex', '0');
    ['mouseenter', 'focus', 'click'].forEach((ev) => el.addEventListener(ev, () => show(el)));
  });
});

/* ===== Particules : un champ d'Adinkra qui dérive en arrière-plan de chaque slide.
   Un seul rAF, dessine uniquement la slide active ; les symboles fuient doucement le pointeur. ===== */
const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
const PATHS = Object.values(ADINKRA).map((s) => new Path2D(s.d.join(' ')));
const DARK = ['#f2a900', '#ffe6b0', '#e85d1b', '#ffffff'];
const LIGHT = ['#f2a900', '#c5302b', '#1c7a45', '#1e3f8f', '#e85d1b', '#8a2d5d'];
const small = innerWidth < 700;
const mouse = { x: -999, y: -999 };
addEventListener('pointermove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });

const fields = [];
document.querySelectorAll('.slide').forEach((slide) => {
  const cv = document.createElement('canvas');
  cv.className = 'adk-fx';
  cv.setAttribute('aria-hidden', 'true');
  slide.insertBefore(cv, slide.querySelector('.panel'));
  const dark = slide.matches('.hero,.ubuntu,.close');
  fields.push({ slide, cv, ctx: cv.getContext('2d'), dark, parts: [], w: 0, h: 0 });
});

function resize(f) {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  f.w = f.cv.clientWidth; f.h = f.cv.clientHeight;
  f.cv.width = f.w * dpr; f.cv.height = f.h * dpr;
  f.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const n = small ? 14 : 30;
  const pal = f.dark ? DARK : LIGHT;
  /* Placement « best candidate » : chaque symbole prend, parmi 14 positions tirées au hasard,
     celle la plus éloignée des autres → semis aléatoire mais équilibré, sans paquets ni trous. */
  f.parts = [];
  for (let i = 0; i < n; i++) {
    const s = 44 + Math.random() * 80;
    let best = null, bestD = -1;
    for (let c = 0; c < 14; c++) {
      const x = Math.random() * f.w, y = Math.random() * f.h;
      let d = Infinity;
      for (const q of f.parts) d = Math.min(d, Math.hypot(q.hx - x, q.hy - y) - (q.s + s) * 0.35);
      if (d > bestD) { bestD = d; best = { x, y }; }
    }
    const spinner = i % 3 === 0; /* un tiers tourne sur lui-même, les autres se balancent */
    f.parts.push({
      hx: best.x, hy: best.y, s, ox: 0, oy: 0,
      r: Math.random() * 6.28, spin: spinner ? (Math.random() < 0.5 ? -1 : 1) * (0.006 + Math.random() * 0.012) : 0,
      sway: spinner ? 0 : 0.12 + Math.random() * 0.2,
      amp: 8 + Math.random() * 18, sp: 0.6 + Math.random() * 0.8,
      k: (Math.random() * PATHS.length) | 0, c: pal[(Math.random() * pal.length) | 0],
      a: (f.dark ? 0.55 : 0.4) + Math.random() * 0.25, ph: Math.random() * 6.28,
    });
  }
}

function draw(f, t) {
  const { ctx, w, h } = f;
  ctx.clearRect(0, 0, w, h);
  for (const p of f.parts) {
    let x = p.hx, y = p.hy, r = p.r;
    if (!reduce) {
      const dx = p.hx + p.ox - mouse.x, dy = p.hy + p.oy - mouse.y, d2 = dx * dx + dy * dy;
      if (d2 < 26000) { const d = Math.sqrt(d2) || 1, push = (160 - d) / 160 * 2.2; p.ox += dx / d * push; p.oy += dy / d * push; }
      p.ox *= 0.94; p.oy *= 0.94; /* retour élastique vers sa place */
      p.r += p.spin;
      x += p.ox + Math.sin(t / 1000 * p.sp + p.ph) * p.amp;
      y += p.oy + Math.cos(t / 1300 * p.sp + p.ph) * p.amp;
      r = p.r + (p.spin ? 0 : Math.sin(t / 1500 * p.sp + p.ph) * p.sway);
    }
    p.x = x; p.y = y;
    ctx.save();
    ctx.translate(x, y); ctx.rotate(r);
    ctx.scale(p.s / 100, p.s / 100); ctx.translate(-50, -50);
    ctx.globalAlpha = p.a * (0.75 + 0.25 * Math.sin(t / 1800 + p.ph));
    ctx.strokeStyle = p.c; ctx.lineWidth = 4.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.stroke(PATHS[p.k]);
    ctx.restore();
  }
}

let current = null;
function frame(t) {
  const f = fields.find((x) => x.slide.classList.contains('active'));
  if (f) {
    if (f !== current || f.w !== f.cv.clientWidth || f.h !== f.cv.clientHeight) { current = f; resize(f); }
    draw(f, t);
  }
  if (!reduce) requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
if (reduce) {
  /* pas d'animation : un rendu statique à chaque changement de slide */
  new MutationObserver(() => requestAnimationFrame(frame)).observe(document.getElementById('deck'), { attributes: true, subtree: true, attributeFilter: ['class'] });
}
