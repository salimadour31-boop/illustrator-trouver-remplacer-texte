# TrouverRemplacerTexte.jsx

**FR** — Recherche et remplacement de texte dans Adobe Illustrator (tous les `TextFrame`), avec dialogue ScriptUI bilingue FR/EN.

**EN** — Find and replace text in Adobe Illustrator (all `TextFrame`s), with a bilingual FR/EN ScriptUI dialog.

## Fonctionnalités

- Champs **Rechercher** / **Remplacer**
- Options : sensible à la casse ; portée = document entier, calque actif, ou sélection (textes sélectionnés ou contenus dans la sélection)
- Bouton **Compter** : affiche le nombre d'occurrences sans modifier le document
- Bouton **Remplacer tout** : applique les remplacements (chaque modification de `.contents` peut être un pas d'annulation distinct — plusieurs Ctrl+Z / Cmd+Z peuvent être nécessaires)
- Ignore les textes et calques verrouillés (compteur « ignorés »)
- Messages clairs si aucun document, aucun texte, ou chaîne de recherche vide
- Aucun appel réseau, aucune collecte de données
- Code 100 % original, compatible ExtendScript ES3

## Installation

1. **Fichier > Scripts > Autre script…** puis choisir `TrouverRemplacerTexte.jsx`
2. Ou copier le fichier dans le dossier Presets/Scripts d'Illustrator, puis relancer Illustrator (le script apparaît dans **Fichier > Scripts**)

## Usage

1. Ouvrir un document Illustrator
2. Lancer le script
3. Saisir la chaîne à rechercher (et éventuellement le remplacement)
4. Choisir la portée et l'option de casse
5. **Compter** pour vérifier, puis **Remplacer tout**

Conseil : travaillez sur une **copie** de votre fichier.

## Compatibilité

- Cible : Adobe Illustrator **CC 2018–2026**
- Statut : **non testé dans Illustrator** (syntaxe ES3 vérifiée avec acorn)

## Licence

MIT — Copyright (c) 2026 Amirouche Amwanes
