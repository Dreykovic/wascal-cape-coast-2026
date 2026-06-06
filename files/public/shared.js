// Données + utilitaires partagés (module ES natif, importé par chaque page).
// Source de vérité : délégations, comités, couleurs, drapeaux, RNG seedé.

export const DELEGATIONS = [
  "Bénin", "Burkina Faso", "Côte d'Ivoire", "Guinée",
  "Mali", "Niger", "Sénégal", "Togo",
];

// Couleur d'accent par pays (le drapeau porte l'identité ; la couleur sert aux puces/stats).
export const COUNTRY = {
  "Bénin":         { color: "#1c7a45" },
  "Burkina Faso":  { color: "#c5302b" },
  "Côte d'Ivoire": { color: "#e85d1b" },
  "Guinée":        { color: "#0e8c7a" },
  "Mali":          { color: "#f2a900" },
  "Niger":         { color: "#8a2d5d" },
  "Sénégal":       { color: "#1e3f8f" },
  "Togo":          { color: "#006a4e" },
};

// Drapeaux SVG (viewBox 0 0 48 32) — repris des affiches, identité cohérente.
const FLAGS = {
  "Bénin": '<rect width="16" height="32" fill="#008751"/><rect x="16" width="32" height="16" fill="#fcd116"/><rect x="16" y="16" width="32" height="16" fill="#e8112d"/>',
  "Burkina Faso": '<rect width="48" height="16" fill="#ef2b2d"/><rect y="16" width="48" height="16" fill="#009639"/><g transform="translate(24,16)"><polygon points="0,-6 1.4,-1.9 5.7,-1.9 2.3,0.7 3.5,4.9 0,2.4 -3.5,4.9 -2.3,0.7 -5.7,-1.9 -1.4,-1.9" fill="#fcd116"/></g>',
  "Côte d'Ivoire": '<rect width="16" height="32" fill="#f77f00"/><rect x="16" width="16" height="32" fill="#fff"/><rect x="32" width="16" height="32" fill="#009e60"/>',
  "Guinée": '<rect width="16" height="32" fill="#ce1126"/><rect x="16" width="16" height="32" fill="#fcd116"/><rect x="32" width="16" height="32" fill="#009460"/>',
  "Mali": '<rect width="16" height="32" fill="#14b53a"/><rect x="16" width="16" height="32" fill="#fcd116"/><rect x="32" width="16" height="32" fill="#ce1126"/>',
  "Niger": '<rect width="48" height="11" fill="#e05206"/><rect y="11" width="48" height="10" fill="#fff"/><rect y="21" width="48" height="11" fill="#0db02b"/><circle cx="24" cy="16" r="4.4" fill="#e05206"/>',
  "Sénégal": '<rect width="16" height="32" fill="#00853f"/><rect x="16" width="16" height="32" fill="#fdef42"/><rect x="32" width="16" height="32" fill="#e31b23"/><g transform="translate(24,16)"><polygon points="0,-5 1.2,-1.6 4.8,-1.6 1.9,0.6 2.9,4 0,2 -2.9,4 -1.9,0.6 -4.8,-1.6 -1.2,-1.6" fill="#00853f"/></g>',
  "Togo": '<rect width="48" height="32" fill="#ffce00"/><rect width="48" height="6.4" fill="#006a4e"/><rect y="12.8" width="48" height="6.4" fill="#006a4e"/><rect y="25.6" width="48" height="6.4" fill="#006a4e"/><rect width="20" height="19.2" fill="#d21034"/><g transform="translate(10,9.6)"><polygon points="0,-5 1.2,-1.6 4.8,-1.6 1.9,0.6 2.9,4 0,2 -2.9,4 -1.9,0.6 -4.8,-1.6 -1.2,-1.6" fill="#fff"/></g>',
};

export function flagSVG(country, w = 30) {
  const h = Math.round((w * 32) / 48);
  return `<svg class="flag" viewBox="0 0 48 32" width="${w}" height="${h}" role="img" aria-label="${country}">${FLAGS[country] || ""}</svg>`;
}

// Comités (un par affiche) + couleur (CCOLOR historique) + emoji.
export const COMMITTEES = [
  { name: "Sorties & Excursions", color: "#0e8c7a", emoji: "🌳", tag: "Destinations, transport, comptes" },
  { name: "Soirées & Jeux",       color: "#8a2d5d", emoji: "🎉", tag: "Films, musique, karaoké, jeux" },
  { name: "Sport & Bien-être",    color: "#1c7a45", emoji: "⚽", tag: "Footing, foot, volley, tournois" },
  { name: "Culture & Échanges",   color: "#e85d1b", emoji: "🎭", tag: "Soirées-pays, rencontres ghanéennes" },
];

export const FLOORS = ["Étage (filles)", "Rez-de-chaussée (garçons)"];
export const ENGLISH_LEVELS = ["Débutant", "Intermédiaire", "Avancé"];

export const ACTIVITIES = [
  "Sorties & excursions", "Movie Night", "Game Night", "Karaoké en anglais",
  "Football", "Volley-ball", "Footing matinal", "Tournoi sportif",
  "Soirées-pays", "Danse & percussions", "Cuisine ghanéenne", "Club de débat",
];
export const TALENTS = [
  "Cuisine", "Chant", "Instrument de musique", "Danse", "Sport",
  "Photo / vidéo", "Animation / présentation", "Organisation / logistique",
  "Dessin / déco", "Langues locales",
];

// RNG seedé (mulberry32) — re-tirages reproductibles côté admin.
export function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function shuffle(list, rand) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const norm = (s) => String(s || "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
export const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
