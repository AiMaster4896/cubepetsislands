# Cube Pets Islands

A tap-only 3D island game for toddlers (age 2–4). Runs in the browser on phones and tablets — no install, no accounts, no network after first load.

**Play:** open `index.html` from any static host (GitHub Pages works). On iPad/iPhone, "Add to Home Screen" for a full-screen experience.

## What's in it

- **Four islands** to pick from: Sunny Farm, Pumpkin Patch (Halloween, night-time), Forest Camp, Beach Island — plus **her own farm**, where every animal she has met comes to live, and a little girl walks around visiting them (tap her to wave, tap an animal to call her over).
- **Players**: several children can play on the same device; each has their own name, avatar, stars, animals and home. Progress is saved on the device only (no accounts, no network).
- **At home**: tap the ground to walk, tap an animal to say hello (hearts), bucket → feed an animal, flower → plant flowers that stay forever, star → party, sun → night (animals sleep) and back to morning, house → call everyone to the garden, tap a cloud → rain and a rainbow.
- **Stars**: one per completed round, shown top-right and kept forever.
- **Free play**: tap any animal to hear it and see it jump; tap the windmill, the glowing pumpkins, the boat.
- **Learning rounds** start by themselves after a few seconds of free play and rotate between:
  - *Find the animal* — "Where is the cow?" (the other animals hide; 2–4 choices, adapts to her)
  - *Colours* — "Tap the red balloon"
  - *Counting* — tap 2–5 pumpkins / hay bales / rocks, counted aloud
  - *Big & small* — "Tap the big tree"
- **No failure**: a wrong tap wobbles and repeats the question. Every round ends in confetti.
- **Rewards**: every 6 stars a new animal arrives (the progress dots and the animal's picture sit under the star counter). It walks onto the island she's on and moves into her home. Every animal she has met appears in the sticker book (top-right button on the island screen).
- **Grown-ups panel**: hold a finger on the bottom-left corner for 2 seconds. Toggle voice/sounds/modes, rounds per visit, reset progress.
- **PWA**: add to home screen on iPad/iPhone for full-screen, offline play.

## Voice prompts

Prompts use the device's speech synthesis. To use your own voice instead, record MP3s into `assets/audio/` and list their keys in `assets/audio/clips.json`, e.g. `["find-cow", "colour-red", "count-3", "praise"]`. Keys are the first argument of every `say()` call in `js/game.js` and `js/main.js`.

## Adding an island

Copy one of the files in `maps/`, change tiles/props/pets, and add it to `MAPS` in `js/main.js` and `MINI` in `js/hub.js`.

## Run locally

Any static server works, e.g. `python3 -m http.server 8000` then open `http://localhost:8000`.
No build step.

## Structure

```
index.html          entry, import map
css/style.css       overlay + mobile hardening
js/main.js          renderer, camera fit, hub/island switching, input, loop
js/hub.js           island picker (mini islands)
js/home.js          the child's own farm: generated from her collection, girl behaviour
js/girl.js          the girl character built from boxes
js/world.js         builds an island from a map JSON; slot tracking for spawns
js/game.js          learning rounds (find / colour / count / size), rewards, unlocks
js/hud.js           prompt card, cheer overlay, sticker book, grown-ups panel
js/hex.js           axial hex grid maths
js/pets.js          pet behaviour (idle, jump, wobble, hide/show)
js/assets.js        GLB loader with cache
js/thumbs.js        renders model thumbnails for the HUD
js/effects.js       sparkles and confetti
js/audio.js         synthesized sounds + speech (Web Audio / Web Speech)
js/storage.js       progress in localStorage
maps/*.json         island definitions (tiles, props, lights, pets, unlocks)
manifest.json, sw.js  PWA
assets/models/      Kenney GLB models + colormap textures
vendor/             three.js r170 + GLTFLoader
```

### Map format

```json
{ "fill": { "radius": 3, "inner": "hex/grass", "outer": "hex/water" },
  "tiles": [ { "q": 1, "r": -1, "m": "hex/building-farm", "rot": 3 } ],
  "props": [ { "q": 0, "r": -1, "m": "forest/tree", "dx": 0.3, "s": 0.55 } ],
  "pets":  [ { "q": 0, "r": 0, "id": "cow" } ] }
```

`q`,`r` are axial hex coordinates; `rot` is in 60° steps; `dx`/`dz` are offsets within the tile.

## Credits

3D models by [Kenney](https://kenney.nl) (Cube Pets, Hexagon Kit, Graveyard Kit, Mini Forest) — CC0 1.0.
Rendering by [three.js](https://threejs.org) — MIT.
