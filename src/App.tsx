import { useState } from 'react';
import { Navbar } from './components/Navbar';
import { SearchBar } from './components/SearchBar';
import { DestinationCard } from './components/Card';
import Map from './components/Map';
import { LocationDetail } from './components/LocationDetail';
import { RoutePlanner } from './components/RoutePlanner';
import { TripPlanner } from './components/TripPlanner';
import { usePlaces } from './hooks/usePlaces';
import { usePitstops } from './hooks/usePitstops';
import { Trip } from './types/trip';
import './App.css';

// Import images
import hotelImg from './assets/hotel.png';

const MOCK_LODGING_IMAGE = hotelImg;

const App = () => {
    const [center, setCenter] = useState({ lat: 14.5995, lng: 120.9842 });
    const [zoom, setZoom] = useState(12);
    const [selectedPlace, setSelectedPlace] = useState<google.maps.places.PlaceResult | null>(null);
    const [isPlanning, setIsPlanning] = useState(false);
    const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
    const [view, setView] = useState<'discovery' | 'planner'>('discovery');
    const [currentTrip] = useState<Trip>({
        id: '1',
        name: 'New Adventure',
        stops: []
    });

    const { places, isLoading: placesLoading } = usePlaces(center);
    const { pitstops } = usePitstops(directions);

    const handlePlaceSelect = (place: google.maps.places.PlaceResult) => {
        if (place.geometry?.location) {
            const loc = {
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng()
            };
            setCenter(loc);
            setZoom(14);
        }
    };

    const handleMarkerClick = (marker: google.maps.Marker) => {
        const placeId = (marker as any).placeId;
        if (placeId) {
            const place = places.find(p => p.place_id === placeId);
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
        setView('discovery');
    };

    const lodgingMarkers = places.map((place: any) => ({
        position: place.geometry.location,
        title: place.name,
        placeId: place.place_id,
        icon: {
            url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
        }
    }));

    const pitstopMarkers = pitstops.map((stop: any) => ({
        position: stop.geometry.location,
        title: stop.name,
        icon: {
            url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
        }
    }));

    const allMarkers = [...lodgingMarkers, ...pitstopMarkers];

    return (
        <div className="app">
            <Navbar onStartPlanning={handleStartPlanning} onExplore={handleExplore} />

            {view === 'discovery' ? (
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
                                places.map((place: any) => (
                                    <DestinationCard
                                        key={place.place_id}
                                        title={place.name}
                                        location={place.vicinity || "Philippines"}
                                        price="₱ - / night"
                                        rating={place.rating}
                                        image={place.photos?.[0]?.getUrl() || MOCK_LODGING_IMAGE}
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
            ) : (
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
