# Connexion OPEX / LEONI

Page statique responsive, sans inscription. Les comptes sont crees manuellement
dans Firebase Authentication et non dans une collection Firestore.

## Configuration

La configuration Web du projet `kosu-audit` est renseignee dans
`firebase-config.js`. Firebase Analytics n'est pas active par la page.

1. Dans la console Firebase, ajoutez une application Web au projet.
2. Copiez les valeurs de configuration Web dans `firebase-config.js`.
   N'utilisez jamais de cle privee ou de compte de service dans cette page.
3. Dans **Authentication > Sign-in method**, activez **Email/Password**.
4. Dans **Authentication > Users > Add user**, creez les comptes avec leur
   adresse e-mail et leur mot de passe.
5. Dans **Authentication > Settings > Authorized domains**, ajoutez le domaine
   de deploiement et, pour les essais locaux, `localhost` si necessaire.

Si Firebase renvoie `auth/configuration-not-found`, ouvrez **Authentication**
dans la console du projet, cliquez sur **Commencer**, puis activez le fournisseur
**Email/Password**. Aucun identifiant de connexion n'est enregistre dans le code.

## Lancement

Servez ce dossier avec un serveur HTTP statique, par exemple l'extension
**Live Server** de VS Code. N'ouvrez pas directement `index.html` avec `file://`,
car la page utilise des modules JavaScript.

Si Python est disponible :

```powershell
python -m http.server 8080 --bind 127.0.0.1
```

Ouvrez ensuite `http://localhost:8080`. Un acces Internet est requis pour le SDK
Firebase heberge sur le CDN officiel Google.
Le serveur doit rester actif pendant l'utilisation ; un onglet deja ouvert
peut conserver une ancienne page meme apres l'arret du serveur.

Le bouton reste desactive pendant le chargement. Un message explicite apparait
si le module JavaScript ne se charge pas ou si la page est ouverte avec `file://`.
Un avertissement apparait apres 15 secondes si le chargement reste en attente.

## Comportement

- Aucun formulaire ou appel de creation de compte.
- Connexion par e-mail et mot de passe avec Firebase Authentication.
- Apres connexion, affichage de l'espace **Kosu Audit** dans la meme page :
  bandeau bleu, fond clair et barre d'icones a gauche, sans cartes ni graphique.
- Icones : saisie, tableau de bord, calendrier, reglages, corbeille et deconnexion.
- Saisie propose trois listes liees : Section / Projet, Segment, Ligne ou machine.
  Changer un parent remet a zero les choix enfants. Aucune valeur fictive.
- Apres les trois choix, la checklist KOSU comporte les 10 points et leurs
  consignes, avec un choix exclusif OK / NOK / NA par point. Elle est masquee
  pour les projets dont le nom exact est CRA ou WPA (casse et espaces externes
  ignores). Aucune autre checklist n'est definie pour ces projets.
- Lorsque la checklist apparait, les listes de selection sont masquees ; le
  bandeau conserve le projet, segment et ligne choisis. **Modifier la selection**
  reaffiche les listes sans perdre les reponses. **Afficher la checklist**
  permet de revenir sans changer de selection. Une progression indique le
  nombre de points renseignes (et non un score de conformite).
- Les icones utilisent Bootstrap Icons 1.11.3 via jsDelivr (Internet requis).
  Les libelles et noms accessibles restent presents independamment des icones.
- Le taux de conformite est calcule en direct : `OK / (OK + NOK) * 100`.
  Les NA et les points sans reponse sont exclus du denominateur. Le resultat
  est marque provisoire tant que les 10 points ne sont pas renseignes, arrondi
  a une decimale au maximum. Sans OK ni NOK : **En attente** si incomplet,
  **Non applicable** si les 10 reponses sont NA. Le taux est distinct de la
  progression et revient a **En attente** pour chaque nouvelle checklist.
- **Enregistrer la checklist** exige les 10 reponses et cree un audit distinct
  dans localStorage (`kosu-audit-record-v1:` suivi d'un UUID), avec les noms,
  identifiants du projet / segment / ligne et la date d'enregistrement.
  Les audits precedents ne sont pas ecrases, uniquement dans ce navigateur et
  communs aux comptes locaux. Aucune interface de consultation n'est encore
  disponible. Les anciens enregistrements `kosu-audit-checklist-v1:` sont
  conserves mais ne sont plus recharges dans le formulaire.
  Apres un enregistrement reussi, la checklist se ferme et les listes Projet /
  Segment / Ligne reapparaissent avec les choix remis a zero et une confirmation.
  Un echec d'enregistrement laisse la checklist ouverte avec ses reponses.
  Chaque nouvelle selection ouvre une checklist vierge, meme pour la meme ligne.
  Modifier la selection puis revenir sans changer les listes conserve les
  reponses en cours ; changer un choix abandonne ces reponses non enregistrees.
  Un rechargement ou une deconnexion abandonne egalement la saisie en cours.
  Une erreur d'ecriture conserve les choix affiches pour reessayer.
- Reglages permet d'ajouter les projets, puis leurs segments, puis leurs lignes
  ou machines. Les noms en double sous un meme parent sont refuses.
  L'ajout d'un projet le selectionne automatiquement pour ajouter ses segments ;
  l'ajout d'un segment le selectionne pour ajouter ses lignes ou machines.
  Les parents de chaque ajout sont affiches explicitement. Changer de projet
  ou de segment efface les noms enfants en cours de saisie pour eviter un
  rattachement involontaire.
  Les selections de Saisie sont mises a jour immediatement.
- Les boutons Supprimer agissent sur le projet, segment ou ligne selectionne.
  Une confirmation indique les elements concernes : supprimer un projet supprime
  ses segments et leurs lignes ; supprimer un segment supprime ses lignes.
  La suppression est definitive, sans passage par la corbeille. En cas d'echec
  d'enregistrement, les donnees et selections restent intactes.
- **Importer un fichier Excel** dans Reglages complete les donnees existantes
  sans les remplacer. Formats `.xlsx` / `.xls`, 5 Mo maximum, premiere feuille
  uniquement, 10 000 lignes de donnees et 256 colonnes maximum.
  La premiere ligne non vide contient les en-tetes `Section`, `Segment`,
  `Ligne ou machine` (ordre libre, casse ignoree ; `Projet` accepte pour Section).
  Chaque ligne doit repeter les trois noms, de 1 a 100 caracteres chacun.
  Les lignes entierement vides sont ignorees. Une erreur de validation annule
  tout l'import. Les doublons sont ignores par nom, sans distinction de casse
  ni d'espaces en debut/fin, uniquement sous le meme parent.
  Le bilan indique les ajouts prevus et doublons. L'import reste en attente
  jusqu'au clic sur **Enregistrer l'import** : avant ce clic, ni les reglages
  ni les listes Saisie ne sont modifies. **Annuler l'import** abandonne les ajouts.
  L'edition est bloquee pendant cette attente. Un rechargement, une deconnexion
  ou un changement des reglages dans un autre onglet abandonne l'import en attente.
  Un echec de stockage conserve l'import pour reessayer ou annuler.
  Le fichier est traite localement et n'est pas envoye a Firebase ni au CDN.
  Le lecteur SheetJS CE 0.20.3 est charge a la demande depuis son CDN officiel
  (acces Internet requis). Aucune macro n'est executee.
- Reglages enregistres dans localStorage (`kosu-audit-structure-v1`), uniquement
  pour ce navigateur et cette origine HTTP, communs aux comptes utilisant ce
  navigateur. Pas de synchronisation Firebase, ni entre appareils. Effacer les
  donnees du navigateur supprime ces reglages. Les erreurs de stockage sont
  affichees explicitement sans ecraser des donnees illisibles.
- Calendrier et corbeille ne sont pas encore configures. La corbeille ne supprime
  aucune donnee. Le tableau de bord reste vide.
- L'espace principal reste masque tant que Firebase n'a pas confirme la session.
  La deconnexion ramene a la page de connexion existante.
- Restauration de la session geree par Firebase.
- Erreurs affichees en francais ; la connexion reste desactivee si la
  configuration est absente.

Le logo OPEX fourni est affiche en haut a gauche depuis `opex_logo.png`.
La marque LEONI est representee en texte et le decor automobile est un dessin SVG.
Pour un rendu strictement identique a la capture, remplacez ces deux representations
par les fichiers graphiques officiels dont vous disposez.

## Protection des donnees

Cette page ne remplace pas les regles de securite Firebase. Protegez les donnees
Firestore / Storage avec des regles appropriees et des autorisations par compte.
Masquer l'inscription dans l'interface ne desactive pas, a lui seul, la creation
de comptes via l'API Firebase. Pour une restriction effective aux comptes
provisionnes par l'administrateur, configurez egalement cette politique cote
Firebase / Identity Platform selon votre projet.
