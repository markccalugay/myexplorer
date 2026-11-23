export interface MapZoomState {
  available: boolean;
  zoom: number;
  minZoom: number;
  maxZoom: number;
}

export const DEFAULT_MAP_ZOOM_STATE: MapZoomState = {
  available: false,
  zoom: 15,
  minZoom: 2,
  maxZoom: 21,
};

const ZOOM_EPSILON = 0.01;

export function clampZoomLevel(
  zoom: number,
  minZoom: number,
  maxZoom: number,
): number {
  if (!Number.isFinite(zoom)) {
    return minZoom;
  }
  return Math.min(Math.max(zoom, minZoom), maxZoom);
}

export function canZoomIn(state: MapZoomState): boolean {
  return state.available && state.zoom < state.maxZoom - ZOOM_EPSILON;
}

export function canZoomOut(state: MapZoomState): boolean {
  return state.available && state.zoom > state.minZoom + ZOOM_EPSILON;
}

export function parseMapZoomState(raw: string | null | undefined): MapZoomState {
  if (!raw) {
    return DEFAULT_MAP_ZOOM_STATE;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<MapZoomState>;
    const minZoom =
      typeof parsed.minZoom === 'number' && Number.isFinite(parsed.minZoom)
        ? parsed.minZoom
        : DEFAULT_MAP_ZOOM_STATE.minZoom;
    const maxZoom =
      typeof parsed.maxZoom === 'number' &&
      Number.isFinite(parsed.maxZoom) &&
      parsed.maxZoom >= minZoom
        ? parsed.maxZoom
        : DEFAULT_MAP_ZOOM_STATE.maxZoom;
    const zoom =
      typeof parsed.zoom === 'number' && Number.isFinite(parsed.zoom)
        ? clampZoomLevel(parsed.zoom, minZoom, maxZoom)
        : DEFAULT_MAP_ZOOM_STATE.zoom;
    return {
      available: Boolean(parsed.available),
      zoom,
      minZoom,
      maxZoom,
    };
  } catch {
    return DEFAULT_MAP_ZOOM_STATE;
  }
}
