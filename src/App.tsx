import { useState, useCallback } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { Navbar } from './components/Navbar';
import { SearchBar } from './components/SearchBar';
import { DestinationCard } from './components/Card';
import Map from './components/Map';
import { LocationDetail } from './components/LocationDetail';
import { RoutePlanner } from './components/RoutePlanner';
import { usePlaces } from './hooks/usePlaces';
import { usePitstops } from './hooks/usePitstops';
import './App.css';

// Import images
import hotelImg from './assets/hotel.png';

function App() {
    const [center, setCenter] = useState<google.maps.LatLngLiteral>({ lat: 14.5995, lng: 120.9842 }); // Manila default
    const [zoom, setZoom] = useState(11);
    const [selectedPlace, setSelectedPlace] = useState<google.maps.places.PlaceResult | null>(null);
    const [isPlanning, setIsPlanning] = useState(false);
    const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);

    const { places, isLoading } = usePlaces(center);
    const { pitstops } = usePitstops(directions);

    const handlePlaceSelect = (place: google.maps.places.PlaceResult) => {
        if (place.geometry?.location) {
            const loc = {
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng()
            };
            setCenter(loc);
            setZoom(13);
            setSelectedPlace(null);
            setDirections(null);
        }
    };

    const handleMarkerClick = useCallback((marker: google.maps.Marker) => {
        const title = marker.getTitle();
        const place = [...places, ...pitstops].find(p => p.name === title);
        if (place) setSelectedPlace(place);
    }, [places, pitstops]);

    const handleRouteFound = (result: google.maps.DirectionsResult) => {
        setDirections(result);
        setIsPlanning(false);
        setSelectedPlace(null);
    };

    const lodgingMarkers = places.map(place => ({
        position: place.geometry?.location?.toJSON(),
        title: place.name,
        clickable: true,
    }));

    const pitstopMarkers = pitstops.map(place => ({
        position: place.geometry?.location?.toJSON(),
        title: place.name,
        clickable: true,
        icon: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png' // Use blue for pitstops
    }));

    const allMarkers = [...lodgingMarkers, ...pitstopMarkers] as google.maps.MarkerOptions[];

    return (
        <div className="app">
            <Navbar />

            <div className="explorer-container">
                <aside className="results-panel">
                    <div className="search-overlay">
                        <SearchBar onPlaceSelect={handlePlaceSelect} />
                    </div>

                    <div className="results-content">
                        <div className="results-header">
                            <h2>Places to stay in the Philippines</h2>
                            <p>{isLoading ? 'Searching...' : `${places.length} stays found`}</p>
                        </div>

                        <div className="results-grid">
                            {places.map((place) => (
                                <DestinationCard
                                    key={place.place_id}
                                    image={place.photos?.[0]?.getUrl() || hotelImg}
                                    title={place.name || 'Unknown Hotel'}
                                    location={place.vicinity || ''}
                                    rating={place.rating || 0}
                                    price={place.price_level ? '₱'.repeat(place.price_level) : '₱-'}
                                    onClick={() => setSelectedPlace(place)}
                                />
                            ))}
                        </div>
                    </div>
                </aside>

                <main className="map-panel">
                    <Map
                        center={center}
                        zoom={zoom}
                        markers={allMarkers}
                        onMarkerClick={handleMarkerClick}
                        directions={directions}
                    />
                </main>

                {selectedPlace && !isPlanning && (
                    <LocationDetail
                        place={selectedPlace}
                        onClose={() => setSelectedPlace(null)}
                        onPlanTrip={() => setIsPlanning(true)}
                    />
                )}

                {isPlanning && selectedPlace && (
                    <RoutePlanner
                        destination={selectedPlace}
                        onClose={() => setIsPlanning(false)}
                        onRouteFound={handleRouteFound}
                    />
                )}
            </div>

            <footer className="footer mini-footer">
                <div className="footer-content">
                    <div className="footer-logo">MyExplorer</div>
                    <p>© 2026 MyExplorer. All rights reserved.</p>
                </div>
            </footer>
            
            <Analytics />
        </div>
    )
}

export default App
