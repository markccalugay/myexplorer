import type {Stop} from './domain';
import {
  buildRouteKey,
  createRouteSnapshotFromResponse,
  type PersistedRoutePayload,
  type RoutingProxyRouteResponse,
} from './route';

const COMPUTE_ROUTE_PATH = '/routes/compute';

const normalizeBaseUrl = (baseUrl?: string) => baseUrl?.trim().replace(/\/+$/, '') ?? '';

export const isRoutingProxyConfigured = (baseUrl?: string) =>
  normalizeBaseUrl(baseUrl).length > 0;

export async function fetchRouteFromRoutingProxy(
  baseUrl: string,
  stops: Stop[],
  signal?: AbortSignal,
): Promise<PersistedRoutePayload> {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  if (!normalizedBaseUrl) {
    throw new Error('Routing proxy URL is not configured in app.json.');
  }

  const routeKey = buildRouteKey(stops);
  if (!routeKey) {
    throw new Error('At least two stops are required before requesting a route.');
  }

  const response = await fetch(`${normalizedBaseUrl}${COMPUTE_ROUTE_PATH}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      routeKey,
      stops: stops.map(stop => ({
        id: stop.id,
        name: stop.name,
        formattedAddress: stop.formattedAddress,
        location: stop.location,
      })),
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Routing proxy request failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as RoutingProxyRouteResponse;
  return createRouteSnapshotFromResponse(payload, routeKey);
}
