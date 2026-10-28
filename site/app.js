// Amélioration facultative : affiche version, date et taille de la dernière version publiée (API publique GitHub).
// Sans JavaScript, ou sans réseau, le lien de téléchargement direct reste valable.
(function () {
  var box = document.getElementById("release");
  var btn = document.getElementById("download");
  if (!box || !btn || !window.fetch) return;
  var API = "https://api.github.com/repos/OrientAbbey/kwa-watt-eneo-manager/releases/latest";
  fetch(API, { headers: { Accept: "application/vnd.github+json" } })
    .then(function (r) {
      if (r.status === 404) { throw new Error("none"); }
      if (!r.ok) { throw new Error("api"); }
      return r.json();
    })
    .then(function (rel) {
      var apk = (rel.assets || []).filter(function (a) { return a.name === "kwa-watt.apk"; })[0];
      if (!apk) { throw new Error("none"); }
      var mb = (apk.size / 1048576).toFixed(1).replace(".", ",");
      var date = new Date(rel.published_at).toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" });
      box.textContent = "Version " + String(rel.tag_name).replace(/^v/, "") + " · " + date + " · " + mb + " Mo · Android 7.0 ou plus";
    })
    .catch(function (e) {
      if (e && e.message === "none") {
        // Aucune version publiée : on évite un lien qui mène à une erreur 404
        btn.href = "https://github.com/OrientAbbey/kwa-watt-eneo-manager/releases";
        btn.textContent = "Voir les versions";
        box.textContent = "La première version n'est pas encore publiée.";
      }
      // autre erreur (réseau, limite de l'API) : on garde le lien direct et le texte statique
    });
})();
