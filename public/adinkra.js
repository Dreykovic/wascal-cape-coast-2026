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
