/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {Text} from 'react-native';
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
    const ReactNative = require('react-native');
    return <ReactNative.View>{children}</ReactNative.View>;
  },
  SafeAreaView: ({children}: {children: React.ReactNode}) => {
    const ReactNative = require('react-native');
    return <ReactNative.View>{children}</ReactNative.View>;
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
