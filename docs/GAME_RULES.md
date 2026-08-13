# Game rules

This is the canonical player-rule reference.

## Goal

Protect the Core and survive for as many turns as possible. Solo has one loss condition: a hostile species captures the Core.

## Turn

Take exactly one main action: Reveal, Attack, or Repaint. The engine then resolves square chains, validates enemy intents, resolves valid intents, applies a scheduled event, generates the next intents, and saves.

## Reveal

A hidden cell is revealable when it touches player territory in any of eight directions. Hover shows probabilities derived from the seeded biome; hover never rerolls. A matching natural family joins the player. Another family becomes an active hostile cell.

## Attack

Any visible adjacent hostile cell is a normal Attack target. Chance is `30% + 20% per additional allied support - 15% per additional defending support`, with reinforcement modifiers and a `10–95%` clamp. Success converts the target; failure leaves it hostile. Both spend the turn.

## Repaint

Repaint guarantees conversion of one adjacent visible hostile non-Core cell. It starts at `2/3`. A player `4×4` or larger square restores one charge, capped at `3/3`.

## Squares

A same-family square perimeter of `3×3` or larger claims, reveals, and reinforces its interior. Filled cells resolve further completed squares deterministically. Mutations remain members of their parent family.

## Intents and Core danger

Thin colored tendrils announce important hostile actions before they resolve. Each intent stores a real source, source family, target, type, chance, and creation turn. Invalid sources or targets remove the intent immediately. `CORE IN DANGER` appears only for a currently valid hostile intent targeting the Core.

## Visibility

Territory counts claimed ownership, not perception. Fog and Cosmic Snap can obscure information without deleting ownership. Clicking a Snap-hidden known cell inspects it without spending the main action.

## Events

Every ten turns the substrate produces Dense Fog, Cosmic Snap, Spore Rain, Bloom Tide, Drought, Mutation Surge, Dead Patch, or Resonance. The event name is warned two turns ahead.
