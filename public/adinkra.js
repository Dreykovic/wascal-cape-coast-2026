/* Adinkra — symboles ghanéens (traits stylisés, dessinés en SVG).
   Usage : <svg class="adk" data-adinkra="sankofa"></svg> ; le module remplit le SVG (viewBox,
   <title>, un <path pathLength="1" style="--p:i"> par trait). Il n'anime rien : le tracé est du
   CSS de la page (classe .in-view sur l'élément ou un ancêtre). Après un rendu dynamique,
   appeler hydrateAll(conteneur) ; adinkraSVG(cle, classes) fournit le balisage. */
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
  neaonnim: { fr: 'Nea Onnim No Sua A Ohu', sens: "Celui qui ne sait pas peut apprendre : chaque mot d'anglais gagné ici est une porte qui s'ouvre.",
    d: ['M50 24V76', 'M40 50H60',
        'M50 24C40 12 18 14 18 30C18 42 34 44 35 35C36 29 28 27 26 32',
        'M50 24C60 12 82 14 82 30C82 42 66 44 65 35C64 29 72 27 74 32',
        'M50 76C40 88 18 86 18 70C18 58 34 56 35 65C36 71 28 73 26 68',
        'M50 76C60 88 82 86 82 70C82 58 66 56 65 65C64 71 72 73 74 68'] },
  esenetekrema: { fr: 'Ese Ne Tekrema', sens: "Les dents et la langue : on se frotte parfois, mais on avance ensemble — l'amitié, l'interdépendance.",
    d: ['M38 50a12 6 0 1 0 24 0a12 6 0 1 0 -24 0',
        'M14 46C12 36 18 28 26 31C28 21 38 18 43 26C46 19 54 19 57 26C62 18 72 21 74 31C82 28 88 36 86 46C70 40 30 40 14 46Z',
        'M14 54C12 64 18 72 26 69C28 79 38 82 43 74C46 81 54 81 57 74C62 82 72 79 74 69C82 72 88 64 86 54C70 60 30 60 14 54Z'] },
  akomantoso: { fr: 'Akoma Ntoso', sens: "Les cœurs liés : se comprendre au-delà des langues et des frontières, d'une délégation à l'autre.",
    d: ['M41 50a9 9 0 1 0 18 0a9 9 0 1 0 -18 0',
        'M50 36C38 28 36 20 40 16C44 12 49 14 50 20C51 14 56 12 60 16C64 20 62 28 50 36Z', 'M50 36V41',
        'M64 50C72 38 80 36 84 40C88 44 86 49 80 50C86 51 88 56 84 60C80 64 72 62 64 50Z', 'M64 50H59',
        'M50 64C62 72 64 80 60 84C56 88 51 86 50 80C49 86 44 88 40 84C36 80 38 72 50 64Z', 'M50 64V59',
        'M36 50C28 62 20 64 16 60C12 56 14 51 20 50C14 49 12 44 16 40C20 36 28 38 36 50Z', 'M36 50H41'] },
  nkyinkyim: { fr: 'Nkyinkyim', sens: "Le chemin sinueux : la vie fait des détours, on s'adapte et on garde le cap.",
    d: ['M26 8L56 29L26 50L56 71L26 92', 'M44 8L74 29L44 50L74 71L44 92', 'M26 8H44', 'M26 92H44'] },
  akoma: { fr: 'Akoma', sens: "Le cœur : la patience et la bienveillance, pour tenir loin de chez soi.",
    d: ['M50 84C26 66 16 50 22 36C28 22 44 24 50 38C56 24 72 22 78 36C84 50 74 66 50 84Z',
        'M50 70C34 58 30 48 33 41C36 34 45 35 50 45C55 35 64 34 67 41C70 48 66 58 50 70Z'] },
  nsoromma: { fr: 'Nsoromma', sens: "L'étoile, enfant du ciel : chacun·e brille, et le groupe forme une constellation.",
    d: ['M50 8L59.2 27.8L79.7 20.3L72.2 40.8L92 50L72.2 59.2L79.7 79.7L59.2 72.2L50 92L40.8 72.2L20.3 79.7L27.8 59.2L8 50L27.8 40.8L20.3 20.3L40.8 27.8Z',
        'M38 50a12 12 0 1 0 24 0a12 12 0 1 0 -24 0'] },
};

const NS = 'http://www.w3.org/2000/svg';

/* Chaîne HTML d'un SVG Adinkra prêt à hydrater (rendus dynamiques : parcours, galerie…). */
export function adinkraSVG(cle, className = '') {
  const cls = ('adk ' + className).trim().replace(/"/g, '');
  return '<svg class="' + cls + '" data-adinkra="' + String(cle).replace(/[^a-z]/gi, '') + '"></svg>';
}

export function hydrate(svg) {
  const s = ADINKRA[svg.dataset.adinkra];
  if (!s || svg.dataset.ready) return;
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', s.fr + ' — ' + s.sens);
  const title = document.createElementNS(NS, 'title'); /* infobulle native au survol */
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
}

/* Frise : la légende suit le survol / le tap / le focus clavier. */
function bindFrieze(fr) {
  if (fr.dataset.adkBound) return;
  fr.dataset.adkBound = '1';
  const cap = fr.querySelector('.adk-cap');
  const show = (el) => {
    const s = ADINKRA[el.dataset.adinkra];
    if (s && cap) cap.innerHTML = '<b>' + s.fr + '</b> — ' + s.sens;
  };
  fr.querySelectorAll('[data-adinkra]').forEach((el) => {
    el.setAttribute('tabindex', '0');
    ['mouseenter', 'focus', 'click'].forEach((ev) => el.addEventListener(ev, () => show(el)));
  });
}

/* À rappeler après tout rendu dynamique (idempotent). */
export function hydrateAll(root = document) {
  if (root.matches && root.matches('[data-adinkra]')) hydrate(root);
  root.querySelectorAll('[data-adinkra]').forEach(hydrate);
  if (root.matches && root.matches('.adk-frieze')) bindFrieze(root);
  root.querySelectorAll('.adk-frieze').forEach(bindFrieze);
}

hydrateAll();
