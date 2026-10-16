# Couleurs pédagogiques des fiches

Le 16 octobre 2026, l’utilisateur a demandé d’appliquer la convention DocECOS au
sens du contenu, au-delà de la légende. Les anciennes couleurs Notion et `kw-*`
mélangeaient plusieurs conventions : ECG en biologie, « rappels » en maladie,
« âge » en chiffre, voire « les » pris pour l’abréviation LES.

## Convention

Référence de présentation : [FAQ DocECOS](https://app.docecos.fr/info), rubrique
« Nos fiches / Quel est notre code couleur ? », consultée le 16 octobre 2026.

| Nature | Présentation | Exemple |
|---|---|---|
| Maladie | Fond rouge pâle | Méningite, diabète |
| Signe fonctionnel ou anomalie clinique | Texte rouge | Fièvre, dyspnée |
| Examen biologique | Texte bleu | NFS, CRP, hémocultures |
| Examen complémentaire hors biologie | Fond bleu pâle | ECG, IRM, ponction lombaire |
| Médicament | Texte vert | Amoxicilline, DTCaP, ROR |
| Traitement non médicamenteux | Fond vert pâle | Drainage, chirurgie, rééducation |
| Professionnel ou avis | Fond violet pâle | Cardiologue, avis spécialisé |
| Chiffres | Texte rose | 11–14 ans, 5 mg/kg/j, deux doses |
| Notion importante | Fond jaune pâle | Signes de gravité, ne pas retarder |

Les variantes marron et orange de la FAQ restent disponibles dans l’éditeur pour
les notions importantes. Aucun sens médical arbitraire ne leur est ajouté.

## Application

`dist/course-semantics.js` contient un lexique explicite, les expressions
contextuelles et les règles numériques. Il annote le HTML à l’affichage, avant
la mise en lignes du lecteur. Il ne réécrit pas les données des 367 items.

- Objectifs, cellules de tableau, questions et réponses de cartes, astuces, conduite à tenir,
  cours dans les pop-up : même fonction appelée par `ATLAS_COURSE.sanitize`.
- Explications des algorithmes et textes détaillés du calendrier vaccinal : même
  annotateur. Les couleurs des branches et des commandes gardent leur rôle UI.
- Repères de synthèse du lecteur : même rendu.
- Anciennes versions personnelles : texte conservé, convention appliquée au
  rendu. À l’ouverture de l’éditeur, les couleurs réellement affichées sont
  importées. Une version ensuite enregistrée avec `semanticVersion:1` respecte
  les choix manuels, y compris une couleur volontairement retirée.
- Aucun changement des images, identifiants de cartes, intitulés LiSA, nombres,
  doses, négations, liens ou références. Les images originales ne sont pas
  recolorées ; leur contenu n’est pas du texte éditable.

## Limites et décisions sémantiques

Il s’agit d’un vocabulaire contrôlé avec règles contextuelles, pas d’une
compréhension exhaustive de toutes les phrases ni d’une validation médicale des
367 items. Un terme inconnu ou ambigu reste neutre. Ajouter une nouvelle règle
exige des exemples positifs et des contre-exemples.

- Les expressions longues priment : « anorexie mentale » = maladie, « anorexie »
  = symptôme ; « purpura fulminans » = maladie, « purpura » = signe.
- Les abréviations sont sensibles à la casse : `LES` peut être une maladie,
  `les` reste neutre ; `VS` est un examen, `vs` une comparaison.
- `RCP`, `TCC`, `EP`, les noms de germes/virus isolés et les mots génériques comme
  « biologique », « traitement », « âge », « grossesse », « rappels » restent
  neutres. Un contexte biologique explicite permet de classer PTH ou insuline.
- « Dosage de l’insuline » relève de la biologie ; « insuline rapide » d’un
  médicament ; « insuline sécrétée » n’est pas une prescription.
- Une ponction pleurale est un examen ; la mention explicite « évacuatrice »
  désigne un geste thérapeutique. Le drainage veineux anatomique reste neutre.
- Les noms complets et molécules contenant des chiffres sont protégés :
  Covid-19, vitamine B12, HbA1c. Les renvois « item 146 » ne sont pas des seuils.
- Les couleurs n’affirment jamais qu’un signe est présent : « pas de fièvre »
  garde sa négation. Elles qualifient uniquement la nature du terme.

Repères de classification vérifiés :
[Assurance maladie — NFS et examens sanguins](https://www.ameli.fr/assure/sante/examen/analyse/lire-resultats-prise-sang),
[Inserm — vaccins et vaccinations](https://www.inserm.fr/dossier/vaccins-et-vaccinations/).
Le contenu clinique existant n’a pas été modifié lors de ce travail de présentation.

## Vérifications

`tests/course-semantics.test.cjs` vérifie les catégories et les cas ambigus, puis
compare chaque objectif, réponse, astuce et stratégie avant/après : texte exact,
images, liens, cellules, listes, gras et italique. La source JSON reste identique.
`SEMANTIC_AUDIT=/chemin/audit.json` permet d’enregistrer les décomptes.

Les tests du lecteur vérifient séparément les 4 893 objectifs, les 11 485 cartes,
les commandes et les 561 objectifs illustrés ; les tests d’édition couvrent la
conservation des contenus et la sauvegarde réversible. Les preuves visuelles et
les résultats de cette livraison sont dans le dossier de travail
`outputs/couleurs-semantiques` de la conversation.
