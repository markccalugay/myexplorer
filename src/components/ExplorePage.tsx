import React, { useState } from 'react';
import './ExplorePage.css';

// ─────────────────────────────────────────────
// Mock Data
// ─────────────────────────────────────────────

const STAYS = [
    {
        id: 1,
        type: 'Hotel',
        title: 'The Lind Boracay',
        location: 'Boracay Island, Aklan',
        price: '₱8,500',
        rating: 4.9,
        reviews: 312,
        image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&q=80',
        badge: 'Top Rated',
    },
    {
        id: 2,
        type: 'Airbnb',
        title: 'Tranquil Beach House',
        location: 'El Nido, Palawan',
        price: '₱4,200',
        rating: 4.8,
        reviews: 198,
        image: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=600&q=80',
        badge: 'Superhost',
    },
    {
        id: 3,
        type: 'Hotel',
        title: 'Henann Regency Resort',
        location: 'Boracay Island, Aklan',
        price: '₱6,800',
        rating: 4.7,
        reviews: 547,
        image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&q=80',
        badge: 'Popular',
    },
    {
        id: 4,
        type: 'Airbnb',
        title: 'Cliffside Glamping Villa',
        location: 'Batangas, Calabarzon',
        price: '₱3,600',
        rating: 4.9,
        reviews: 87,
        image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80',
        badge: 'New',
    },
    {
        id: 5,
        type: 'Resort',
        title: 'Eskaya Beach Resort & Spa',
        location: 'Bohol, Visayas',
        price: '₱12,000',
        rating: 4.9,
        reviews: 203,
        image: 'https://images.unsplash.com/photo-1602002418082-dd4a3f5b4f59?w=600&q=80',
        badge: 'Luxury',
    },
    {
        id: 6,
        type: 'Airbnb',
        title: 'Rice Terrace View Cottage',
        location: 'Banaue, Ifugao',
        price: '₱2,800',
        rating: 4.7,
        reviews: 134,
        image: 'https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?w=600&q=80',
        badge: 'Unique Stay',
    },
];

const ACTIVITIES = [
    {
        id: 1,
        title: 'Island Hopping',
        location: 'El Nido, Palawan',
        price: '₱1,500 / person',
        duration: 'Full Day',
        image: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=600&q=80',
        emoji: '🚤',
    },
    {
        id: 2,
        title: 'Scuba Diving',
        location: 'Tubbataha Reef, Palawan',
        price: '₱3,200 / dive',
        duration: '3–4 hrs',
        image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&q=80',
        emoji: '🤿',
    },
    {
        id: 3,
        title: 'Chocolate Hills ATV',
        location: 'Carmen, Bohol',
        price: '₱800 / person',
        duration: '2 hrs',
        image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80',
        emoji: '🏍️',
    },
    {
        id: 4,
        title: 'Whale Shark Swimming',
        location: 'Oslob, Cebu',
        price: '₱1,800 / person',
        duration: 'Morning only',
        image: 'https://images.unsplash.com/photo-1504208434309-cb69f4fe52b0?w=600&q=80',
        emoji: '🐋',
    },
    {
        id: 5,
        title: 'Batad Rice Terrace Trek',
        location: 'Ifugao, Cordillera',
        price: '₱1,200 / person',
        duration: 'Half Day',
        image: 'https://images.unsplash.com/photo-1552751753-cf20741eacea?w=600&q=80',
        emoji: '🥾',
    },
    {
        id: 6,
        title: 'Sunset Sailing',
        location: 'Boracay, Aklan',
        price: '₱950 / person',
        duration: '2 hrs',
        image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80',
        emoji: '⛵',
    },
];

const VEHICLES = [
    {
        id: 1,
        title: 'Toyota HiAce Van',
        type: 'Passenger Van',
        seats: 10,
        price: '₱4,500',
        per: 'day',
        driver: true,
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',
        badge: 'Most Popular',
    },
    {
        id: 2,
        title: 'Mitsubishi Montero',
        type: '4x4 SUV',
        seats: 7,
        price: '₱3,800',
        per: 'day',
        driver: false,
        image: 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=600&q=80',
        badge: 'Off-Road Ready',
    },
    {
        id: 3,
        title: 'Toyota Innova',
        type: 'MPV',
        seats: 7,
        price: '₱2,800',
        per: 'day',
        driver: true,
        image: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=600&q=80',
        badge: 'Family Friendly',
    },
    {
        id: 4,
        title: 'Weekend Van Package',
        type: '2-Night Deal',
        seats: 12,
        price: '₱8,900',
        per: 'weekend',
        driver: true,
        image: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=600&q=80',
        badge: '🔥 Best Value',
    },
    {
        id: 5,
        title: 'Honda CR-V',
        type: 'Compact SUV',
        seats: 5,
        price: '₱2,200',
        per: 'day',
        driver: false,
        image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=600&q=80',
        badge: 'Self-Drive',
    },
];

const STORIES = [
    {
        id: 1,
        user: 'Maria Santos',
        handle: '@mariasantos',
        avatar: 'https://i.pravatar.cc/80?img=47',
        destination: 'El Nido, Palawan 🌊',
        timeAgo: '2 days ago',
        caption: 'Nothing prepared us for how breathtaking Palawan would be. Every lagoon felt like a secret waiting to be discovered. 10/10 would go back in a heartbeat! 💙',
        images: [
            'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400&q=80',
            'https://images.unsplash.com/photo-1513407030348-c983a97b98d8?w=400&q=80',
            'https://images.unsplash.com/photo-1552751753-cf20741eacea?w=400&q=80',
        ],
        likes: 284,
        comments: 47,
        planned: 'Planned with MyExplorer'
    },
    {
        id: 2,
        user: 'Carlos Reyes',
        handle: '@carlosexplores',
        avatar: 'https://i.pravatar.cc/80?img=12',
        destination: 'Bohol & Cebu, Visayas 🐠',
        timeAgo: '5 days ago',
        caption: 'Swimming with whale sharks was the most humbling experience of my life. Bohol\'s tarsiers are adorably tiny. Perfect 5-day itinerary thanks to MyExplorer\'s trip planner!',
        images: [
            'https://images.unsplash.com/photo-1504208434309-cb69f4fe52b0?w=400&q=80',
            'https://images.unsplash.com/photo-1583212292454-1fe6229603b7?w=400&q=80',
        ],
        likes: 519,
        comments: 93,
        planned: 'Planned with MyExplorer'
    },
    {
        id: 3,
        user: 'Ana dela Cruz',
        handle: '@anadlc',
        avatar: 'https://i.pravatar.cc/80?img=5',
        destination: 'Sagada & Banaue, Cordillera 🏔️',
        timeAgo: '1 week ago',
        caption: 'The rice terraces at sunrise made me feel like I was standing at the edge of the world. Sagada\'s caves are not for the faint-hearted but 100% worth it. Such a journey!',
        images: [
            'https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?w=400&q=80',
            'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80',
            'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&q=80',
        ],
        likes: 731,
        comments: 128,
        planned: 'Planned with MyExplorer'
    },
];

const WHY_FEATURES = [
    {
        icon: '🗺️',
        title: 'Built-in Trip Planner',
        description: 'Plan your entire route — hotels, activities, pitstops — in one seamless itinerary. No toggling between apps.',
        vs: 'Airbnb & Booking.com only book stays.',
    },
    {
        icon: '🇵🇭',
        title: 'Local-First Discovery',
        description: 'We surface hidden gems, local guides, and community-recommended spots that big platforms miss.',
        vs: 'Algorithm-driven, often favors big chains.',
    },
    {
        icon: '🚐',
        title: 'Transport Included',
        description: 'Book your van, car, or shuttle right alongside your hotel. Travel as a group without the logistics headache.',
        vs: 'No transport options on Airbnb or Booking.',
    },
    {
        icon: '📖',
        title: 'Free Itinerary Builder',
        description: 'Get a shareable, day-by-day trip plan with estimated costs, driving times, and activity bookings.',
        vs: 'Paid add-ons or third-party tools required.',
    },
    {
        icon: '👥',
        title: 'Community Stories',
        description: 'Real photos and reviews from real travelers who planned their trip the same way you are.',
        vs: 'Generic star ratings with no context.',
    },
    {
        icon: '💳',
        title: 'Bundle & Save',
        description: 'Book stay + transport + activities together and unlock exclusive bundle discounts.',
        vs: 'Each booking is separate with no bundling.',
    },
];

const CATEGORIES = [
    { id: 'all', label: 'All', emoji: '✨' },
    { id: 'hotels', label: 'Hotels', emoji: '🏨' },
    { id: 'airbnb', label: 'Airbnb-style', emoji: '🏠' },
    { id: 'camping', label: 'Camping', emoji: '🏕️' },
    { id: 'activities', label: 'Activities', emoji: '🎯' },
    { id: 'cars', label: 'Car Rentals', emoji: '🚐' },
    { id: 'beach', label: 'Beach', emoji: '🏖️' },
    { id: 'mountains', label: 'Mountains', emoji: '🏔️' },
    { id: 'islands', label: 'Islands', emoji: '🏝️' },
];

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

const StayCard: React.FC<typeof STAYS[0]> = ({ title, location, price, rating, reviews, image, badge, type }) => (
    <div className="ep-card ep-stay-card">
        <div className="ep-card-img-wrap">
            <img src={image} alt={title} className="ep-card-img" />
            <span className="ep-card-badge">{badge}</span>
            <span className="ep-card-type">{type}</span>
            <button className="ep-card-heart" aria-label="Save">♡</button>
        </div>
        <div className="ep-card-body">
            <div className="ep-card-top">
                <h4 className="ep-card-title">{title}</h4>
                <div className="ep-card-rating">★ {rating} <span>({reviews})</span></div>
            </div>
            <p className="ep-card-loc">📍 {location}</p>
            <div className="ep-card-footer">
                <span className="ep-card-price"><strong>{price}</strong> / night</span>
                <button className="ep-book-btn">Book</button>
            </div>
        </div>
    </div>
);

const ActivityCard: React.FC<typeof ACTIVITIES[0]> = ({ title, location, price, duration, image, emoji }) => (
    <div className="ep-card ep-activity-card">
        <div className="ep-card-img-wrap">
            <img src={image} alt={title} className="ep-card-img" />
            <span className="ep-activity-emoji">{emoji}</span>
        </div>
        <div className="ep-card-body">
            <h4 className="ep-card-title">{title}</h4>
            <p className="ep-card-loc">📍 {location}</p>
            <div className="ep-activity-meta">
                <span className="ep-activity-duration">⏱ {duration}</span>
            </div>
            <div className="ep-card-footer">
                <span className="ep-card-price"><strong>{price}</strong></span>
                <button className="ep-book-btn ep-book-btn--green">Book</button>
            </div>
        </div>
    </div>
);

const VehicleCard: React.FC<typeof VEHICLES[0]> = ({ title, type, seats, price, per, driver, image, badge }) => (
    <div className="ep-card ep-vehicle-card">
        <div className="ep-card-img-wrap">
            <img src={image} alt={title} className="ep-card-img ep-card-img--vehicle" />
            <span className="ep-card-badge ep-card-badge--orange">{badge}</span>
        </div>
        <div className="ep-card-body">
            <h4 className="ep-card-title">{title}</h4>
            <p className="ep-vehicle-type">{type}</p>
            <div className="ep-vehicle-meta">
                <span>👥 {seats} seats</span>
                <span>{driver ? '🧑 With Driver' : '🔑 Self-Drive'}</span>
            </div>
            <div className="ep-card-footer">
                <span className="ep-card-price"><strong>{price}</strong> / {per}</span>
                <button className="ep-book-btn ep-book-btn--orange">Reserve</button>
            </div>
        </div>
    </div>
);

const StoryCard: React.FC<typeof STORIES[0]> = ({ user, handle, avatar, destination, timeAgo, caption, images, likes, comments, planned }) => (
    <div className="ep-story-card">
        <div className="ep-story-header">
            <img src={avatar} alt={user} className="ep-story-avatar" />
            <div className="ep-story-user-info">
                <div className="ep-story-username">{user}</div>
                <div className="ep-story-handle">{handle} · <span className="ep-story-time">{timeAgo}</span></div>
            </div>
            <button className="ep-story-follow">Follow</button>
        </div>
        <div className="ep-story-destination">✈️ {destination}</div>
        <p className="ep-story-caption">{caption}</p>
        <div className={`ep-story-images ep-story-images--${images.length}`}>
            {images.map((img, i) => (
                <img key={i} src={img} alt={`Story photo ${i + 1}`} className="ep-story-img" />
            ))}
        </div>
        <div className="ep-story-footer">
            <div className="ep-story-actions">
                <button className="ep-story-action">❤️ {likes}</button>
                <button className="ep-story-action">💬 {comments}</button>
                <button className="ep-story-action">↗️ Share</button>
            </div>
            <div className="ep-story-badge">🗺️ {planned}</div>
        </div>
    </div>
);

// ─────────────────────────────────────────────
// Main ExplorePage
// ─────────────────────────────────────────────

interface ExplorePageProps {
    onStartPlanning?: () => void;
}

export const ExplorePage: React.FC<ExplorePageProps> = ({ onStartPlanning }) => {
    const [activeCategory, setActiveCategory] = useState('all');
    const [searchDestination, setSearchDestination] = useState('');
    const [searchDates, setSearchDates] = useState('');
    const [searchGuests, setSearchGuests] = useState('');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        onStartPlanning?.();
    };

    return (
        <div className="explore-page">

            {/* ── Hero ── */}
            <section className="ep-hero">
                <div className="ep-hero-bg" />
                <div className="ep-hero-content">
                    <p className="ep-hero-eyebrow">Discover the Philippines 🇵🇭</p>
                    <h1 className="ep-hero-title">Your next adventure<br />starts right here.</h1>
                    <p className="ep-hero-sub">Book stays, plan activities, rent a van, and share the adventure — all in one place.</p>

                    <form className="ep-search-bar" onSubmit={handleSearch}>
                        <div className="ep-search-field">
                            <label>Destination</label>
                            <input
                                type="text"
                                placeholder="Where are you going?"
                                value={searchDestination}
                                onChange={e => setSearchDestination(e.target.value)}
                            />
                        </div>
                        <div className="ep-search-divider" />
                        <div className="ep-search-field">
                            <label>Dates</label>
                            <input
                                type="text"
                                placeholder="Add dates"
                                value={searchDates}
                                onChange={e => setSearchDates(e.target.value)}
                            />
                        </div>
                        <div className="ep-search-divider" />
                        <div className="ep-search-field">
                            <label>Guests</label>
                            <input
                                type="text"
                                placeholder="Add guests"
                                value={searchGuests}
                                onChange={e => setSearchGuests(e.target.value)}
                            />
                        </div>
                        <button type="submit" className="ep-search-btn">
                            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <circle cx="11" cy="11" r="8" />
                                <path d="M21 21l-4.35-4.35" />
                            </svg>
                        </button>
                    </form>
                </div>
            </section>

            {/* ── Category Pills ── */}
            <section className="ep-categories-bar">
                <div className="ep-categories-scroll">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            className={`ep-category-pill ${activeCategory === cat.id ? 'ep-category-pill--active' : ''}`}
                            onClick={() => setActiveCategory(cat.id)}
                        >
                            <span className="ep-cat-emoji">{cat.emoji}</span>
                            {cat.label}
                        </button>
                    ))}
                </div>
                <div className="ep-cat-fade-right" />
            </section>

            {/* ── Recommended Stays ── */}
            <section className="ep-section">
                <div className="ep-section-inner">
                    <div className="ep-section-header">
                        <div>
                            <h2 className="ep-section-title">Recommended Stays</h2>
                            <p className="ep-section-sub">Handpicked hotels, Airbnbs, and resorts across the Philippines</p>
                        </div>
                        <button className="ep-see-all">See all →</button>
                    </div>
                    <div className="ep-scroll-row">
                        {STAYS.map(s => <StayCard key={s.id} {...s} />)}
                    </div>
                </div>
            </section>

            {/* ── Activities ── */}
            <section className="ep-section ep-section--tinted">
                <div className="ep-section-inner">
                    <div className="ep-section-header">
                        <div>
                            <h2 className="ep-section-title">Things to Do</h2>
                            <p className="ep-section-sub">Activities, tours, and experiences you won't find on Google</p>
                        </div>
                        <button className="ep-see-all">See all →</button>
                    </div>
                    <div className="ep-scroll-row">
                        {ACTIVITIES.map(a => <ActivityCard key={a.id} {...a} />)}
                    </div>
                </div>
            </section>

            {/* ── Car / Van Rentals ── */}
            <section className="ep-section">
                <div className="ep-section-inner">
                    <div className="ep-section-header">
                        <div>
                            <h2 className="ep-section-title">Rent a Car or Van</h2>
                            <p className="ep-section-sub">Travel on your terms — book a ride alongside your hotel, no hassle</p>
                        </div>
                        <button className="ep-see-all">See all →</button>
                    </div>
                    <div className="ep-vehicle-banner">
                        <div className="ep-vehicle-banner-text">
                            <span className="ep-vehicle-banner-emoji">🚐</span>
                            <div>
                                <strong>Group trip?</strong> Bundle a van with your hotel and save up to 20%
                            </div>
                        </div>
                        <button className="ep-bundle-btn" onClick={onStartPlanning}>Plan a Bundle →</button>
                    </div>
                    <div className="ep-scroll-row">
                        {VEHICLES.map(v => <VehicleCard key={v.id} {...v} />)}
                    </div>
                </div>
            </section>

            {/* ── Travel Stories ── */}
            <section className="ep-section ep-section--dark">
                <div className="ep-section-inner">
                    <div className="ep-section-header">
                        <div>
                            <h2 className="ep-section-title ep-section-title--light">Stories from Explorers</h2>
                            <p className="ep-section-sub ep-section-sub--light">Real trips, real memories — shared by our community</p>
                        </div>
                        <button className="ep-see-all ep-see-all--light">See all →</button>
                    </div>
                    <div className="ep-stories-grid">
                        {STORIES.map(s => <StoryCard key={s.id} {...s} />)}
                    </div>
                    <div className="ep-stories-share-cta">
                        <p>Have an adventure to share?</p>
                        <button className="ep-share-story-btn">📸 Share Your Trip</button>
                    </div>
                </div>
            </section>

            {/* ── Why MyExplorer ── */}
            <section className="ep-section ep-why-section">
                <div className="ep-section-inner">
                    <div className="ep-why-header">
                        <span className="ep-why-eyebrow">Why MyExplorer?</span>
                        <h2 className="ep-why-title">Not just booking.<br />The whole adventure.</h2>
                        <p className="ep-why-sub">Here's why thousands of Filipino travelers choose MyExplorer over Airbnb and Booking.com.</p>
                    </div>
                    <div className="ep-why-grid">
                        {WHY_FEATURES.map((f, i) => (
                            <div key={i} className="ep-why-card">
                                <div className="ep-why-icon">{f.icon}</div>
                                <h3 className="ep-why-feature-title">{f.title}</h3>
                                <p className="ep-why-desc">{f.description}</p>
                                <div className="ep-why-vs">
                                    <span className="ep-vs-label">Others:</span> {f.vs}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="ep-why-cta">
                        <button className="ep-why-cta-btn" onClick={onStartPlanning}>
                            Start Planning Your Trip — It's Free
                        </button>
                        <p className="ep-why-cta-sub">No account needed to explore. Sign up when you're ready to book.</p>
                    </div>
                </div>
            </section>

        </div>
    );
};
