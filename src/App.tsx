import { useEffect, useMemo, useState } from 'react';
import { Navbar } from './components/Navbar';
import { SearchBar } from './components/SearchBar';
import { DestinationCard } from './components/Card';
import Map from './components/Map';
import { LocationDetail } from './components/LocationDetail';
import { RoutePlanner } from './components/RoutePlanner';
import { TripPlanner } from './components/TripPlanner';
import { ExplorePage } from './components/ExplorePage';
import { Bookings } from './components/Bookings';
import { BrandLogo } from './components/BrandLogo';
import { isGoogleMapsConfigurationError, useGoogleMaps } from './hooks/useGoogleMaps';
import { usePlaces } from './hooks/usePlaces';
import { usePitstops } from './hooks/usePitstops';
import { Trip } from './types/trip';
import { AppPlace } from './types/place';
import { AppRoute } from './lib/googleRoutes';
import { createEmptyTrip, cloneTrip, normalizeLoadedTrip, normalizeTrip, type LegacyTrip } from './lib/tripDocument';
import './App.css';

import hotelImg from './assets/hotel.png';

const MOCK_LODGING_IMAGE = hotelImg;
const SAVED_TRIPS_STORAGE_KEY = 'myexplorer.saved-trips';

type AppView = 'explore' | 'discovery' | 'planner' | 'bookings';
interface TripState {
    currentTrip: Trip;
    tripBaselineSnapshot: string | null;
}
type PlannerOverlayIntent = 'vehicles' | 'invite' | 'assignments' | null;

const createInitialTripState = (): TripState => {
    const trip = createEmptyTrip();
    return {
        currentTrip: trip,
        tripBaselineSnapshot: normalizeTrip(trip),
    };
};

const App = () => {
    const [center, setCenter] = useState({ lat: 14.5995, lng: 120.9842 });
    const [zoom, setZoom] = useState(12);
    const [selectedPlace, setSelectedPlace] = useState<AppPlace | null>(null);
    const [isPlanning, setIsPlanning] = useState(false);
    const [route, setRoute] = useState<AppRoute | null>(null);
    const [view, setView] = useState<AppView>('explore');
    const [tripState, setTripState] = useState(createInitialTripState);
    const [plannerOverlayIntent, setPlannerOverlayIntent] = useState<PlannerOverlayIntent>(null);
    const [savedTrips, setSavedTrips] = useState<Trip[]>(() => {
        try {
            const raw = window.localStorage.getItem(SAVED_TRIPS_STORAGE_KEY);
            if (!raw) return [];

            const parsed = JSON.parse(raw) as LegacyTrip[];
            return Array.isArray(parsed) ? parsed.map(normalizeLoadedTrip) : [];
        } catch (error) {
            console.error('Failed to load saved trips:', error);
            return [];
        }
    });
    const { currentTrip, tripBaselineSnapshot } = tripState;
    const {
        error: googleMapsError,
        isLoading: googleMapsIsLoading,
        retry: retryGoogleMaps,
    } = useGoogleMaps();
    const isGoogleMapsConfigError = isGoogleMapsConfigurationError(googleMapsError);

    const setCurrentTrip = (updater: Trip | ((previousTrip: Trip) => Trip)) => {
        setTripState((previousState) => ({
            ...previousState,
            currentTrip: typeof updater === 'function'
                ? (updater as (previousTrip: Trip) => Trip)(previousState.currentTrip)
                : updater,
        }));
    };

    const setTripBaselineSnapshot = (snapshot: string | null) => {
        setTripState((previousState) => ({
            ...previousState,
            tripBaselineSnapshot: snapshot,
        }));
    };

    const placesEnabled = view === 'discovery';
    const pitstopsEnabled = view === 'discovery' && route !== null;
    const { places, isLoading: placesLoading } = usePlaces(center, placesEnabled);
    const { pitstops } = usePitstops(route, pitstopsEnabled);

    const hasUnsavedTripChanges = useMemo(() => {
        if (tripBaselineSnapshot === null) return false;
        return normalizeTrip(currentTrip) !== tripBaselineSnapshot;
    }, [currentTrip, tripBaselineSnapshot]);

    useEffect(() => {
        try {
            window.localStorage.setItem(SAVED_TRIPS_STORAGE_KEY, JSON.stringify(savedTrips));
        } catch (error) {
            console.error('Failed to save trips:', error);
        }
    }, [savedTrips]);

    useEffect(() => {
        if (view !== 'planner' || !hasUnsavedTripChanges) return;

        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = '';
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedTripChanges, view]);

    const confirmLeavePlanner = () => {
        if (view !== 'planner' || !hasUnsavedTripChanges) return true;

        return window.confirm(
            'You have unsaved trip changes. Save your trip before leaving this tab, or choose OK to leave without saving.'
        );
    };

    const navigateToView = (nextView: AppView) => {
        if (nextView === view) return;
        if (!confirmLeavePlanner()) return;
        setView(nextView);
    };

    const handlePlaceSelect = (place: AppPlace) => {
        setCenter(place.location);
        setZoom(14);
        setSelectedPlace(place);
        setView('discovery');
    };

    const handleMarkerClick = (marker: { placeId?: string }) => {
        const placeId = marker.placeId;
        if (placeId) {
            const place = places.find(p => p.id === placeId);
            if (place) setSelectedPlace(place);
        }
    };

    const handlePlanTrip = () => {
        setIsPlanning(true);
    };

    const handleRouteFound = (result: AppRoute) => {
        setRoute(result);
    };

    const handleStartPlanning = () => {
        setPlannerOverlayIntent(null);
        navigateToView('planner');
    };

    const handleExplore = () => {
        navigateToView('explore');
    };

    const handleOpenBookings = () => {
        navigateToView('bookings');
    };

    const handleTripChange = (trip: Trip) => {
        setCurrentTrip((previousTrip) => (
            normalizeTrip(previousTrip) === normalizeTrip(trip)
                ? previousTrip
                : cloneTrip(trip)
        ));
    };

    const handleSaveTrip = (trip: Trip) => {
        const timestamp = new Date().toISOString();
        const previous = savedTrips.find((savedTrip) => savedTrip.id === trip.id);
        const savedTrip: Trip = {
            ...cloneTrip(trip),
            savedAt: previous?.savedAt || trip.savedAt || timestamp,
            updatedAt: timestamp,
        };

        setSavedTrips((prev) => {
            const withoutCurrent = prev.filter((entry) => entry.id !== savedTrip.id);
            return [savedTrip, ...withoutCurrent];
        });
        setCurrentTrip(savedTrip);
        setTripBaselineSnapshot(normalizeTrip(savedTrip));
    };

    const handleCreateNewTrip = () => {
        if (!confirmLeavePlanner()) return;

        const nextTrip = createEmptyTrip();
        setCurrentTrip(nextTrip);
        setTripBaselineSnapshot(normalizeTrip(nextTrip));
        setPlannerOverlayIntent(null);
        setView('planner');
    };

    const handleOpenSavedTrip = (trip: Trip) => {
        if (!confirmLeavePlanner()) return;

        const nextTrip = cloneTrip(trip);
        setCurrentTrip(nextTrip);
        setTripBaselineSnapshot(normalizeTrip(nextTrip));
        setPlannerOverlayIntent(null);
        setView('planner');
    };

    const handleOpenTripConvoy = (trip: Trip) => {
        if (!confirmLeavePlanner()) return;

        const nextTrip = cloneTrip(trip);
        setCurrentTrip(nextTrip);
        setTripBaselineSnapshot(normalizeTrip(nextTrip));
        setPlannerOverlayIntent('vehicles');
        setView('planner');
    };

    const lodgingMarkers = places.map((place: AppPlace) => ({
        position: place.location,
        title: place.name,
        placeId: place.id,
        color: '#d93025',
    }));

    const pitstopMarkers = pitstops.map((stop: AppPlace) => ({
        position: stop.location,
        title: stop.name,
        color: '#1a73e8',
    }));

    const allMarkers = [...lodgingMarkers, ...pitstopMarkers];

    return (
        <div className={`app app--${view}`}>
            <Navbar
                onStartPlanning={handleStartPlanning}
                onExplore={handleExplore}
                onOpenBookings={handleOpenBookings}
                activeView={view}
            />

            {googleMapsError && (
                <div className="maps-alert" role="alert" aria-live="polite">
                    <div className="maps-alert__copy">
                        <strong>Maps services are unavailable.</strong>
                        <span>{googleMapsError.message}</span>
                    </div>
                    {!isGoogleMapsConfigError && (
                        <button
                            type="button"
                            className="maps-alert__retry"
                            onClick={retryGoogleMaps}
                            disabled={googleMapsIsLoading}
                        >
                            {googleMapsIsLoading ? 'Retrying...' : 'Retry Maps'}
                        </button>
                    )}
                </div>
            )}

            {view === 'explore' && (
                <main className="main-content main-content--explore">
                    <ExplorePage onStartPlanning={handleStartPlanning} />
                </main>
            )}

            {view === 'discovery' && (
                <main className="main-content main-content--discovery">
                    <div className="results-panel">
                        <SearchBar onPlaceSelect={handlePlaceSelect} />

                        <div className="discovery-header">
                            <h1>Places to stay in the Philippines</h1>
                            <p>{places.length} stays found</p>
                        </div>

                        <div className="results-grid">
                            {placesLoading ? (
                                <p>Loading stays...</p>
                            ) : (
                                places.map((place) => (
                                    <DestinationCard
                                        key={place.id}
                                        title={place.name}
                                        location={place.formattedAddress || 'Philippines'}
                                        price="₱ - / night"
                                        rating={place.rating || 0}
                                        image={place.photoUrl || MOCK_LODGING_IMAGE}
                                        onClick={() => setSelectedPlace(place)}
                                    />
                                ))
                            )}
                        </div>
                    </div>

                    <div className="map-panel">
                        <Map
                            center={center}
                            zoom={zoom}
                            markers={allMarkers}
                            onMarkerClick={handleMarkerClick}
                            directions={route}
                        />
                    </div>

                    {selectedPlace && (
                        <LocationDetail
                            place={selectedPlace}
                            onClose={() => setSelectedPlace(null)}
                            onPlanTrip={handlePlanTrip}
                        />
                    )}

                    {isPlanning && selectedPlace && (
                        <RoutePlanner
                            destination={selectedPlace}
                            onClose={() => setIsPlanning(false)}
                            onRouteFound={handleRouteFound}
                        />
                    )}
                </main>
            )}

            {view === 'planner' && (
                <TripPlanner
                    key={currentTrip.id}
                    trip={currentTrip}
                    onTripChange={handleTripChange}
                    onSaveTrip={handleSaveTrip}
                    isDirty={hasUnsavedTripChanges}
                    isSavedTrip={savedTrips.some((trip) => trip.id === currentTrip.id)}
                    convoyDefaultOverlay={plannerOverlayIntent}
                    onConvoyOverlayHandled={() => setPlannerOverlayIntent(null)}
                    onClose={handleExplore}
                />
            )}

            {view === 'bookings' && (
                <main className="main-content main-content--bookings">
                    <Bookings
                        trips={savedTrips}
                        onOpenTrip={handleOpenSavedTrip}
                        onManageConvoy={handleOpenTripConvoy}
                        onCreateTrip={handleCreateNewTrip}
                    />
                </main>
            )}

            <footer className="footer">
                <div className="footer-content">
                    <BrandLogo className="footer-logo" />
                    <span className="footer-copy">© 2026 MyExplorer. All rights reserved.</span>
                </div>
            </footer>
        </div>
    );
};

export default App;
