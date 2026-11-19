# Red Horizon

An original 3D first-person alien-invasion game prototype. Cross an occupied city in an astronaut suit, recover three power cores, reach the last ship before its launch window closes, and escape to a small civilization on Mars. This is separate from the Strapsky inventory app.

## Play locally

In this folder, run:

```powershell
node server.js
```

Open `http://127.0.0.1:8000` in a desktop browser. Node.js is required. Three.js and fonts currently load from public CDNs, so an internet connection is needed.

## Controls

WASD move, mouse aim, click to fire, hold to fire automatic weapons, R reload, Shift sprint, E interact or pick up, 1–5 switch owned weapons, M mute audio, Esc pause. After finding the optic module, hold right mouse or press Q to aim; Q toggles aiming for touchpad users. Click **Begin Mission** to lock the pointer. If your browser does not support mouse lock, move the cursor to aim and click the game to fire.

The relay power core is in the open southwest of the fallen mast. Use **Test Sound** on the start screen to check browser audio; the status confirms whether the browser's audio engine started. If that status says audio is ready but you hear nothing, check your device and browser volume. On a Windows laptop, touchpad palm rejection can pause mouse input briefly after keyboard movement; increasing touchpad sensitivity in Windows settings can help.

## Current scope

The Earth level includes a clinic, a fallen signal relay, a crash site, abandoned vehicles, signs, ruined buildings, and four types of aliens. A blocked central street leads to a roofless service passage on the west and a walk-through repair garage on the east; both routes are marked with signs and lead toward the later cores. Stalkers pursue steadily; runners flank and dash after a brief warning; brutes telegraph a wide slam; spitters strafe at range and fire projectiles after a visible charge. Spitters begin appearing after a core is recovered. Up to three nearby aliens use a rigged model with walk and run animations; more distant aliens use lighter models with distinct skin, armor, fins, and glands by type. All aliens have consistent head, torso, arm, and leg hitboxes; any body hit deals damage, with a bonus for headshots. Four weapon caches along the route unlock an assault rifle, shotgun, sniper rifle, and minigun; the player starts with a pistol. Three optional field caches off the main route add an optic for zoom and tighter aimed shots, 50% more magazine capacity, and 25% more weapon damage; these upgrades apply to owned and later weapons. Each weapon has its own ammo, fire rate, damage, spread, recoil, tracer, textured model, and synthesized sound. Recovering the third core starts a 120-second rush to the ship. This remains a playable prototype, not a finished game.

Taking the clinic core triggers an alarm and an ambush around its exits. At the ship, press E with all three cores to start an 18-second power-up. Stay within the marked ring to charge it while three attack waves arrive; leaving the ring pauses charging. When the ship is ready, press E again to board before the launch timer expires.
