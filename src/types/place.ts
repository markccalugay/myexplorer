export interface AppPlace {
    id: string;
    name: string;
    location: google.maps.LatLngLiteral;
    formattedAddress?: string;
    rating?: number;
    photoUrl?: string;
    websiteUri?: string;
    nationalPhoneNumber?: string;
    summary?: string;
    primaryType?: string;
    googleMapsUri?: string;
}
