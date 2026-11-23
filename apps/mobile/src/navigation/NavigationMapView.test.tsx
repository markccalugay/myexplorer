import React from 'react';
import {DeviceEventEmitter, NativeModules, Platform} from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import {NavigationMapView} from './NavigationMapView';

const EVENT_MAP_ZOOM_CHANGED = 'MyExplorerNavigationMapZoomChanged';

describe('NavigationMapView accessible zoom controls', () => {
  const originalOs = Platform.OS;

  afterEach(() => {
    jest.useRealTimers();
    Platform.OS = originalOs;
    delete (NativeModules as Record<string, unknown>).MyExplorerNavigation;
  });

  test('renders 48x48 accessible Zoom in / Zoom out controls with boundary disabled states', async () => {
    Platform.OS = 'android';
    const zoomMapMock = jest
      .fn()
      .mockResolvedValueOnce(
        JSON.stringify({available: true, zoom: 21, minZoom: 2, maxZoom: 21}),
      )
      .mockResolvedValueOnce(
        JSON.stringify({available: true, zoom: 2, minZoom: 2, maxZoom: 21}),
      );
    const getMapZoomStateMock = jest.fn().mockResolvedValue(
      JSON.stringify({available: true, zoom: 15, minZoom: 2, maxZoom: 21}),
    );

    (NativeModules as Record<string, unknown>).MyExplorerNavigation = {
      zoomMap: zoomMapMock,
      getMapZoomState: getMapZoomStateMock,
      addListener: jest.fn(),
      removeListeners: jest.fn(),
    };

    let renderer: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(<NavigationMapView />);
    });
    await ReactTestRenderer.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const zoomInBtn = renderer!.root.findByProps({accessibilityLabel: 'Zoom in'});
    const zoomOutBtn = renderer!.root.findByProps({accessibilityLabel: 'Zoom out'});

    expect(zoomInBtn.props.accessibilityRole).toBe('button');
    expect(zoomOutBtn.props.accessibilityRole).toBe('button');
    expect(zoomInBtn.props.disabled).toBe(false);
    expect(zoomOutBtn.props.disabled).toBe(false);
    expect(zoomInBtn.props.accessibilityState).toEqual({disabled: false});
    expect(zoomOutBtn.props.accessibilityState).toEqual({disabled: false});

    // Zoom in to maxZoom (21) -> Zoom in becomes disabled, Zoom out stays enabled
    await ReactTestRenderer.act(async () => {
      zoomInBtn.props.onPress();
      await Promise.resolve();
    });
    expect(zoomMapMock).toHaveBeenCalledWith(1);
    expect(
      renderer!.root.findByProps({accessibilityLabel: 'Zoom in'}).props.disabled,
    ).toBe(true);
    expect(
      renderer!.root.findByProps({accessibilityLabel: 'Zoom in'}).props
        .accessibilityState,
    ).toEqual({disabled: true});
    expect(
      renderer!.root.findByProps({accessibilityLabel: 'Zoom out'}).props
        .accessibilityState,
    ).toEqual({disabled: false});

    // Zoom out to minZoom (2) -> Zoom out becomes disabled, Zoom in becomes enabled
    await ReactTestRenderer.act(async () => {
      renderer!.root.findByProps({accessibilityLabel: 'Zoom out'}).props.onPress();
      await Promise.resolve();
    });
    expect(zoomMapMock).toHaveBeenCalledWith(-1);
    expect(
      renderer!.root.findByProps({accessibilityLabel: 'Zoom out'}).props.disabled,
    ).toBe(true);
    expect(
      renderer!.root.findByProps({accessibilityLabel: 'Zoom out'}).props
        .accessibilityState,
    ).toEqual({disabled: true});
    expect(
      renderer!.root.findByProps({accessibilityLabel: 'Zoom in'}).props
        .accessibilityState,
    ).toEqual({disabled: false});

    await ReactTestRenderer.act(async () => {
      renderer!.unmount();
    });
  });

  test('enables controls when map becomes ready after >500ms, syncs camera boundary changes, and cleans up on unmount', async () => {
    jest.useFakeTimers();
    Platform.OS = 'android';
    const removeListenersMock = jest.fn();

    (NativeModules as Record<string, unknown>).MyExplorerNavigation = {
      getMapZoomState: jest.fn().mockResolvedValue(
        JSON.stringify({available: false, zoom: 15, minZoom: 2, maxZoom: 21}),
      ),
      zoomMap: jest.fn(),
      addListener: jest.fn(),
      removeListeners: removeListenersMock,
    };

    let renderer: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(<NavigationMapView />);
    });
    await ReactTestRenderer.act(async () => {
      await Promise.resolve();
    });

    // Initially unavailable -> both disabled
    expect(
      renderer!.root.findByProps({accessibilityLabel: 'Zoom in'}).props.disabled,
    ).toBe(true);
    expect(
      renderer!.root.findByProps({accessibilityLabel: 'Zoom out'}).props.disabled,
    ).toBe(true);

    // Advance past 500ms without map ready -> still disabled
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(1200);
    });
    expect(
      renderer!.root.findByProps({accessibilityLabel: 'Zoom in'}).props.disabled,
    ).toBe(true);

    // Map becomes ready at 1200ms via native event -> buttons enable
    await ReactTestRenderer.act(async () => {
      DeviceEventEmitter.emit(
        EVENT_MAP_ZOOM_CHANGED,
        JSON.stringify({available: true, zoom: 14, minZoom: 2, maxZoom: 21}),
      );
    });
    expect(
      renderer!.root.findByProps({accessibilityLabel: 'Zoom in'}).props.disabled,
    ).toBe(false);
    expect(
      renderer!.root.findByProps({accessibilityLabel: 'Zoom out'}).props.disabled,
    ).toBe(false);

    // Camera reaches maxZoom (21) via pinch/double-tap -> Zoom in disabled; gesture back to 18.5 -> recovers
    await ReactTestRenderer.act(async () => {
      DeviceEventEmitter.emit(
        EVENT_MAP_ZOOM_CHANGED,
        JSON.stringify({available: true, zoom: 21, minZoom: 2, maxZoom: 21}),
      );
    });
    expect(
      renderer!.root.findByProps({accessibilityLabel: 'Zoom in'}).props
        .accessibilityState,
    ).toEqual({disabled: true});
    await ReactTestRenderer.act(async () => {
      DeviceEventEmitter.emit(
        EVENT_MAP_ZOOM_CHANGED,
        JSON.stringify({available: true, zoom: 18.5, minZoom: 2, maxZoom: 21}),
      );
    });
    expect(
      renderer!.root.findByProps({accessibilityLabel: 'Zoom in'}).props
        .accessibilityState,
    ).toEqual({disabled: false});

    // Camera reaches minZoom (2) -> Zoom out disabled; gesture back to 4.5 -> recovers
    await ReactTestRenderer.act(async () => {
      DeviceEventEmitter.emit(
        EVENT_MAP_ZOOM_CHANGED,
        JSON.stringify({available: true, zoom: 2, minZoom: 2, maxZoom: 21}),
      );
    });
    expect(
      renderer!.root.findByProps({accessibilityLabel: 'Zoom out'}).props
        .accessibilityState,
    ).toEqual({disabled: true});
    await ReactTestRenderer.act(async () => {
      DeviceEventEmitter.emit(
        EVENT_MAP_ZOOM_CHANGED,
        JSON.stringify({available: true, zoom: 4.5, minZoom: 2, maxZoom: 21}),
      );
    });
    expect(
      renderer!.root.findByProps({accessibilityLabel: 'Zoom out'}).props
        .accessibilityState,
    ).toEqual({disabled: false});

    // View destruction disables controls
    await ReactTestRenderer.act(async () => {
      DeviceEventEmitter.emit(
        EVENT_MAP_ZOOM_CHANGED,
        JSON.stringify({available: false, zoom: 15, minZoom: 2, maxZoom: 21}),
      );
    });
    expect(
      renderer!.root.findByProps({accessibilityLabel: 'Zoom in'}).props.disabled,
    ).toBe(true);

    // Unmount cleans up listener and ignores subsequent events without warnings
    await ReactTestRenderer.act(async () => {
      renderer!.unmount();
    });
    expect(removeListenersMock).toHaveBeenCalled();

    await ReactTestRenderer.act(async () => {
      DeviceEventEmitter.emit(
        EVENT_MAP_ZOOM_CHANGED,
        JSON.stringify({available: true, zoom: 12, minZoom: 2, maxZoom: 21}),
      );
    });
  });
});
