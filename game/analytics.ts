export type AnalyticsEvent = 'game_start' | 'tutorial_complete' | 'run_end' | 'daily_start' | 'share_result' | 'online_room_created' | 'online_match_end';

export interface AnalyticsProvider { track(event: AnalyticsEvent, data?: Record<string, string | number | boolean>): void; }
export class NoopAnalyticsProvider implements AnalyticsProvider { track(_event: AnalyticsEvent, _data?: Record<string, string | number | boolean>): void {} }
export const analytics: AnalyticsProvider = new NoopAnalyticsProvider();
