import {
  isNavigationSessionInProgress,
  type NavigationSessionSnapshot,
} from '../navigation/session';
import type {Trip} from '../planner/domain';

export type AppScreen = 'web' | 'home' | 'native';
export type NativeReturnTarget = 'web' | 'home';

export type HomeRecoveryState =
  | {kind: 'none'}
  | {
      kind: 'corrupt' | 'active-session' | 'draft';
      title: string;
      subtitle: string;
      actionLabel: string;
    };

export type LegalDestination = {
  id: 'privacy' | 'terms' | 'attribution' | 'permissions' | 'support';
  title: string;
  summary: string;
};

export const LEGAL_DESTINATIONS: LegalDestination[] = [
  {
    id: 'privacy',
    title: 'Privacy Policy',
    summary:
      'Trip drafts, saved trips, and active navigation snapshots stay on your device unless you choose to use web features. Full policy details remain in the web Legal section.',
  },
  {
    id: 'terms',
    title: 'Terms of Service',
    summary:
      'MyExplorer helps travelers explore places, plan stops, and reopen trips. Always follow local traffic laws and road conditions.',
  },
  {
    id: 'attribution',
    title: 'Maps Attribution',
    summary:
      'Map tiles, place search, and turn-by-turn guidance use Google Maps Platform and Android Geocoder where available.',
  },
  {
    id: 'permissions',
    title: 'Location Permissions',
    summary:
      'Location access is requested only when needed for turn-by-turn navigation and route guidance.',
  },
  {
    id: 'support',
    title: 'Support',
    summary:
      'Support and contact details are maintained in the web Legal & Support destination while native parity is being completed.',
  },
];

export function resolveBackNavigationTarget(params: {
  currentScreen: AppScreen;
  nativeReturnTarget: NativeReturnTarget;
  platformOs: string;
}): AppScreen | null {
  const {currentScreen, nativeReturnTarget, platformOs} = params;
  if (currentScreen === 'native') {
    if (nativeReturnTarget === 'home') {
      return 'home';
    }
    return platformOs === 'android' ? 'web' : null;
  }
  if (currentScreen === 'home') {
    return platformOs === 'android' ? 'web' : null;
  }
  return null;
}

export function deriveHomeRecoveryState(params: {
  navigationSession: NavigationSessionSnapshot;
  draftTrip: Trip | null;
}): HomeRecoveryState {
  const {navigationSession, draftTrip} = params;
  if (navigationSession.hasCorruptRecovery) {
    return {
      kind: 'corrupt',
      title: 'Saved session needs review',
      subtitle:
        navigationSession.recoveryError ||
        'Saved navigation session could not be restored. Review or explicitly discard recovery data in the planner.',
      actionLabel: 'Return to current trip',
    };
  }

  if (isNavigationSessionInProgress(navigationSession)) {
    const tripLabel = navigationSession.tripName || 'Current Trip';
    const statusLabel =
      navigationSession.status.charAt(0).toUpperCase() +
      navigationSession.status.slice(1);
    const detail = navigationSession.nextInstructionText
      ? `${statusLabel} • ${navigationSession.nextInstructionText}`
      : `${statusLabel} • Resume turn-by-turn guidance`;
    return {
      kind: 'active-session',
      title: tripLabel,
      subtitle: detail,
      actionLabel: 'Return to current trip',
    };
  }

  if (draftTrip && draftTrip.stops.length > 0) {
    return {
      kind: 'draft',
      title: draftTrip.name || 'Draft Trip',
      subtitle: `${draftTrip.stops.length} stop${draftTrip.stops.length === 1 ? '' : 's'} in local draft`,
      actionLabel: 'Return to current trip',
    };
  }

  return {kind: 'none'};
}
