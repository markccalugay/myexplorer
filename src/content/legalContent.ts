export interface LegalPageSection {
    title: string;
    paragraphs?: string[];
    bullets?: string[];
}

export interface LegalPageContent {
    eyebrow: string;
    title: string;
    summary: string;
    effectiveDate: string;
    callouts?: string[];
    sections: LegalPageSection[];
}

export const privacyPolicyContent: LegalPageContent = {
    eyebrow: 'Privacy Policy',
    title: 'How MyExplorer handles trip, location, and device data.',
    summary: 'This policy explains the current web product scope: trip planning, local saved data, Google Maps Platform-powered discovery, and optional location access.',
    effectiveDate: 'March 27, 2026',
    callouts: [
        'MyExplorer currently stores saved trips, saved places, and navigation-session state locally on your device.',
        'Location access is optional and is only requested when you choose features that depend on your current position.',
    ],
    sections: [
        {
            title: 'What we handle',
            bullets: [
                'Trip details such as your origin, destination, and any stops you choose to save.',
                'Saved-place labels you create, such as Home or Office.',
                'Current location, if you grant permission for location-based trip setup or active navigation flows.',
                'Technical app state needed to reopen a trip or recover an active navigation session on the same device.',
            ],
        },
        {
            title: 'How this data is used',
            bullets: [
                'To build routes, estimate trip progress, and reopen saved trips later.',
                'To let you start a trip from your current device location when you ask us to do that.',
                'To power route-aware recommendations such as pitstops or along-the-way suggestions.',
                'To keep the app usable after reloads by restoring locally saved trip and navigation state.',
            ],
        },
        {
            title: 'Where data is stored',
            bullets: [
                'Saved trips, saved places, and navigation-session state are currently stored in your browser on your device.',
                'Map, place, routing, and related discovery requests are processed through Google Maps Platform when those features are used.',
                'MyExplorer also links out to third-party websites or Google Maps destinations when you choose to open them.',
            ],
        },
        {
            title: 'Your controls',
            bullets: [
                'You can decline location permission and continue using non-location features.',
                'You can clear saved local data from inside the product where controls are available, or by clearing your browser storage for MyExplorer.',
                'You can choose not to save a trip or favorite place on a shared device.',
            ],
        },
        {
            title: 'Current scope and updates',
            paragraphs: [
                'The product does not currently present user accounts, payments, marketing cookies, or ad-tech-based tracking in the web experience covered by this page.',
                'If that scope changes, this privacy policy will be updated before those changes are relied on publicly.',
            ],
        },
    ],
};

export const termsOfServiceContent: LegalPageContent = {
    eyebrow: 'Terms of Service',
    title: 'Use MyExplorer as a trip-planning guide, not as a guarantee.',
    summary: 'These terms are designed for a product that helps travelers explore places, plan stops, and reopen trips later.',
    effectiveDate: 'March 27, 2026',
    callouts: [
        'Routing, ETA, and place details may be delayed, incomplete, or inaccurate.',
        'Drivers and travelers remain responsible for real-world safety decisions at all times.',
    ],
    sections: [
        {
            title: 'Service use',
            bullets: [
                'MyExplorer is intended to help you explore places, organize trip stops, and reopen saved itineraries.',
                'You may use the service only in lawful ways and only for your own travel-planning purposes unless MyExplorer explicitly allows broader use.',
            ],
        },
        {
            title: 'Travel and safety disclaimer',
            bullets: [
                'Do not rely on MyExplorer as an emergency, roadside, or safety-critical system.',
                'Always use your own judgment, follow traffic laws, and prioritize live road, weather, venue, and safety conditions.',
                'Trip timing, suggested stops, and route guidance may change without notice or may fail entirely.',
            ],
        },
        {
            title: 'Third-party content',
            bullets: [
                'Place information, maps, routes, photos, and related discovery content may come from third-party providers including Google Maps Platform.',
                'Outbound links to websites, booking destinations, or map destinations are provided for convenience and are not controlled by MyExplorer.',
            ],
        },
        {
            title: 'Availability and changes',
            bullets: [
                'The service is provided on an as-is and as-available basis.',
                'Features may change, pause, or be removed as the product evolves.',
                'We may update these terms when the product scope or launch posture changes.',
            ],
        },
        {
            title: 'Ownership and limits',
            bullets: [
                'MyExplorer and its original product content remain the property of their respective owners.',
                'To the fullest extent permitted by law, MyExplorer is not liable for travel losses, missed reservations, route issues, or decisions made using incomplete third-party data.',
            ],
        },
    ],
};

export const mapsAttributionContent: LegalPageContent = {
    eyebrow: 'Maps & Attribution',
    title: 'MyExplorer uses Google Maps Platform for core map and discovery features.',
    summary: 'This page explains the role of Google Maps Platform in the product and why attribution appears both on maps and on related content surfaces.',
    effectiveDate: 'March 27, 2026',
    callouts: [
        'Map tiles, place discovery, routing, and some descriptive place content are provided through Google Maps Platform.',
        'When Google-derived content appears outside the embedded map, MyExplorer adds attribution in those UI surfaces as well.',
    ],
    sections: [
        {
            title: 'What comes from Google Maps Platform',
            bullets: [
                'Interactive map rendering and related map controls.',
                'Place search, autocomplete, and nearby place discovery.',
                'Routing and route-derived recommendations.',
                'Place names, photos, ratings, addresses, summaries, and related map URLs where shown.',
            ],
        },
        {
            title: 'How attribution is handled',
            bullets: [
                'Google attribution is shown directly in the map canvas where Google renders it.',
                'MyExplorer also adds attribution text in non-map place-detail or recommendation surfaces when Google-derived content is shown there.',
            ],
        },
        {
            title: 'Related policies',
            paragraphs: [
                'Use of these features may also be subject to Google Maps Platform terms, service-specific terms, and attribution requirements.',
            ],
            bullets: [
                'https://cloud.google.com/maps-platform/terms/',
                'https://cloud.google.com/maps-platform/terms/maps-service-terms/',
                'https://developers.google.com/maps/documentation/geolocation/policies',
            ],
        },
    ],
};

export const permissionsContent: LegalPageContent = {
    eyebrow: 'Permissions & Device Access',
    title: 'MyExplorer only asks for device access that supports the trip you choose to plan.',
    summary: 'The product currently relies on location and local-device storage for a small set of planning and navigation features.',
    effectiveDate: 'March 27, 2026',
    callouts: [
        'Location is optional on the web until you choose to start from your current device location.',
        'Saved trips, saved places, and navigation recovery state are stored locally on your device today.',
    ],
    sections: [
        {
            title: 'Location permission',
            bullets: [
                'Used to set your trip origin from your current position when you ask for that flow.',
                'Used to help resume an active trip or keep your route progress grounded in your live position during active navigation.',
                'If you decline location access, you can still plan trips by entering places manually.',
            ],
        },
        {
            title: 'Local storage',
            bullets: [
                'Used to remember saved trips, saved places, and navigation recovery state on the current device.',
                'Used so you can reopen your trip later without needing an account-based backend first.',
                'Stored data is intentionally limited to the minimum information the product needs to reopen core trip flows.',
            ],
        },
        {
            title: 'Mobile alignment',
            paragraphs: [
                'The repo also contains iOS and Android shells that declare location-related permissions for future mobile trip flows. Public website disclosures should stay aligned with those platform declarations before mobile store distribution.',
            ],
        },
    ],
};

export const supportContent: LegalPageContent = {
    eyebrow: 'Support',
    title: 'Support and launch contact details are being finalized.',
    summary: 'This page exists so the public footer has a stable destination while MyExplorer finalizes its launch-ready support and legal contact path.',
    effectiveDate: 'March 27, 2026',
    callouts: [
        'The business entity name and launch contact addresses still need final confirmation before public release.',
    ],
    sections: [
        {
            title: 'Current status',
            bullets: [
                'MyExplorer is still in active product development.',
                'Support, privacy, and legal contact details will be published here before public launch.',
                'Until then, use this page as the stable support destination linked from the site footer.',
            ],
        },
        {
            title: 'What this page will cover at launch',
            bullets: [
                'General product support contact information.',
                'Privacy and legal inquiry contact information, if different.',
                'Business identity details used across the published legal pages.',
            ],
        },
    ],
};
