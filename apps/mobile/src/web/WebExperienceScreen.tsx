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

export const MYEXPLORER_WEB_URL = 'https://myexplorer-travel.vercel.app';

type Props = {
  onOpenNativePlanner: () => void;
};

export function WebExperienceScreen({onOpenNativePlanner}: Props) {
  const webViewRef = useRef<MyExplorerWebViewHandle | null>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<WebLoadErrorEvent | null>(null);
  const [showAbout, setShowAbout] = useState(false);
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
      if (showAbout) {
        setShowAbout(false);
        return true;
      }
      if (canGoBack) {
        webViewRef.current?.goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [canGoBack, showAbout]);

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
        <View style={styles.actionsRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Native Nav"
            style={styles.navChip}
            onPress={onOpenNativePlanner}>
            <Text style={styles.navChipText}>Native Nav</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="About"
            style={styles.aboutChip}
            onPress={() => setShowAbout(true)}>
            <Text style={styles.aboutChipText}>About</Text>
          </Pressable>
        </View>
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
                onPress={onOpenNativePlanner}>
                <Text style={styles.secondaryBtnText}>Native Nav</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="App Info"
                style={styles.secondaryBtn}
                onPress={() => setShowAbout(true)}>
                <Text style={styles.secondaryBtnText}>About</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>

      <Modal
        visible={showAbout}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAbout(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>About MyExplorer</Text>
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
              Trips planned in the web view are saved in web storage on this
              device. Use Native Nav for phone turn-by-turn navigation and
              Android Auto.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close About"
              style={styles.primaryBtn}
              onPress={() => setShowAbout(false)}>
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
    paddingHorizontal: 12,
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
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navChip: {
    backgroundColor: '#1d4ed8',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  navChipText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  aboutChip: {
    backgroundColor: '#1e3a5f',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  aboutChipText: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '600',
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
