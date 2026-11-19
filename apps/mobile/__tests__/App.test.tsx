/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {Platform, Text} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import App, {NativePlannerScreen} from '../App';

jest.mock('../src/web/appInfo', () => {
  const actual = jest.requireActual('../src/web/appInfo');
  return {
    ...actual,
    getRuntimeAppInfo: jest.fn(async () => ({
      packageName: 'com.thestillfoundation.myexplorer',
      versionName: '1.0',
      versionCode: 4,
    })),
  };
});

jest.mock('../src/web/MyExplorerWebView', () => {
  const ReactActual = require('react');
  const {View: MockView} = require('react-native');
  return {
    MyExplorerWebView: ReactActual.forwardRef((props: any, ref: any) => {
      ReactActual.useImperativeHandle(ref, () => ({
        goBack: jest.fn(),
        reload: jest.fn(),
        resolveGeolocation: jest.fn(),
        exportTrip: () => {
          props.onTripExported?.(
            JSON.stringify({
              currentTrip: {
                id: 'web-trip-99',
                name: 'Manila Heritage',
                updatedAt: '2026-11-19T12:00:00.000Z',
                stops: [
                  {id: 'w1', name: 'Japanese Garden', location: {lat: 14.5839, lng: 120.9794}},
                  {id: 'w2', name: 'Intramuros', location: {lat: 14.5896, lng: 120.9747}},
                ],
              },
            }),
          );
        },
      }));
      return <MockView testID="mock-webview" {...props} />;
    }),
  };
});

jest.mock(
  '@react-native-async-storage/async-storage',
  () => ({
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async () => undefined),
    removeItem: jest.fn(async () => undefined),
    clear: jest.fn(async () => undefined),
  }),
);

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({children}: {children: React.ReactNode}) => {
    const {View: MockView} = jest.requireActual('react-native');
    return <MockView>{children}</MockView>;
  },
  SafeAreaView: ({children}: {children: React.ReactNode}) => {
    const {View: MockView} = jest.requireActual('react-native');
    return <MockView>{children}</MockView>;
  },
}));

test('renders a planner-first mobile shell', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<NativePlannerScreen />);
  });

  await ReactTestRenderer.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });

  const textInstances = renderer!.root.findAllByType(Text);

  expect(renderer!.root.findByProps({children: 'Trip Planner'})).toBeTruthy();
  expect(renderer!.root.findByProps({children: 'New Trip'})).toBeTruthy();
  expect(renderer!.root.findByProps({children: 'Saved Trips'})).toBeTruthy();
  expect(renderer!.root.findByProps({children: 'Resume'})).toBeTruthy();
  expect(() => renderer!.root.findByProps({children: 'MyExplorer Native Shell'})).toThrow();
  expect(textInstances.length).toBeGreaterThanOrEqual(5);
});

test('blocks trip switching and stop edits while navigation is active or paused', async () => {
  const getItemMock = AsyncStorage.getItem as jest.Mock;
  getItemMock.mockImplementation(async (key: string) => {
    if (key === 'myexplorer.mobile.navigationSession.v1') {
      return JSON.stringify({
        sessionId: 'nav-active-1',
        tripId: 'trip-1',
        tripName: 'Manila Loop',
        status: 'active',
        currentStopIndex: 1,
        currentLegIndex: 0,
        nextInstructionText: 'Head north',
        nextRoadName: 'Padre Burgos Ave',
        maneuverCode: 1,
        stepDistanceMeters: 50,
        remainingDistanceMeters: 1000,
        remainingDurationSeconds: 180,
        finalRemainingDistanceMeters: 1000,
        finalRemainingDurationSeconds: 180,
        isRerouting: false,
        needsNavigatorReconnect: false,
        updatedAtMs: 1700000000000,
      });
    }
    return null;
  });

  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<NativePlannerScreen />);
  });
  await ReactTestRenderer.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });

  const findButton = (label: string) => {
    let node = renderer!.root.findByProps({children: label}).parent;
    while (node && typeof node.props.onPress !== 'function') {
      node = node.parent;
    }
    return node;
  };

  const newTripBtn = findButton('New Trip');
  expect(newTripBtn).toBeTruthy();

  await ReactTestRenderer.act(async () => {
    newTripBtn!.props.onPress();
  });

  expect(
    renderer!.root.findByProps({
      children: 'End active or paused navigation before switching or creating a trip.',
    }),
  ).toBeTruthy();

  const addStopBtn = findButton('Add Stop to Trip');
  expect(addStopBtn).toBeTruthy();

  await ReactTestRenderer.act(async () => {
    addStopBtn!.props.onPress();
  });

  expect(
    renderer!.root.findByProps({
      children: 'End active or paused navigation before editing, reordering, or removing stops.',
    }),
  ).toBeTruthy();

  getItemMock.mockImplementation(async () => null);
});

test('launches web experience on Android, shows runtime version in hamburger App info, and hands off trip to Native Nav', async () => {
  const originalOs = Platform.OS;
  Platform.OS = 'android';
  let renderer: ReactTestRenderer.ReactTestRenderer;

  try {
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(<App />);
    });

    await ReactTestRenderer.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const webView = renderer!.root.findByProps({testID: 'mock-webview'});
    expect(webView.props.url).toBe('https://myexplorer-travel.vercel.app');

    const menuBtn = renderer!.root.findByProps({accessibilityLabel: 'Menu'});
    await ReactTestRenderer.act(async () => {
      menuBtn.props.onPress();
    });

    const appInfoBtn = renderer!.root.findByProps({accessibilityLabel: 'App info'});
    await ReactTestRenderer.act(async () => {
      appInfoBtn.props.onPress();
    });

    const versionNode = renderer!.root.findByProps({testID: 'app-version-text'});
    expect(versionNode.props.children).toBe('Version 1.0 (4)');

    const closeBtn = renderer!.root.findByProps({accessibilityLabel: 'Close App info'});
    await ReactTestRenderer.act(async () => {
      closeBtn.props.onPress();
    });

    await ReactTestRenderer.act(async () => {
      menuBtn.props.onPress();
    });

    const nativeBtn = renderer!.root.findByProps({accessibilityLabel: 'Navigate Current Trip'});
    await ReactTestRenderer.act(async () => {
      nativeBtn.props.onPress();
    });

    await ReactTestRenderer.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(renderer!.root.findByProps({children: 'Trip Planner'})).toBeTruthy();
    expect(renderer!.root.findByProps({children: 'Japanese Garden'})).toBeTruthy();
    expect(renderer!.root.findByProps({children: 'Intramuros'})).toBeTruthy();
  } finally {
    Platform.OS = originalOs;
  }
});
