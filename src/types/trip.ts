export interface Stop {
    id: string;
    name: string;
    location: google.maps.LatLngLiteral;
    type: 'start' | 'stop' | 'destination';
    category?: string;
    description?: string;
    rating?: number;
    distanceFromPrevious?: number; // km
    durationFromPrevious?: number; // mins
    arrivalTime?: string; // e.g. "8:15 AM"
}

export interface Trip {
    id: string;
    name: string;
    stops: Stop[];
    totalDistance?: number;
    totalDuration?: number;
}
