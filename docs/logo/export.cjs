// Régénère les fichiers d'icône/splash de public/ à partir des SVG de ce dossier.
// Usage (depuis la racine du dépôt) :  npm i --no-save sharp && node docs/logo/export.cjs
// Puis :  npx @capacitor/assets generate --android --assetPath public   (fait aussi par la CI à chaque build)
const sharp = require("sharp");
const path = require("path");
const here = __dirname;
const out = path.join(here, "..", "..", "public");
(async () => {
  const r = (svg, size, file) => sharp(path.join(here, svg), { density: 144 }).resize(size, size).png().toFile(path.join(out, file));
  await r("B_icon.svg", 1024, "icon.png"); // utilisée aussi dans l'interface et comme favicon
  await r("B_icon.svg", 1024, "icon-only.png");
  await r("B_foreground.svg", 1024, "icon-foreground.png");
  await r("B_background.svg", 1024, "icon-background.png");
  await r("B_splash.svg", 2732, "splash.png");
  await r("B_splash.svg", 2732, "splash-dark.png");
  console.log("Icône et splash régénérés dans public/");
})();
