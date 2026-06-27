# Rift Clash

Prototype web de platform fighter local inspiré des codes du genre : dégâts en pourcentage, knockback évolutif, stocks, plateformes et blast zones.

## Lancer

```bash
npm install
npm run dev
```

Puis ouvrir l'URL affichée par Vite.

## Ajouter un personnage

Les combattants sont définis dans `src/characters.js`. Ajouter une entrée dans `fighters` avec :

- `id`, `name`, `tagline`, `color`, `accent`
- `stats` pour vitesse, poids, sauts, gravité
- `moves.neutral` et `moves.special` pour hitbox, dégâts, angle, knockback, cooldown

Aucun changement moteur n'est nécessaire pour ajouter un personnage simple.
