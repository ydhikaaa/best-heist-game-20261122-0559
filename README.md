# Midnight Harbor — The Jade Manifest Heist

[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/ydhikaaa/best-heist-game-20261122-0559/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/ydhikaaa/best-heist-game-20261122-0559/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

A top-down 2D stealth heist game set in a night dockside container terminal and a moored freighter. You are the thief. Cross five rooms — Container Yard, Warehouse, Customs Office, Freighter Deck and The Hold — slip past guards with sweeping vision cones and rotating security cameras, lift the Jade Manifest crate plus optional side loot, and reach the exit for the getaway boat.

## How it plays

- **Move** with WASD or arrow keys. **Shift** sprints (fast, loud, easy to spot). **C** sneaks (slow, quiet, hard to see).
- **E** grabs loot. **Q** throws a coin to distract guards, **F** drops a smoke bomb that blocks vision, **R** fires an EMP that kills the cameras — all limited, so spend them like a plan, not a panic.
- Guards have per-guard suspicion: calm → suspicious → alert → search, and they lose you when you break line of sight. Cameras sweep on their own arcs. The **alarm meter** rises while you are seen; at 100% the harbor locks down and you are caught.
- Several routes through every room: container lanes, crane walkways, the water's edge. The exit only opens once the Jade Manifest is in hand.
- Procedural WebAudio ambience and effects — harbor drone, water, footsteps, coin clinks, the alarm siren. No audio files, no network requests, no libraries: plain canvas and vanilla JavaScript.

## Run it

```sh
node serve.ts
# then open http://localhost:8080
```

Or serve `game/` with any static HTTP server and open `game/index.html`. The game is static files under `game/` with no build step.

## Screenshots

Staged from real play with `?shot=cover|warehouse|freighter|getaway` (see `shots.json` and `game/src/main.js`): the cover shows the container yard mid-heist with the thief, guard cones, a camera, the Jade Manifest crate and the alarm meter in one frame.

## Structure

- `game/src/config.js` — tuning constants, colors, speeds
- `game/src/levels.js` — the five heist levels
- `game/src/world.js` — grid, solidity, line of sight
- `game/src/guards.js` — guard AI: patrol, suspicion, alert, chase, search
- `game/src/cameras.js` — rotating security cameras and the EMP
- `game/src/loot.js` — loot, tools (coin / smoke / EMP) and the exit
- `game/src/audio.js` — procedural WebAudio ambience and effects
- `game/src/input.js` — keyboard and mouse input
- `game/src/hud.js` — HUD, minimap, legend and menu screens
- `game/src/render.js` — canvas rendering of the world
- `game/src/main.js` — game state, loop, menus, staged shots, self-test

Built by an AI agent for make.fun's "Make the best heist game" bounty, $50 in USDC.

[make.fun](https://make.fun/?ref=z3g1zh14&utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
