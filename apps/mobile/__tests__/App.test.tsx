/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {NativeModules, Platform, Text} from 'react-native';
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

test('auto-restores active/paused trip on Android launch, stays on web for canceled/completed, and supports Return to Trip', async () => {
  const originalOs = Platform.OS;
  Platform.OS = 'android';
  try {
    // 1. Active session on relaunch -> auto-restores to NativePlannerScreen with recovered stops
    (NativeModules as Record<string, unknown>).MyExplorerNavigation = {
      addListener: jest.fn(),
      removeListeners: jest.fn(),
      getSessionState: jest.fn().mockResolvedValue(
        JSON.stringify({
          sessionId: 'nav-auto-1',
          tripId: 'web-trip-7',
          tripName: 'Manila to Antipolo',
          status: 'paused',
          needsNavigatorReconnect: true,
          stops: [
            {id: 's1', name: 'Rizal Park', lat: 14.5831, lng: 120.9794, type: 'start'},
            {id: 's2', name: 'Antipolo', lat: 14.5873, lng: 121.176, type: 'destination'},
          ],
        }),
      ),
    };

    let renderer: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(<App />);
    });
    await ReactTestRenderer.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(renderer!.root.findByProps({children: 'Trip Planner'})).toBeTruthy();
    expect(renderer!.root.findByProps({children: 'Rizal Park'})).toBeTruthy();
    expect(renderer!.root.findByProps({children: 'Antipolo'})).toBeTruthy();

    // Back to Explore (Web) shows Return to Trip banner directly on home experience
    const exploreText = renderer!.root.findByProps({children: 'Explore (Web)'});
    let exploreNode = exploreText.parent;
    while (exploreNode && typeof exploreNode.props.onPress !== 'function') {
      exploreNode = exploreNode.parent;
    }
    await ReactTestRenderer.act(async () => {
      exploreNode!.props.onPress();
    });
    const returnBtn = renderer!.root.findByProps({
      accessibilityLabel: 'Return to Current Trip',
    });
    expect(returnBtn).toBeTruthy();

    // Tapping Return to Trip returns directly to NativePlannerScreen without web-DOM export
    await ReactTestRenderer.act(async () => {
      returnBtn.props.onPress();
    });
    expect(renderer!.root.findByProps({children: 'Trip Planner'})).toBeTruthy();

    // 2. Canceled (abandoned) session on relaunch -> stays on WebExperienceScreen and shows clear canceled notice
    (NativeModules as Record<string, unknown>).MyExplorerNavigation = {
      addListener: jest.fn(),
      removeListeners: jest.fn(),
      getSessionState: jest.fn().mockResolvedValue(
        JSON.stringify({
          sessionId: 'nav-old-2',
          tripId: 'web-trip-8',
          tripName: 'Old Trip',
          status: 'abandoned',
        }),
      ),
    };

    let canceledRenderer: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      canceledRenderer = ReactTestRenderer.create(<App />);
    });
    await ReactTestRenderer.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(canceledRenderer!.root.findByProps({testID: 'mock-webview'})).toBeTruthy();
    expect(
      canceledRenderer!.root.findByProps({children: 'Navigation was canceled'}),
    ).toBeTruthy();
    expect(
      canceledRenderer!.root.findAllByProps({
        accessibilityLabel: 'Return to Current Trip',
      }),
    ).toHaveLength(0);
  } finally {
    Platform.OS = originalOs;
  }
});

test('preserves conflicting draft across app restart, surfaces both choices without silent data loss, and skips conflict when matching', async () => {
  const originalOs = Platform.OS;
  Platform.OS = 'android';
  const getItemMock = AsyncStorage.getItem as jest.Mock;
  const setItemMock = AsyncStorage.setItem as jest.Mock;

  const activeSessionJson = JSON.stringify({
    sessionId: 'nav-conflict-1',
    tripId: 'trip-active-1',
    tripName: 'Manila Loop',
    status: 'paused',
    needsNavigatorReconnect: true,
    updatedAtMs: 5000,
    stops: [
      {id: 'a1', name: 'Rizal Park', lat: 14.5831, lng: 120.9794, type: 'start'},
      {id: 'a2', name: 'Antipolo', lat: 14.6255, lng: 121.1245, type: 'destination'},
    ],
  });

  const conflictingDraft = {
    id: 'draft-baguio',
    name: 'Baguio Draft',
    stops: [
      {id: 'd1', name: 'QC', location: {lat: 14.676, lng: 121.0437}, type: 'start'},
      {id: 'd2', name: 'Baguio', location: {lat: 16.4023, lng: 120.596}, type: 'destination'},
    ],
    updatedAt: '2026-11-22T05:00:00.000Z',
  };

  try {
    (NativeModules as Record<string, unknown>).MyExplorerNavigation = {
      addListener: jest.fn(),
      removeListeners: jest.fn(),
      getSessionState: jest.fn().mockResolvedValue(activeSessionJson),
    };
    getItemMock.mockImplementation(async (key: string) => {
      if (key === 'myexplorer.mobile.draft-trip') {
        return JSON.stringify(conflictingDraft);
      }
      if (key === 'myexplorer.mobile.draft-baseline') {
        return JSON.stringify({
          id: 'draft-baguio',
          name: 'Untitled Trip',
          stops: [],
        });
      }
      return null;
    });

    // 1. Rehydrate with persisted conflicting draft -> conflict prompt shown, draft NOT overwritten
    let renderer1: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer1 = ReactTestRenderer.create(<App />);
    });
    await ReactTestRenderer.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(renderer1!.root.findByProps({children: 'Trip recovery conflict'})).toBeTruthy();
    expect(renderer1!.root.findByProps({children: 'Baguio'})).toBeTruthy();

    // Choose "Keep Draft" -> draft remains and explanation shown
    const keepBtnText = renderer1!.root.findByProps({children: 'Keep Draft'});
    let keepBtn = keepBtnText.parent;
    while (keepBtn && typeof keepBtn.props.onPress !== 'function') {
      keepBtn = keepBtn.parent;
    }
    await ReactTestRenderer.act(async () => {
      keepBtn!.props.onPress();
    });
    expect(renderer1!.root.findAllByProps({children: 'Trip recovery conflict'})).toHaveLength(0);
    expect(renderer1!.root.findByProps({children: 'Baguio'})).toBeTruthy();

    // 2. Rehydrate again and choose "Use Active Trip" -> switches to active trip AND preserves draft in Saved Trips
    setItemMock.mockClear();
    let renderer2: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer2 = ReactTestRenderer.create(<App />);
    });
    await ReactTestRenderer.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const useActiveText = renderer2!.root.findByProps({children: 'Use Active Trip'});
    let useActiveBtn = useActiveText.parent;
    while (useActiveBtn && typeof useActiveBtn.props.onPress !== 'function') {
      useActiveBtn = useActiveBtn.parent;
    }
    await ReactTestRenderer.act(async () => {
      useActiveBtn!.props.onPress();
    });

    expect(renderer2!.root.findByProps({children: 'Rizal Park'})).toBeTruthy();
    expect(renderer2!.root.findByProps({children: 'Antipolo'})).toBeTruthy();
    const savedCalls = setItemMock.mock.calls.filter(
      call => call[0] === 'myexplorer.mobile.saved-trips',
    );
    expect(savedCalls.some(call => String(call[1]).includes('Baguio Draft'))).toBe(true);

    // 3. Rehydrate when persisted draft matches active session -> NO conflict prompt
    const matchingDraft = {
      id: 'trip-active-1',
      name: 'Manila Loop',
      stops: [
        {id: 'a1', name: 'Rizal Park', location: {lat: 14.5831, lng: 120.9794}, type: 'start'},
        {id: 'a2', name: 'Antipolo', location: {lat: 14.6255, lng: 121.1245}, type: 'destination'},
      ],
    };
    getItemMock.mockImplementation(async (key: string) => {
      if (key === 'myexplorer.mobile.draft-trip') {
        return JSON.stringify(matchingDraft);
      }
      if (key === 'myexplorer.mobile.draft-baseline') {
        return JSON.stringify({id: 'trip-active-1', name: 'Untitled Trip', stops: []});
      }
      return null;
    });

    let renderer3: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer3 = ReactTestRenderer.create(<App />);
    });
    await ReactTestRenderer.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(renderer3!.root.findAllByProps({children: 'Trip recovery conflict'})).toHaveLength(0);
    expect(renderer3!.root.findByProps({children: 'Rizal Park'})).toBeTruthy();
  } finally {
    Platform.OS = originalOs;
    getItemMock.mockImplementation(async () => null);
  }
});

test('conflict recovery preserves existing saved trips with colliding IDs, handles persistence failure, and survives restart', async () => {
  const originalOs = Platform.OS;
  Platform.OS = 'android';
  const getItemMock = AsyncStorage.getItem as jest.Mock;
  const setItemMock = AsyncStorage.setItem as jest.Mock;

  const existingSavedTrip = {
    id: 'shared-trip-id',
    name: 'Original Saved Baguio',
    stops: [
      {id: 's1', name: 'Manila', location: {lat: 14.5995, lng: 120.9842}, type: 'start'},
      {id: 's2', name: 'Baguio', location: {lat: 16.4023, lng: 120.596}, type: 'destination'},
    ],
  };

  const editedDraftSameSavedId = {
    id: 'shared-trip-id',
    name: 'Edited Baguio Draft',
    stops: [
      {id: 's1', name: 'Manila', location: {lat: 14.5995, lng: 120.9842}, type: 'start'},
      {id: 's3', name: 'La Union', location: {lat: 16.6159, lng: 120.3209}, type: 'destination'},
    ],
  };

  const activeSessionJson = JSON.stringify({
    sessionId: 'nav-collision-1',
    tripId: 'trip-active-other',
    tripName: 'Tagaytay Run',
    status: 'paused',
    needsNavigatorReconnect: true,
    updatedAtMs: 7000,
    stops: [
      {id: 'a1', name: 'Rizal Park', lat: 14.5831, lng: 120.9794, type: 'start'},
      {id: 'a2', name: 'Tagaytay', lat: 14.1153, lng: 120.9621, type: 'destination'},
    ],
  });

  const store: Record<string, string> = {
    'myexplorer.mobile.saved-trips': JSON.stringify([existingSavedTrip]),
    'myexplorer.mobile.draft-trip': JSON.stringify(editedDraftSameSavedId),
    'myexplorer.mobile.draft-baseline': JSON.stringify({
      ...existingSavedTrip,
      routeSnapshot: undefined,
      savedAt: undefined,
      updatedAt: undefined,
    }),
  };

  try {
    (NativeModules as Record<string, unknown>).MyExplorerNavigation = {
      addListener: jest.fn(),
      removeListeners: jest.fn(),
      getSessionState: jest.fn().mockResolvedValue(activeSessionJson),
    };
    getItemMock.mockImplementation(async (key: string) => store[key] ?? null);

    // 1. Persistence failure keeps draft intact, does NOT switch trip, and shows error
    setItemMock.mockImplementation(async (key: string) => {
      if (key === 'myexplorer.mobile.saved-trips') {
        throw new Error('Disk full');
      }
    });

    let renderer1: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer1 = ReactTestRenderer.create(<App />);
    });
    await ReactTestRenderer.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const useActiveText1 = renderer1!.root.findByProps({children: 'Use Active Trip'});
    let useActiveBtn1 = useActiveText1.parent;
    while (useActiveBtn1 && typeof useActiveBtn1.props.onPress !== 'function') {
      useActiveBtn1 = useActiveBtn1.parent;
    }
    await ReactTestRenderer.act(async () => {
      await useActiveBtn1!.props.onPress();
    });

    expect(
      renderer1!.root.findByProps({
        children:
          'Could not save your conflicting draft. Your draft was kept intact; please retry.',
      }),
    ).toBeTruthy();
    // Draft is still intact (La Union still shown, not Tagaytay)
    expect(renderer1!.root.findByProps({children: 'La Union'})).toBeTruthy();
    expect(renderer1!.root.findAllByProps({children: 'Tagaytay'})).toHaveLength(0);

    // 2. When persistence succeeds, BOTH Original Saved Baguio and Edited Baguio Draft (Preserved Draft) are kept
    setItemMock.mockImplementation(async (key: string, value: string) => {
      store[key] = value;
    });

    await ReactTestRenderer.act(async () => {
      await useActiveBtn1!.props.onPress();
    });

    const savedAfter = JSON.parse(store['myexplorer.mobile.saved-trips']) as Array<{
      id: string;
      name: string;
    }>;
    expect(savedAfter.some(t => t.id === 'shared-trip-id' && t.name === 'Original Saved Baguio')).toBe(
      true,
    );
    expect(
      savedAfter.some(
        t => t.id !== 'shared-trip-id' && t.name === 'Edited Baguio Draft (Preserved Draft)',
      ),
    ).toBe(true);
    expect(renderer1!.root.findByProps({children: 'Tagaytay'})).toBeTruthy();

    // 3. Reopening after restart still shows both saved trips
    let renderer2: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer2 = ReactTestRenderer.create(<App />);
    });
    await ReactTestRenderer.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(renderer2!.root.findByProps({children: 'Original Saved Baguio'})).toBeTruthy();
    expect(
      renderer2!.root.findByProps({children: 'Edited Baguio Draft (Preserved Draft)'}),
    ).toBeTruthy();
  } finally {
    Platform.OS = originalOs;
    getItemMock.mockImplementation(async () => null);
    setItemMock.mockImplementation(async () => undefined);
  }
});
