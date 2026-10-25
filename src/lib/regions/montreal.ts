import { spot, type Region } from './types';

/** Montréal : contenu de démo fait main (coordonnées vérifiées dans OpenStreetMap). */
export const MONTREAL_REGION: Region = {
  id: 'montreal',
  name: 'Montréal',
  center: { lat: 45.515, lng: -73.575 },
  cityRadiusKm: 7,
  regionRadiusKm: 45,
  home: { lat: 45.5246, lng: -73.5817, label: 'Avenue du Mont-Royal, Plateau' },

  places: {
    tamTams: spot(45.5142, -73.5852, 'Monument George-Étienne-Cartier · Mont-Royal', 'park'),
    kondiaronk: spot(45.5035, -73.587, 'Belvédère Kondiaronk · Mont-Royal', 'view'),
    lacCastors: spot(45.4987, -73.5974, 'Lac aux Castors · Mont-Royal', 'park'),
    laFontaine: spot(45.5263, -73.569, 'Parc La Fontaine', 'park'),
    laurier: spot(45.5321, -73.5878, 'Parc Sir-Wilfrid-Laurier', 'park'),
    jarry: spot(45.5356, -73.6279, 'Parc Jarry', 'pitch'),
    jeanneMance: spot(45.515, -73.5832, 'Parc Jeanne-Mance', 'pitch'),
    jeanDrapeau: spot(45.5139, -73.5343, 'Parc Jean-Drapeau · île Sainte-Hélène', 'park'),
    circuit: spot(45.4987, -73.5227, 'Circuit Gilles-Villeneuve · île Notre-Dame', 'pitch'),
    placeJacquesCartier: spot(45.5079, -73.553, 'Place Jacques-Cartier · Vieux-Montréal', 'square'),
    vieuxPort: spot(45.5065, -73.5505, 'Vieux-Port · quai Jacques-Cartier', 'square'),
    jeanTalon: spot(45.5359, -73.6151, 'Marché Jean-Talon', 'market'),
    atwater: spot(45.4796, -73.5768, 'Marché Atwater · canal de Lachine', 'market'),
    saintLaurent: spot(45.517, -73.581, 'Boulevard Saint-Laurent · Plateau', 'bar'),
    saintDenis: spot(45.5148, -73.5655, 'Rue Saint-Denis · Quartier latin', 'bar'),
    squareSaintLouis: spot(45.5171, -73.5698, 'Square Saint-Louis', 'park'),
    emilieGamelin: spot(45.5159, -73.56, 'Place Émilie-Gamelin', 'square'),
    placeDesFestivals: spot(45.5074, -73.5674, 'Place des Festivals · Quartier des spectacles', 'square'),
    mbam: spot(45.4987, -73.5794, 'Musée des beaux-arts de Montréal', 'museum'),
    cinemaDuParc: spot(45.5105, -73.575, 'Cinéma du Parc', 'cinema'),
    maisonneuve: spot(45.5651, -73.5622, 'Parc Maisonneuve', 'park'),
    jardinBotanique: spot(45.5595, -73.5612, 'Jardin botanique de Montréal', 'park'),
    mcgill: spot(45.504, -73.577, 'Campus McGill · Lower Field', 'pitch'),
    oratoire: spot(45.4931, -73.6209, 'Oratoire Saint-Joseph', 'view'),
    saintBruno: spot(45.5476, -73.327, 'Parc national du Mont-Saint-Bruno', 'peak'),
    saintHilaire: spot(45.5501, -73.1534, 'Mont Saint-Hilaire · Réserve naturelle Gault', 'peak'),
    capSaintJacques: spot(45.4649, -73.9316, 'Parc-nature du Cap-Saint-Jacques', 'water'),
  },

  urbanSpots: [
    'laFontaine', 'laurier', 'jarry', 'jeanneMance', 'squareSaintLouis', 'emilieGamelin',
    'placeJacquesCartier', 'vieuxPort', 'mcgill', 'maisonneuve', 'lacCastors', 'placeDesFestivals',
    'atwater', 'tamTams',
  ],

  extraLives: [
    { title: 'Dek hockey improvisé', emoji: '🏒', category: 'sport', cap: [8, 10], spots: ['pitch', 'park'] },
    { title: 'Spikeball au parc', emoji: '🟡', category: 'sport', cap: [4, 6], spots: ['park'] },
    { title: '5 à 7 improvisé', emoji: '🍻', category: 'food', cap: [5, 10], spots: ['bar'] },
  ],

  seeds: [
    {
      title: 'Tam-tams du Mont-Royal', emoji: '🥁', kind: 'regular', category: 'musique',
      place: 'tamTams', capacity: 40, present: 12, joined: 10, recurrence: { weekdays: [0], time: '12:00' }, durationMin: 360,
      description: 'Le rendez-vous incontournable du dimanche au pied du monument George-Étienne-Cartier : percussions, danse et pique-nique. Apporte ton djembé (ou juste ta bonne humeur) ! 🥁',
    },
    {
      title: 'Partie de loup-garou', emoji: '🐺', kind: 'event', category: 'jeux',
      place: 'laFontaine', capacity: 10, present: 4, joined: 3, when: { weekday: 0, time: '14:00' }, durationMin: 150,
      description: "On se retrouve près de l'étang du parc La Fontaine pour quelques parties de loup-garou. J'apporte les cartes, débutants bienvenus ! 🐺🌕",
    },
    {
      title: 'Coucher de soleil au belvédère Kondiaronk', emoji: '🌄', kind: 'event', category: 'nature',
      place: 'kondiaronk', capacity: 15, present: 2, joined: 6, when: { daysAhead: 1, time: '17:00' }, durationMin: 120,
      description: "Montée par l'escalier du parc du Mont-Royal (20 min), puis vue sur le centre-ville qui s'illumine. Prévois une petite laine, ça pince le soir !",
    },
    {
      title: '5 à 7 jeux de société', emoji: '🎲', kind: 'regular', category: 'jeux',
      place: 'saintLaurent', capacity: 12, present: 2, joined: 6, meJoined: true, recurrence: { weekdays: [3], time: '17:00' }, durationMin: 150,
      description: "Le 5 à 7 du mercredi dans un bar du boulevard Saint-Laurent : Codenames, Skyjo, Catan… Apporte tes jeux préférés !",
    },
    {
      title: 'Dek hockey du jeudi', emoji: '🏒', kind: 'regular', category: 'sport',
      place: 'jarry', capacity: 12, present: 4, joined: 5, recurrence: { weekdays: [4], time: '19:00' }, durationMin: 90,
      description: 'Matchs amicaux de dek hockey au parc Jarry, tous niveaux. Bâtons en prêt, casque recommandé.',
    },
    {
      title: 'Soccer à 5', emoji: '⚽', kind: 'live', category: 'sport',
      place: 'jeanneMance', capacity: 10, present: 7, joined: 0, startedMinAgo: 10, durationMin: 90,
      description: 'On est 7 sur le terrain du parc Jeanne-Mance, il manque 3 joueurs pour faire du 5 contre 5 ! Venez comme vous êtes 😄',
    },
    {
      title: 'Running au parc du Mont-Royal', emoji: '🏃', kind: 'regular', category: 'sport',
      place: 'tamTams', capacity: 20, present: 4, joined: 7, meJoined: true, recurrence: { weekdays: [2, 4], time: '18:30' }, durationMin: 60,
      description: 'Boucle de 7 km sur le chemin Olmsted, on termine au chalet du Mont-Royal. Tous niveaux, personne n’est laissé derrière !',
    },
    {
      title: 'Jam session au Vieux-Montréal', emoji: '🎸', kind: 'event', category: 'musique',
      place: 'placeJacquesCartier', capacity: 8, present: 3, joined: 2, when: { inMinutes: 50 }, durationMin: 120,
      description: 'Guitares, ukulélés, harmonica… On s’installe sur la place Jacques-Cartier. Répertoire folk, du Beau Dommage aux Cowboys Fringants !',
    },
    {
      title: 'Pétanque au square Saint-Louis', emoji: '🎯', kind: 'live', category: 'jeux',
      place: 'squareSaintLouis', capacity: 6, present: 4, joined: 0, startedMinAgo: 20, durationMin: 120,
      description: 'Deux équipes de 3 : il manque 2 personnes. On a les boules et le cochonnet !',
    },
    {
      title: 'Yoga au lac aux Castors', emoji: '🧘', kind: 'regular', category: 'bienetre',
      place: 'lacCastors', capacity: 15, present: 1, joined: 8, recurrence: { weekdays: [6], time: '10:00' }, durationMin: 75,
      description: "Yoga doux au bord du lac aux Castors, tous niveaux. Apporte ton tapis et une bouteille d'eau. Gratuit, contribution volontaire 🙏",
    },
    {
      title: 'Sortie vélo au mont Saint-Bruno', emoji: '🚴', kind: 'event', category: 'sport',
      place: 'saintBruno', capacity: 6, present: 2, joined: 1, when: { weekday: 6, time: '08:30' }, durationMin: 300,
      description: 'Départ du Plateau, traversée du pont Jacques-Cartier puis direction le mont Saint-Bruno : ~60 km aller-retour, rythme modéré. Casque obligatoire.',
    },
    {
      title: 'Rando au mont Saint-Hilaire', emoji: '⛰️', kind: 'event', category: 'nature',
      place: 'saintHilaire', capacity: 8, present: 2, joined: 3, when: { weekday: 0, time: '09:00' }, durationMin: 300,
      description: 'Sentier du Pain de Sucre (~8 km) avec vue sur toute la Montérégie. Covoiturage depuis le métro Longueuil.',
    },
    {
      title: 'Tournée du marché Jean-Talon', emoji: '🍎', kind: 'event', category: 'food',
      place: 'jeanTalon', capacity: 10, present: 2, joined: 5, when: { daysAhead: 1, time: '11:00' }, durationMin: 120,
      description: 'On goûte les produits d’automne (pommes, courges, sirop d’érable…) puis on cuisine un repas ensemble. Participation : 10 $.',
    },
    {
      title: 'Pique-nique au parc Jean-Drapeau', emoji: '🧺', kind: 'event', category: 'food',
      place: 'jeanDrapeau', capacity: 20, present: 4, joined: 6, when: { weekday: 6, time: '12:30' }, durationMin: 150,
      description: 'Chacun apporte quelque chose à partager. Vue sur le centre-ville, frisbee et bonne humeur fournis !',
    },
    {
      title: 'Ultimate frisbee', emoji: '🥏', kind: 'live', category: 'sport',
      place: 'mcgill', capacity: 12, present: 8, joined: 1, startedMinAgo: 15, durationMin: 120,
      description: 'Match amical sur le terrain du campus McGill. Il reste 3 places, venez !',
    },
    {
      title: 'Basket 3x3', emoji: '🏀', kind: 'live', category: 'sport',
      place: 'maisonneuve', capacity: 6, present: 4, joined: 1, startedMinAgo: 5, durationMin: 90,
      description: 'Terrain libre au parc Maisonneuve : il manque 1 joueur pour faire du 3 contre 3.',
    },
    {
      title: 'Ciné-club : soirée Villeneuve', emoji: '🎬', kind: 'event', category: 'culture',
      place: 'cinemaDuParc', capacity: 10, present: 3, joined: 4, when: { weekday: 5, time: '19:30' }, durationMin: 180,
      description: 'On (re)voit « Incendies » de Denis Villeneuve, puis on en jase autour d’une bière.',
    },
    {
      title: 'Visite du Musée des beaux-arts', emoji: '🖼️', kind: 'event', category: 'culture',
      place: 'mbam', capacity: 8, present: 1, joined: 3, when: { daysAhead: 3, time: '14:00' }, durationMin: 120,
      description: "On découvre le pavillon d'art québécois et canadien en petit groupe, puis café pour en discuter.",
    },
    {
      title: 'Karaoké du jeudi', emoji: '🎤', kind: 'regular', category: 'musique',
      place: 'saintDenis', capacity: 14, present: 3, joined: 5, recurrence: { weekdays: [4], time: '21:00' }, durationMin: 150,
      description: "Micro ouvert à tous dans un bar de la rue Saint-Denis, de Céline à Charlotte Cardin. Fous rires garantis 🎶",
    },
    {
      title: "Balade d'automne au Cap-Saint-Jacques", emoji: '🍂', kind: 'event', category: 'nature',
      place: 'capSaintJacques', capacity: 10, present: 3, joined: 2, when: { daysAhead: 6, time: '10:00' }, durationMin: 180,
      description: "Balade de 6 km en forêt jusqu'à la plage du lac des Deux Montagnes, en pleines couleurs d'automne. Idéal en famille.",
    },
    {
      title: 'Rallye photo au Jardin botanique', emoji: '📷', kind: 'event', category: 'culture',
      place: 'jardinBotanique', capacity: 12, present: 3, joined: 2, when: { daysAhead: 5, time: '10:00' }, durationMin: 180,
      description: 'Rallye photo par équipes dans les jardins d’automne (Jardin de Chine, Jardin japonais…). Smartphone accepté !',
    },
    {
      title: 'Roller au circuit Gilles-Villeneuve', emoji: '🛼', kind: 'regular', category: 'sport',
      place: 'circuit', capacity: 15, present: 3, joined: 5, recurrence: { weekdays: [1, 5], time: '18:00' }, durationMin: 90,
      description: "Tours de patin à roues alignées sur le circuit de l'île Notre-Dame, tous niveaux. Casque et protections conseillés.",
    },
    {
      title: 'Échecs en plein air', emoji: '♟️', kind: 'regular', category: 'jeux',
      place: 'emilieGamelin', capacity: 10, present: 2, joined: 3, recurrence: { weekdays: [6], time: '15:00' }, durationMin: 180,
      description: "Échiquiers en libre accès, parties rapides et blitz. Tous niveaux, on t'apprend volontiers les ouvertures !",
    },
    {
      title: 'Tournoi de Mölkky', emoji: '🪵', kind: 'event', category: 'jeux',
      place: 'laurier', mine: true,
      capacity: 12, present: 2, joined: 5, when: { inMinutes: 22 * 60 + 30 }, durationMin: 150,
      description: 'Tournoi en équipes de 2 au parc Laurier, prix pour les gagnants 🏆 Jus de pomme et beignes sur place.',
    },
  ],
};
