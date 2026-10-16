# Lecture des objectifs

Toutes les fiches utilisent la même page de lecture : sommaire par objectif,
plusieurs sections ouvertes simultanément, titre officiel accessible et rappel
actif intégré. Sur tablette, le sommaire reste disponible pendant le défilement.

`objective-reading.js` enrichit le DOM produit par `renderItem`. L'appel à
`capture` avant le remplacement de la page conserve les objectifs ouverts et
la position de lecture dans la session. Les cartes sont rendues à la demande,
une à la fois, avec leur identifiant, leur question et leur correction existants.
Les réponses ne sont pas notées automatiquement.

Les contenus de `dist/data/`, les images et les données personnelles ne sont pas
réécrits. Les titres de navigation retirent seulement la formule pédagogique
initiale. Le titre officiel reste disponible intégralement. Les titres et
intertitres éditoriaux de l'item 146 proviennent du pilote approuvé. Ailleurs,
un court paragraphe introductif existant peut être mis en évidence, sans être
résumé ni déplacé. Le statut et la date de relecture restent propres à la fiche.

## Validation

Le test `tests/objective-reading.test.cjs` nécessite `jsdom` via `NODE_PATH`.
Il contrôle les 367 fiches, 4 893 objectifs, 11 485 cartes et 561 objectifs
illustrés : conservation du contenu affiché, couleurs, liens, tables, images,
intitulés et identifiants ; ouverture collective ; état de navigation ; dates
et statuts de vérification ; absence de réponse révélée par une ancienne carte.

La validation visuelle couvre plusieurs spécialités et les fiches de 52, 58
et 74 objectifs. Dimensions de navigateur : 1280 × 900, 810 × 1080 et
390 × 844. Le contrôle tablette simule le format iPad ; il ne remplace pas
un essai sur Safari/iPad physique.

Les fichiers de publication sont `dist/index.html`, `dist/app.js`,
`dist/objective-reading.js` et `dist/objective-reading.css`.
