/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {Text} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import App from '../App';

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
    renderer = ReactTestRenderer.create(<App />);
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
    renderer = ReactTestRenderer.create(<App />);
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
