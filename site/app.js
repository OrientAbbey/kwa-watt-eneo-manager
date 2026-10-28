// Affiche la version actuelle si l'API publique GitHub répond. Le lien vers la liste
// des versions reste toujours utilisable si JavaScript ou l'API ne sont pas disponibles.
(function () {
  var box = document.getElementById("release");
  var links = document.querySelectorAll("[data-release-download]");
  if (!box || !links.length || !window.fetch) return;
  var API = "https://api.github.com/repos/OrientAbbey/kwa-watt-eneo-manager/releases/latest";
  var DOWNLOAD = "https://github.com/OrientAbbey/kwa-watt-eneo-manager/releases/latest/download/kwa-watt.apk";
  fetch(API, { headers: { Accept: "application/vnd.github+json" } })
    .then(function (r) {
      if (r.status === 404) {
        box.textContent = "La première version n'est pas encore publiée.";
        return null;
      }
      if (!r.ok) { throw new Error("api"); }
      return r.json();
    })
    .then(function (rel) {
      if (!rel) return;
      var apk = (rel.assets || []).filter(function (a) { return a.name === "kwa-watt.apk"; })[0];
      if (!apk) {
        box.textContent = "Consultez la page des versions pour vérifier la disponibilité du téléchargement.";
        return;
      }
      var mb = (apk.size / 1048576).toFixed(1).replace(".", ",");
      var date = new Date(rel.published_at).toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" });
      links.forEach(function (link) {
        link.href = DOWNLOAD;
        link.textContent = "Télécharger l'APK (Android)";
      });
      box.textContent = "Version " + String(rel.tag_name).replace(/^v/, "") + " · " + date + " · " + mb + " Mo · Android 7.0 ou plus";
    })
    .catch(function () {
      // En cas de réseau/API indisponible, les liens statiques restent dirigés vers les versions.
    });
})();
