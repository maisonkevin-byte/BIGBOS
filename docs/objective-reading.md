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

## Notions sur des lignes distinctes

Le formateur commun `course-reading.js` structure aussi les cellules de tableaux,
les paragraphes, les listes, les encadrés et les corrections des cartes. Les
points-virgules, fins de phrases, puces explicites et libellés en gras terminés
par deux-points indiquent les coupures possibles. Un simple retour à la ligne
sépare les notions ; un espace plus large sépare deux phrases. Les paragraphes
et listes déjà structurés gardent leur hiérarchie.

Le texte et la ponctuation restent inchangés. Les plages DOM préservent les
couleurs Notion, le gras, les liens et les images, même à une coupure interne
dans un fragment coloré. Les virgules, conjonctions, barres obliques et flèches
ne déclenchent pas de coupure. Les parenthèses, crochets, abréviations courantes
et certains débuts de restriction sont protégés. Ces règles de présentation
ne constituent pas une compréhension sémantique exhaustive : les énumérations
ambiguës doivent être structurées explicitement dans le contenu, après lecture.

`tests/course-reading.test.cjs` compare le texte, les portions colorées, liens,
images, cellules et listes avant/après sur l'ensemble des objectifs et corrections,
ainsi que les astuces et stratégies renseignées. Il couvre aussi les doses,
conditions, limites de fragments colorés et la stabilité d'un second formatage.
Les ressources `course-reading.js` et `course-reading.css` sont versionnées dans
`index.html` pour que les navigateurs chargent la nouvelle présentation.
