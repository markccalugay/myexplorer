import {
  canZoomIn,
  canZoomOut,
  clampZoomLevel,
  DEFAULT_MAP_ZOOM_STATE,
  parseMapZoomState,
} from './mapZoom';

describe('mapZoom helpers', () => {
  test('canZoomIn and canZoomOut enforce map availability and min/max zoom bounds', () => {
    expect(canZoomIn(DEFAULT_MAP_ZOOM_STATE)).toBe(false);
    expect(canZoomOut(DEFAULT_MAP_ZOOM_STATE)).toBe(false);

    const mid = {available: true, zoom: 14, minZoom: 2, maxZoom: 21};
    expect(canZoomIn(mid)).toBe(true);
    expect(canZoomOut(mid)).toBe(true);

    const atMax = {available: true, zoom: 21, minZoom: 2, maxZoom: 21};
    expect(canZoomIn(atMax)).toBe(false);
    expect(canZoomOut(atMax)).toBe(true);

    const atMin = {available: true, zoom: 2, minZoom: 2, maxZoom: 21};
    expect(canZoomIn(atMin)).toBe(true);
    expect(canZoomOut(atMin)).toBe(false);
  });

  test('clampZoomLevel and parseMapZoomState handle bounds and malformed payloads', () => {
    expect(clampZoomLevel(25, 2, 21)).toBe(21);
    expect(clampZoomLevel(-1, 2, 21)).toBe(2);
    expect(clampZoomLevel(12.5, 2, 21)).toBe(12.5);

    expect(
      parseMapZoomState(
        JSON.stringify({available: true, zoom: 16, minZoom: 3, maxZoom: 20}),
      ),
    ).toEqual({available: true, zoom: 16, minZoom: 3, maxZoom: 20});

    expect(parseMapZoomState('not-json')).toEqual(DEFAULT_MAP_ZOOM_STATE);
    expect(parseMapZoomState(null)).toEqual(DEFAULT_MAP_ZOOM_STATE);
  });
});
