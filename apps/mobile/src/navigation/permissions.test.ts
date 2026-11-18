import {PermissionsAndroid, Platform} from 'react-native';
import {requestAndroidNavigationPermissions} from './permissions';

describe('requestAndroidNavigationPermissions', () => {
  const originalOS = Platform.OS;
  const originalVersion = Platform.Version;

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', {value: originalOS, configurable: true});
    Object.defineProperty(Platform, 'Version', {value: originalVersion, configurable: true});
    jest.restoreAllMocks();
  });

  test('handles precise location granted on Android 13+', async () => {
    Object.defineProperty(Platform, 'OS', {value: 'android', configurable: true});
    Object.defineProperty(Platform, 'Version', {value: 34, configurable: true});

    jest.spyOn(PermissionsAndroid, 'requestMultiple').mockResolvedValue({
      [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION]:
        PermissionsAndroid.RESULTS.GRANTED,
      [PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION]:
        PermissionsAndroid.RESULTS.GRANTED,
      [PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS]:
        PermissionsAndroid.RESULTS.GRANTED,
    } as never);

    const res = await requestAndroidNavigationPermissions();
    expect(res.status).toBe('granted');
    expect(res.canStartNavigation).toBe(true);
    expect(res.notificationsGranted).toBe(true);
    expect(res.message).toBeNull();
  });

  test('blocks navigation when only approximate location is granted', async () => {
    Object.defineProperty(Platform, 'OS', {value: 'android', configurable: true});
    Object.defineProperty(Platform, 'Version', {value: 34, configurable: true});

    jest.spyOn(PermissionsAndroid, 'requestMultiple').mockResolvedValue({
      [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION]:
        PermissionsAndroid.RESULTS.DENIED,
      [PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION]:
        PermissionsAndroid.RESULTS.GRANTED,
      [PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS]:
        PermissionsAndroid.RESULTS.GRANTED,
    } as never);

    const res = await requestAndroidNavigationPermissions();
    expect(res.status).toBe('approximate-only');
    expect(res.canStartNavigation).toBe(false);
    expect(res.message).toContain('Precise Location');
  });

  test('reports permanently-denied when NEVER_ASK_AGAIN is returned', async () => {
    Object.defineProperty(Platform, 'OS', {value: 'android', configurable: true});
    Object.defineProperty(Platform, 'Version', {value: 34, configurable: true});

    jest.spyOn(PermissionsAndroid, 'requestMultiple').mockResolvedValue({
      [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION]:
        PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN,
      [PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION]:
        PermissionsAndroid.RESULTS.DENIED,
      [PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS]:
        PermissionsAndroid.RESULTS.DENIED,
    } as never);

    const res = await requestAndroidNavigationPermissions();
    expect(res.status).toBe('permanently-denied');
    expect(res.canStartNavigation).toBe(false);
    expect(res.message).toContain('App Settings');
  });
});
