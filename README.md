# ATLAS-EDN

Version du projet ATLAS-EDN préparée le 11 octobre 2026 : fiches, cartes de révision, illustrations, favoris par objectif, menu repliable et taille du texte réglable.

## Lancer le site

Le site est statique et ses fichiers sont dans `dist/`. Aucune compilation ni installation de dépendances n'est nécessaire.

```sh
python3 -m http.server 8000 --directory dist
```

Ouvrir ensuite http://localhost:8000 dans le navigateur.

## Hébergement

Le dossier à publier est `dist/`. Utiliser un hébergement de fichiers statiques avec `index.html` comme page d'accueil.

Les progrès et réglages sont enregistrés dans le navigateur. Utiliser les fonctions d'export et d'import du site pour les transporter entre appareils.

## Provenance

Copie de la version complète du projet local ATLAS-EDN, issue de `ATLAS-EDN-publication-complete.zip`, avec 2 052 fichiers dans `dist/`. Le transfert vers ce dépôt ne publie pas automatiquement le site.
