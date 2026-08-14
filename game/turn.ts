import type { TurnServerConfig } from '@trystero-p2p/core';

export interface PublicTurnEnvironment {
  credentialsUrl?: string;
  turnUrl?: string;
  turnUsername?: string;
  turnCredential?: string;
}

export type ResolvedTurnConfiguration =
  | { mode: 'rtc'; iceServers: RTCIceServer[]; warning?: string }
  | { mode: 'turn'; turnServers: TurnServerConfig[]; warning?: string }
  | { mode: 'none'; warning?: string };

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

const TURN_FETCH_TIMEOUT_MS = 6_000;
const ALLOWED_ICE_SCHEMES = ['stun:', 'stuns:', 'turn:', 'turns:'];

function clean(value: string | undefined): string | undefined {
  const result = value?.trim();
  return result || undefined;
}

function validIceUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 512) return false;
  return ALLOWED_ICE_SCHEMES.some((scheme) => value.startsWith(scheme));
}

function parseIceServer(value: unknown): RTCIceServer | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Record<string, unknown>;
  const urls = Array.isArray(candidate.urls)
    ? candidate.urls.filter(validIceUrl)
    : validIceUrl(candidate.urls) ? candidate.urls : null;
  if (!urls || (Array.isArray(urls) && urls.length === 0)) return null;

  const server: RTCIceServer = { urls };
  if (typeof candidate.username === 'string') server.username = candidate.username;
  if (typeof candidate.credential === 'string') server.credential = candidate.credential;
  return server;
}

export function parseIceServers(payload: unknown): RTCIceServer[] {
  const list = Array.isArray(payload)
    ? payload
    : payload && typeof payload === 'object' && Array.isArray((payload as { iceServers?: unknown }).iceServers)
      ? (payload as { iceServers: unknown[] }).iceServers
      : [];
  return list.slice(0, 16).map(parseIceServer).filter((server): server is RTCIceServer => server !== null);
}

function hasTurnServer(servers: RTCIceServer[]): boolean {
  return servers.some(({ urls }) => (Array.isArray(urls) ? urls : [urls]).some((url) => url.startsWith('turn:') || url.startsWith('turns:')));
}

export function buildStaticTurnConfig(environment: PublicTurnEnvironment): TurnServerConfig[] | null {
  const urls = clean(environment.turnUrl)?.split(',').map((url) => url.trim()).filter(validIceUrl)
    .filter((url) => url.startsWith('turn:') || url.startsWith('turns:'));
  const username = clean(environment.turnUsername);
  const credential = clean(environment.turnCredential);
  if (!urls?.length || !username || !credential) return null;
  return [{ urls: urls.length === 1 ? urls[0] : urls, username, credential }];
}

export function readPublicTurnEnvironment(): PublicTurnEnvironment {
  return {
    credentialsUrl: process.env.NEXT_PUBLIC_METERED_TURN_CREDENTIALS_URL,
    turnUrl: process.env.NEXT_PUBLIC_TURN_URL,
    turnUsername: process.env.NEXT_PUBLIC_TURN_USERNAME,
    turnCredential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
  };
}

export function hasPublicTurnConfiguration(environment = readPublicTurnEnvironment()): boolean {
  return Boolean(clean(environment.credentialsUrl) || buildStaticTurnConfig(environment));
}

export async function resolveTurnConfiguration(
  environment = readPublicTurnEnvironment(),
  fetcher: FetchLike = fetch,
): Promise<ResolvedTurnConfiguration> {
  const credentialsUrl = clean(environment.credentialsUrl);
  if (credentialsUrl) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TURN_FETCH_TIMEOUT_MS);
    try {
      const response = await fetcher(credentialsUrl, { cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error(`TURN credentials request failed with HTTP ${response.status}`);
      const iceServers = parseIceServers(await response.json());
      if (!hasTurnServer(iceServers)) throw new Error('TURN credentials response contains no TURN server');
      return { mode: 'rtc', iceServers };
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      const staticTurn = buildStaticTurnConfig(environment);
      if (staticTurn) return {
        mode: 'turn',
        turnServers: staticTurn,
        warning: `Не удалось получить временную TURN-конфигурацию; используется статическая: ${detail}`,
      };
      return { mode: 'none', warning: `Не удалось получить TURN-конфигурацию: ${detail}` };
    } finally {
      clearTimeout(timeout);
    }
  }

  const staticTurn = buildStaticTurnConfig(environment);
  if (staticTurn) return { mode: 'turn', turnServers: staticTurn };

  const hasPartialStaticConfig = Boolean(clean(environment.turnUrl) || clean(environment.turnUsername) || clean(environment.turnCredential));
  return {
    mode: 'none',
    warning: hasPartialStaticConfig ? 'Статическая TURN-конфигурация заполнена не полностью.' : undefined,
  };
}
