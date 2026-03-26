import type { GeoPoint } from './geo';

export interface AppPlace {
    id: string;
    name: string;
    location: GeoPoint;
    formattedAddress?: string;
    rating?: number;
    photoUrl?: string;
    websiteUri?: string;
    nationalPhoneNumber?: string;
    summary?: string | { text?: string };
    primaryType?: string;
    googleMapsUri?: string;
}
