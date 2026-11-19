# Red Horizon

An original 3D first-person alien-invasion game prototype. Cross an occupied city in an astronaut suit, recover three power cores, reach the last ship before its launch window closes, and escape to a small civilization on Mars. This is separate from the Strapsky inventory app.

## Play locally

In this folder, run:

```powershell
node server.js
```

Open `http://127.0.0.1:8000` in a desktop browser. Node.js is required. Three.js and fonts currently load from public CDNs, so an internet connection is needed.

## Controls

WASD move, mouse aim, left click fire, R reload, Shift sprint, E interact, M mute audio, Esc pause. Click **Begin Mission** to lock the pointer. If your browser does not support mouse lock, move the cursor to aim and click the game to fire.

## Current scope

The Earth level includes a clinic, a fallen signal relay, a crash site, abandoned vehicles, signs, ruined buildings, and three types of aliens. Combat has attack warnings, hit and death reactions, tracers, and synthesized sound. Recovering the third core starts a 120-second rush to the ship. The detailed alien asset has no skeleton or animation clips, so its movement and attack motion currently animate the whole model rather than individual limbs. This remains a playable prototype, not a finished game.
