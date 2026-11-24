/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {DeviceEventEmitter, NativeModules, Platform, Text} from 'react-native';
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

  const addStopBtn = findButton('Add stop');
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
      await Promise.resolve();
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
      await Promise.resolve();
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
      await Promise.resolve();
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
      await Promise.resolve();
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
      await Promise.resolve();
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
      await Promise.resolve();
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
      await Promise.resolve();
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
      await Promise.resolve();
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
      await Promise.resolve();
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

test('searches places without coordinates, adds stops in order, reorders, removes with undo, and handles search errors', async () => {
  const originalOs = Platform.OS;
  Platform.OS = 'android';
  const searchPlacesMock = jest
    .fn()
    .mockResolvedValueOnce(
      JSON.stringify([
        {
          id: 'p1',
          name: 'Rizal Park',
          formattedAddress: 'Roxas Blvd, Ermita, Manila',
          lat: 14.5831,
          lng: 120.9794,
        },
      ]),
    )
    .mockResolvedValueOnce(
      JSON.stringify([
        {
          id: 'p2',
          name: 'Tagaytay Picnic Grove',
          formattedAddress: 'Tagaytay, Cavite',
          lat: 14.1266,
          lng: 120.9963,
        },
      ]),
    )
    .mockRejectedValueOnce(new Error('Network unavailable'));

  (NativeModules as Record<string, unknown>).MyExplorerNavigation = {
    addListener: jest.fn(),
    removeListeners: jest.fn(),
    getSessionState: jest.fn().mockResolvedValue(JSON.stringify({status: 'idle'})),
    searchPlaces: searchPlacesMock,
  };

  let renderer: ReactTestRenderer.ReactTestRenderer;
  try {
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(<NativePlannerScreen />);
    });
    await ReactTestRenderer.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    const searchInput = renderer!.root.findByProps({
      placeholder: 'Search by place name or street address',
    });
    await ReactTestRenderer.act(async () => {
      searchInput.props.onChangeText('Rizal Park');
    });

    const searchBtnText = renderer!.root.findByProps({children: 'Search'});
    let searchBtn = searchBtnText.parent;
    while (searchBtn && typeof searchBtn.props.onPress !== 'function') {
      searchBtn = searchBtn.parent;
    }
    await ReactTestRenderer.act(async () => {
      await searchBtn!.props.onPress();
    });

    // Both search results appear with address context
    expect(renderer!.root.findByProps({children: 'Rizal Park'})).toBeTruthy();
    expect(renderer!.root.findByProps({children: 'Roxas Blvd, Ermita, Manila'})).toBeTruthy();

    // Add first result -> added to stops without entering coordinates
    const hasText = (expected: string) =>
      renderer!.root
        .findAllByType(Text)
        .some(node =>
          (Array.isArray(node.props.children)
            ? node.props.children.join('')
            : String(node.props.children ?? '')) === expected,
        );

    const getAddButtons = () =>
      renderer!.root.findAllByProps({children: 'Add'}).map(node => {
        let parent = node.parent;
        while (parent && typeof parent.props.onPress !== 'function') {
          parent = parent.parent;
        }
        return parent!;
      });

    await ReactTestRenderer.act(async () => {
      getAddButtons()[0].props.onPress();
    });

    expect(hasText('Stops: 1')).toBe(true);
    expect(hasText('Added "Rizal Park" to trip.')).toBe(true);

    // Search again for a second stop, add it, and reorder stops
    await ReactTestRenderer.act(async () => {
      searchInput.props.onChangeText('Tagaytay');
    });
    await ReactTestRenderer.act(async () => {
      await searchBtn!.props.onPress();
    });
    await ReactTestRenderer.act(async () => {
      getAddButtons()[0].props.onPress();
    });
    expect(hasText('Stops: 2')).toBe(true);

    const moveUpText = renderer!.root.findByProps({children: 'Up'});
    let moveUpBtn = moveUpText.parent;
    while (moveUpBtn && typeof moveUpBtn.props.onPress !== 'function') {
      moveUpBtn = moveUpBtn.parent;
    }
    await ReactTestRenderer.act(async () => {
      moveUpBtn!.props.onPress();
    });
    expect(hasText('Stops: 2')).toBe(true);

    // Search error shows Retry Search and preserves existing stops
    await ReactTestRenderer.act(async () => {
      searchInput.props.onChangeText('Broken Query');
    });
    await ReactTestRenderer.act(async () => {
      await searchBtn!.props.onPress();
    });
    expect(hasText('Network unavailable')).toBe(true);
    expect(hasText('Retry Search')).toBe(true);
    expect(hasText('Stops: 2')).toBe(true);

    // Remove first stop and Undo restores it
    const removeText = renderer!.root.findAllByProps({children: 'Remove'})[0];
    let removeBtn = removeText.parent;
    while (removeBtn && typeof removeBtn.props.onPress !== 'function') {
      removeBtn = removeBtn.parent;
    }
    await ReactTestRenderer.act(async () => {
      removeBtn!.props.onPress();
    });
    expect(hasText('Stops: 1')).toBe(true);

    const undoText = renderer!.root.findByProps({children: 'Undo'});
    let undoBtn = undoText.parent;
    while (undoBtn && typeof undoBtn.props.onPress !== 'function') {
      undoBtn = undoBtn.parent;
    }
    await ReactTestRenderer.act(async () => {
      undoBtn!.props.onPress();
    });
    expect(hasText('Stops: 2')).toBe(true);
    expect(hasText('Rizal Park')).toBe(true);
    expect(hasText('Tagaytay Picnic Grove')).toBe(true);
  } finally {
    Platform.OS = originalOs;
  }
});

test('prevents stale/out-of-order search results, preserves destination on intermediate add, and rejects blank manual coords', async () => {
  const originalOs = Platform.OS;
  Platform.OS = 'android';

  type Deferred<T> = {
    promise: Promise<T>;
    resolve: (value: T) => void;
    reject: (error: Error) => void;
  };
  const createDeferred = <T,>(): Deferred<T> => {
    let resolve!: (value: T) => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return {promise, resolve, reject};
  };

  const req1 = createDeferred<string>();
  const req2 = createDeferred<string>();
  const req3 = createDeferred<string>();

  const searchPlacesMock = jest
    .fn()
    .mockReturnValueOnce(req1.promise)
    .mockReturnValueOnce(req2.promise)
    .mockReturnValueOnce(req3.promise)
    .mockResolvedValueOnce(
      JSON.stringify([
        {id: 'p-start', name: 'Manila', formattedAddress: 'Metro Manila', lat: 14.5995, lng: 120.9842},
      ]),
    )
    .mockResolvedValueOnce(
      JSON.stringify([
        {id: 'p-dest', name: 'Tagaytay', formattedAddress: 'Cavite', lat: 14.1153, lng: 120.9621},
      ]),
    )
    .mockResolvedValueOnce(
      JSON.stringify([
        {id: 'p-mid', name: 'Nuvali', formattedAddress: 'Laguna', lat: 14.239, lng: 121.057},
      ]),
    );

  (NativeModules as Record<string, unknown>).MyExplorerNavigation = {
    addListener: jest.fn(),
    removeListeners: jest.fn(),
    getSessionState: jest.fn().mockResolvedValue(JSON.stringify({status: 'idle'})),
    searchPlaces: searchPlacesMock,
  };

  let renderer: ReactTestRenderer.ReactTestRenderer;
  try {
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(<NativePlannerScreen />);
    });
    await ReactTestRenderer.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    const hasText = (expected: string) =>
      renderer!.root
        .findAllByType(Text)
        .some(node =>
          (Array.isArray(node.props.children)
            ? node.props.children.join('')
            : String(node.props.children ?? '')) === expected,
        );

    const findBtn = (label: string) => {
      const node = renderer!.root.findByProps({children: label});
      let parent = node.parent;
      while (parent && typeof parent.props.onPress !== 'function') {
        parent = parent.parent;
      }
      return parent!;
    };

    const searchInput = renderer!.root.findByProps({
      placeholder: 'Search by place name or street address',
    });

    // 1. Overlapping out-of-order searches: req1 started first, req2 started second
    await ReactTestRenderer.act(async () => {
      searchInput.props.onChangeText('Old Query');
    });
    await ReactTestRenderer.act(async () => {
      findBtn('Search').props.onPress();
    });
    await ReactTestRenderer.act(async () => {
      searchInput.props.onChangeText('New Query');
    });
    await ReactTestRenderer.act(async () => {
      findBtn('Search').props.onPress();
    });

    // req2 finishes first -> shown
    await ReactTestRenderer.act(async () => {
      req2.resolve(
        JSON.stringify([
          {id: 'new-1', name: 'New Place', formattedAddress: 'New Addr', lat: 14.5, lng: 121.0},
        ]),
      );
      await Promise.resolve();
    });
    expect(hasText('New Place')).toBe(true);

    // req1 finishes late (error or result) -> ignored!
    await ReactTestRenderer.act(async () => {
      req1.reject(new Error('Old query failed late'));
      await Promise.resolve();
    });
    expect(hasText('New Place')).toBe(true);
    expect(hasText('Old query failed late')).toBe(false);

    // Editing query clears stale results immediately
    await ReactTestRenderer.act(async () => {
      searchInput.props.onChangeText('Edited');
    });
    expect(hasText('New Place')).toBe(false);

    // Clearing while req3 is pending ignores late req3 resolution
    await ReactTestRenderer.act(async () => {
      findBtn('Search').props.onPress();
    });
    await ReactTestRenderer.act(async () => {
      findBtn('Clear').props.onPress();
    });
    await ReactTestRenderer.act(async () => {
      req3.resolve(
        JSON.stringify([
          {id: 'stale-3', name: 'Stale Place 3', formattedAddress: 'Addr', lat: 14.6, lng: 121.1},
        ]),
      );
      await Promise.resolve();
    });
    expect(hasText('Stale Place 3')).toBe(false);

    // 2. Adding 3rd stop via search preserves existing destination ("Tagaytay")
    for (const q of ['Manila', 'Tagaytay', 'Nuvali']) {
      await ReactTestRenderer.act(async () => {
        searchInput.props.onChangeText(q);
      });
      await ReactTestRenderer.act(async () => {
        await findBtn('Search').props.onPress();
      });
      await ReactTestRenderer.act(async () => {
        findBtn('Add').props.onPress();
      });
    }
    expect(hasText('Stops: 3')).toBe(true);
    // Destination must still be Tagaytay (last stop), with Nuvali inserted before it
    const stopTitles = renderer!.root
      .findAllByType(Text)
      .map(n => (typeof n.props.children === 'string' ? n.props.children : ''))
      .filter(t => t === 'Manila' || t === 'Nuvali' || t === 'Tagaytay');
    expect(stopTitles).toEqual(['Manila', 'Nuvali', 'Tagaytay']);

    // 3. Manual coordinates: reject blank/whitespace, allow explicit 0,0
    await ReactTestRenderer.act(async () => {
      findBtn('Enter coordinates manually').props.onPress();
    });
    const stopNameInput = renderer!.root.findByProps({placeholder: 'Batangas Port'});
    const latInput = renderer!.root.findByProps({placeholder: '13.7565'});
    const lngInput = renderer!.root.findByProps({placeholder: '121.0583'});

    await ReactTestRenderer.act(async () => {
      stopNameInput.props.onChangeText('Blank Coords Stop');
      latInput.props.onChangeText('   ');
      lngInput.props.onChangeText('');
    });
    await ReactTestRenderer.act(async () => {
      findBtn('Add Stop to Trip').props.onPress();
    });
    expect(
      hasText('Valid latitude (-90..90) and longitude (-180..180) are required.'),
    ).toBe(true);
    expect(hasText('Stops: 3')).toBe(true);

    // Explicit 0, 0 is accepted and inserted before destination
    await ReactTestRenderer.act(async () => {
      stopNameInput.props.onChangeText('Null Island');
      latInput.props.onChangeText('0');
      lngInput.props.onChangeText('0');
    });
    await ReactTestRenderer.act(async () => {
      findBtn('Add Stop to Trip').props.onPress();
    });
    expect(hasText('Stops: 4')).toBe(true);
    expect(hasText('Null Island')).toBe(true);
  } finally {
    Platform.OS = originalOs;
  }
});

describe('Native Home saved-trip opening & unsaved-changes protection', () => {
  const SAVED_TRIP_FROM_HOME = {
    id: 'saved-home-1',
    name: 'Tagaytay Escape',
    stops: [
      {id: 's1', name: 'Manila', location: {lat: 14.5995, lng: 120.9842}, type: 'start' as const},
      {id: 's2', name: 'Tagaytay', location: {lat: 14.1153, lng: 120.9621}, type: 'destination' as const},
    ],
  };

  const UNSAVED_DRAFT = {
    id: 'draft-unsaved-1',
    name: 'Unsaved Weekend Draft',
    stops: [
      {id: 'd1', name: 'Makati', location: {lat: 14.5547, lng: 121.0244}, type: 'start' as const},
    ],
  };

  const originalOs = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'android';
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (NativeModules as Record<string, unknown>).MyExplorerNavigation = {
      getSessionState: jest.fn().mockResolvedValue(JSON.stringify({status: 'idle'})),
      startTripNavigation: jest.fn(),
      pauseNavigation: jest.fn(),
      resumeNavigation: jest.fn(),
      stopNavigation: jest.fn(),
      discardCorruptRecoverySession: jest.fn(),
      addListener: jest.fn(),
      removeListeners: jest.fn(),
    };
  });

  afterEach(() => {
    Platform.OS = originalOs;
    delete (NativeModules as Record<string, unknown>).MyExplorerNavigation;
  });

  function createHelpers(renderer: ReactTestRenderer.ReactTestRenderer) {
    const allText = () =>
      renderer.root
        .findAllByType(Text)
        .map(n =>
          Array.isArray(n.props.children)
            ? n.props.children.join('')
            : String(n.props.children ?? ''),
        );
    const hasText = (substr: string) => allText().some(t => t.includes(substr));
    const findBtn = (label: string) =>
      renderer.root.findAll(
        n => n.props?.accessibilityRole === 'button' && n.props?.children?.props?.children === label,
      )[0];
    return {hasText, findBtn};
  }

  test('opens a saved trip from Native Home immediately when there is no unsaved draft', async () => {
    (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
      if (key === 'myexplorer.mobile.saved-trips') {
        return JSON.stringify([SAVED_TRIP_FROM_HOME]);
      }
      return null;
    });

    let renderer: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <NativePlannerScreen
          handoffTrip={SAVED_TRIP_FROM_HOME}
          handoffKey={1}
          handoffSource="home"
        />,
      );
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    const {hasText} = createHelpers(renderer!);
    expect(hasText('Opened saved trip "Tagaytay Escape" (2 stops).')).toBe(true);
    expect(hasText('from web')).toBe(false);
    expect(hasText('Unsaved changes')).toBe(false);
  });

  test('prompts for unsaved draft when opening a saved trip from Home and preserves draft on cancel', async () => {
    (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
      if (key === 'myexplorer.mobile.saved-trips') {
        return JSON.stringify([SAVED_TRIP_FROM_HOME]);
      }
      if (key === 'myexplorer.mobile.draft-trip') {
        return JSON.stringify(UNSAVED_DRAFT);
      }
      return null;
    });

    let renderer: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <NativePlannerScreen
          handoffTrip={SAVED_TRIP_FROM_HOME}
          handoffKey={1}
          handoffSource="home"
        />,
      );
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    const {hasText, findBtn} = createHelpers(renderer!);
    expect(hasText('Unsaved changes')).toBe(true);
    expect(hasText('Opened saved trip')).toBe(false);

    await ReactTestRenderer.act(async () => {
      findBtn('Keep Editing').props.onPress();
    });

    expect(hasText('Unsaved changes')).toBe(false);
    expect(hasText('Makati')).toBe(true);
    expect(
      (AsyncStorage.setItem as jest.Mock).mock.calls.some(
        ([k, v]) => k === 'myexplorer.mobile.draft-trip' && String(v).includes('Unsaved Weekend Draft'),
      ),
    ).toBe(true);
  });

  test('opens chosen saved trip from Home after confirming Discard Changes on unsaved draft', async () => {
    (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
      if (key === 'myexplorer.mobile.saved-trips') {
        return JSON.stringify([SAVED_TRIP_FROM_HOME]);
      }
      if (key === 'myexplorer.mobile.draft-trip') {
        return JSON.stringify(UNSAVED_DRAFT);
      }
      return null;
    });

    let renderer: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <NativePlannerScreen
          handoffTrip={SAVED_TRIP_FROM_HOME}
          handoffKey={1}
          handoffSource="home"
        />,
      );
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    const {hasText, findBtn} = createHelpers(renderer!);
    expect(hasText('Unsaved changes')).toBe(true);

    await ReactTestRenderer.act(async () => {
      findBtn('Discard Changes').props.onPress();
    });

    expect(hasText('Opened saved trip "Tagaytay Escape" (2 stops).')).toBe(true);
    expect(hasText('Tagaytay')).toBe(true);
    expect(hasText('from web')).toBe(false);
  });

  test('preserves active navigation and corrupt-recovery protections when opening a saved trip from Home', async () => {
    const navMock = (NativeModules as Record<string, any>).MyExplorerNavigation;
    navMock.getSessionState.mockResolvedValue(
      JSON.stringify({
        sessionId: 'sess-active',
        tripId: 'trip-active',
        tripName: 'Active Trip',
        status: 'active',
        stops: SAVED_TRIP_FROM_HOME.stops,
        hasCorruptRecovery: true,
        recoveryError: 'Corrupt recovery payload preserved.',
      }),
    );
    (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
      if (key === 'myexplorer.mobile.saved-trips') {
        return JSON.stringify([SAVED_TRIP_FROM_HOME]);
      }
      return null;
    });

    let renderer: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <NativePlannerScreen
          handoffTrip={SAVED_TRIP_FROM_HOME}
          handoffKey={1}
          handoffSource="home"
        />,
      );
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    const {hasText} = createHelpers(renderer!);
    expect(
      hasText('End active or paused navigation before switching or creating a trip.'),
    ).toBe(true);
    expect(hasText('Opened saved trip')).toBe(false);
    expect(navMock.discardCorruptRecoverySession).not.toHaveBeenCalled();
  });

  test('preserves web handoff wording for actual web handoffs', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <NativePlannerScreen
          handoffTrip={SAVED_TRIP_FROM_HOME}
          handoffKey={1}
          handoffSource="web"
        />,
      );
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    const {hasText} = createHelpers(renderer!);
    expect(hasText('Loaded "Tagaytay Escape" (2 stops) from web.')).toBe(true);
  });

  test('consumes a handoff only once and does not reopen it when NativePlannerScreen remounts', async () => {
    const onConsumeHandoff = jest.fn();
    (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
      if (key === 'myexplorer.mobile.saved-trips') {
        return JSON.stringify([SAVED_TRIP_FROM_HOME]);
      }
      return null;
    });

    let renderer: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <NativePlannerScreen
          handoffTrip={SAVED_TRIP_FROM_HOME}
          handoffKey={7}
          handoffSource="home"
          onConsumeHandoff={onConsumeHandoff}
        />,
      );
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(onConsumeHandoff).toHaveBeenCalledTimes(1);
    expect(onConsumeHandoff).toHaveBeenCalledWith(7);

    // Unmount and remount after parent clears consumed handoff, with an existing draft in storage
    await ReactTestRenderer.act(async () => {
      renderer!.unmount();
    });

    (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
      if (key === 'myexplorer.mobile.saved-trips') {
        return JSON.stringify([SAVED_TRIP_FROM_HOME]);
      }
      if (key === 'myexplorer.mobile.draft-trip') {
        return JSON.stringify(UNSAVED_DRAFT);
      }
      return null;
    });

    let remounted: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      remounted = ReactTestRenderer.create(
        <NativePlannerScreen
          handoffTrip={null}
          handoffKey={0}
          handoffSource="home"
          onConsumeHandoff={onConsumeHandoff}
        />,
      );
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    const {hasText} = createHelpers(remounted!);
    expect(hasText('Makati')).toBe(true);
    expect(hasText('Opened saved trip "Tagaytay Escape"')).toBe(false);
    expect(onConsumeHandoff).toHaveBeenCalledTimes(1);
  });

  test('preserves pending handoff and draft when session restore fails, then processes on retry respecting active session', async () => {
    const navMock = (NativeModules as Record<string, any>).MyExplorerNavigation;
    const onConsumeHandoff = jest.fn();
    navMock.getSessionState.mockRejectedValueOnce(new Error('Binder unavailable'));

    (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
      if (key === 'myexplorer.mobile.saved-trips') {
        return JSON.stringify([SAVED_TRIP_FROM_HOME]);
      }
      if (key === 'myexplorer.mobile.draft-trip') {
        return JSON.stringify(UNSAVED_DRAFT);
      }
      return null;
    });

    let renderer: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <NativePlannerScreen
          handoffTrip={SAVED_TRIP_FROM_HOME}
          handoffKey={9}
          handoffSource="home"
          onConsumeHandoff={onConsumeHandoff}
        />,
      );
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    const {hasText, findBtn} = createHelpers(renderer!);
    expect(hasText('Session check failed')).toBe(true);
    expect(hasText('Makati')).toBe(true);
    expect(hasText('Opened saved trip')).toBe(false);
    expect(onConsumeHandoff).not.toHaveBeenCalled();

    // Retry succeeds and discovers an active navigation session -> preserves active-nav protection
    navMock.getSessionState.mockResolvedValueOnce(
      JSON.stringify({
        sessionId: 'sess-active',
        tripId: 'trip-active',
        tripName: 'Active Trip',
        status: 'active',
        stops: SAVED_TRIP_FROM_HOME.stops,
      }),
    );

    await ReactTestRenderer.act(async () => {
      findBtn('Retry Session Check').props.onPress();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(hasText('Session check failed')).toBe(false);
    expect(onConsumeHandoff).toHaveBeenCalledWith(9);
    expect(
      hasText('End active or paused navigation before switching or creating a trip.'),
    ).toBe(true);
    expect(hasText('Opened saved trip')).toBe(false);
  });

  test('treats malformed native session response as a failure, preserves draft and handoff, and proceeds to unsaved-changes prompt on idle retry', async () => {
    const navMock = (NativeModules as Record<string, any>).MyExplorerNavigation;
    const onConsumeHandoff = jest.fn();
    navMock.getSessionState.mockResolvedValueOnce('{malformed-json');

    (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
      if (key === 'myexplorer.mobile.saved-trips') {
        return JSON.stringify([SAVED_TRIP_FROM_HOME]);
      }
      if (key === 'myexplorer.mobile.draft-trip') {
        return JSON.stringify(UNSAVED_DRAFT);
      }
      return null;
    });

    let renderer: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <NativePlannerScreen
          handoffTrip={SAVED_TRIP_FROM_HOME}
          handoffKey={11}
          handoffSource="home"
          onConsumeHandoff={onConsumeHandoff}
        />,
      );
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    const {hasText, findBtn} = createHelpers(renderer!);
    expect(hasText('Session check failed')).toBe(true);
    expect(hasText('Makati')).toBe(true);
    expect(hasText('Opened saved trip')).toBe(false);
    expect(onConsumeHandoff).not.toHaveBeenCalled();

    // Retry returns valid idle -> pending handoff continues through unsaved-changes confirmation
    navMock.getSessionState.mockResolvedValueOnce(JSON.stringify({status: 'idle'}));

    await ReactTestRenderer.act(async () => {
      findBtn('Retry Session Check').props.onPress();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(hasText('Session check failed')).toBe(false);
    expect(onConsumeHandoff).toHaveBeenCalledWith(11);
    expect(hasText('Unsaved changes')).toBe(true);
  });

  test('ignores an older restore response arriving after newer verified session state', async () => {
    const navMock = (NativeModules as Record<string, any>).MyExplorerNavigation;
    const onConsumeHandoff = jest.fn();
    let resolveOlderRestore!: (value: string) => void;
    navMock.getSessionState.mockImplementationOnce(
      () =>
        new Promise<string>(resolve => {
          resolveOlderRestore = resolve;
        }),
    );

    (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
      if (key === 'myexplorer.mobile.saved-trips') {
        return JSON.stringify([SAVED_TRIP_FROM_HOME]);
      }
      return null;
    });

    let renderer: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <NativePlannerScreen
          handoffTrip={SAVED_TRIP_FROM_HOME}
          handoffKey={12}
          handoffSource="home"
          onConsumeHandoff={onConsumeHandoff}
        />,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    // Newer verified active session arrives via native event before older restore resolves
    await ReactTestRenderer.act(async () => {
      DeviceEventEmitter.emit(
        'MyExplorerNavigationStateChanged',
        JSON.stringify({
          sessionId: 'sess-newer',
          tripId: 'trip-newer',
          tripName: 'Newer Active Trip',
          status: 'active',
          stops: SAVED_TRIP_FROM_HOME.stops,
        }),
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    const {hasText} = createHelpers(renderer!);
    expect(
      hasText('End active or paused navigation before switching or creating a trip.'),
    ).toBe(true);

    // Older restore resolves late with idle -> must NOT replace newer active session or open trip
    await ReactTestRenderer.act(async () => {
      resolveOlderRestore(JSON.stringify({status: 'idle'}));
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(hasText('Opened saved trip')).toBe(false);
    expect(hasText('Newer Active Trip')).toBe(true);
  });

  test('renders Trip Map in NativePlannerScreen and updates marker/route status when stops change', async () => {
    const navMock = (NativeModules as Record<string, any>).MyExplorerNavigation;
    navMock.getPreTripMapZoomState = jest
      .fn()
      .mockResolvedValue(JSON.stringify({available: true, zoom: 14, minZoom: 2, maxZoom: 21}));

    (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
      if (key === 'myexplorer.mobile.saved-trips') {
        return JSON.stringify([SAVED_TRIP_FROM_HOME]);
      }
      return null;
    });

    let renderer: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <NativePlannerScreen
          handoffTrip={SAVED_TRIP_FROM_HOME}
          handoffKey={20}
          handoffSource="home"
        />,
      );
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    const {hasText, findBtn} = createHelpers(renderer!);
    expect(hasText('Trip Map')).toBe(true);
    expect(hasText('2 valid stops')).toBe(true);
    expect(hasText('No calculated route preview available yet; showing stop markers only.')).toBe(true);

    // Removing a stop updates marker count and route status honestly
    await ReactTestRenderer.act(async () => {
      findBtn('Remove').props.onPress();
    });
    expect(hasText('1 valid stop')).toBe(true);
    expect(hasText('Add at least two valid stops to preview a route.')).toBe(true);
  });
});
