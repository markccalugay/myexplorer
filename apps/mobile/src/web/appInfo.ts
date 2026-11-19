import {NativeModules, Platform} from 'react-native';

export type AppInfo = {
  packageName: string;
  versionName: string;
  versionCode: number;
};

type NativeAppInfoModule = {
  getAppInfo?: () => Promise<AppInfo>;
};

export async function getRuntimeAppInfo(): Promise<AppInfo | null> {
  if (Platform.OS !== 'android') {
    return null;
  }
  const mod = NativeModules.MyExplorerAppInfo as NativeAppInfoModule | undefined;
  if (!mod?.getAppInfo) {
    return null;
  }
  return mod.getAppInfo();
}

export function formatAppVersionLabel(info: AppInfo | null): string {
  if (!info) {
    return 'Version unavailable';
  }
  return `Version ${info.versionName} (${info.versionCode})`;
}
