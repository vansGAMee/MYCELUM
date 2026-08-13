# Deploy to Vercel

1. Push the repository to GitHub.
2. Import it in Vercel.
3. Let Vercel detect Next.js and use `npm run build`.
4. Add no environment variables for the base game.
5. Deploy.

There is no database, authentication service, required secret, or runtime API. Core play and local saves run entirely in the browser. P2P availability still depends on both players' browser/network WebRTC support.
