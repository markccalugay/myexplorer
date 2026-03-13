import { AppPlace } from '../types/place';

export const APP_PLACE_FIELDS = [
    'displayName',
    'formattedAddress',
    'location',
    'viewport',
    'rating',
    'photos',
    'websiteURI',
    'nationalPhoneNumber',
    'editorialSummary',
    'googleMapsURI',
    'primaryType',
] as const;

export const BASIC_PLACE_FIELDS = [
    'displayName',
    'formattedAddress',
    'location',
    'googleMapsURI',
] as const;

const toLatLngLiteral = (
    location?: google.maps.LatLng | google.maps.LatLngLiteral | null
): google.maps.LatLngLiteral | null => {
    if (!location) return null;
    if (typeof (location as google.maps.LatLng).lat === 'function') {
        const latLng = location as google.maps.LatLng;
        return { lat: latLng.lat(), lng: latLng.lng() };
    }

    const literal = location as google.maps.LatLngLiteral;
    if (typeof literal.lat === 'number' && typeof literal.lng === 'number') {
        return literal;
    }

    return null;
};

export const toAppPlace = (place: google.maps.places.Place): AppPlace | null => {
    const location = toLatLngLiteral(place.location);
    if (!location) return null;

    const fallbackId = [
        place.displayName || place.formattedAddress || 'unknown-place',
        location.lat.toFixed(6),
        location.lng.toFixed(6),
    ].join('::');

    return {
        id: place.googleMapsURI || fallbackId,
        name: place.displayName || place.formattedAddress || 'Unknown place',
        location,
        formattedAddress: place.formattedAddress || undefined,
        rating: place.rating ?? undefined,
        photoUrl: place.photos?.[0]?.getURI({ maxWidth: 800 }) || undefined,
        websiteUri: place.websiteURI || undefined,
        nationalPhoneNumber: place.nationalPhoneNumber || undefined,
        summary: place.editorialSummary || undefined,
        primaryType: place.primaryType || undefined,
        googleMapsUri: place.googleMapsURI || undefined,
    };
};

export const fetchPlaceFromPrediction = async (
    prediction: google.maps.places.PlacePrediction,
    fields: readonly string[] = APP_PLACE_FIELDS
): Promise<AppPlace | null> => {
    const place = prediction.toPlace();
    await place.fetchFields({ fields: [...fields] });
    return toAppPlace(place);
};
