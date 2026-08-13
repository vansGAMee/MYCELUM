# Monetization adapter

The game ships with `NoopAdProvider`, so no empty slot, request, error, or layout shift appears without configuration.

`game/monetization.ts` defines `menu`, `post_run`, `post_match`, and `rewarded_optional` placements. A future provider can implement `AdProvider.show()` and replace the exported instance. Safe placements are the restrained menu, post-run, and post-match surfaces. Ads must never interrupt a turn, block Reveal/Attack, or grant an online advantage.

Potential optional variables:

```text
NEXT_PUBLIC_AD_PROVIDER=none
NEXT_PUBLIC_AD_CLIENT_ID=
NEXT_PUBLIC_AD_SLOT_MENU=
NEXT_PUBLIC_AD_SLOT_POST_RUN=
NEXT_PUBLIC_AD_SLOT_POST_MATCH=
NEXT_PUBLIC_SUPPORT_URL=
```

Ad-network review, consent, regional policy, and account approval remain external responsibilities. `game/analytics.ts` similarly exports a no-op event interface with no SaaS dependency.
