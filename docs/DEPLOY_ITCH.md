# Deploy to itch.io

```bash
npm install
npm run build:itch
```

Zip the **contents** of `out/` so `index.html` is at the archive root. Upload it as an HTML game, enable browser embedding, and allow fullscreen. A `1200×750` viewport is a good starting size; responsive scaling is supported.

Before publishing, test a solo run, local save/continue, challenge links, fullscreen, and P2P from the itch embed. WebRTC can be restricted by browser privacy or embed policy, so confirm it on the final itch page. Pricing and donations are configured on itch.io.
