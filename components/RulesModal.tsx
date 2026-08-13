'use client';

export function RulesModal({ onClose }: { onClose: () => void }) {
  const rules = [
    ['Goal', 'Protect your Core and survive. A hostile capture ends the run.'],
    ['Reveal', 'Open hidden cells touching your colony. Hover to see the real seeded likelihoods.'],
    ['Attack', 'Click adjacent enemies. More nearby allies improve your odds. Every attempt spends the turn.'],
    ['Squares', 'Close a same-color 3×3 or larger perimeter to claim and reinforce its interior.'],
    ['Repaint', 'A guaranteed adjacent conversion. Charges are limited to 3; large squares restore one.'],
    ['Enemies', 'Thin tendrils show important actions before they resolve. Remove the real source to cancel one.'],
    ['Defeat', 'An enemy captures your Core. There are no shields or hidden Core health.'],
  ];
  return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="rules-title">
    <section className="modal">
      <header className="modal-head"><h2 id="rules-title">How to play</h2><button className="icon-button" onClick={onClose} aria-label="Close">Close</button></header>
      <div className="rules-grid">{rules.map(([title, copy]) => <div key={title} style={{ display: 'contents' }}><b>{title}</b><p>{copy}</p></div>)}</div>
    </section>
  </div>;
}
