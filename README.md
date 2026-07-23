![GitHub Latest Version](https://img.shields.io/github/v/release/DonHuberto/l5r5e-tactical-grid?sort=semver)
![GitHub Latest Release](https://img.shields.io/github/downloads/DonHuberto/l5r5e-tactical-grid/latest/aedifs-tactical-grid.zip)
![GitHub All Releases](https://img.shields.io/github/downloads/DonHuberto/l5r5e-tactical-grid/total)

# FoundryVTT - Tactical Grid for L5R5e

This repository is DonHuberto's L5R5e-focused fork of Aedif's Tactical Grid. It deliberately keeps the
`aedifs-tactical-grid` module ID and replaces the upstream package, so do not enable both implementations.
Install this fork once from:

`https://github.com/DonHuberto/l5r5e-tactical-grid/releases/latest/download/module.json`

The fork preserves Aedif's authorship and GPL-3.0 license. It adds native integration with the public
`game.l5r5e.rangeBands` API supplied by L5R5e system 1.14.105 or newer.

# Features
- Item & Token range highlighting
- Distance measurements to Tokens during:
   - Token drag/hover
   - Ruler drag
   - Keybind press (`H` by default)
- Integration with cover modules
- Grid toggling and selective display
  - Visually toggle the game grid on/off via keybinds (`G` and `Shift+G` by default)
  - Display the grid only around hovered over or controlled placeables

## Range Highlighting

For L5R5e, hovering a readied weapon shows the active grip's maximum range and shades the area below its
minimum range. Weapon and technique hovers on actor sheets, Argon HUD buttons, and supported item macros use
the same range snapshot. Distance labels use `Range N`; Tactical Grid does not decide attack legality or
spend movement.

![rangeHighlight](https://github.com/user-attachments/assets/cfc7daf5-f236-4218-ae28-d01d853f4fda)

## Distance Measurement

![distanceMeasure](https://github.com/user-attachments/assets/ca52c8f9-954c-460a-9d48-eff4dc80eb9c)

## Grid Toggling

![gridToggle](https://github.com/user-attachments/assets/e7fd74e3-3299-48e4-bb8b-c382e80b352b)

## Cover Integration

![cover](https://github.com/user-attachments/assets/d8407ce6-43b5-46d7-98db-38fc32d5548f)

## @DEVs

The [upstream wiki](https://github.com/Aedif/tactical-grid/wiki) documents the original module architecture.
