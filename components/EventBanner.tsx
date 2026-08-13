'use client';

import { useEffect, useState } from 'react';
import type { WorldEvent } from '../game/types';

export function EventBanner({ event }: { event: WorldEvent | null }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!event) return;
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), 5200);
    return () => window.clearTimeout(timer);
  }, [event?.id]);
  return visible && event ? <aside className="event-toast"><b>{event.title}</b><p>{event.description}</p></aside> : null;
}
