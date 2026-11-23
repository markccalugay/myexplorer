import React, {useEffect, useState} from 'react';
import {
  NativeModules,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
  requireNativeComponent,
} from 'react-native';
import {
  canZoomIn,
  canZoomOut,
  DEFAULT_MAP_ZOOM_STATE,
  parseMapZoomState,
  type MapZoomState,
} from './mapZoom';

let cachedNativeView: React.ComponentType<{style?: ViewStyle}> | null | undefined;

function getNativeNavigationView(): React.ComponentType<{style?: ViewStyle}> | null {
  if (Platform.OS !== 'android') {
    return null;
  }
  if (cachedNativeView === undefined) {
    cachedNativeView = requireNativeComponent<{style?: ViewStyle}>(
      'MyExplorerNavigationView',
    );
  }
  return cachedNativeView;
}

type NativeMapZoomModule = {
  zoomMap?: (delta: number) => Promise<string>;
  getMapZoomState?: () => Promise<string>;
};

export function NavigationMapView({style}: {style?: ViewStyle}) {
  const [zoomState, setZoomState] = useState<MapZoomState>(DEFAULT_MAP_ZOOM_STATE);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return undefined;
    }
    const mod = NativeModules.MyExplorerNavigation as NativeMapZoomModule | undefined;
    if (!mod || typeof mod.getMapZoomState !== 'function') {
      return undefined;
    }
    let mounted = true;
    const refresh = () => {
      mod
        .getMapZoomState?.()
        .then(raw => {
          if (mounted) {
            setZoomState(parseMapZoomState(raw));
          }
        })
        .catch(() => {});
    };
    refresh();
    const timer = setTimeout(refresh, 500);
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, []);

  const NativeNavigationView = getNativeNavigationView();
  if (!NativeNavigationView) {
    return null;
  }

  const handleZoom = (delta: number) => {
    const mod = NativeModules.MyExplorerNavigation as NativeMapZoomModule | undefined;
    if (!mod || typeof mod.zoomMap !== 'function') {
      return;
    }
    mod
      .zoomMap(delta)
      .then(raw => {
        setZoomState(parseMapZoomState(raw));
      })
      .catch(() => {});
  };

  const zoomInEnabled = canZoomIn(zoomState);
  const zoomOutEnabled = canZoomOut(zoomState);

  return (
    <View style={[styles.container, style]}>
      <NativeNavigationView style={styles.map} />
      <View style={styles.zoomControls} pointerEvents="box-none">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Zoom in"
          accessibilityHint="Zooms the navigation map in by one level"
          accessibilityState={{disabled: !zoomInEnabled}}
          disabled={!zoomInEnabled}
          onPress={() => handleZoom(1)}
          style={({pressed}) => [
            styles.zoomButton,
            !zoomInEnabled && styles.zoomButtonDisabled,
            pressed && zoomInEnabled && styles.zoomButtonPressed,
          ]}>
          <Text style={styles.zoomButtonText}>+</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Zoom out"
          accessibilityHint="Zooms the navigation map out by one level"
          accessibilityState={{disabled: !zoomOutEnabled}}
          disabled={!zoomOutEnabled}
          onPress={() => handleZoom(-1)}
          style={({pressed}) => [
            styles.zoomButton,
            !zoomOutEnabled && styles.zoomButtonDisabled,
            pressed && zoomOutEnabled && styles.zoomButtonPressed,
          ]}>
          <Text style={styles.zoomButtonText}>−</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    height: 240,
    marginBottom: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  zoomControls: {
    position: 'absolute',
    right: 10,
    top: 10,
    gap: 8,
  },
  zoomButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(11, 29, 53, 0.9)',
    borderColor: '#3d638c',
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 48,
  },
  zoomButtonDisabled: {
    opacity: 0.45,
  },
  zoomButtonPressed: {
    opacity: 0.75,
  },
  zoomButtonText: {
    color: '#f7fbff',
    fontSize: 22,
    fontWeight: '700',
  },
});
