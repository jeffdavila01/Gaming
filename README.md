# Finger Strike

Hand-controlled shooting game restored from Fruit Flow. All game logic runs in your browser.

## Run

Right-click Gaming/index.html in VS Code and select Open with Live Server. If serving the parent project, visit http://127.0.0.1:5500/Gaming/index.html. Refresh with Ctrl + Shift + R after updates. Click Start Game, allow camera access and wait for the model; the round starts automatically. Mouse Demo Mode works without a webcam or model download.

## Controls

- Show your full hand for automatic target lock. Move your palm left/right to select enemies anywhere in the arena. The crosshair follows the target; after a hit it selects another.
- Pinch thumb/index to shoot; separate them to re-arm. Increase Pinch sensitivity if firing is difficult.
- Hold an open palm for 0.45 seconds to reload. On Game Over this restarts the round.
- Hold a closed fist for 0.7 seconds for a 3-second shield, with an 8-second cooldown.
- Uncheck Auto-lock for manual index-finger aiming.
- Mouse Demo: move to aim, click to fire, R reload, Space shield.
- Escape / Pause pauses or resumes. Restart resets the round.

A round lasts 90 seconds with 100 health and 12-shot magazines. Reload takes 0.65 seconds. Escaped enemies remove 20 health unless shielded. Spawns get faster over time. Game Over shows score and accuracy. Hits match visible rotated hexagons.

## Files and dependencies

index.html and style.css provide the interface. game.js handles enemies, hits, effects, audio and rounds. script.js connects controls and state. handTracking.js provides real MediaPipe landmarks, camera lifecycle and gestures.

MediaPipe JS/WASM are pinned to 0.10.21, using direct vision_bundle.mjs from jsDelivr with unpkg fallback. The official Google-hosted float16 Hand Landmarker model is downloaded on first use. GPU initialization falls back to CPU and the model is reused. Internet is needed for these downloads; camera frames are processed locally. Use localhost or HTTPS, not file://.

Tab switching pauses the round. Camera stop, switching to Mouse Demo and leaving the page stop webcam tracks. Hand loss clears target lock. Tracking depends on lighting, camera and hardware; actual webcam accuracy and a complete browser playthrough require manual verification. Syntax, DOM wiring and deterministic engine/control checks can be run with developer tooling.

Reload detection checks finger straightness and wrist distance, tolerates one relaxed finger and does not require a fully spread thumb. Middle and ring fingers must be extended and thumb/index separated. Brief pose noise up to 100 ms pauses progress; it does not count toward the 450 ms hold. One reload is triggered per hold. Release the pose before repeating. The camera preview shows hold progress.

Distance and two-hand controls: the camera now requests 1280x720 when available, and the minimum accepted hand size is smaller. Reload checks normalized finger geometry, allowing a visible open palm farther from the camera. Real distance remains limited by webcam resolution, lighting and model visibility. Both hands have independent gesture state and fire cooldowns, so simultaneous pinches fire two shots when at least two rounds remain. Each shot uses that hand position for auto-lock. The primary hand controls the displayed crosshair. Either hand can reload or activate shield. Ammo and reload are shared: shooting is blocked during the 0.65-second reload.

You can reload any partially used magazine (1-11 rounds remaining), not just an empty one. Use either open palm, Reload (R), or the R key in hand or mouse mode. Reload refills to 12 in 0.65 seconds; a full magazine needs no reload.
