import { Navbar } from './components/Navbar';
import { SearchBar } from './components/SearchBar';
import { DestinationCard } from './components/Card';
import { Button } from './components/Button';
import './App.css';

// Import images
import baliImg from './assets/bali.png';
import swissImg from './assets/swiss.png';
import hotelImg from './assets/hotel.png';

function App() {
    return (
        <div className="app">
            <Navbar />

            <main className="main-content">
                <section className="hero">
                    <div className="hero-content">
                        <h1 className="hero-title">Explore the world your way.</h1>
                        <p className="hero-subtitle">Discover beautiful destinations and plan your perfect journey with ease.</p>
                        <div className="hero-search">
                            <SearchBar />
                        </div>
                    </div>
                </section>

                <section className="featured-destinations">
                    <div className="section-header">
                        <h2 className="section-title">Popular Destinations</h2>
                        <Button variant="secondary">View All</Button>
                    </div>

                    <div className="grid grid-4">
                        <DestinationCard
                            image={baliImg}
                            title="Tropical Paradise"
                            location="Uluwatu, Bali"
                            rating={4.9}
                            price="$120"
                        />
                        <DestinationCard
                            image={swissImg}
                            title="Alpine Retreat"
                            location="Grindelwald, Switzerland"
                            rating={5.0}
                            price="$250"
                        />
                        <DestinationCard
                            image={hotelImg}
                            title="City Skyline View"
                            location="Tokyo, Japan"
                            rating={4.8}
                            price="$350"
                        />
                        <DestinationCard
                            image={baliImg} // Reusing for placeholder
                            title="Secluded Beach"
                            location="El Nido, Philippines"
                            rating={4.7}
                            price="$180"
                        />
                    </div>
                </section>

                <section className="cta-section">
                    <div className="cta-card">
                        <h2>Ready to start your adventure?</h2>
                        <p>Join thousands of travelers planning their dream trips on MyExplorer.</p>
                        <Button variant="cta">Start Planning Now</Button>
                    </div>
                </section>
            </main>

            <footer className="footer">
                <div className="footer-content">
                    <div className="footer-logo">MyExplorer</div>
                    <p>© 2026 MyExplorer. All rights reserved.</p>
                </div>
            </footer>
        </div>
    )
}

export default App
