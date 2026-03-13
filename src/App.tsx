import { useState } from 'react';
import { Navbar } from './components/Navbar';
import { SearchBar } from './components/SearchBar';
import { DestinationCard } from './components/Card';
import Map from './components/Map';
import { LocationDetail } from './components/LocationDetail';
import { RoutePlanner } from './components/RoutePlanner';
import { TripPlanner } from './components/TripPlanner';
import { ExplorePage } from './components/ExplorePage';
import { usePlaces } from './hooks/usePlaces';
import { usePitstops } from './hooks/usePitstops';
import { Trip } from './types/trip';
import { AppPlace } from './types/place';
import './App.css';

// Import images
import hotelImg from './assets/hotel.png';

const MOCK_LODGING_IMAGE = hotelImg;

const App = () => {
    const [center, setCenter] = useState({ lat: 14.5995, lng: 120.9842 });
    const [zoom, setZoom] = useState(12);
    const [selectedPlace, setSelectedPlace] = useState<AppPlace | null>(null);
    const [isPlanning, setIsPlanning] = useState(false);
    const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
    const [view, setView] = useState<'explore' | 'discovery' | 'planner'>('explore');
    const [currentTrip] = useState<Trip>({
        id: '1',
        name: 'New Adventure',
        stops: []
    });

    const { places, isLoading: placesLoading } = usePlaces(center);
    const { pitstops } = usePitstops(directions);

    const handlePlaceSelect = (place: AppPlace) => {
        setCenter(place.location);
        setZoom(14);
        setSelectedPlace(place);
    };

    const handleMarkerClick = (marker: google.maps.Marker) => {
        const placeId = (marker as any).placeId;
        if (placeId) {
            const place = places.find(p => p.id === placeId);
            if (place) setSelectedPlace(place);
        }
    };

    const handlePlanTrip = () => {
        setIsPlanning(true);
    };

    const handleRouteFound = (result: google.maps.DirectionsResult) => {
        setDirections(result);
    };

    const handleStartPlanning = () => {
        setView('planner');
    };

    const handleExplore = () => {
        setView('explore');
    };

    const lodgingMarkers = places.map((place: any) => ({
        position: place.location,
        title: place.name,
        placeId: place.id,
        icon: {
            url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
        }
    }));

    const pitstopMarkers = pitstops.map((stop: any) => ({
        position: stop.location,
        title: stop.name,
        icon: {
            url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
        }
    }));

    const allMarkers = [...lodgingMarkers, ...pitstopMarkers];

    return (
        <div className="app">
            <Navbar 
                onStartPlanning={handleStartPlanning} 
                onExplore={handleExplore} 
                activeView={view} 
            />

            {view === 'explore' && (
                <main className="main-content" style={{ overflowY: 'auto' }}>
                    <ExplorePage onStartPlanning={handleStartPlanning} />
                </main>
            )}

            {view === 'discovery' && (
                <main className="main-content">
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
                                        location={place.formattedAddress || "Philippines"}
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
                            directions={directions}
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
                    trip={currentTrip}
                    onClose={handleExplore}
                />
            )}

            <footer className="footer">
                <div className="footer-content">
                    <span className="footer-logo">MyExplorer</span>
                    <span className="footer-copy">© 2026 MyExplorer. All rights reserved.</span>
                </div>
            </footer>
        </div>
    );
};

export default App;
