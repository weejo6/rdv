# RDV · Rendez-vous

**Crée, visualise et rejoins les événements autour de chez toi, sur une carte interactive.**

👉 Démo en ligne : **https://weejo6.github.io/rdv/**

L'app est une démo de présentation : tout tourne dans le navigateur, avec des habitants et des
événements simulés **autour de ta position**, placés sur les vrais lieux de ton quartier (parcs, terrains,
places, bars, cinémas, sommets, lacs…) trouvés dans OpenStreetMap.
Si la géolocalisation est refusée, la démo se déroule à Grenoble, avec des lieux choisis à la main
(Parc Paul Mistral, Bastille, Col de la Croix de Fer…).

---

## Fonctionnalités

### La carte
- Carte interactive (OpenStreetMap) centrée sur ta position.
- Chaque RDV est une épingle colorée avec son emoji et le **nombre de places restantes**.
- Filtres par type, catégorie, rayon (1 à 100 km) et recherche texte. Vue liste triée par distance ou horaire.
- **Un événement complet disparaît de la carte** (avec une petite animation). Il reste visible dans « Mes RDV ».

### Trois types d'événements

| Type | Couleur | Exemple |
|---|---|---|
| **Événement** : planifié et ponctuel | 🔵 Bleu | Ce dimanche à 14 h, une partie de loup-garou |
| **Régulier** : planifié et récurrent | 🟣 Violet | Tous les dimanches à 14 h, loup-garou |
| **Live** : créé à la volée, éphémère | 🟢 Vert | Tu es au parc, il te manque 2 joueurs |

Un RDV vert est soit un live qui vient d'être créé, soit un événement (ou une séance d'un régulier) qui vient de commencer.

### Créer un RDV
Nom, nombre total de personnes et personnes déjà présentes, lieu (recherche d'adresse, clic sur la carte,
épingle déplaçable ou géolocalisation, avec nom du lieu trouvé automatiquement), horaire (date pour un événement,
jours de la semaine pour un régulier, « maintenant » pour un live), durée, catégorie, description, photos et vidéos.

Astuce : **clic droit (ou appui long) sur la carte** pour créer un RDV à cet endroit.

### Annulation
- **Automatique** : l'organisateur reçoit une demande de confirmation **24 h avant** puis **1 h avant**.
  Une réponse négative, ou une absence de réponse, annule l'événement (pour un régulier : la séance concernée).
- **Manuelle** : l'organisateur peut annuler à tout moment (un régulier : la prochaine séance ou toute la série).
- **Désinscription** : un participant peut se désinscrire ; l'organisateur et tous les participants sont prévenus.

### Simulation (pour la démo)
- Des habitants fictifs rejoignent tes RDV, se désinscrivent, t'envoient un petit message quand tu rejoins les leurs,
  et lancent des lives près de toi.
- Panneau **« Démo »** : avancer le temps (+15 min, +1 h, +1 jour), accélérer l'horloge (x60, x600),
  sauter directement à J-1 / H-1 / au début de ton prochain RDV pour montrer les confirmations et l'annulation automatique,
  déclencher manuellement des inscriptions, désinscriptions et lives, réinitialiser la démo.
- Position : « Ma position » (par défaut) ou « Grenoble » (lieux faits main), dans le panneau Démo.

Les données (dont les photos et vidéos) sont sauvegardées dans le navigateur (IndexedDB).

---

## Scénario de présentation (5 min)

1. **Ouvrir la carte** : épingles bleues, violettes et vertes autour de toi ; les lives « pulsent ».
2. **Cliquer un live vert** (ex. « Foot à 5 ») → « Je viens maintenant ! ». L'organisateur te répond.
3. **Créer un live** « Partie de loup-garou », 10 personnes dont 8 déjà là → les habitants simulés le rejoignent
   en quelques secondes, il devient complet et **disparaît de la carte**.
4. **Notifications 🔔** : la demande de confirmation J-1 du « Tournoi de Mölkky » attend ta réponse.
5. **Démo → « H-1 »** sans avoir répondu : le tournoi est **annulé automatiquement**.
6. **Démo → « +1 h »** : des événements passent au vert quand ils commencent.

---

## Stack technique

- [React 19](https://react.dev) + TypeScript, build avec [Vite](https://vite.dev)
- [Leaflet](https://leafletjs.com) / [react-leaflet](https://react-leaflet.js.org) + tuiles [OpenStreetMap](https://www.openstreetmap.org)
- Lieux et géocodage : [Photon](https://photon.komoot.io) et [Nominatim](https://nominatim.org) (données OpenStreetMap, sans clé d'API)
- État : [Zustand](https://zustand-demo.pmnd.rs), persistance IndexedDB via [idb-keyval](https://github.com/jakearchibald/idb-keyval)
- Icônes : [Lucide](https://lucide.dev) · Tests : [Vitest](https://vitest.dev)
- Déploiement automatique sur GitHub Pages à chaque push sur `main` (GitHub Actions)

```
src/
├── components/   Interface : carte, panneaux, fiche événement, formulaire de création…
├── lib/          Logique pure : temps, statuts, géo, données de démo, formatage
├── sim/          Boucle de simulation (horloge + habitants fictifs)
├── store/        État global (Zustand) : événements, notifications, annulations automatiques
└── styles.css
```

## Lancer en local

```bash
npm install
npm run dev
```

Puis ouvrir http://localhost:5173/rdv/

```bash
npm test         # tests unitaires
npm run build    # build de production dans dist/
```

## Pistes pour la suite

- Vrai back-end (comptes, base de données partagée, temps réel) et notifications push.
- Messagerie entre participants.
- Modération et signalement.
- Application mobile (PWA installable, ou React Native).
