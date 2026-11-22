import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  AppState,
  BackHandler,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import appConfig from './app.json';
import {WebExperienceScreen} from './src/web/WebExperienceScreen';

import {
  cloneTrip,
  createEmptyTrip,
  createManualStop,
  formatStopTypeLabel,
  insertStopIntoTripStops,
  normalizeTrip,
  parseManualCoordinate,
  retypeStops,
  upsertSavedTrip,
  type Stop,
  type Trip,
} from './src/planner/domain';
import {
  buildRouteKey,
  createInitialRouteState,
  formatDistanceKm,
  formatDuration,
  formatDurationSeconds,
  routeSnapshotMatchesTrip,
  type RouteState,
} from './src/planner/route';
import {
  fetchRouteFromRoutingProxy,
  isRoutingProxyConfigured,
} from './src/planner/routingProxyClient';
import {
  placeResultToStop,
  searchPlacesByQuery,
  type PlaceSearchResult,
} from './src/planner/placeSearch';
import {
  loadPlannerState,
  persistDraftTrip,
  persistSavedTrips,
} from './src/planner/storage';
import {
  IDLE_NAVIGATION_SESSION,
  isNavigationSessionInProgress,
  navigationSessionMatchesTrip,
  pauseNativeNavigation,
  preserveConflictingDraftInSavedTrips,
  preserveSessionTripInSavedTrips,
  reconcileTripWithNavigationSession,
  restoreNavigationSession,
  resumeOrRetryNavigation,
  startNativeNavigation,
  stopNativeNavigation,
  subscribeToNavigationUpdates,
  type NavigationSessionSnapshot,
} from './src/navigation/session';
import {NavigationMapView} from './src/navigation/NavigationMapView';
import {openAppPermissionSettings} from './src/navigation/permissions';

type PendingAction =
  | {type: 'new-trip'}
  | {type: 'open-saved'; tripId: string};

type StopDraft = {
  name: string;
  formattedAddress: string;
  lat: string;
  lng: string;
};

const EMPTY_STOP_DRAFT: StopDraft = {
  name: '',
  formattedAddress: '',
  lat: '',
  lng: '',
};

const ROUTE_REFRESH_DEBOUNCE_MS = 800;

export function NativePlannerScreen({
  onBackToExplore,
  handoffTrip,
  handoffKey,
}: {
  onBackToExplore?: () => void;
  handoffTrip?: Trip | null;
  handoffKey?: number;
}) {
  const isDarkMode = useColorScheme() === 'dark';
  const [hasHydrated, setHasHydrated] = useState(false);
  const [savedTrips, setSavedTrips] = useState<Trip[]>([]);
  const [currentTrip, setCurrentTrip] = useState<Trip>(createEmptyTrip);
  const [tripBaselineSnapshot, setTripBaselineSnapshot] = useState<string | null>(null);
  const [stopDraft, setStopDraft] = useState<StopDraft>(EMPTY_STOP_DRAFT);
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeSearchResults, setPlaceSearchResults] = useState<PlaceSearchResult[]>([]);
  const [resultsForQuery, setResultsForQuery] = useState('');
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  const [placeSearchError, setPlaceSearchError] = useState<string | null>(null);
  const [hasSearchedPlaces, setHasSearchedPlaces] = useState(false);
  const searchRequestSeqRef = useRef(0);
  const [showPlaceSearch, setShowPlaceSearch] = useState(true);
  const [showManualCoordinates, setShowManualCoordinates] = useState(false);
  const [lastRemovedStop, setLastRemovedStop] = useState<{
    stop: Stop;
    index: number;
    tripId: string;
  } | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [recoveryConflict, setRecoveryConflict] = useState<{
    sessionTrip: Trip;
    message: string;
  } | null>(null);
  const [dismissedConflictKey, setDismissedConflictKey] = useState<string | null>(null);
  const [routeState, setRouteState] = useState<RouteState>(createInitialRouteState);
  const [navigationSession, setNavigationSession] = useState<NavigationSessionSnapshot>(
    IDLE_NAVIGATION_SESSION,
  );
  const routingProxyUrl = appConfig.routingProxyUrl?.trim() ?? '';

  useEffect(() => {
    if (!hasHydrated || !handoffTrip || !handoffKey) {
      return;
    }
    if (isNavigationSessionInProgress(navigationSession)) {
      setValidationMessage(
        'End active or paused navigation before loading a trip from web.',
      );
      return;
    }
    const nextTrip = cloneTrip(handoffTrip);
    setCurrentTrip(nextTrip);
    setTripBaselineSnapshot(JSON.stringify(normalizeTrip(nextTrip)));
    setSavedTrips(prev => upsertSavedTrip(prev, nextTrip));
    setPendingAction(null);
    setValidationMessage(
      `Loaded "${nextTrip.name}" (${nextTrip.stops.length} stops) from web.`,
    );
  }, [hasHydrated, handoffKey, handoffTrip, navigationSession]);

  useEffect(() => {
    const unsubscribe = subscribeToNavigationUpdates(snapshot => {
      setNavigationSession(snapshot);
    });
    restoreNavigationSession()
      .then(restored => {
        setNavigationSession(restored);
      })
      .catch(() => {});
    const appStateSub = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        restoreNavigationSession()
          .then(restored => {
            setNavigationSession(restored);
          })
          .catch(() => {});
      }
    });
    return () => {
      unsubscribe();
      appStateSub.remove();
    };
  }, []);

  const hasUnsavedChanges = useMemo(() => {
    if (tripBaselineSnapshot === null) {
      return false;
    }

    return normalizeTrip(currentTrip) !== tripBaselineSnapshot;
  }, [currentTrip, tripBaselineSnapshot]);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }
    const result = reconcileTripWithNavigationSession({
      currentTrip,
      session: navigationSession,
      hasUnsavedDraftChanges: hasUnsavedChanges,
    });
    if (result.action === 'none') {
      setRecoveryConflict(null);
      return;
    }
    if (result.action === 'error') {
      setRecoveryConflict(null);
      setValidationMessage(result.message);
      return;
    }
    if (result.action === 'conflict') {
      const conflictKey = `${navigationSession.sessionId}:${navigationSession.updatedAtMs}:${currentTrip.id}`;
      if (dismissedConflictKey !== conflictKey) {
        setRecoveryConflict({
          sessionTrip: result.sessionTrip,
          message: result.message,
        });
      }
      return;
    }
    setRecoveryConflict(null);
    setCurrentTrip(result.trip);
    setTripBaselineSnapshot(normalizeTrip(result.trip));
    setRouteState(getRouteStateForTrip(result.trip));
  }, [
    currentTrip,
    dismissedConflictKey,
    hasHydrated,
    hasUnsavedChanges,
    navigationSession,
  ]);

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      const state = await loadPlannerState();
      if (!isMounted) {
        return;
      }

      const restoredDraft = state.draftTrip ? cloneTrip(state.draftTrip) : createEmptyTrip();
      const restoredSavedTrips = state.savedTrips.map(savedTrip => cloneTrip(savedTrip));
      let restoredBaseline = normalizeTrip(restoredDraft);
      if (state.draftTrip) {
        if (state.draftBaselineSnapshot !== null) {
          restoredBaseline = state.draftBaselineSnapshot;
        } else {
          const matchingSaved = restoredSavedTrips.find(t => t.id === restoredDraft.id);
          if (matchingSaved) {
            restoredBaseline = normalizeTrip(matchingSaved);
          } else if (restoredDraft.stops.length > 0) {
            restoredBaseline = normalizeTrip(createEmptyTrip());
          }
        }
      }
      setSavedTrips(restoredSavedTrips);
      setCurrentTrip(restoredDraft);
      setTripBaselineSnapshot(restoredBaseline);
      setRouteState(getRouteStateForTrip(restoredDraft));
      setHasHydrated(true);
    };

    bootstrap().catch(error => {
      console.warn('Failed to load planner state.', error);
      if (isMounted) {
        const emptyTrip = createEmptyTrip();
        setCurrentTrip(emptyTrip);
        setTripBaselineSnapshot(normalizeTrip(emptyTrip));
        setRouteState(getRouteStateForTrip(emptyTrip));
        setHasHydrated(true);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    persistSavedTrips(savedTrips).catch(error => {
      console.warn('Failed to persist saved trips.', error);
    });
  }, [hasHydrated, savedTrips]);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    persistDraftTrip(currentTrip, tripBaselineSnapshot).catch(error => {
      console.warn('Failed to persist draft trip.', error);
    });
  }, [currentTrip, hasHydrated, tripBaselineSnapshot]);

  const currentRouteKey = useMemo(() => buildRouteKey(currentTrip.stops), [currentTrip.stops]);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (!currentRouteKey || !isRoutingProxyConfigured(routingProxyUrl)) {
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      try {
        const hasMatchingSnapshot = routeSnapshotMatchesTrip(currentTrip.routeSnapshot, {
          stops: currentTrip.stops,
        });
        setRouteState({
          status: hasMatchingSnapshot ? 'loading' : currentTrip.routeSnapshot ? 'stale' : 'loading',
          message: hasMatchingSnapshot
            ? 'Refreshing the route from the routing proxy...'
            : 'Requesting a route from the routing proxy...',
          activeRouteKey: currentRouteKey,
        });

        const routeSnapshot = await fetchRouteFromRoutingProxy(
          routingProxyUrl,
          currentTrip.stops,
          controller.signal,
        );

        setCurrentTrip(previousTrip => {
          if (buildRouteKey(previousTrip.stops) !== routeSnapshot.routeKey) {
            return previousTrip;
          }

          return {
            ...previousTrip,
            routeSnapshot,
          };
        });
        setRouteState({
          status: 'ready',
          message: 'Route is up to date.',
          activeRouteKey: routeSnapshot.routeKey,
        });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        const errorMessage =
          error instanceof Error ? error.message : 'Routing proxy refresh failed.';
        setRouteState({
          status: currentTrip.routeSnapshot ? 'stale' : 'error',
          message: errorMessage,
          activeRouteKey: currentRouteKey,
        });
      }
    }, ROUTE_REFRESH_DEBOUNCE_MS);

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [currentRouteKey, currentTrip.routeSnapshot, currentTrip.stops, hasHydrated, routingProxyUrl]);

  function queueOrRunAction(action: PendingAction) {
    if (isNavigationSessionInProgress(navigationSession)) {
      setValidationMessage(
        'End active or paused navigation before switching or creating a trip.',
      );
      return;
    }

    if (hasUnsavedChanges) {
      setPendingAction(action);
      return;
    }

    runPendingAction(action);
  }

  function runPendingAction(action: PendingAction) {
    setPendingAction(null);
    setValidationMessage(null);

    if (action.type === 'new-trip') {
      const nextTrip = createEmptyTrip();
      setCurrentTrip(nextTrip);
      setTripBaselineSnapshot(normalizeTrip(nextTrip));
      setStopDraft(EMPTY_STOP_DRAFT);
      setRouteState(getRouteStateForTrip(nextTrip));
      return;
    }

    const savedTrip = savedTrips.find(trip => trip.id === action.tripId);
    if (!savedTrip) {
      return;
    }

    const nextTrip = cloneTrip(savedTrip);
    setCurrentTrip(nextTrip);
    setTripBaselineSnapshot(normalizeTrip(nextTrip));
    setStopDraft(EMPTY_STOP_DRAFT);
    setRouteState(getRouteStateForTrip(nextTrip));
  }

  function discardPendingAction() {
    if (!pendingAction) {
      return;
    }

    runPendingAction(pendingAction);
  }

  function saveTrip() {
    setSavedTrips(previousTrips => upsertSavedTrip(previousTrips, currentTrip));
    setTripBaselineSnapshot(normalizeTrip(currentTrip));
    setValidationMessage('Trip saved to this device.');
  }

  function saveAndContinue() {
    saveTrip();
    if (pendingAction) {
      runPendingAction(pendingAction);
    }
  }

  function updateTripName(name: string) {
    setCurrentTrip(previousTrip => ({
      ...previousTrip,
      name,
    }));
  }

  function updateStopDraft(field: keyof StopDraft, value: string) {
    setStopDraft(previousDraft => ({
      ...previousDraft,
      [field]: value,
    }));
  }

  function invalidateRouteForStops(nextStops: Stop[]) {
    setRouteState({
      status: nextStops.length >= 2 ? 'stale' : 'idle',
      message:
        nextStops.length >= 2
          ? isRoutingProxyConfigured(routingProxyUrl)
            ? 'Stops changed. Recalculating route...'
            : 'Stops changed. Route preview invalidated (routing proxy not configured).'
          : 'Add at least two stops to calculate a route.',
      activeRouteKey: buildRouteKey(nextStops),
    });
  }

  function handleOpenPlaceSearch() {
    if (isNavigationSessionInProgress(navigationSession)) {
      setValidationMessage(
        'End active or paused navigation before editing, reordering, or removing stops.',
      );
      return;
    }
    setShowPlaceSearch(true);
    setPlaceSearchError(null);
  }

  function handlePlaceQueryChange(nextQuery: string) {
    searchRequestSeqRef.current += 1;
    setPlaceQuery(nextQuery);
    setPlaceSearchResults([]);
    setResultsForQuery('');
    setPlaceSearchError(null);
    setHasSearchedPlaces(false);
    setIsSearchingPlaces(false);
  }

  async function handleSearchPlaces() {
    if (isNavigationSessionInProgress(navigationSession)) {
      setValidationMessage(
        'End active or paused navigation before editing, reordering, or removing stops.',
      );
      return;
    }
    const requestId = ++searchRequestSeqRef.current;
    const submittedQuery = placeQuery.trim();
    setIsSearchingPlaces(true);
    setPlaceSearchError(null);
    try {
      const response = await searchPlacesByQuery(submittedQuery);
      if (requestId !== searchRequestSeqRef.current) {
        return;
      }
      setPlaceSearchResults(response.results);
      setResultsForQuery(submittedQuery);
      setHasSearchedPlaces(true);
      if (response.invalidCount > 0 && response.results.length > 0) {
        setValidationMessage(
          `Skipped ${response.invalidCount} place result(s) with missing or invalid coordinates.`,
        );
      }
    } catch (error) {
      if (requestId !== searchRequestSeqRef.current) {
        return;
      }
      setPlaceSearchResults([]);
      setResultsForQuery(submittedQuery);
      setHasSearchedPlaces(true);
      setPlaceSearchError(
        error instanceof Error
          ? error.message
          : 'Place search failed. Check your connection and try again.',
      );
    } finally {
      if (requestId === searchRequestSeqRef.current) {
        setIsSearchingPlaces(false);
      }
    }
  }

  function handleSelectPlaceResult(result: PlaceSearchResult) {
    if (isNavigationSessionInProgress(navigationSession)) {
      setValidationMessage(
        'End active or paused navigation before editing, reordering, or removing stops.',
      );
      return;
    }
    if (placeQuery.trim() !== resultsForQuery) {
      setPlaceSearchResults([]);
      setHasSearchedPlaces(false);
      return;
    }
    let nextStop: Stop;
    try {
      nextStop = placeResultToStop(result);
    } catch (error) {
      setPlaceSearchError(
        error instanceof Error ? error.message : 'Selected place is invalid.',
      );
      return;
    }
    const nextStops = insertStopIntoTripStops(currentTrip.stops, nextStop);
    setCurrentTrip(previousTrip => ({
      ...previousTrip,
      stops: nextStops,
      routeSnapshot: undefined,
    }));
    invalidateRouteForStops(nextStops);
    searchRequestSeqRef.current += 1;
    setPlaceQuery('');
    setPlaceSearchResults([]);
    setResultsForQuery('');
    setPlaceSearchError(null);
    setHasSearchedPlaces(false);
    setIsSearchingPlaces(false);
    setLastRemovedStop(null);
    setValidationMessage(`Added "${nextStop.name}" to trip.`);
  }

  function addStop() {
    if (isNavigationSessionInProgress(navigationSession)) {
      setValidationMessage(
        'End active or paused navigation before editing, reordering, or removing stops.',
      );
      return;
    }

    const name = stopDraft.name.trim();
    const lat = parseManualCoordinate(stopDraft.lat, -90, 90);
    const lng = parseManualCoordinate(stopDraft.lng, -180, 180);

    if (!name) {
      setValidationMessage('Add a stop name before saving it to the trip.');
      return;
    }

    if (lat === null || lng === null) {
      setValidationMessage('Valid latitude (-90..90) and longitude (-180..180) are required.');
      return;
    }

    const nextStop = createManualStop({
      name,
      formattedAddress: stopDraft.formattedAddress,
      lat,
      lng,
    });

    const nextStops = insertStopIntoTripStops(currentTrip.stops, nextStop);
    setCurrentTrip(previousTrip => ({
      ...previousTrip,
      stops: nextStops,
      routeSnapshot: undefined,
    }));
    invalidateRouteForStops(nextStops);
    setStopDraft(EMPTY_STOP_DRAFT);
    setLastRemovedStop(null);
    setValidationMessage(null);
  }

  function removeStop(stopId: string) {
    if (isNavigationSessionInProgress(navigationSession)) {
      setValidationMessage(
        'End active or paused navigation before editing, reordering, or removing stops.',
      );
      return;
    }

    const removedIndex = currentTrip.stops.findIndex(stop => stop.id === stopId);
    const removed = removedIndex >= 0 ? currentTrip.stops[removedIndex] : null;
    if (!removed) {
      return;
    }
    const nextStops = retypeStops(currentTrip.stops.filter(stop => stop.id !== stopId));
    setCurrentTrip(previousTrip => ({
      ...previousTrip,
      stops: nextStops,
      routeSnapshot: undefined,
    }));
    invalidateRouteForStops(nextStops);
    setLastRemovedStop({stop: removed, index: removedIndex, tripId: currentTrip.id});
  }

  function undoRemoveStop() {
    if (isNavigationSessionInProgress(navigationSession)) {
      setValidationMessage(
        'End active or paused navigation before editing, reordering, or removing stops.',
      );
      return;
    }
    if (!lastRemovedStop || lastRemovedStop.tripId !== currentTrip.id) {
      setLastRemovedStop(null);
      return;
    }
    const nextStops = [...currentTrip.stops];
    const insertAt = Math.min(Math.max(lastRemovedStop.index, 0), nextStops.length);
    nextStops.splice(insertAt, 0, lastRemovedStop.stop);
    const retyped = retypeStops(nextStops);
    setCurrentTrip(previousTrip => ({
      ...previousTrip,
      stops: retyped,
      routeSnapshot: undefined,
    }));
    invalidateRouteForStops(retyped);
    setValidationMessage(`Restored "${lastRemovedStop.stop.name}".`);
    setLastRemovedStop(null);
  }

  function moveStop(stopId: string, direction: -1 | 1) {
    if (isNavigationSessionInProgress(navigationSession)) {
      setValidationMessage(
        'End active or paused navigation before editing, reordering, or removing stops.',
      );
      return;
    }

    const currentIndex = currentTrip.stops.findIndex(stop => stop.id === stopId);
    const nextIndex = currentIndex + direction;

    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= currentTrip.stops.length) {
      return;
    }

    const nextStops = [...currentTrip.stops];
    const [movedStop] = nextStops.splice(currentIndex, 1);
    nextStops.splice(nextIndex, 0, movedStop);
    const retyped = retypeStops(nextStops);

    setCurrentTrip(previousTrip => ({
      ...previousTrip,
      stops: retyped,
      routeSnapshot: undefined,
    }));
    invalidateRouteForStops(retyped);
  }

  async function handleStartNavigation() {
    if (currentTrip.stops.length < 2) {
      setValidationMessage('Add at least a start and destination stop before starting navigation.');
      return;
    }
    try {
      const next = await startNativeNavigation(currentTrip);
      setNavigationSession(next);
      setValidationMessage(null);
    } catch (error) {
      setValidationMessage(
        error instanceof Error ? error.message : 'Unable to start turn-by-turn navigation.',
      );
    }
  }

  async function handlePauseNavigation() {
    try {
      const next = await pauseNativeNavigation();
      setNavigationSession(next);
    } catch (error) {
      setValidationMessage(
        error instanceof Error ? error.message : 'Unable to pause navigation.',
      );
    }
  }

  async function handleResumeNavigation() {
    try {
      const next = await resumeOrRetryNavigation(navigationSession, currentTrip);
      setNavigationSession(next);
      setValidationMessage(null);
    } catch (error) {
      setValidationMessage(
        error instanceof Error ? error.message : 'Unable to resume turn-by-turn navigation.',
      );
    }
  }

  async function handleStopNavigation() {
    try {
      const next = await stopNativeNavigation();
      setNavigationSession(next);
    } catch (error) {
      setValidationMessage(
        error instanceof Error ? error.message : 'Unable to stop navigation.',
      );
    }
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <SafeAreaView
        style={[
          styles.safeArea,
          isDarkMode ? styles.safeAreaDark : styles.safeAreaLight,
        ]}>
        <AppContent
          onBackToExplore={onBackToExplore}
          currentTrip={currentTrip}
          hasUnsavedChanges={hasUnsavedChanges}
          navigationSession={navigationSession}
          onCreateNewTrip={() => queueOrRunAction({type: 'new-trip'})}
          onDismissPendingAction={() => setPendingAction(null)}
          onDiscardPendingAction={discardPendingAction}
          onMoveStop={moveStop}
          onOpenSavedTrip={tripId => queueOrRunAction({type: 'open-saved', tripId})}
          onPauseNavigation={handlePauseNavigation}
          onRemoveStop={removeStop}
          onResumeNavigation={handleResumeNavigation}
          onSaveAndContinue={saveAndContinue}
          onSaveTrip={saveTrip}
          onStartNavigation={handleStartNavigation}
          onStopNavigation={handleStopNavigation}
          onStopDraftChange={updateStopDraft}
          onSubmitStop={addStop}
          onTripNameChange={updateTripName}
          pendingAction={pendingAction}
          recoveryConflict={recoveryConflict}
          onUseSessionTrip={async () => {
            if (!recoveryConflict) {
              return;
            }
            const nextTrip = cloneTrip(recoveryConflict.sessionTrip);
            const {nextSavedTrips, preservedTrip} =
              preserveConflictingDraftInSavedTrips({
                savedTrips,
                draftTrip: currentTrip,
                activeSessionTripId: nextTrip.id,
              });
            if (preservedTrip) {
              try {
                await persistSavedTrips(nextSavedTrips);
              } catch {
                setValidationMessage(
                  'Could not save your conflicting draft. Your draft was kept intact; please retry.',
                );
                return;
              }
              setSavedTrips(nextSavedTrips);
            }
            setRecoveryConflict(null);
            setCurrentTrip(nextTrip);
            setTripBaselineSnapshot(normalizeTrip(nextTrip));
            setRouteState(getRouteStateForTrip(nextTrip));
            setValidationMessage(
              preservedTrip
                ? 'Switched to active navigation trip. Your conflicting draft was preserved in Saved Trips.'
                : null,
            );
          }}
          onKeepDraftTrip={async () => {
            if (recoveryConflict) {
              const {nextSavedTrips, preservedTrip} =
                preserveSessionTripInSavedTrips({
                  savedTrips,
                  sessionTrip: recoveryConflict.sessionTrip,
                  currentDraftId: currentTrip.id,
                });
              if (preservedTrip) {
                try {
                  await persistSavedTrips(nextSavedTrips);
                } catch {
                  setValidationMessage(
                    'Could not save the active session trip to Saved Trips. Your draft was kept intact; please retry.',
                  );
                  return;
                }
                setSavedTrips(nextSavedTrips);
              }
            }
            setDismissedConflictKey(
              `${navigationSession.sessionId}:${navigationSession.updatedAtMs}:${currentTrip.id}`,
            );
            setRecoveryConflict(null);
            setValidationMessage(
              'Kept your draft. Active navigation session remains running and can be resumed from Turn-by-Turn Navigation.',
            );
          }}
          onOpenPlaceSearch={handleOpenPlaceSearch}
          onPlaceQueryChange={handlePlaceQueryChange}
          onSearchPlaces={handleSearchPlaces}
          onSelectPlaceResult={handleSelectPlaceResult}
          onToggleManualCoordinates={() => setShowManualCoordinates(prev => !prev)}
          onUndoRemoveStop={undoRemoveStop}
          placeQuery={placeQuery}
          placeSearchResults={placeSearchResults}
          isSearchingPlaces={isSearchingPlaces}
          placeSearchError={placeSearchError}
          hasSearchedPlaces={hasSearchedPlaces}
          showPlaceSearch={showPlaceSearch}
          showManualCoordinates={showManualCoordinates}
          lastRemovedStop={
            lastRemovedStop && lastRemovedStop.tripId === currentTrip.id
              ? lastRemovedStop.stop
              : null
          }
          routeState={routeState}
          routingProxyConfigured={isRoutingProxyConfigured(routingProxyUrl)}
          savedTrips={savedTrips}
          stopDraft={stopDraft}
          validationMessage={validationMessage}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function AppContent({
  currentTrip,
  hasUnsavedChanges,
  navigationSession,
  onBackToExplore,
  onCreateNewTrip,
  onDismissPendingAction,
  onDiscardPendingAction,
  onMoveStop,
  onOpenSavedTrip,
  onPauseNavigation,
  onRemoveStop,
  onResumeNavigation,
  onSaveAndContinue,
  onSaveTrip,
  onStartNavigation,
  onStopNavigation,
  onStopDraftChange,
  onSubmitStop,
  onTripNameChange,
  pendingAction,
  recoveryConflict,
  onUseSessionTrip,
  onKeepDraftTrip,
  onOpenPlaceSearch,
  onPlaceQueryChange,
  onSearchPlaces,
  onSelectPlaceResult,
  onToggleManualCoordinates,
  onUndoRemoveStop,
  placeQuery,
  placeSearchResults,
  isSearchingPlaces,
  placeSearchError,
  hasSearchedPlaces,
  showPlaceSearch,
  showManualCoordinates,
  lastRemovedStop,
  routeState,
  routingProxyConfigured,
  savedTrips,
  stopDraft,
  validationMessage,
}: {
  currentTrip: Trip;
  hasUnsavedChanges: boolean;
  navigationSession: NavigationSessionSnapshot;
  onBackToExplore?: () => void;
  onCreateNewTrip: () => void;
  onDismissPendingAction: () => void;
  onDiscardPendingAction: () => void;
  onMoveStop: (stopId: string, direction: -1 | 1) => void;
  onOpenSavedTrip: (tripId: string) => void;
  onPauseNavigation: () => void;
  onRemoveStop: (stopId: string) => void;
  onResumeNavigation: () => void;
  onSaveAndContinue: () => void;
  onSaveTrip: () => void;
  onStartNavigation: () => void;
  onStopNavigation: () => void;
  onStopDraftChange: (field: keyof StopDraft, value: string) => void;
  onSubmitStop: () => void;
  onTripNameChange: (name: string) => void;
  pendingAction: PendingAction | null;
  recoveryConflict: {sessionTrip: Trip; message: string} | null;
  onUseSessionTrip: () => void;
  onKeepDraftTrip: () => void;
  onOpenPlaceSearch: () => void;
  onPlaceQueryChange: (query: string) => void;
  onSearchPlaces: () => void;
  onSelectPlaceResult: (result: PlaceSearchResult) => void;
  onToggleManualCoordinates: () => void;
  onUndoRemoveStop: () => void;
  placeQuery: string;
  placeSearchResults: PlaceSearchResult[];
  isSearchingPlaces: boolean;
  placeSearchError: string | null;
  hasSearchedPlaces: boolean;
  showPlaceSearch: boolean;
  showManualCoordinates: boolean;
  lastRemovedStop: Stop | null;
  routeState: RouteState;
  routingProxyConfigured: boolean;
  savedTrips: Trip[];
  stopDraft: StopDraft;
  validationMessage: string | null;
}) {
  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Planner-First Mobile Build</Text>
          <Text style={styles.title}>Trip Planner</Text>
          <Text style={styles.body}>
            Build your itinerary, save it on-device, and reopen it before you hit the
            road.
          </Text>
        </View>

        <View style={styles.actionRow}>
          {onBackToExplore ? (
            <ActionButton label="Explore (Web)" onPress={onBackToExplore} />
          ) : null}
          <ActionButton label="New Trip" onPress={onCreateNewTrip} />
          <ActionButton label="Save Trip" onPress={onSaveTrip} />
          <ActionButton label="Resume" onPress={() => onOpenSavedTrip(currentTrip.id)} />
        </View>

        {validationMessage ? (
          <View style={styles.messageBanner}>
            <Text style={styles.messageText}>{validationMessage}</Text>
          </View>
        ) : null}

        {recoveryConflict ? (
          <View style={styles.pendingCard}>
            <Text style={styles.pendingTitle}>Trip recovery conflict</Text>
            <Text style={styles.pendingBody}>{recoveryConflict.message}</Text>
            <View style={styles.pendingActions}>
              <ActionButton label="Keep Draft" onPress={onKeepDraftTrip} />
              <ActionButton label="Use Active Trip" onPress={onUseSessionTrip} />
            </View>
          </View>
        ) : null}

        {pendingAction ? (
          <View style={styles.pendingCard}>
            <Text style={styles.pendingTitle}>Unsaved changes</Text>
            <Text style={styles.pendingBody}>
              Save this trip before switching, or discard your edits and continue.
            </Text>
            <View style={styles.pendingActions}>
              <ActionButton label="Keep Editing" onPress={onDismissPendingAction} />
              <ActionButton label="Discard Changes" onPress={onDiscardPendingAction} />
              <ActionButton label="Save & Continue" onPress={onSaveAndContinue} />
            </View>
          </View>
        ) : null}

        <SectionCard title="Current Trip">
          <LabeledInput
            label="Trip name"
            onChangeText={onTripNameChange}
            placeholder="Weekend getaway"
            value={currentTrip.name}
          />
          <Text style={styles.tripMeta}>
            {hasUnsavedChanges ? 'Draft has unsaved changes' : 'Draft is up to date'}
          </Text>
          <Text style={styles.tripMeta}>Stops: {currentTrip.stops.length}</Text>
        </SectionCard>

        <SectionCard title="Turn-by-Turn Navigation">
          {navigationSession.status !== 'idle' || currentTrip.stops.length >= 2 ? (
            <NavigationMapView />
          ) : null}
          <Text style={styles.tripMeta}>
            Session status: {navigationSession.status}
            {navigationSession.isRerouting ? ' (rerouting)' : ''}
            {navigationSession.status === 'paused' &&
            navigationSession.needsNavigatorReconnect
              ? ' (needs reconnect)'
              : ''}
          </Text>
          {isNavigationSessionInProgress(navigationSession) && navigationSession.tripName ? (
            <Text style={styles.tripMeta}>
              Navigating trip: {navigationSession.tripName}
            </Text>
          ) : null}
          {isNavigationSessionInProgress(navigationSession) &&
          !navigationSessionMatchesTrip(navigationSession, currentTrip) ? (
            <Text style={styles.tripMeta}>
              Notice: Active navigation is running for a different trip ({navigationSession.tripName || navigationSession.tripId}).
            </Text>
          ) : null}
          {navigationSession.nextInstructionText ? (
            <Text style={styles.tripMeta}>
              Next: {navigationSession.nextInstructionText}
            </Text>
          ) : null}
          {navigationSession.remainingDistanceMeters > 0 ? (
            <Text style={styles.tripMeta}>
              Next stop: {formatDistanceKm(navigationSession.remainingDistanceMeters)} ·{' '}
              {formatDurationSeconds(navigationSession.remainingDurationSeconds)}
            </Text>
          ) : null}
          {navigationSession.finalRemainingDistanceMeters > 0 ? (
            <Text style={styles.tripMeta}>
              Final destination:{' '}
              {formatDistanceKm(navigationSession.finalRemainingDistanceMeters)} ·{' '}
              {formatDurationSeconds(navigationSession.finalRemainingDurationSeconds)}
            </Text>
          ) : null}
          {navigationSession.lastError ? (
            <Text style={styles.tripMeta}>Notice: {navigationSession.lastError}</Text>
          ) : null}
          <View style={styles.actionRow}>
            {navigationSession.status === 'active' ||
            navigationSession.status === 'preparing' ||
            navigationSession.status === 'reconnecting' ? (
              <ActionButton compact label="Pause" onPress={onPauseNavigation} />
            ) : navigationSession.status === 'paused' ? (
              <ActionButton compact label="Resume Nav" onPress={onResumeNavigation} />
            ) : (
              <ActionButton compact label="Start Navigation" onPress={onStartNavigation} />
            )}
            {navigationSession.status !== 'idle' &&
            navigationSession.status !== 'abandoned' &&
            navigationSession.status !== 'completed' ? (
              <ActionButton compact label="End Navigation" onPress={onStopNavigation} />
            ) : null}
            {navigationSession.permissionStatus === 'permanently-denied' ||
            navigationSession.permissionStatus === 'approximate-only' ? (
              <ActionButton
                compact
                label="Open Settings"
                onPress={() => {
                  openAppPermissionSettings().catch(() => {});
                }}
              />
            ) : null}
          </View>
        </SectionCard>

        <SectionCard title="Add Stop">
          {isNavigationSessionInProgress(navigationSession) ? (
            <View style={styles.pendingCard}>
              <Text style={styles.pendingBody}>
                Navigation is {navigationSession.status}. End navigation before adding, reordering, or removing stops so your phone and Android Auto stay in sync.
              </Text>
              <View style={styles.pendingActions}>
                <ActionButton compact label="End Navigation" onPress={onStopNavigation} />
              </View>
            </View>
          ) : null}

          {showPlaceSearch ? (
            <View>
              <LabeledInput
                label="Search place or address"
                onChangeText={onPlaceQueryChange}
                placeholder="Search by place name or street address"
                value={placeQuery}
              />
              <View style={styles.actionRow}>
                <ActionButton compact label="Search" onPress={onSearchPlaces} />
                {placeQuery.trim().length > 0 ? (
                  <ActionButton
                    compact
                    label="Clear"
                    onPress={() => onPlaceQueryChange('')}
                  />
                ) : null}
                <ActionButton
                  compact
                  label={showManualCoordinates ? 'Hide manual entry' : 'Enter coordinates manually'}
                  onPress={onToggleManualCoordinates}
                />
              </View>

              {isSearchingPlaces ? (
                <View style={styles.searchLoadingRow}>
                  <ActivityIndicator size="small" color="#7dd3fc" />
                  <Text style={styles.tripMeta}>Searching places...</Text>
                </View>
              ) : null}

              {placeSearchError ? (
                <View style={styles.messageBanner}>
                  <Text style={styles.messageText}>{placeSearchError}</Text>
                  <View style={styles.pendingActions}>
                    <ActionButton compact label="Retry Search" onPress={onSearchPlaces} />
                  </View>
                </View>
              ) : null}

              {!isSearchingPlaces &&
              !placeSearchError &&
              hasSearchedPlaces &&
              placeSearchResults.length === 0 ? (
                <Text style={styles.emptyText}>
                  No places found for "{placeQuery}". Try a more specific name or address.
                </Text>
              ) : null}

              {placeSearchResults.map(result => (
                <View key={result.id} style={styles.searchResultCard}>
                  <View style={styles.searchResultCopy}>
                    <Text style={styles.searchResultTitle}>{result.name}</Text>
                    {result.formattedAddress ? (
                      <Text style={styles.searchResultAddress}>
                        {result.formattedAddress}
                      </Text>
                    ) : null}
                  </View>
                  <ActionButton
                    compact
                    label="Add"
                    onPress={() => onSelectPlaceResult(result)}
                  />
                </View>
              ))}
            </View>
          ) : null}

          {showManualCoordinates ? (
            <View style={styles.manualSection}>
              <LabeledInput
                label="Stop name"
                onChangeText={value => onStopDraftChange('name', value)}
                placeholder="Batangas Port"
                value={stopDraft.name}
              />
              <LabeledInput
                label="Address"
                onChangeText={value => onStopDraftChange('formattedAddress', value)}
                placeholder="Batangas City, Batangas"
                value={stopDraft.formattedAddress}
              />
              <View style={styles.coordinateRow}>
                <View style={styles.coordinateField}>
                  <LabeledInput
                    keyboardType="numeric"
                    label="Lat"
                    onChangeText={value => onStopDraftChange('lat', value)}
                    placeholder="13.7565"
                    value={stopDraft.lat}
                  />
                </View>
                <View style={styles.coordinateFieldLast}>
                  <LabeledInput
                    keyboardType="numeric"
                    label="Lng"
                    onChangeText={value => onStopDraftChange('lng', value)}
                    placeholder="121.0583"
                    value={stopDraft.lng}
                  />
                </View>
              </View>
              <ActionButton label="Add Stop to Trip" onPress={onSubmitStop} />
            </View>
          ) : null}
        </SectionCard>

        <SectionCard title="Stop Order">
          <View style={styles.actionRow}>
            <ActionButton compact label="Add stop" onPress={onOpenPlaceSearch} />
          </View>
          {lastRemovedStop ? (
            <View style={styles.undoBanner}>
              <Text style={styles.tripMeta}>
                Removed "{lastRemovedStop.name}".
              </Text>
              <ActionButton compact label="Undo" onPress={onUndoRemoveStop} />
            </View>
          ) : null}
          {currentTrip.stops.length === 0 ? (
            <Text style={styles.emptyText}>
              Tap "Add stop" and search for a place by name or address to build your trip.
            </Text>
          ) : (
            currentTrip.stops.map((stop, index) => (
              <StopCard
                key={stop.id}
                index={index}
                onMoveDown={() => onMoveStop(stop.id, 1)}
                onMoveUp={() => onMoveStop(stop.id, -1)}
                onRemove={() => onRemoveStop(stop.id)}
                stop={stop}
                totalStops={currentTrip.stops.length}
              />
            ))
          )}
        </SectionCard>

        <SectionCard title="Saved Trips">
          <Text style={styles.sectionHint}>
            Saved trips stay on this device so you can reopen them before the trip.
          </Text>
          {savedTrips.length === 0 ? (
            <Text style={styles.emptyText}>
              Save the current itinerary and it will show up here.
            </Text>
          ) : (
            savedTrips.map(savedTrip => (
              <View key={savedTrip.id} style={styles.savedTripCard}>
                <View style={styles.savedTripCopy}>
                  <Text style={styles.savedTripTitle}>{savedTrip.name}</Text>
                  <Text style={styles.savedTripMeta}>{savedTrip.stops.length} stops</Text>
                  <Text style={styles.savedTripMeta}>
                    Updated {formatTimestamp(savedTrip.updatedAt)}
                  </Text>
                </View>
                <ActionButton compact label="Open" onPress={() => onOpenSavedTrip(savedTrip.id)} />
              </View>
            ))
          )}
        </SectionCard>

        <SectionCard title="Route Status">
          <Text style={styles.sectionHint}>
            Automatic route refresh is {routingProxyConfigured ? 'enabled' : 'waiting for proxy setup'}.
          </Text>
          <Text style={styles.tripMeta}>Status: {routeState.status}</Text>
          <Text style={styles.tripMeta}>
            {routeState.message ?? 'No route request has been made yet.'}
          </Text>
          {currentTrip.routeSnapshot ? (
            <View style={styles.routeSummaryCard}>
              <Text style={styles.savedTripTitle}>Last known route</Text>
              <Text style={styles.savedTripMeta}>
                Distance {formatDistanceKm(currentTrip.routeSnapshot.totalDistanceMeters)}
              </Text>
              <Text style={styles.savedTripMeta}>
                Duration {formatDuration(currentTrip.routeSnapshot.totalDurationMillis)}
              </Text>
              <Text style={styles.savedTripMeta}>
                Legs {currentTrip.routeSnapshot.legs.length}
              </Text>
              <Text style={styles.savedTripMeta}>
                Refreshed {formatTimestamp(currentTrip.routeSnapshot.refreshedAt)}
              </Text>
            </View>
          ) : (
            <Text style={styles.emptyText}>
              No persisted route payload yet. Once the routing proxy is configured, the app
              will refresh automatically after structural trip edits.
            </Text>
          )}
        </SectionCard>
      </View>
    </ScrollView>
  );
}

function getRouteStateForTrip(trip: Trip): RouteState {
  const routeKey = buildRouteKey(trip.stops);
  if (!routeKey) {
    return {
      status: 'idle',
      message: 'Add at least two stops to request a route.',
      activeRouteKey: null,
    };
  }

  if (routeSnapshotMatchesTrip(trip.routeSnapshot, trip)) {
    return {
      status: 'ready',
      message: 'Restored the last known route payload from local storage.',
      activeRouteKey: routeKey,
    };
  }

  if (trip.routeSnapshot) {
    return {
      status: 'stale',
      message: 'The saved route payload no longer matches the current stop order.',
      activeRouteKey: routeKey,
    };
  }

  return {
    status: 'idle',
    message: 'Route refresh will start automatically once the proxy is configured.',
    activeRouteKey: routeKey,
  };
}

function ActionButton({
  compact = false,
  label,
  onPress,
}: {
  compact?: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({pressed}) => [
        styles.actionButton,
        compact ? styles.actionButtonCompact : null,
        pressed ? styles.actionButtonPressed : null,
      ]}>
      <Text style={styles.actionButtonLabel}>{label}</Text>
    </Pressable>
  );
}

function SectionCard({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function LabeledInput({
  keyboardType,
  label,
  onChangeText,
  placeholder,
  value,
}: {
  keyboardType?: 'default' | 'numeric';
  label: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#7b8ca3"
        style={styles.input}
        value={value}
      />
    </View>
  );
}

function StopCard({
  index,
  onMoveDown,
  onMoveUp,
  onRemove,
  stop,
  totalStops,
}: {
  index: number;
  onMoveDown: () => void;
  onMoveUp: () => void;
  onRemove: () => void;
  stop: Stop;
  totalStops: number;
}) {
  const canMoveUp = index > 0;
  const canMoveDown = index < totalStops - 1;

  return (
    <View style={styles.stopCard}>
      <View style={styles.stopCopy}>
        <Text style={styles.stopType}>{formatStopTypeLabel(stop.type)}</Text>
        <Text style={styles.stopName}>{stop.name}</Text>
        {stop.formattedAddress ? (
          <Text style={styles.stopAddress}>{stop.formattedAddress}</Text>
        ) : null}
        <Text style={styles.stopCoordinates}>
          {stop.location.lat.toFixed(4)}, {stop.location.lng.toFixed(4)}
        </Text>
      </View>
      <View style={styles.stopActions}>
        {canMoveUp ? <ActionButton compact label="Up" onPress={onMoveUp} /> : null}
        {canMoveDown ? <ActionButton compact label="Down" onPress={onMoveDown} /> : null}
        <ActionButton compact label="Remove" onPress={onRemove} />
      </View>
    </View>
  );
}

function formatTimestamp(value?: string) {
  if (!value) {
    return 'just now';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  safeAreaLight: {
    backgroundColor: '#f4f7fb',
  },
  safeAreaDark: {
    backgroundColor: '#07111d',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  container: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  hero: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    marginBottom: 18,
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  eyebrow: {
    color: '#2b6cb0',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.1,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  title: {
    color: '#0b1d35',
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 38,
    marginBottom: 12,
  },
  body: {
    color: '#425466',
    fontSize: 16,
    lineHeight: 24,
  },
  bodyDark: {
    color: '#d8e4f2',
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  actionButton: {
    backgroundColor: '#0f2741',
    borderRadius: 16,
    marginBottom: 10,
    marginRight: 10,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  actionButtonCompact: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  actionButtonPressed: {
    opacity: 0.85,
  },
  actionButtonLabel: {
    color: '#f7fbff',
    fontSize: 15,
    fontWeight: '700',
  },
  messageBanner: {
    backgroundColor: '#e9f4ff',
    borderColor: '#b8d9ff',
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  messageText: {
    color: '#0d4f8b',
    fontSize: 14,
    fontWeight: '600',
  },
  pendingCard: {
    backgroundColor: '#fff4dc',
    borderColor: '#f0c56b',
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 16,
    padding: 18,
  },
  pendingTitle: {
    color: '#6f4b00',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  pendingBody: {
    color: '#6f4b00',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  pendingActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  sectionCard: {
    backgroundColor: '#0f2741',
    borderRadius: 24,
    marginBottom: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  sectionTitle: {
    color: '#f7fbff',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 14,
  },
  sectionHint: {
    color: '#bfd3e5',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    color: '#8fb6d8',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#f7fbff',
    borderRadius: 16,
    color: '#0b1d35',
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  coordinateRow: {
    flexDirection: 'row',
  },
  coordinateField: {
    flex: 1,
    marginRight: 10,
  },
  coordinateFieldLast: {
    flex: 1,
  },
  tripMeta: {
    color: '#bfd3e5',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },
  emptyText: {
    color: '#bfd3e5',
    fontSize: 14,
    lineHeight: 21,
  },
  stopCard: {
    backgroundColor: '#173553',
    borderRadius: 20,
    marginBottom: 12,
    padding: 14,
  },
  stopCopy: {
    marginBottom: 10,
  },
  stopType: {
    color: '#8fb6d8',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  stopName: {
    color: '#f7fbff',
    fontSize: 18,
    fontWeight: '600',
  },
  stopAddress: {
    color: '#d6e3ef',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  stopCoordinates: {
    color: '#8fb6d8',
    fontSize: 13,
    marginTop: 6,
  },
  stopActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  savedTripCard: {
    alignItems: 'center',
    backgroundColor: '#173553',
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    padding: 14,
  },
  savedTripCopy: {
    flex: 1,
    marginRight: 12,
  },
  savedTripTitle: {
    color: '#f7fbff',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  savedTripMeta: {
    color: '#9fb8cf',
    fontSize: 13,
    lineHeight: 18,
  },
  routeSummaryCard: {
    backgroundColor: '#173553',
    borderRadius: 20,
    marginTop: 8,
    padding: 14,
  },
  searchLoadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  searchResultCard: {
    alignItems: 'center',
    backgroundColor: '#173553',
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    padding: 12,
  },
  searchResultCopy: {
    flex: 1,
    marginRight: 10,
  },
  searchResultTitle: {
    color: '#f7fbff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  searchResultAddress: {
    color: '#9fb8cf',
    fontSize: 13,
    lineHeight: 18,
  },
  manualSection: {
    borderTopColor: '#254a6e',
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 12,
  },
  undoBanner: {
    alignItems: 'center',
    backgroundColor: '#173553',
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});

function App() {
  const [screen, setScreen] = useState<'web' | 'native'>(
    Platform.OS === 'android' ? 'web' : 'native',
  );
  const [handoffTrip, setHandoffTrip] = useState<Trip | null>(null);
  const [handoffKey, setHandoffKey] = useState(0);
  const [navigationSession, setNavigationSession] = useState<NavigationSessionSnapshot>(
    IDLE_NAVIGATION_SESSION,
  );
  const [dismissedNoticeKey, setDismissedNoticeKey] = useState<string | null>(null);
  const hasAutoRestoredRef = useRef(false);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return undefined;
    }
    const syncSession = (allowAutoRestore: boolean) => {
      restoreNavigationSession()
        .then(restored => {
          setNavigationSession(restored);
          if (allowAutoRestore && !hasAutoRestoredRef.current) {
            hasAutoRestoredRef.current = true;
            if (isNavigationSessionInProgress(restored)) {
              setScreen('native');
            }
          }
        })
        .catch(() => {});
    };

    const unsubscribe = subscribeToNavigationUpdates(snapshot => {
      setNavigationSession(snapshot);
    });
    syncSession(true);

    const appStateSub = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        syncSession(false);
      }
    });

    return () => {
      unsubscribe();
      appStateSub.remove();
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android' || screen !== 'native') {
      return undefined;
    }
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setScreen('web');
      return true;
    });
    return () => sub.remove();
  }, [screen]);

  const currentNoticeKey = `${navigationSession.sessionId}:${navigationSession.status}`;
  const visibleWebSession =
    dismissedNoticeKey === currentNoticeKey &&
    !isNavigationSessionInProgress(navigationSession)
      ? null
      : navigationSession;

  if (screen === 'web') {
    return (
      <SafeAreaProvider>
        <WebExperienceScreen
          navigationSession={visibleWebSession}
          onReturnToCurrentTrip={() => setScreen('native')}
          onDismissSessionNotice={() => setDismissedNoticeKey(currentNoticeKey)}
          onOpenNativePlanner={trip => {
            if (trip) {
              setHandoffTrip(trip);
              setHandoffKey(k => k + 1);
            }
            setScreen('native');
          }}
        />
      </SafeAreaProvider>
    );
  }

  return (
    <NativePlannerScreen
      handoffTrip={handoffTrip}
      handoffKey={handoffKey}
      onBackToExplore={
        Platform.OS === 'android' ? () => setScreen('web') : undefined
      }
    />
  );
}

export default App;
