import React from 'react';
import {Platform, StyleSheet, View, type ViewStyle, requireNativeComponent} from 'react-native';

const NativeNavigationView =
  Platform.OS === 'android'
    ? requireNativeComponent<{style?: ViewStyle}>('MyExplorerNavigationView')
    : null;

export function NavigationMapView({style}: {style?: ViewStyle}) {
  if (!NativeNavigationView) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      <NativeNavigationView style={styles.map} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    height: 240,
    marginBottom: 12,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
});
