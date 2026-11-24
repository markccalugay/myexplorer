import React from 'react';
import {DeviceEventEmitter, NativeModules, Platform} from 'react-native';
import ReactTestRenderer from 'react-test-renderer';

import type {Trip} from './domain';
import {buildPreTripMapModel} from './preTripMap';
import {PreTripMapView} from './PreTripMapView';
import {buildRouteKey} from './route';

const STOP_1 = {
  id: 's1',
  name: 'Manila',
  location: {lat: 14.5995, lng: 120.9842},
  type: 'start' as const,
};

const STOP_2 = {
  id: 's2',
  name: 'Tagaytay',
  location: {lat: 14.1153, lng: 120.9621},
  type: 'destination' as const,
};

const STOP_3 = {
  id: 's3',
  name: 'Nuvali',
  location: {lat: 14.239, lng: 121.057},
  type: 'stop' as const,
};

describe('buildPreTripMapModel', () => {
  test('updates markers when stops are added, removed, or reordered and filters invalid coordinates', () => {
    const base = buildPreTripMapModel({stops: [STOP_1, STOP_2]});
    expect(base.validStops.map(s => `${s.order}:${s.id}`)).toEqual([
      '1:s1',
      '2:s2',
    ]);
    expect(base.ignoredInvalidStopCount).toBe(0);

    const added = buildPreTripMapModel({stops: [STOP_1, STOP_3, STOP_2]});
    expect(added.validStops.map(s => `${s.order}:${s.id}`)).toEqual([
      '1:s1',
      '2:s3',
      '3:s2',
    ]);

    const invalidStop = {
      id: 'bad',
      name: 'Nowhere',
      location: {lat: 999, lng: Number.NaN},
      type: 'stop' as const,
    };
    const withInvalid = buildPreTripMapModel({
      stops: [STOP_1, invalidStop, STOP_2],
    });
    expect(withInvalid.validStops.map(s => s.id)).toEqual(['s1', 's2']);
    expect(withInvalid.ignoredInvalidStopCount).toBe(1);
    expect(withInvalid.encodedPolyline).toBeNull();
  });

  test('displays valid matching route snapshot and hides stale or unavailable snapshots', () => {
    const routeKey = buildRouteKey([STOP_1, STOP_2])!;
    const validTrip: Pick<Trip, 'stops' | 'routeSnapshot'> = {
      stops: [STOP_1, STOP_2],
      routeSnapshot: {
        source: 'routing-proxy',
        provider: 'google-routes',
        routeKey,
        refreshedAt: '2026-11-24T00:00:00.000Z',
        totalDistanceMeters: 60000,
        totalDurationMillis: 3600000,
        encodedPolyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
        legs: [{distanceMeters: 60000, durationMillis: 3600000}],
      },
    };

    const validModel = buildPreTripMapModel(validTrip);
    expect(validModel.routeOverlayStatus).toBe('valid');
    expect(validModel.encodedPolyline).toBe('_p~iF~ps|U_ulLnnqC_mqNvxq`@');

    // Stale after stop reorder/addition
    const staleModel = buildPreTripMapModel({
      ...validTrip,
      stops: [STOP_1, STOP_3, STOP_2],
    });
    expect(staleModel.routeOverlayStatus).toBe('stale');
    expect(staleModel.encodedPolyline).toBeNull();
    expect(staleModel.routeOverlayMessage).toContain('stale');

    // Unavailable when no snapshot exists
    const unavailableModel = buildPreTripMapModel(
      {stops: [STOP_1, STOP_2]},
      {status: 'error', message: 'Routing proxy timed out.'},
    );
    expect(unavailableModel.routeOverlayStatus).toBe('unavailable');
    expect(unavailableModel.encodedPolyline).toBeNull();
    expect(unavailableModel.routeOverlayMessage).toBe(
      'Routing proxy timed out.',
    );
  });
});

describe('PreTripMapView component', () => {
  const originalOs = Platform.OS;

  afterEach(() => {
    Platform.OS = originalOs;
    delete (NativeModules as Record<string, unknown>).MyExplorerNavigation;
  });

  test('renders Android pre-trip map, handles zoom readiness, and updates marker/route status', async () => {
    Platform.OS = 'android';
    const zoomPreTripMap = jest.fn().mockResolvedValue(
      JSON.stringify({available: true, zoom: 16, minZoom: 2, maxZoom: 21}),
    );
    const getPreTripMapZoomState = jest.fn().mockResolvedValue(
      JSON.stringify({available: false, zoom: 15, minZoom: 2, maxZoom: 21}),
    );
    (NativeModules as Record<string, unknown>).MyExplorerNavigation = {
      zoomPreTripMap,
      getPreTripMapZoomState,
      addListener: jest.fn(),
      removeListeners: jest.fn(),
    };

    let tree!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(
        <PreTripMapView trip={{stops: [STOP_1, STOP_2]}} />,
      );
      await Promise.resolve();
    });

    expect(
      tree.root.findByProps({testID: 'pre-trip-map-loading'}),
    ).toBeTruthy();
    expect(
      tree.root.findByProps({testID: 'pre-trip-zoom-in-btn'}).props.disabled,
    ).toBe(true);
    expect(
      tree.root.findByProps({testID: 'pre-trip-map-markers-status'}).props
        .children,
    ).toEqual(['Markers: ', 2, ' valid stop', 's', '']);

    // Map becomes ready via native event
    await ReactTestRenderer.act(async () => {
      DeviceEventEmitter.emit(
        'MyExplorerPreTripMapZoomChanged',
        JSON.stringify({available: true, zoom: 15, minZoom: 2, maxZoom: 21}),
      );
    });

    expect(
      tree.root.findByProps({testID: 'pre-trip-zoom-in-btn'}).props.disabled,
    ).toBe(false);

    await ReactTestRenderer.act(async () => {
      tree.root.findByProps({testID: 'pre-trip-zoom-in-btn'}).props.onPress();
      await Promise.resolve();
    });
    expect(zoomPreTripMap).toHaveBeenCalledWith(1);
  });

  test('handles unavailable native platform gracefully without crashing', async () => {
    Platform.OS = 'ios';
    let tree!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(
        <PreTripMapView trip={{stops: [STOP_1]}} />,
      );
    });
    expect(
      tree.root.findByProps({testID: 'pre-trip-map-unavailable'}),
    ).toBeTruthy();
  });
});
