const startupStatus = document.querySelector("#status");

function showStartupError(message) {
  startupStatus.textContent = message;
  startupStatus.hidden = false;
}

if (location.protocol === "file:") {
  showStartupError("Ouvrez cette page avec un serveur HTTP (par exemple Live Server), et non en double-cliquant sur le fichier HTML.");
} else {
  const loadingTimer = setTimeout(() => {
    showStartupError("Le chargement de la connexion prend trop de temps. Vérifiez votre accès Internet et au serveur local, puis rechargez la page.");
  }, 15000);

  import("./app.js")
    .catch((error) => {
      console.error("Chargement de la page impossible :", error);
      showStartupError("Impossible de charger la connexion. Vérifiez que le serveur est démarré et que les fichiers JavaScript sont accessibles, puis rechargez la page.");
    })
    .finally(() => clearTimeout(loadingTimer));
}
