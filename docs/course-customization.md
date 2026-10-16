# Fiches personnalisables et code couleurs

Référence observée : https://app.docecos.fr/info, rubrique « Nos fiches »,
16 octobre 2026. Le code porte sur les annotations pédagogiques des fiches.
L’interface générale ATLAS conserve sa présentation approuvée.

## Direction visuelle

La palette de l’éditeur utilise le papier, l’encre et les bordures existants
pour conserver une seule page de cours par item. La typographie reste celle
d’ATLAS : titres Manrope, texte DM Sans. Une fenêtre de travail large contient
la barre d’outils, le texte et les actions de sauvegarde. Sur téléphone, les
outils défilent horizontalement et les champs restent assez grands au toucher.

La légende distingue explicitement couleur du texte et surlignage. Les couleurs
claires exactes observées dans la FAQ sont :

| Usage | Couleur |
| --- | --- |
| Notion importante, jaune | `#fbf3db` |
| Notion importante, marron | `#e9e5e3` |
| Notion importante, orange | `#f6e9d9` |
| Examen complémentaire hors biologie, fond bleu | `#ddebf1` |
| Maladie, fond rouge | `#fbe4e4` |
| Traitement non médicamenteux, fond vert | `#ddedea` |
| Professionnel de santé / avis, fond violet | `#eae4f2` |
| Signes fonctionnels / anomalies cliniques, texte rouge | `#e03e3e` |
| Biologie, texte bleu | `#0b6e99` |
| Chiffres, texte rose | `#ad1a72` |
| Médicaments, texte vert | `#4d6461` |

Le rouge du texte est légèrement assombri (`#c93232`) pour améliorer le contraste
sur les fonds clairs ATLAS, sans changer sa signification.

Des variantes plus claires du texte et des fonds plus sombres servent au thème
sombre. Les annotations existantes sont conservées ; aucun classement médical
nouveau n’est inféré d’un mot ou d’une phrase. Les anciens marqueurs explicites
`kw-clinique`, `kw-bio`, `kw-medic`, `kw-imagerie`, `kw-radio` et `kw-chiffre`
utilisent les équivalents de cette légende. Les classes plus ambiguës ne sont
pas reclassées automatiquement. La légende constitue une convention d’édition,
pas une attestation que chaque annotation historique a été requalifiée.

## Fonctionnement

- Modifier le contenu d’un objectif sans changer son identifiant, son intitulé
  officiel ni ses cartes ; les images associées restent dans leur galerie.
- Texte riche : six niveaux de titres, gras, italique, souligné, barré,
  indices/exposants, listes simples/numérotées/à cocher, citation, liens HTTPS/HTTP,
  images par URL HTTPS, tableaux et blocs repliables.
- Couleur du texte et surlignage indépendants ; annuler/rétablir ; monter,
  descendre, dupliquer ou retirer un bloc. Les déplacements utilisent des
  boutons accessibles au clavier et au toucher.
- Ajouter et renommer des sections personnelles dans une rubrique, les marquer
  acquises, les retirer puis les restaurer. Les objectifs officiels gardent
  leur décompte et leur progression.
- Sauvegarder une version, récupérer un brouillon après fermeture/rechargement,
  consulter le cours d’origine et le rétablir. Une version précédente est gardée.

`state.courseEdits` voyage avec le profil existant et ses sauvegardes JSON.
En invité, les changements restent sur l’appareil. Avec un compte, le mécanisme
Supabase existant sauvegarde et synchronise les champs JSON, y compris les
brouillons. Les conflits restent soumis au choix explicite du profil ; un compte
ne récupère pas implicitement les données invitées ou d’un autre compte.
Une sauvegarde locale refusée laisse l’éditeur ouvert et affiche une erreur.

Les brouillons personnels portent l’item et la rubrique pour ne pas apparaître
dans un autre cours portant le même nom de rubrique. La bascule de compte
termine l’enregistrement sous l’ancien compte avant de verrouiller l’interface.

Le texte enregistré est nettoyé : aucun script, gestionnaire d’événement, iframe,
style arbitraire ou URL javascript. Les détails se replient en lecture. Les
cases d’une liste à cocher se modifient dans l’éditeur. Les tableaux incomplets
peuvent recevoir des cellules vides de réparation ; aucune cellule renseignée
ne doit être supprimée par la conversion.

## Construction et vérification

Le moteur libre Tiptap/ProseMirror est distribué localement et chargé seulement
à l’ouverture de l’éditeur. Aucun contenu n’est envoyé au fournisseur du moteur.

```sh
npm ci --prefix editor-src
npm run build --prefix editor-src
NODE_PATH=../qa-deps/node_modules node --test tests/course-customization.test.cjs tests/account.test.cjs
```

Les dépendances sont verrouillées dans `editor-src/package-lock.json`.
Les licences sont regroupées dans `dist/vendor/course-editor.LICENSE.txt`.
Référence API : https://tiptap.dev/docs/editor/getting-started/install/vanilla-javascript

Les tests couvrent les 4 893 objectifs, la conservation du texte, des liens,
des images et des cellules renseignées, le nettoyage HTML, les commandes du
moteur, le stockage refusé, le nettoyage du profil, les sauvegardes JSON et la
synchronisation simulée entre appareils/comptes. Les tests du lecteur couvrent
également les 11 485 cartes et les 561 objectifs illustrés.
Les essais navigateur utilisent les dimensions 1280 × 900, 810 × 1080 et
390 × 844, en clair et sombre. Ils ne constituent pas un essai sur iPad physique.
