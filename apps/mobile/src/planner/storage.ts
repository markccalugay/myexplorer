import AsyncStorage from '@react-native-async-storage/async-storage';

import type {Trip} from './domain';

const SAVED_TRIPS_STORAGE_KEY = 'myexplorer.mobile.saved-trips';
const DRAFT_TRIP_STORAGE_KEY = 'myexplorer.mobile.draft-trip';

const parseTrips = (value: string | null): Trip[] => {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as Trip[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Failed to parse saved trips from storage.', error);
    return [];
  }
};

const parseTrip = (value: string | null): Trip | null => {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as Trip;
  } catch (error) {
    console.warn('Failed to parse draft trip from storage.', error);
    return null;
  }
};

export async function loadPlannerState(): Promise<{
  savedTrips: Trip[];
  draftTrip: Trip | null;
}> {
  const [savedTripsValue, draftTripValue] = await Promise.all([
    AsyncStorage.getItem(SAVED_TRIPS_STORAGE_KEY),
    AsyncStorage.getItem(DRAFT_TRIP_STORAGE_KEY),
  ]);

  return {
    savedTrips: parseTrips(savedTripsValue),
    draftTrip: parseTrip(draftTripValue),
  };
}

export async function persistSavedTrips(savedTrips: Trip[]): Promise<void> {
  await AsyncStorage.setItem(SAVED_TRIPS_STORAGE_KEY, JSON.stringify(savedTrips));
}

export async function persistDraftTrip(trip: Trip): Promise<void> {
  await AsyncStorage.setItem(DRAFT_TRIP_STORAGE_KEY, JSON.stringify(trip));
}
