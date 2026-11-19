import React, {forwardRef, useImperativeHandle, useRef} from 'react';
import {
  findNodeHandle,
  Platform,
  requireNativeComponent,
  StyleSheet,
  UIManager,
  View,
  type NativeSyntheticEvent,
  type ViewProps,
} from 'react-native';

export type WebLoadEvent = {
  url: string;
};

export type WebLoadErrorEvent = {
  code: number;
  description: string;
  url: string;
};

export type WebNavigationStateEvent = {
  canGoBack: boolean;
  url: string;
  title: string;
};

export type GeolocationRequestEvent = {
  origin: string;
};

export type TripExportedEvent = {
  payload: string;
};

type NativeWebViewProps = ViewProps & {
  url: string;
  onWebLoadStart?: (event: NativeSyntheticEvent<WebLoadEvent>) => void;
  onWebLoadEnd?: (event: NativeSyntheticEvent<WebLoadEvent>) => void;
  onWebLoadError?: (event: NativeSyntheticEvent<WebLoadErrorEvent>) => void;
  onWebNavigationStateChange?: (
    event: NativeSyntheticEvent<WebNavigationStateEvent>,
  ) => void;
  onGeolocationPermissionRequested?: (
    event: NativeSyntheticEvent<GeolocationRequestEvent>,
  ) => void;
  onTripExported?: (event: NativeSyntheticEvent<TripExportedEvent>) => void;
};

const NativeMyExplorerWebView =
  Platform.OS === 'android'
    ? requireNativeComponent<NativeWebViewProps>('MyExplorerWebView')
    : null;

export type MyExplorerWebViewHandle = {
  goBack: () => void;
  reload: () => void;
  resolveGeolocation: (granted: boolean) => void;
  exportTrip: () => void;
};

type Props = {
  url: string;
  onLoadStart?: (url: string) => void;
  onLoadEnd?: (url: string) => void;
  onLoadError?: (error: WebLoadErrorEvent) => void;
  onNavigationStateChange?: (state: WebNavigationStateEvent) => void;
  onGeolocationPermissionRequested?: (origin: string) => void;
  onTripExported?: (payload: string) => void;
};

function dispatchWebViewCommand(
  viewRef: React.RefObject<View | null>,
  commandName: string,
  args: unknown[] = [],
) {
  const handle = findNodeHandle(viewRef.current);
  if (handle == null) {
    return;
  }
  const config = UIManager.getViewManagerConfig('MyExplorerWebView');
  const commandId = config?.Commands?.[commandName];
  if (commandId == null) {
    return;
  }
  UIManager.dispatchViewManagerCommand(handle, commandId, args);
}

export const MyExplorerWebView = forwardRef<MyExplorerWebViewHandle, Props>(
  function MyExplorerWebView(
    {
      url,
      onLoadStart,
      onLoadEnd,
      onLoadError,
      onNavigationStateChange,
      onGeolocationPermissionRequested,
      onTripExported,
    },
    ref,
  ) {
    const nativeRef = useRef<View | null>(null);

    useImperativeHandle(ref, () => ({
      goBack: () => dispatchWebViewCommand(nativeRef, 'goBack'),
      reload: () => dispatchWebViewCommand(nativeRef, 'reload'),
      resolveGeolocation: (granted: boolean) =>
        dispatchWebViewCommand(nativeRef, 'resolveGeolocation', [granted]),
      exportTrip: () => dispatchWebViewCommand(nativeRef, 'exportTrip'),
    }));

    if (!NativeMyExplorerWebView) {
      return <View style={styles.fill} />;
    }

    return (
      <NativeMyExplorerWebView
        ref={nativeRef as unknown as React.RefObject<never>}
        style={styles.fill}
        url={url}
        onWebLoadStart={e => onLoadStart?.(e.nativeEvent.url)}
        onWebLoadEnd={e => onLoadEnd?.(e.nativeEvent.url)}
        onWebLoadError={e => onLoadError?.(e.nativeEvent)}
        onWebNavigationStateChange={e =>
          onNavigationStateChange?.(e.nativeEvent)
        }
        onGeolocationPermissionRequested={e =>
          onGeolocationPermissionRequested?.(e.nativeEvent.origin)
        }
        onTripExported={e => onTripExported?.(e.nativeEvent.payload)}
      />
    );
  },
);

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
