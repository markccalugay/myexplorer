export interface LocationProvider {
    getCurrentLocation(): Promise<google.maps.LatLngLiteral>;
}
