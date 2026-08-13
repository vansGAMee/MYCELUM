# MYCELIUM

A living territory strategy about prediction, geometry, and pressure.

Reveal uncertain cells.

Attack neighboring colonies.

Close same-color squares to claim territory.

Read enemy intentions.

Protect your Core.

Solo survival + lightweight P2P 1v1. No account or database required.

## Run

```bash
npm install
npm run dev
npm test
npm run build
npm run build:itch
```

The base game needs no environment variables, backend, database, authentication, or API key.

## Rules in one minute

- Reveal a hidden cell touching your territory. Hover first to read its seeded species forecast.
- Attack any adjacent revealed hostile cell. Local allied support raises the displayed chance.
- Repaint guarantees one adjacent hostile conversion. Charges begin at `2/3` and never exceed `3/3`.
- Close a same-family square perimeter of `3×3` or larger to claim and reinforce its interior. Fills can chain.
- Enemy tendrils announce valid intents. Capturing their real source cancels them immediately.
- A hostile capture of your Core ends the run.

See [game rules](docs/GAME_RULES.md), [architecture](docs/ARCHITECTURE.md), [Vercel deployment](docs/DEPLOY_VERCEL.md), and [itch.io deployment](docs/DEPLOY_ITCH.md).
