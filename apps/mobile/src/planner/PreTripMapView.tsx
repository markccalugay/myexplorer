import React, {useEffect, useMemo, useState} from 'react';
import {
  NativeEventEmitter,
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
} from '../navigation/mapZoom';
import type {Trip} from './domain';
import {buildPreTripMapModel} from './preTripMap';
import type {RouteState} from './route';

const EVENT_PRE_TRIP_MAP_ZOOM_CHANGED = 'MyExplorerPreTripMapZoomChanged';

type NativePreTripMapProps = {
  style?: ViewStyle;
  stopsJson: string;
  encodedPolyline: string | null;
};

let cachedPreTripMapView:
  | React.ComponentType<NativePreTripMapProps>
  | null
  | undefined;

function getNativePreTripMapView(): React.ComponentType<NativePreTripMapProps> | null {
  if (Platform.OS !== 'android') {
    return null;
  }
  if (cachedPreTripMapView === undefined) {
    try {
      cachedPreTripMapView = requireNativeComponent<NativePreTripMapProps>(
        'MyExplorerPreTripMapView',
      );
    } catch {
      cachedPreTripMapView = null;
    }
  }
  return cachedPreTripMapView;
}

type NativePreTripZoomModule = {
  zoomPreTripMap?: (delta: number) => Promise<string>;
  getPreTripMapZoomState?: () => Promise<string>;
  addListener?: (eventName: string) => void;
  removeListeners?: (count: number) => void;
};

export function PreTripMapView({
  trip,
  routeState,
  style,
}: {
  trip: Pick<Trip, 'stops' | 'routeSnapshot'>;
  routeState?: Pick<RouteState, 'status' | 'message'>;
  style?: ViewStyle;
}) {
  const [zoomState, setZoomState] = useState<MapZoomState>(
    DEFAULT_MAP_ZOOM_STATE,
  );
  const [mapError, setMapError] = useState<string | null>(null);

  const model = useMemo(
    () => buildPreTripMapModel(trip, routeState),
    [routeState, trip],
  );
  const stopsJson = useMemo(
    () => JSON.stringify(model.validStops),
    [model.validStops],
  );

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return undefined;
    }
    const mod = NativeModules.MyExplorerNavigation as
      | NativePreTripZoomModule
      | undefined;
    if (!mod) {
      return undefined;
    }
    let mounted = true;
    const emitter = new NativeEventEmitter(
      NativeModules.MyExplorerNavigation as never,
    );
    const subscription = emitter.addListener(
      EVENT_PRE_TRIP_MAP_ZOOM_CHANGED,
      (raw: string) => {
        if (mounted) {
          setZoomState(parseMapZoomState(raw));
          setMapError(null);
        }
      },
    );

    if (typeof mod.getPreTripMapZoomState === 'function') {
      mod
        .getPreTripMapZoomState()
        .then(raw => {
          if (mounted) {
            setZoomState(parseMapZoomState(raw));
          }
        })
        .catch(() => {
          if (mounted) {
            setMapError('Pre-trip map controls are currently unavailable.');
          }
        });
    }

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  const NativePreTripMap = getNativePreTripMapView();
  const zoomInEnabled = canZoomIn(zoomState);
  const zoomOutEnabled = canZoomOut(zoomState);

  const handleZoom = (delta: number) => {
    const mod = NativeModules.MyExplorerNavigation as
      | NativePreTripZoomModule
      | undefined;
    if (!mod || typeof mod.zoomPreTripMap !== 'function') {
      return;
    }
    mod
      .zoomPreTripMap(delta)
      .then(raw => {
        setZoomState(parseMapZoomState(raw));
        setMapError(null);
      })
      .catch(() => {
        setMapError('Map zoom is unavailable until the map finishes loading.');
      });
  };

  return (
    <View style={styles.wrapper} testID="pre-trip-map-wrapper">
      {NativePreTripMap ? (
        <View style={[styles.container, style]}>
          <NativePreTripMap
            style={styles.map}
            stopsJson={stopsJson}
            encodedPolyline={model.encodedPolyline}
          />
          {!zoomState.available ? (
            <View style={styles.loadingBadge} pointerEvents="none">
              <Text style={styles.loadingText} testID="pre-trip-map-loading">
                Loading map…
              </Text>
            </View>
          ) : null}
          <View style={styles.zoomControls} pointerEvents="box-none">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Zoom in pre-trip map"
              accessibilityHint="Zooms the pre-trip map in by one level"
              accessibilityState={{disabled: !zoomInEnabled}}
              testID="pre-trip-zoom-in-btn"
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
              accessibilityLabel="Zoom out pre-trip map"
              accessibilityHint="Zooms the pre-trip map out by one level"
              accessibilityState={{disabled: !zoomOutEnabled}}
              testID="pre-trip-zoom-out-btn"
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
      ) : (
        <View style={styles.fallbackBox} testID="pre-trip-map-unavailable">
          <Text style={styles.fallbackText}>
            Interactive native map preview is only available on Android.
          </Text>
        </View>
      )}

      <Text style={styles.statusText} testID="pre-trip-map-markers-status">
        Markers: {model.validStops.length} valid stop
        {model.validStops.length === 1 ? '' : 's'}
        {model.ignoredInvalidStopCount > 0
          ? ` (${model.ignoredInvalidStopCount} ignored with invalid coordinates)`
          : ''}
      </Text>
      <Text style={styles.statusText} testID="pre-trip-map-route-status">
        {model.routeOverlayMessage}
      </Text>
      {mapError ? (
        <Text style={styles.errorText} testID="pre-trip-map-error">
          {mapError}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 8,
  },
  container: {
    borderRadius: 16,
    height: 240,
    marginBottom: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  loadingBadge: {
    backgroundColor: 'rgba(8, 22, 36, 0.84)',
    borderRadius: 8,
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    position: 'absolute',
    top: 10,
  },
  loadingText: {
    color: '#e6f0fa',
    fontSize: 12,
    fontWeight: '600',
  },
  zoomControls: {
    gap: 8,
    position: 'absolute',
    right: 10,
    top: 10,
  },
  zoomButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(12, 31, 51, 0.9)',
    borderColor: '#4e779e',
    borderRadius: 12,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  zoomButtonPressed: {
    backgroundColor: '#1f4973',
  },
  zoomButtonDisabled: {
    opacity: 0.45,
  },
  zoomButtonText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 28,
  },
  fallbackBox: {
    backgroundColor: '#0e243a',
    borderColor: '#254a6e',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    padding: 14,
  },
  fallbackText: {
    color: '#b8cde0',
    fontSize: 13,
  },
  statusText: {
    color: '#b8cde0',
    fontSize: 13,
    lineHeight: 18,
  },
  errorText: {
    color: '#f2b880',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
});
