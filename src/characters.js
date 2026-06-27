export const fighters = [
  {
    id: 'nova',
    name: 'Nova',
    tagline: 'Polyvalente, rapide, parfaite pour débuter.',
    color: '#72f7ff',
    accent: '#3278ff',
    stats: {
      speed: 6.2,
      airSpeed: 4.6,
      acceleration: 1.15,
      jump: 17.2,
      gravity: 0.82,
      fallSpeed: 17,
      weight: 1,
      size: 46
    },
    moves: {
      neutral: {
        name: 'Arc Jab',
        damage: 7,
        startup: 5,
        active: 8,
        recovery: 15,
        range: 58,
        height: 34,
        offsetY: -6,
        angle: -0.2,
        baseKnockback: 8,
        growth: 0.18
      },
      up: {
        name: 'Star Upper',
        damage: 8,
        startup: 7,
        active: 9,
        recovery: 21,
        range: 52,
        height: 66,
        offsetY: -44,
        angle: -1.22,
        baseKnockback: 10,
        growth: 0.24
      },
      down: {
        name: 'Low Comet',
        damage: 6,
        startup: 4,
        active: 10,
        recovery: 17,
        range: 64,
        height: 26,
        offsetY: 16,
        angle: -0.04,
        baseKnockback: 7,
        growth: 0.16
      },
      special: {
        name: 'Pulse Burst',
        damage: 12,
        startup: 12,
        active: 12,
        recovery: 30,
        range: 82,
        height: 48,
        offsetY: -8,
        angle: -0.72,
        baseKnockback: 13,
        growth: 0.28
      }
    }
  },
  {
    id: 'bront',
    name: 'Bront',
    tagline: 'Lourd, puissant, survit longtemps.',
    color: '#ffb45f',
    accent: '#ff5d2e',
    stats: {
      speed: 4.5,
      airSpeed: 3.5,
      acceleration: 0.86,
      jump: 15.5,
      gravity: 0.94,
      fallSpeed: 18,
      weight: 1.32,
      size: 55
    },
    moves: {
      neutral: {
        name: 'Stone Hook',
        damage: 10,
        startup: 8,
        active: 9,
        recovery: 20,
        range: 66,
        height: 40,
        offsetY: -4,
        angle: -0.1,
        baseKnockback: 10,
        growth: 0.2
      },
      up: {
        name: 'Crag Launcher',
        damage: 13,
        startup: 11,
        active: 8,
        recovery: 28,
        range: 58,
        height: 76,
        offsetY: -54,
        angle: -1.28,
        baseKnockback: 14,
        growth: 0.26
      },
      down: {
        name: 'Quake Sweep',
        damage: 11,
        startup: 10,
        active: 12,
        recovery: 24,
        range: 76,
        height: 30,
        offsetY: 18,
        angle: -0.02,
        baseKnockback: 11,
        growth: 0.18
      },
      special: {
        name: 'Meteor Ram',
        damage: 18,
        startup: 18,
        active: 14,
        recovery: 40,
        range: 90,
        height: 54,
        offsetY: -2,
        angle: -0.45,
        baseKnockback: 18,
        growth: 0.32
      }
    }
  },
  {
    id: 'mistral',
    name: 'Mistral',
    tagline: 'Très mobile, faible poids, gros jeu aérien.',
    color: '#c79cff',
    accent: '#7d4cff',
    stats: {
      speed: 6.9,
      airSpeed: 5.6,
      acceleration: 1.35,
      jump: 18.8,
      gravity: 0.72,
      fallSpeed: 15.5,
      weight: 0.84,
      size: 42
    },
    moves: {
      neutral: {
        name: 'Wind Slice',
        damage: 6,
        startup: 4,
        active: 7,
        recovery: 13,
        range: 62,
        height: 32,
        offsetY: -10,
        angle: -0.28,
        baseKnockback: 7,
        growth: 0.2
      },
      up: {
        name: 'Cyclone Lift',
        damage: 7,
        startup: 5,
        active: 12,
        recovery: 18,
        range: 56,
        height: 72,
        offsetY: -50,
        angle: -1.34,
        baseKnockback: 9,
        growth: 0.25
      },
      down: {
        name: 'Slipstream Cut',
        damage: 5,
        startup: 3,
        active: 11,
        recovery: 14,
        range: 70,
        height: 24,
        offsetY: 18,
        angle: -0.08,
        baseKnockback: 6,
        growth: 0.17
      },
      special: {
        name: 'Gale Kick',
        damage: 11,
        startup: 10,
        active: 16,
        recovery: 28,
        range: 78,
        height: 38,
        offsetY: -12,
        angle: -0.9,
        baseKnockback: 12,
        growth: 0.3
      }
    }
  }
];
