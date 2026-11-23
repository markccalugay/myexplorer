import React from 'react';
import {NativeModules, Platform} from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import {NavigationMapView} from './NavigationMapView';

describe('NavigationMapView accessible zoom controls', () => {
  const originalOs = Platform.OS;

  afterEach(() => {
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
    expect(zoomInBtn.props.accessibilityState).toEqual({disabled: false});
    expect(zoomOutBtn.props.accessibilityState).toEqual({disabled: false});

    // Zoom in to maxZoom (21) -> Zoom in becomes disabled, Zoom out stays enabled
    await ReactTestRenderer.act(async () => {
      zoomInBtn.props.onPress();
      await Promise.resolve();
    });
    expect(zoomMapMock).toHaveBeenCalledWith(1);
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

  test('disables zoom buttons when map is not yet available', async () => {
    Platform.OS = 'android';
    (NativeModules as Record<string, unknown>).MyExplorerNavigation = {
      getMapZoomState: jest.fn().mockResolvedValue(
        JSON.stringify({available: false, zoom: 15, minZoom: 2, maxZoom: 21}),
      ),
    };

    let renderer: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(<NavigationMapView />);
    });
    await ReactTestRenderer.act(async () => {
      await Promise.resolve();
    });

    expect(
      renderer!.root.findByProps({accessibilityLabel: 'Zoom in'}).props
        .accessibilityState,
    ).toEqual({disabled: true});
    expect(
      renderer!.root.findByProps({accessibilityLabel: 'Zoom out'}).props
        .accessibilityState,
    ).toEqual({disabled: true});
    await ReactTestRenderer.act(async () => {
      renderer!.unmount();
    });
  });
});
