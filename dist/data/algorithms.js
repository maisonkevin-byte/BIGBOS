/* Parcours pédagogiques ATLAS. Sources LiSA EDN 2026 consultées le 12/10/2026. */
(() => {
'use strict';
const source = (code, title) => ({code:'OIC-'+code, rank:code.split('-')[2], title,
 url:'https://livret.uness.fr/lisa/2026/'+encodeURIComponent((title+' OIC-'+code).replace(/ /g,'_'))});
const sources = {
 p3:source('116-03-A',"Connaître les modalités du diagnostic d'un prurit"),
 p6:source('116-06-A',"Connaître les examens à réaliser en première intention dans le cadre d'un prurit sine materia"),
 p8:source('116-08-A','Connaître trois causes principales de prurit diffus avec lésions cutanées'),
 p9:source('116-09-A','Connaître les différentes causes de prurit diffus sine materia'),
 p14:source('116-14-A','Connaître les principes de la prise en charge du prurit'),
 a1:source('213-01-A',"Connaître la définition d'une anémie"),
 a5:source('213-05-A',"Connaître les critères de gravité d'une anémie"),
 a7:source('213-07-A','Connaître la démarche étiologique clinique et biologique (arbre décisionnel) devant une anémie'),
 d3:source('203-03-A',"Connaître les principales étiologies d'une dyspnée aiguë et leur signes cliniques"),
 d5:source('203-05-A',"Connaître les éléments d'orientation diagnostique face à une dyspnée chronique"),
 d7:source('203-07-A','Connaître les examens complémentaires de première intention en fonction du caractère aigu ou chronique'),
 d11:source('203-11-A','Identifier les signes de gravité imposant des décisions thérapeutiques immédiates'),
 t2:source('230-02-A','Savoir rechercher une détresse vitale devant une douleur thoracique'),
 t4:source('230-04-A','Savoir évoquer les quatre urgences cardio-vasculaires devant une douleur thoracique'),
 t6:source('230-06-A','Connaître la démarche diagnostique des quatre urgences cardio-vasculaires'),
 t9:source('230-09-A','Connaître les examens biologiques à prescrire et leur interprétation des quatre urgences cardio-vasculaires'),
 t13:source('230-13-A','Connaître les principales causes thoraciques de douleur aiguë en dehors des quatre urgences cardio-vasculaires'),
 n23:source('267-23-A',"Connaître les indications de prescription et les seuils de Définition de la sévérité d'une hyponatrémie"),
 n25:source('267-25-A',"Connaître les symptômes de gravité de l'hyponatrémie"),
 n26:source('267-26-A','Connaître les principales étiologies des hyponatrémies'),
 n28:source('267-28-A','Connaître le principal risque de la correction rapide des hyponatrémies'),
 n29:source('267-29-A',"Connaître les modalités du diagnostic d'une hypernatrémie"),
 n32:source('267-32-A','Connaître les principales étiologies des hypernatrémies')
};
const choice=(label,to)=>({label,to});
const node=(id,title,body,why,refs,choices=[],extra={})=>({id,title,body,why,refs,choices,...extra});
window.ATLAS_ALGORITHM_DATA={version:1,reviewedAt:'2026-10-12',sources,algorithms:[
 {id:'prurit',sdd:88,title:'Devant un prurit',items:[116],scope:'Orientation initiale chez l’adulte · Les terrains particuliers nécessitent leur démarche dédiée.',
  sddUrl:'https://livret.uness.fr/lisa/2026/Prurit_SDD-088',summary:'Distinguer la dermatose initiale des conséquences du grattage.',
  nodes:[
   node('entry','Existe-t-il une lésion cutanée primitive ?',[
    'Préciser la localisation, l’évolution et les expositions. Examiner toute la peau.',
    'Différencier la lésion initiale des excoriations, du prurigo ou de la lichénification provoqués par le grattage.'
   ],'Des traces de grattage ne suffisent pas à identifier la maladie qui provoque le prurit.',['p3'],[choice('Lésion primitive identifiée','dermatose'),choice('Aucune lésion primitive','systemique'),choice('Examen encore incertain','exam')]),
   node('exam','Compléter la description clinique',[
    'Reprendre la chronologie : la lésion précédait-elle le grattage ? Décrire sa morphologie et sa répartition.',
    'En cas d’incertitude, confronter l’examen à l’iconographie et solliciter un avis dermatologique.'
   ],'Une information manquante ne permet pas de choisir la branche « absence de lésion ».',['p3'],[choice('Revenir à l’examen des lésions','entry')],{kind:'uncertain'}),
   node('dermatose','Orienter selon la lésion primitive',[
    'Confronter la morphologie et le contexte aux dermatoses prurigineuses : eczéma, urticaire, gale, psoriasis, entre autres.',
    'Vérifier que l’hypothèse explique la distribution et l’évolution.'
   ],'La lésion oriente l’enquête ; le prurit seul ne désigne pas une dermatose précise.',['p8'],[choice('Cause identifiée','traiter'),choice('Cause encore indéterminée','revoir')]),
   node('systemique','Prurit sine materia : explorer les autres causes',[
    'Rechercher médicaments, signes généraux et arguments rénaux, hépatiques, hématologiques ou endocriniens.',
    'Le bilan LiSA comprend notamment NFS-plaquettes, créatinine, bilan de cholestase, TSH et ferritine. Consulter l’objectif pour le bilan complet et les particularités du sujet âgé.'
   ],'L’absence de lésion primitive n’exclut pas une cause systémique.',['p6','p9'],[choice('Cause identifiée après bilan','traiter'),choice('Bilan non contributif','revoir')]),
   node('traiter','Associer prise en charge de la cause et soulagement',[
    'Traiter la cause retenue et limiter les irritants cutanés ; les émollients et la réduction des lésions de grattage font partie des mesures symptomatiques.',
    'Réévaluer le retentissement, l’évolution et d’éventuelles lésions de surinfection.'
   ],'Le soulagement du symptôme et le traitement étiologique sont complémentaires.',['p14'],[],{kind:'finish'}),
   node('revoir','Reprendre l’enquête si le prurit persiste',[
    'Réexaminer les lésions, les expositions et les traitements ; confronter les résultats aux signes généraux.',
    'Un bilan initial non contributif laisse la cause indéterminée : reprendre le diagnostic différentiel avec l’aide de l’item.'
   ],'L’absence d’explication au premier bilan n’est pas un diagnostic étiologique.',['p3','p9'],[],{kind:'uncertain'})
  ]},
 {id:'anemie',sdd:217,title:'Devant une baisse de l’hémoglobine',items:[213,212,219],scope:'Orientation chez l’adulte hors grossesse · Les seuils pédiatriques et obstétricaux sont distincts.',
  sddUrl:'https://livret.uness.fr/lisa/2026/Baisse_de_l%27h%C3%A9moglobine_SDD-217',summary:'Tolérance d’abord, puis hémoglobine, VGM et réticulocytes.',
  nodes:[
   node('entry','Une urgence est-elle présente ?',[
    'Rechercher un saignement aigu, une hémolyse aiguë et une mauvaise tolérance : angor, hypotension, confusion, dyspnée importante ou tachycardie mal supportée.',
    'Tenir compte du terrain et de la vitesse d’installation, au-delà du chiffre d’hémoglobine.'
   ],'La gravité dépend de la tolérance et du mécanisme autant que de la profondeur de l’anémie.',['a5'],[choice('Urgence ou mauvaise tolérance','urgent'),choice('Pas d’urgence identifiée après évaluation','confirm'),choice('Tolérance non évaluée','eval')]),
   node('urgent','Prioriser l’évaluation et la prise en charge urgente',[
    'Organiser une prise en charge adaptée à la mauvaise tolérance et rechercher la cause en parallèle.',
    'La classification étiologique détaillée ne doit pas retarder la prise en charge d’une hémorragie ou d’une hémolyse aiguë.'
   ],'Une anémie aiguë peut nécessiter une intervention avant la fin du bilan étiologique.',['a5'],[],{kind:'urgent'}),
   node('eval','Évaluer avant de classer',[
    'Recueillir les signes de tolérance, les constantes, les antériorités et le contexte de saignement.'
   ],'Une absence d’information sur la tolérance ne vaut pas absence de gravité.',['a5'],[choice('Évaluation disponible','entry')],{kind:'uncertain'}),
   node('confirm','La baisse de l’Hb correspond-elle à une anémie ?',[
    'Adulte hors grossesse : Hb < 13 g/dL chez l’homme ; < 12 g/dL chez la femme.',
    'Comparer aux antériorités et vérifier les circonstances d’hémodilution. Le nombre d’hématies ne définit pas l’anémie.'
   ],'L’interprétation repose sur l’Hb et sur le contexte du prélèvement.',['a1'],[choice('Anémie confirmée','vgm'),choice('Seuil non franchi ou contexte incertain','contexte')]),
   node('contexte','Interpréter la variation dans son contexte',[
    'Une baisse par rapport à une antériorité ne suffit pas, à elle seule, à définir une anémie. Rechercher une hémodilution et utiliser les seuils adaptés au terrain.'
   ],'Une grossesse ou une situation pédiatrique requiert d’autres références.',['a1'],[],{kind:'uncertain'}),
   node('vgm','Quel est le volume globulaire moyen ?',[
    'Repères de l’objectif LiSA 213-07-A : microcytose < 80 fL ; normocytose 80–98 fL ; macrocytose > 98 fL.'
   ],'Le VGM organise la première orientation étiologique. Le seuil supérieur est ici celui de la source LiSA consultée.',['a7'],[choice('VGM < 80 fL','micro'),choice('VGM de 80 à 98 fL','retic-normo'),choice('VGM > 98 fL','retic-macro')]),
   node('micro','Explorer une anémie microcytaire',[
    'Ferritine et contexte inflammatoire (CRP) orientent vers carence martiale ou inflammation.',
    'Explorer l’origine de la carence ; envisager une hémoglobinopathie en seconde intention selon le contexte.'
   ],'La microcytose ne suffit pas à conclure à une carence en fer.',['a7'],[],{kind:'finish',related:[219]}),
   node('retic-normo','Anémie normocytaire : quelle réponse réticulocytaire ?',[
    'Régénérative : réticulocytes ≥ 120 G/L. Arégénérative : < 120 G/L.',
    'Après une hémorragie aiguë, la réticulocytose peut être retardée d’environ 48 heures.'
   ],'Les réticulocytes évaluent la réponse médullaire.',['a7'],[choice('≥ 120 G/L','regeneratif'),choice('< 120 G/L','normo')]),
   node('retic-macro','Anémie macrocytaire : quelle réponse réticulocytaire ?',[
    'Réticulocytes ≥ 120 G/L : régénérative ; < 120 G/L : arégénérative.'
   ],'La réponse médullaire complète l’orientation donnée par le VGM.',['a7'],[choice('≥ 120 G/L','regeneratif'),choice('< 120 G/L','macro')]),
   node('regeneratif','Rechercher perte, destruction ou récupération',[
    'Évoquer hémorragie, hémolyse ou correction récente d’une carence.',
    'Pour l’hémolyse : LDH, bilirubine non conjuguée et haptoglobine ; compléter selon le contexte par frottis et test direct à l’antiglobuline.'
   ],'Une réponse médullaire conservée oriente vers un mécanisme périphérique ou une récupération.',['a7'],[],{kind:'finish'}),
   node('normo','Explorer une anémie normocytaire arégénérative',[
    'Rechercher inflammation, insuffisance rénale et hypothyroïdie.',
    'Discuter l’exploration médullaire si le bilan reste inexpliqué, si les réticulocytes sont très bas ou si plusieurs lignées sont atteintes.'
   ],'Le déficit de production peut être secondaire à une cause extramédullaire.',['a7'],[],{kind:'finish'}),
   node('macro','Explorer une anémie macrocytaire arégénérative',[
    'Rechercher notamment un déficit en B12 ou B9 et une hypothyroïdie.',
    'Si aucune cause n’explique l’anémie, discuter une exploration médullaire spécialisée.'
   ],'La macrocytose arégénérative oriente le bilan de production.',['a7'],[],{kind:'finish'})
  ]},
 {id:'dyspnee',sdd:162,title:'Devant une dyspnée',items:[203],scope:'Orientation chez l’adulte · Parcours pédiatrique distinct.',
  sddUrl:'https://livret.uness.fr/lisa/2026/Dyspn%C3%A9e_SDD-162',summary:'Repérer la gravité et orienter les examens selon la temporalité.',
  nodes:[
   node('entry','Existe-t-il un signe de gravité ?',[
    'Lutte respiratoire : tachypnée > 25/min chez l’adulte, tirage ou recrutement des muscles respiratoires.',
    'Faillite ou retentissement : respiration paradoxale, bradypnée extrême, cyanose, vigilance altérée, hypotension ou marbrures.',
    'Sur les gaz du sang : PaCO₂ ≥ 45 mmHg ET pH < 7,35 signalent une acidose respiratoire non compensée.'
   ],'La recherche d’une détresse précède l’orientation étiologique détaillée.',['d11'],[choice('Au moins un signe de gravité','urgent'),choice('Pas de signe après évaluation','temps'),choice('Évaluation incomplète','eval')]),
   node('urgent','Basculer vers la détresse respiratoire',[
    'Organiser la prise en charge urgente ; évaluer et traiter la défaillance en parallèle de la recherche étiologique.',
    'Poursuivre avec l’item 359 pour la conduite à tenir adaptée.'
   ],'Un bilan diagnostique complet ne doit pas retarder la prise en charge de la défaillance.',['d11'],[],{kind:'urgent',related:[359]}),
   node('eval','Recueillir les données de gravité',[
    'Examiner la mécanique respiratoire, la vigilance et la perfusion ; mesurer les constantes et interpréter les gaz du sang lorsqu’ils sont indiqués.'
   ],'Une donnée non recueillie reste inconnue.',['d11'],[choice('Revenir à l’évaluation initiale','entry')],{kind:'uncertain'}),
   node('temps','Quelle est la temporalité ?',[
    'Préciser début, évolution, circonstances et antériorités. Une aggravation récente sur maladie chronique doit faire rechercher une décompensation.'
   ],'La temporalité et le contexte orientent le choix des examens.',['d3','d5','d7'],[choice('Aiguë ou aggravation récente','aigue'),choice('Chronique sans aggravation récente','chronique')]),
   node('aigue','Construire les hypothèses aiguës',[
    'Rechercher les signes d’obstruction, d’atteinte pleurale, d’infection ou de congestion cardiaque et le contexte thromboembolique.',
    'Orienter radiographie thoracique, ECG et biologie selon l’examen ; utiliser les gaz du sang pour apprécier le retentissement.'
   ],'Les signes orientent une hypothèse ; ils ne la confirment pas isolément.',['d3','d7'],[choice('Une hypothèse est étayée','orienter'),choice('Radiographie normale ou bilan non concluant','negatif')]),
   node('negatif','Poursuivre malgré une radiographie normale',[
    'Une radiographie sans anomalie notable peut accompagner notamment une embolie pulmonaire, un asthme, une BPCO ou une anémie.',
    'Réexaminer la probabilité clinique et sélectionner les examens complémentaires adaptés à l’hypothèse.'
   ],'Un examen initial normal ne termine pas l’enquête d’une dyspnée inexpliquée.',['d7'],[],{kind:'uncertain',related:[213]}),
   node('chronique','Orienter le bilan chronique',[
    'Croiser terrain, auscultation et symptômes : obstruction bronchique, cardiopathie, atteinte interstitielle, pleurale ou autre mécanisme.',
    'NFS, ECG et radiographie participent au bilan initial ; BNP/NT-proBNP en cas de suspicion cardiaque. Les EFR s’intègrent à l’exploration orientée.'
   ],'Une auscultation normale laisse possibles une anémie ou certaines maladies ventilatoires ou vasculaires.',['d5','d7'],[choice('Hypothèse à approfondir','orienter')]),
   node('orienter','Relier le mécanisme à l’item correspondant',[
    'Poursuivre la confirmation diagnostique dans l’item de la maladie suspectée, puis sa prise en charge et sa surveillance.',
    'Réévaluer la gravité en cas d’évolution clinique.'
   ],'La situation de départ organise le raisonnement ; l’item précise le diagnostic et le traitement.',['d3','d5'],[],{kind:'finish',related:[234,360,213]})
  ]},
 {id:'thorax',sdd:161,title:'Devant une douleur thoracique aiguë',items:[230],scope:'Orientation initiale chez l’adulte · Les hypothèses peuvent coexister.',
  sddUrl:'https://livret.uness.fr/lisa/2026/Douleur_thoracique_SDD-161',summary:'Prioriser les urgences et interpréter les examens dans leur contexte.',
  nodes:[
   node('entry','Existe-t-il une détresse vitale ?',[
    'Rechercher détresse respiratoire, signes de choc et altération de conscience.',
    'Préciser en parallèle les caractéristiques de la douleur, le terrain et les signes associés.'
   ],'La stabilité initiale détermine la priorité de prise en charge.',['t2','t6'],[choice('Détresse identifiée','urgent'),choice('Patient évalué sans détresse','priorites'),choice('Données de gravité manquantes','eval')]),
   node('urgent','Déclencher une prise en charge urgente',[
    'Organiser l’évaluation et la prise en charge de la défaillance, avec recherche étiologique simultanée.',
    'L’ECG et les examens orientés s’inscrivent dans cette prise en charge urgente.'
   ],'L’absence de diagnostic définitif ne doit pas différer la prise en charge de la détresse.',['t2','t6'],[],{kind:'urgent',related:[359,339]}),
   node('eval','Compléter immédiatement l’évaluation',[
    'Recueillir constantes, conscience et signes respiratoires et circulatoires avant de conclure à l’absence de détresse.'
   ],'Une information inconnue ne permet pas de classer le patient comme stable.',['t2'],[choice('Reprendre le tri initial','entry')],{kind:'uncertain'}),
   node('priorites','Rechercher les urgences avant de banaliser',[
    'Les quatre urgences cardiovasculaires LiSA : SCA, embolie pulmonaire, dissection aortique et péricardite avec tamponnade.',
    'Rechercher aussi les causes respiratoires, dont le pneumothorax. Les quatre urgences cardiovasculaires ne couvrent pas toutes les urgences thoraciques.'
   ],'L’orientation doit rester ouverte à plusieurs mécanismes.',['t4','t13'],[choice('Organiser le bilan orienté','bilan')]),
   node('bilan','Confronter clinique, ECG et examens orientés',[
    'Décrire localisation, irradiation, installation et facteurs déclenchants ; examiner pouls, pression artérielle et auscultation.',
    'Réaliser et interpréter l’ECG. Choisir ensuite biologie et imagerie en fonction des hypothèses.'
   ],'Un examen est pertinent lorsqu’il répond à une hypothèse clinique précise.',['t6'],[choice('Hypothèse étayée','suite'),choice('Résultat biologique à interpréter','marqueurs'),choice('Bilan non concluant','reevaluer')]),
   node('marqueurs','Que permet réellement de conclure le biomarqueur ?',[
    'Une troponine élevée ne suffit pas à diagnostiquer un SCA : intégrer clinique, ECG et cinétique.',
    'Les D-dimères peuvent contribuer à exclure une EP lorsque la probabilité clinique s’y prête ; un résultat positif ne confirme pas l’EP.'
   ],'Le résultat prend son sens dans le contexte et la stratégie diagnostique.',['t9'],[choice('Confronter au bilan complet','bilan')]),
   node('suite','Poursuivre la filière diagnostique adaptée',[
    'Confirmer l’hypothèse et organiser prise en charge et surveillance dans l’item correspondant.',
    'Plusieurs hypothèses plausibles nécessitent de conserver les diagnostics alternatifs.'
   ],'Une orientation est une étape du raisonnement, pas une confirmation automatique.',['t6'],[],{kind:'finish',related:[339,225,235,360]}),
   node('reevaluer','Garder la douleur inexpliquée dans le raisonnement',[
    'Reconsidérer chronologie, probabilité clinique, ECG et cinétique des marqueurs ; adapter les examens ou l’orientation.',
    'Explorer ensuite les autres causes thoraciques selon les éléments recueillis.'
   ],'Un premier résultat non concluant ne justifie pas, à lui seul, une conclusion rassurante.',['t6','t9','t13'],[],{kind:'uncertain'})
  ]},
 {id:'natremie',sdd:202,title:'Devant une dysnatrémie',items:[267],scope:'Orientation diagnostique chez l’adulte · Les modalités de correction relèvent de la prise en charge dédiée.',
  sddUrl:'https://livret.uness.fr/lisa/2026/Dysnatr%C3%A9mie_SDD-202',summary:'Gravité, natrémie, osmolalité puis état extracellulaire.',
  nodes:[
   node('entry','Existe-t-il un retentissement préoccupant ?',[
    'Comparer aux antériorités et préciser les symptômes et la vitesse d’installation.',
    'En hyponatrémie : vomissements, détresse cardiorespiratoire, somnolence profonde, convulsions ou troubles de conscience sont des signes sévères. Confusion, céphalées et nausées nécessitent aussi une évaluation rapide.'
   ],'Le degré d’urgence dépend du retentissement clinique et de la temporalité.',['n25','n29'],[choice('Symptômes sévères ou état préoccupant','urgent'),choice('Évaluation réalisée, sans retentissement préoccupant','valeur'),choice('Symptômes ou antériorités inconnus','eval')]),
   node('urgent','Prioriser la prise en charge et la surveillance',[
    'Organiser une évaluation urgente et une correction adaptée à la situation, avec surveillance rapprochée.',
    'Une correction trop rapide d’une hyponatrémie chronique expose à une démyélinisation osmotique.'
   ],'La correction nécessite une stratégie propre à la sévérité, à l’ancienneté et au terrain.',['n25','n28'],[],{kind:'urgent'}),
   node('eval','Compléter les données avant l’orientation',[
    'Recueillir examen neurologique, constantes, traitements et résultats antérieurs. Une ancienneté inconnue doit rester identifiée comme telle.'
   ],'L’incertitude sur l’installation compte dans le choix de la prise en charge.',['n25','n28'],[choice('Revenir à l’évaluation','entry')],{kind:'uncertain'}),
   node('valeur','Dans quel intervalle se situe la natrémie ?',[
    'Hyponatrémie : Na⁺ < 135 mmol/L. Hypernatrémie : Na⁺ > 145 mmol/L.',
    'LiSA qualifie de sévère biologiquement l’hyponatrémie < 120 mmol/L : cette situation nécessite une évaluation urgente, même si les signes sont discrets.'
   ],'Les seuils biologiques et la gravité clinique apportent des informations complémentaires.',['n23','n25','n29'],[choice('Na⁺ < 120 mmol/L','urgent'),choice('Na⁺ de 120 à < 135 mmol/L','osm'),choice('Na⁺ de 135 à 145 mmol/L','normal'),choice('Na⁺ > 145 mmol/L','hyper')]),
   node('normal','Pas de dysnatrémie selon ces seuils',[
    'Interpréter une éventuelle variation dans le contexte clinique et les références du laboratoire.'
   ],'La variation d’un résultat et le franchissement d’un seuil sont deux informations distinctes.',['n23','n29'],[],{kind:'finish'}),
   node('osm','L’hyponatrémie est-elle hypo-osmotique ?',[
    'Vérifier l’osmolalité plasmatique ; rechercher notamment hyperglycémie ou situations de pseudohyponatrémie.',
    'Une osmolalité normale ou élevée impose une interprétation spécifique avant de poursuivre l’arbre des hyponatrémies hypotoniques.'
   ],'Une natrémie basse ne suffit pas à définir le mécanisme du trouble hydrique.',['n26'],[choice('Hypo-osmolalité confirmée','urines'),choice('Osmolalité normale ou élevée','nonhypo'),choice('Osmolalité non disponible','mesure')]),
   node('mesure','Documenter l’osmolalité',[
    'Compléter les données plasmatiques nécessaires et confronter mesure, glycémie et contexte biologique.'
   ],'Il faut documenter cette étape avant d’utiliser les branches suivantes.',['n26'],[choice('Résultat disponible','osm')],{kind:'uncertain'}),
   node('nonhypo','Explorer l’hyponatrémie non hypo-osmotique',[
    'Rechercher le contexte d’hyperglycémie ou d’interférence liée à une hyperlipidémie ou hyperprotidémie. Adapter la démarche au mécanisme retenu.'
   ],'La démarche des hyponatrémies hypotoniques ne s’applique pas directement ici.',['n26'],[],{kind:'finish'}),
   node('urines','Les urines sont-elles suffisamment diluées ?',[
    'Une osmolalité urinaire < 100 mOsm/kg traduit une dilution adaptée ; examiner apports hydriques et apports en solutés.',
    'Si les urines restent plus concentrées, interpréter le compartiment extracellulaire et les données urinaires.'
   ],'La réponse rénale aide à identifier le mécanisme de rétention d’eau.',['n26'],[choice('Uosm < 100 mOsm/kg','apports'),choice('Uosm ≥ 100 mOsm/kg','volemie')]),
   node('apports','Rechercher un déséquilibre entre apports et élimination',[
    'Évaluer notamment l’excès d’apports hypotoniques, les apports en solutés et le contexte clinique.'
   ],'Une dilution urinaire adaptée oriente l’enquête sur le bilan des apports.',['n26'],[],{kind:'finish'}),
   node('volemie','Quel est l’état du compartiment extracellulaire ?',[
    'Rechercher signes de déshydratation, hypotension orthostatique, œdèmes et surcharge ; interpréter les urines avec les traitements.'
   ],'La volémie et les médicaments modifient l’interprétation du bilan sodé.',['n26'],[choice('Déshydratation extracellulaire','pertes'),choice('Surcharge ou œdèmes','surcharge'),choice('Euvolémie étayée','siadh'),choice('État encore indéterminé','volumeincertain')]),
   node('pertes','Explorer les pertes ou le défaut d’apport sodé',[
    'Distinguer pertes digestives, cutanées et rénales ; rechercher l’effet des diurétiques et confronter au bilan urinaire.'
   ],'La réponse hormonale à une déplétion peut entretenir la rétention d’eau.',['n26'],[],{kind:'finish'}),
   node('surcharge','Rechercher une cause de surcharge',[
    'Envisager insuffisance cardiaque, cirrhose, syndrome néphrotique ou insuffisance rénale avancée selon le contexte.'
   ],'Une surcharge totale peut coexister avec une baisse de volémie efficace.',['n26'],[],{kind:'finish',related:[234]}),
   node('siadh','Vérifier les critères avant de retenir un SIADH',[
    'Croiser hypo-osmolalité, urine inadaptée, euvolémie et natriurèse avec les conditions de prélèvement.',
    'Écarter notamment insuffisance surrénale, hypothyroïdie, anomalie rénale et prise récente de diurétiques ; rechercher ensuite la cause.'
   ],'Euvolémie et hyponatrémie ne suffisent pas à elles seules au diagnostic de SIADH.',['n26'],[],{kind:'finish'}),
   node('volumeincertain','Réexaminer plutôt que supposer une euvolémie',[
    'Confronter examen, antériorités, traitements et résultats urinaires avant de choisir la branche.'
   ],'L’absence de signes documentés n’établit pas une euvolémie.',['n26'],[choice('Évaluation complétée','volemie')],{kind:'uncertain'}),
   node('hyper','Explorer le déficit hydrique et le volume extracellulaire',[
    'Rechercher un accès insuffisant à l’eau, des pertes digestives, cutanées ou rénales ; une polyurie hypotonique oriente vers un défaut de concentration urinaire.',
    'Distinguer déshydratation globale, déficit hydrique isolé et apport excessif de sodium selon le contexte.'
   ],'Le bilan des apports et pertes d’eau, associé à l’état extracellulaire, organise l’enquête.',['n29','n32'],[],{kind:'finish'})
  ]}
]};
})();
