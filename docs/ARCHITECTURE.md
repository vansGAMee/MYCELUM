# Architecture

The rules engine is authoritative. React and PixiJS project its state; neither owns gameplay truth.

- `game/config.ts`: balance, eras, species, and render constants.
- `game/rng.ts`: deterministic gameplay PRNG and noise.
- `game/world.ts`: lazy chunk generation, ownership, visibility, and predictions.
- `game/engine.ts`: actions and the turn pipeline.
- `game/squares.ts`: deterministic geometric detection and chains.
- `game/spread.ts`: source-addressed enemy intents and validation.
- `game/events.ts`: the eight substrate events.
- `game/save.ts`: versioned localStorage persistence.
- `game/multiplayer.ts`: room-code P2P transport and host-authoritative action validation.
- `render/`: camera, viewport culling, LOD, pooled effects, and Pixi projection.
- `components/`: menu, HUD, contextual overlays, and modals.

Gameplay randomness uses the engine PRNG. Cosmetic particles may vary. Saves contain logical cells and stable run data, never animation objects.

Online uses Trystero over WebRTC/Nostr plus BroadcastChannel for same-browser testing. It requires no application secret. The host owns resolution; the guest sends intended actions. Advanced reconnect and matchmaking are intentionally out of scope.
