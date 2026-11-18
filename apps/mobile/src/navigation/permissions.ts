import {Linking, PermissionsAndroid, Platform} from 'react-native';

export type NavigationPermissionStatus =
  | 'granted'
  | 'approximate-only'
  | 'denied'
  | 'permanently-denied';

export interface NavigationPermissionResult {
  status: NavigationPermissionStatus;
  canStartNavigation: boolean;
  notificationsGranted: boolean;
  message: string | null;
}

export async function requestAndroidNavigationPermissions(): Promise<NavigationPermissionResult> {
  if (Platform.OS !== 'android') {
    return {
      status: 'granted',
      canStartNavigation: true,
      notificationsGranted: true,
      message: null,
    };
  }

  const permissionsToRequest: Array<
    (typeof PermissionsAndroid.PERMISSIONS)[keyof typeof PermissionsAndroid.PERMISSIONS]
  > = [
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
  ];

  const androidVersion =
    typeof Platform.Version === 'number'
      ? Platform.Version
      : parseInt(String(Platform.Version), 10) || 0;

  if (androidVersion >= 33 && PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS) {
    permissionsToRequest.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  }

  const results = await PermissionsAndroid.requestMultiple(permissionsToRequest);
  const fine = results[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
  const coarse = results[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION];
  const notifications =
    androidVersion >= 33 && PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      ? results[PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS] ===
        PermissionsAndroid.RESULTS.GRANTED
      : true;

  if (fine === PermissionsAndroid.RESULTS.GRANTED) {
    return {
      status: 'granted',
      canStartNavigation: true,
      notificationsGranted: notifications,
      message: notifications
        ? null
        : 'Navigation can start, but notification permission was denied so background alerts may be hidden.',
    };
  }

  if (
    fine === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN ||
    coarse === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN
  ) {
    return {
      status: 'permanently-denied',
      canStartNavigation: false,
      notificationsGranted: notifications,
      message:
        'Precise location permission is permanently denied. Open App Settings to allow Precise Location for turn-by-turn navigation.',
    };
  }

  if (coarse === PermissionsAndroid.RESULTS.GRANTED) {
    return {
      status: 'approximate-only',
      canStartNavigation: false,
      notificationsGranted: notifications,
      message:
        'Only approximate location was granted. Turn-by-turn navigation requires Precise Location.',
    };
  }

  return {
    status: 'denied',
    canStartNavigation: false,
    notificationsGranted: notifications,
    message:
      'Location permission was denied. Grant Precise Location to start turn-by-turn navigation.',
  };
}

export async function openAppPermissionSettings(): Promise<void> {
  await Linking.openSettings();
}
