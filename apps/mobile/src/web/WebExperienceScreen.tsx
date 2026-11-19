import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Modal,
  PermissionsAndroid,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {Trip} from '../planner/domain';
import {
  formatAppVersionLabel,
  getRuntimeAppInfo,
  type AppInfo,
} from './appInfo';
import {
  MyExplorerWebView,
  type MyExplorerWebViewHandle,
  type WebLoadErrorEvent,
} from './MyExplorerWebView';
import {parseWebTripHandoff} from './tripHandoff';

export const MYEXPLORER_WEB_URL = 'https://myexplorer-travel.vercel.app';

type Props = {
  onOpenNativePlanner: (handoffTrip: Trip | null) => void;
};

export function WebExperienceScreen({onOpenNativePlanner}: Props) {
  const webViewRef = useRef<MyExplorerWebViewHandle | null>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<WebLoadErrorEvent | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showAppInfo, setShowAppInfo] = useState(false);
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);

  useEffect(() => {
    let mounted = true;
    getRuntimeAppInfo()
      .then(info => {
        if (mounted) {
          setAppInfo(info);
        }
      })
      .catch(() => {
        if (mounted) {
          setAppInfo(null);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (showAppInfo) {
        setShowAppInfo(false);
        return true;
      }
      if (showMenu) {
        setShowMenu(false);
        return true;
      }
      if (canGoBack) {
        webViewRef.current?.goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [canGoBack, showAppInfo, showMenu]);

  const handleGeolocationRequest = useCallback(async () => {
    if (Platform.OS !== 'android') {
      webViewRef.current?.resolveGeolocation(false);
      return;
    }
    try {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'MyExplorer Location Access',
          message:
            'Allow MyExplorer to use your location for nearby places and map centering.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        },
      );
      webViewRef.current?.resolveGeolocation(
        result === PermissionsAndroid.RESULTS.GRANTED,
      );
    } catch {
      webViewRef.current?.resolveGeolocation(false);
    }
  }, []);

  const handleRetry = useCallback(() => {
    setLoadError(null);
    setIsLoading(true);
    webViewRef.current?.reload();
  }, []);

  const handleOpenNativeNav = useCallback(() => {
    setShowMenu(false);
    if (loadError) {
      onOpenNativePlanner(null);
      return;
    }
    webViewRef.current?.exportTrip();
  }, [loadError, onOpenNativePlanner]);

  const handleTripExported = useCallback(
    (payload: string) => {
      const trip = parseWebTripHandoff(payload);
      onOpenNativePlanner(trip);
    },
    [onOpenNativePlanner],
  );

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0b1f33" />
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <Text style={styles.brandTitle}>MyExplorer</Text>
          {isLoading && !loadError ? (
            <ActivityIndicator
              size="small"
              color="#7dd3fc"
              style={styles.spinner}
            />
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Menu"
          style={styles.menuButton}
          onPress={() => setShowMenu(true)}>
          <Text style={styles.menuIcon}>☰</Text>
        </Pressable>
      </View>

      <View style={styles.webContainer}>
        <MyExplorerWebView
          ref={webViewRef}
          url={MYEXPLORER_WEB_URL}
          onLoadStart={() => {
            setIsLoading(true);
            setLoadError(null);
          }}
          onLoadEnd={() => {
            setIsLoading(false);
          }}
          onLoadError={err => {
            setIsLoading(false);
            setLoadError(err);
          }}
          onNavigationStateChange={state => {
            setCanGoBack(state.canGoBack);
          }}
          onGeolocationPermissionRequested={() => {
            handleGeolocationRequest().catch(() => {});
          }}
          onTripExported={handleTripExported}
        />

        {loadError ? (
          <View style={styles.errorOverlay}>
            <Text style={styles.errorTitle}>Unable to load MyExplorer</Text>
            <Text style={styles.errorBody}>
              {loadError.description} ({loadError.code})
            </Text>
            <View style={styles.errorActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Retry"
                style={styles.primaryBtn}
                onPress={handleRetry}>
                <Text style={styles.primaryBtnText}>Retry</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open Native Planner"
                style={styles.secondaryBtn}
                onPress={() => onOpenNativePlanner(null)}>
                <Text style={styles.secondaryBtnText}>Native Nav</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="App info"
                style={styles.secondaryBtn}
                onPress={() => setShowAppInfo(true)}>
                <Text style={styles.secondaryBtnText}>App info</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>

      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}>
        <Pressable
          style={styles.menuBackdrop}
          onPress={() => setShowMenu(false)}>
          <View style={styles.menuCard}>
            <Text style={styles.menuHeading}>MyExplorer</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Navigate Current Trip"
              style={styles.menuItemPrimary}
              onPress={handleOpenNativeNav}>
              <Text style={styles.menuItemPrimaryText}>
                Navigate Current Trip (Native Nav)
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Reload"
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                handleRetry();
              }}>
              <Text style={styles.menuItemText}>Reload</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="App info"
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                setShowAppInfo(true);
              }}>
              <Text style={styles.menuItemText}>App info</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={showAppInfo}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAppInfo(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>App info</Text>
            <Text style={styles.modalVersion} testID="app-version-text">
              {formatAppVersionLabel(appInfo)}
            </Text>
            {appInfo ? (
              <Text style={styles.modalMeta}>
                Package: {appInfo.packageName}
              </Text>
            ) : null}
            <Text style={styles.modalMeta}>
              Web Experience: {MYEXPLORER_WEB_URL}
            </Text>
            <Text style={styles.modalNote}>
              Save a trip in the web planner, then open the menu and choose
              Navigate Current Trip to hand off its stops to phone turn-by-turn
              navigation.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close App info"
              style={styles.primaryBtn}
              onPress={() => setShowAppInfo(false)}>
              <Text style={styles.primaryBtnText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0b1f33',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#0b1f33',
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
  },
  spinner: {
    marginLeft: 8,
  },
  menuButton: {
    backgroundColor: '#1e3a5f',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  menuIcon: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
  },
  webContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0b1f33',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorTitle: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  errorBody: {
    color: '#cbd5e1',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  errorActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  primaryBtn: {
    backgroundColor: '#1d4ed8',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryBtn: {
    backgroundColor: '#1e3a5f',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  secondaryBtnText: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '600',
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.55)',
    alignItems: 'flex-end',
    paddingTop: 58,
    paddingRight: 12,
  },
  menuCard: {
    width: 260,
    backgroundColor: '#102a43',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#244a70',
    gap: 8,
  },
  menuHeading: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    paddingHorizontal: 6,
  },
  menuItemPrimary: {
    backgroundColor: '#1d4ed8',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  menuItemPrimaryText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  menuItem: {
    backgroundColor: '#173553',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  menuItemText: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#102a43',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#244a70',
  },
  modalTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalVersion: {
    color: '#7dd3fc',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  modalMeta: {
    color: '#cbd5e1',
    fontSize: 13,
    marginBottom: 6,
  },
  modalNote: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
    marginBottom: 16,
  },
});
