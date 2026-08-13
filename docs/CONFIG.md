# Configuration

Balance and visual constants live in `game/config.ts`.

Important values:

- starting/max Repaint: `2 / 3`
- attack: `30%` base, `+20%` allied support, `-15%` defender support, `10–95%` clamp
- squares: `3×3` through `12×12` detection window
- events: every `10` turns
- chunks: `16×16`
- zoom: `0.25–2.5`
- particles: bounded at `160`

No environment variable is required. Optional future commercial configuration is described in `MONETIZATION.md`.
