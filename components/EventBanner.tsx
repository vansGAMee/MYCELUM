'use client';

import { useEffect, useState } from 'react';
import type { WorldEvent } from '../game/types';

export function EventBanner({ event, suppressed = false }: { event: WorldEvent | null; suppressed?: boolean }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!event || suppressed) { setVisible(false); return; }
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), 5200);
    return () => window.clearTimeout(timer);
  }, [event?.id, suppressed]);
  return visible && event ? <aside className="event-toast"><b>{event.title}</b><p>{event.description}</p></aside> : null;
}
