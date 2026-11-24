jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import {NativeModules, Platform} from 'react-native';
import ReactTestRenderer from 'react-test-renderer';

import {
  IDLE_NAVIGATION_SESSION,
  type NavigationSessionSnapshot,
} from '../navigation/session';
import type {Trip} from '../planner/domain';
import {
  deriveHomeRecoveryState,
  resolveBackNavigationTarget,
} from './homeNavigation';
import {NativeHomeScreen} from './NativeHomeScreen';

const SAVED_TRIP: Trip = {
  id: 'trip-convoy-1',
  name: 'Baguio Weekend',
  stops: [
    {
      id: 'stop-1',
      name: 'Manila',
      location: {lat: 14.5995, lng: 120.9842},
      type: 'start',
    },
    {
      id: 'stop-2',
      name: 'Baguio',
      location: {lat: 16.4023, lng: 120.596},
      type: 'destination',
    },
  ],
  convoy: {
    id: 'convoy-1',
    tripId: 'trip-convoy-1',
    vehicles: [],
    participants: [],
    invites: [],
    assignments: [],
    createdAt: '2026-11-23T00:00:00.000Z',
    updatedAt: '2026-11-23T00:00:00.000Z',
  },
};

describe('homeNavigation helpers', () => {
  test('resolveBackNavigationTarget routes predictably between planner, home, and web', () => {
    expect(
      resolveBackNavigationTarget({
        currentScreen: 'native',
        nativeReturnTarget: 'home',
        platformOs: 'android',
      }),
    ).toBe('home');

    expect(
      resolveBackNavigationTarget({
        currentScreen: 'home',
        nativeReturnTarget: 'home',
        platformOs: 'android',
      }),
    ).toBe('web');

    expect(
      resolveBackNavigationTarget({
        currentScreen: 'native',
        nativeReturnTarget: 'web',
        platformOs: 'android',
      }),
    ).toBe('web');

    expect(
      resolveBackNavigationTarget({
        currentScreen: 'web',
        nativeReturnTarget: 'web',
        platformOs: 'android',
      }),
    ).toBeNull();
  });

  test('deriveHomeRecoveryState surfaces corrupt recovery, active session, and draft states without discarding data', () => {
    const corruptSession: NavigationSessionSnapshot = {
      ...IDLE_NAVIGATION_SESSION,
      hasCorruptRecovery: true,
      recoveryError: 'Corrupt snapshot preserved on disk.',
    };
    expect(
      deriveHomeRecoveryState({
        navigationSession: corruptSession,
        draftTrip: SAVED_TRIP,
      }),
    ).toMatchObject({
      kind: 'corrupt',
      title: 'Saved session needs review',
      subtitle: 'Corrupt snapshot preserved on disk.',
      actionLabel: 'Return to current trip',
    });

    const activeSession: NavigationSessionSnapshot = {
      ...IDLE_NAVIGATION_SESSION,
      sessionId: 'sess-1',
      tripId: 'trip-1',
      tripName: 'Tagaytay Run',
      status: 'active',
      nextInstructionText: 'Turn right onto Aguinaldo Hwy',
    };
    expect(
      deriveHomeRecoveryState({
        navigationSession: activeSession,
        draftTrip: null,
      }),
    ).toMatchObject({
      kind: 'active-session',
      title: 'Tagaytay Run',
      actionLabel: 'Return to current trip',
    });

    expect(
      deriveHomeRecoveryState({
        navigationSession: IDLE_NAVIGATION_SESSION,
        draftTrip: SAVED_TRIP,
      }),
    ).toMatchObject({
      kind: 'draft',
      title: 'Baguio Weekend',
      subtitle: '2 stops in local draft',
      actionLabel: 'Return to current trip',
    });

    expect(
      deriveHomeRecoveryState({
        navigationSession: IDLE_NAVIGATION_SESSION,
        draftTrip: null,
      }),
    ).toEqual({kind: 'none'});
  });
});

describe('NativeHomeScreen', () => {
  const originalOs = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'android';
    (NativeModules as Record<string, unknown>).MyExplorerAppInfo = {
      getAppInfo: jest.fn().mockResolvedValue({
        packageName: 'com.thestillfoundation.myexplorer',
        versionName: '1.0',
        versionCode: 4,
      }),
    };
  });

  afterEach(() => {
    Platform.OS = originalOs;
    delete (NativeModules as Record<string, unknown>).MyExplorerAppInfo;
  });

  test('renders Plan a trip, Return to current trip, saved trips, version, and legal info without mutating storage', async () => {
    (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) =>
      key === 'myexplorer.mobile.saved-trips'
        ? JSON.stringify([SAVED_TRIP])
        : null,
    );
    const setItemSpy = AsyncStorage.setItem as jest.Mock;
    const removeItemSpy = AsyncStorage.removeItem as jest.Mock;

    const onPlanTrip = jest.fn();
    const onReturnToCurrentTrip = jest.fn();
    const onOpenSavedTrip = jest.fn();
    const onBackToWeb = jest.fn();

    let tree!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(
        <NativeHomeScreen
          navigationSession={{
            ...IDLE_NAVIGATION_SESSION,
            hasCorruptRecovery: true,
            recoveryError: 'Corrupt session kept safe.',
          }}
          onPlanTrip={onPlanTrip}
          onReturnToCurrentTrip={onReturnToCurrentTrip}
          onOpenSavedTrip={onOpenSavedTrip}
          onBackToWeb={onBackToWeb}
        />,
      );
      await Promise.resolve();
    });

    const versionText = tree.root.findByProps({
      testID: 'home-app-version-text',
    });
    expect(versionText.props.children).toBe('Version 1.0 (4)');

    const recoveryCard = tree.root.findByProps({
      testID: 'home-recovery-card',
    });
    expect(recoveryCard).toBeTruthy();

    await ReactTestRenderer.act(async () => {
      tree.root.findByProps({testID: 'home-plan-trip-btn'}).props.onPress();
      tree.root
        .findByProps({testID: 'home-return-to-trip-btn'})
        .props.onPress();
      tree.root
        .findByProps({testID: `home-open-trip-${SAVED_TRIP.id}`})
        .props.onPress();
      tree.root.findByProps({testID: 'home-back-to-web-btn'}).props.onPress();
      tree.root.findByProps({testID: 'home-legal-privacy'}).props.onPress();
    });

    expect(onPlanTrip).toHaveBeenCalledTimes(1);
    expect(onReturnToCurrentTrip).toHaveBeenCalledTimes(1);
    expect(onOpenSavedTrip).toHaveBeenCalledWith(SAVED_TRIP);
    expect(onBackToWeb).toHaveBeenCalledTimes(1);
    expect(setItemSpy).not.toHaveBeenCalled();
    expect(removeItemSpy).not.toHaveBeenCalled();
  });
});
