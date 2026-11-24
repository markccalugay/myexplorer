import React, {useEffect, useState} from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {type NavigationSessionSnapshot} from '../navigation/session';
import type {Trip} from '../planner/domain';
import {loadPlannerState} from '../planner/storage';
import {
  formatAppVersionLabel,
  getRuntimeAppInfo,
  type AppInfo,
} from '../web/appInfo';
import {
  deriveHomeRecoveryState,
  LEGAL_DESTINATIONS,
  type LegalDestination,
} from './homeNavigation';

type NativeHomeScreenProps = {
  navigationSession: NavigationSessionSnapshot;
  onPlanTrip: () => void;
  onReturnToCurrentTrip: () => void;
  onOpenSavedTrip: (trip: Trip) => void;
  onBackToWeb?: () => void;
};

export function NativeHomeScreen({
  navigationSession,
  onPlanTrip,
  onReturnToCurrentTrip,
  onOpenSavedTrip,
  onBackToWeb,
}: NativeHomeScreenProps) {
  const [savedTrips, setSavedTrips] = useState<Trip[]>([]);
  const [draftTrip, setDraftTrip] = useState<Trip | null>(null);
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [selectedLegal, setSelectedLegal] = useState<LegalDestination | null>(
    null,
  );

  useEffect(() => {
    let mounted = true;
    loadPlannerState()
      .then(state => {
        if (!mounted) {
          return;
        }
        setSavedTrips(state.savedTrips);
        setDraftTrip(state.draftTrip);
      })
      .catch(() => {
        if (!mounted) {
          return;
        }
        setSavedTrips([]);
        setDraftTrip(null);
      });

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

  const recoveryState = deriveHomeRecoveryState({
    navigationSession,
    draftTrip,
  });

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>MyExplorer • Native Phone Home (Dev Preview)</Text>
          <Text style={styles.title}>Plan your next road trip</Text>
          <Text style={styles.subtitle}>
            Core native journey preview. Discovery, Convoy, and full web
            capabilities remain in the web experience until #84 parity is
            complete.
          </Text>
          <View style={styles.heroActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Plan a trip"
              testID="home-plan-trip-btn"
              style={styles.primaryBtn}
              onPress={onPlanTrip}>
              <Text style={styles.primaryBtnText}>Plan a trip</Text>
            </Pressable>
            {onBackToWeb ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Back to Explore"
                testID="home-back-to-web-btn"
                style={styles.secondaryBtn}
                onPress={onBackToWeb}>
                <Text style={styles.secondaryBtnText}>Back to Explore</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {recoveryState.kind !== 'none' ? (
          <View
            style={[
              styles.card,
              recoveryState.kind === 'corrupt' ? styles.cardWarning : null,
            ]}
            testID="home-recovery-card">
            <Text style={styles.cardEyebrow}>
              {recoveryState.kind === 'corrupt'
                ? 'Recovery Required'
                : 'Current Trip'}
            </Text>
            <Text style={styles.cardTitle}>{recoveryState.title}</Text>
            <Text style={styles.cardBody}>{recoveryState.subtitle}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={recoveryState.actionLabel}
              testID="home-return-to-trip-btn"
              style={styles.primaryBtn}
              onPress={onReturnToCurrentTrip}>
              <Text style={styles.primaryBtnText}>
                {recoveryState.actionLabel}
              </Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>Saved Trips</Text>
          <Text style={styles.cardTitle}>
            {savedTrips.length === 0
              ? 'No saved trips yet'
              : `${savedTrips.length} saved trip${savedTrips.length === 1 ? '' : 's'}`}
          </Text>
          {savedTrips.length === 0 ? (
            <Text style={styles.cardBody}>
              Save a trip in the native planner to reopen it here offline.
            </Text>
          ) : (
            <View style={styles.savedList}>
              {savedTrips.map(trip => (
                <View
                  key={trip.id}
                  style={styles.savedRow}
                  testID={`home-saved-trip-${trip.id}`}>
                  <View style={styles.savedMeta}>
                    <Text style={styles.savedName}>{trip.name}</Text>
                    <Text style={styles.savedDetail}>
                      {trip.stops.length} stop{trip.stops.length === 1 ? '' : 's'}
                      {trip.convoy ? ' • Convoy data preserved' : ''}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${trip.name}`}
                    testID={`home-open-trip-${trip.id}`}
                    style={styles.secondaryBtn}
                    onPress={() => onOpenSavedTrip(trip)}>
                    <Text style={styles.secondaryBtnText}>Open</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>App Info &amp; Legal</Text>
          <Text style={styles.cardTitle} testID="home-app-version-text">
            {formatAppVersionLabel(appInfo)}
          </Text>
          {appInfo ? (
            <Text style={styles.cardBody}>Package: {appInfo.packageName}</Text>
          ) : null}
          <View style={styles.legalList}>
            {LEGAL_DESTINATIONS.map(item => (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={item.title}
                testID={`home-legal-${item.id}`}
                style={styles.legalBtn}
                onPress={() => setSelectedLegal(item)}>
                <Text style={styles.legalBtnText}>{item.title}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={selectedLegal !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedLegal(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{selectedLegal?.title}</Text>
            <Text style={styles.cardBody}>{selectedLegal?.summary}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close legal info"
              testID="home-legal-close-btn"
              style={styles.primaryBtn}
              onPress={() => setSelectedLegal(null)}>
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
    backgroundColor: '#0c1f33',
    flex: 1,
  },
  scrollContent: {
    gap: 14,
    padding: 16,
  },
  hero: {
    backgroundColor: '#122c47',
    borderColor: '#244a70',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  eyebrow: {
    color: '#7fb5e6',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  title: {
    color: '#f7fbff',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 6,
  },
  subtitle: {
    color: '#b8cde0',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  heroActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  card: {
    backgroundColor: '#122c47',
    borderColor: '#244a70',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  cardWarning: {
    borderColor: '#d9822b',
  },
  cardEyebrow: {
    color: '#7fb5e6',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  cardTitle: {
    color: '#f7fbff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  cardBody: {
    color: '#b8cde0',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  primaryBtn: {
    alignItems: 'center',
    backgroundColor: '#2c7be5',
    borderRadius: 10,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    alignItems: 'center',
    backgroundColor: '#1c3d5e',
    borderColor: '#366491',
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  secondaryBtnText: {
    color: '#e6f0fa',
    fontSize: 14,
    fontWeight: '600',
  },
  savedList: {
    gap: 10,
    marginTop: 6,
  },
  savedRow: {
    alignItems: 'center',
    backgroundColor: '#0e243a',
    borderColor: '#204263',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
  },
  savedMeta: {
    flex: 1,
    paddingRight: 10,
  },
  savedName: {
    color: '#f7fbff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  savedDetail: {
    color: '#9fb8cf',
    fontSize: 13,
  },
  legalList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  legalBtn: {
    backgroundColor: '#173553',
    borderColor: '#2d5882',
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  legalBtnText: {
    color: '#d8e7f5',
    fontSize: 13,
    fontWeight: '600',
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(6, 14, 24, 0.72)',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#122c47',
    borderColor: '#2d5882',
    borderRadius: 16,
    borderWidth: 1,
    maxWidth: 420,
    padding: 18,
    width: '100%',
  },
  modalTitle: {
    color: '#f7fbff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
});
