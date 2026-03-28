# Mobile Routing Proxy Contract

This document defines the current backend proxy contract for mobile route
refreshes in MyExplorer.

The mobile app now persists normalized route payloads locally and refreshes
routes automatically after structural trip edits, but the actual route
computation is intended to happen through a backend proxy instead of through
direct client-side Google Routes requests.

## Endpoint

- Method: `POST`
- Path: `/routes/compute`
- Content type: `application/json`

## Request shape

```json
{
  "routeKey": "start:14.59950,120.98420|destination:13.75650,121.05830",
  "stops": [
    {
      "id": "start",
      "name": "Origin",
      "formattedAddress": "Manila",
      "location": {
        "lat": 14.5995,
        "lng": 120.9842
      }
    },
    {
      "id": "destination",
      "name": "Batangas",
      "formattedAddress": "Batangas Port",
      "location": {
        "lat": 13.7565,
        "lng": 121.0583
      }
    }
  ]
}
```

Rules:

- at least 2 ordered stops are required
- the mobile planner owns stop order before the request is sent
- `routeKey` must match the stop sequence used for the request

## Response shape

```json
{
  "route": {
    "provider": "google-routes",
    "routeKey": "start:14.59950,120.98420|destination:13.75650,121.05830",
    "refreshedAt": "2026-03-28T01:20:00.000Z",
    "totalDistanceMeters": 12000,
    "totalDurationMillis": 960000,
    "encodedPolyline": "encoded_polyline_here",
    "legs": [
      {
        "distanceMeters": 12000,
        "durationMillis": 960000
      }
    ]
  }
}
```

## Local development

The repo now includes a local Node proxy script:

```sh
npm run mobile:routing-proxy
```

Required environment variable:

- `MYEXPLORER_GOOGLE_ROUTES_API_KEY`

Optional:

- `PORT` defaults to `8787`

To point the React Native app at the proxy during development, set
`routingProxyUrl` in `apps/mobile/app.json`, for example:

```json
{
  "routingProxyUrl": "http://127.0.0.1:8787"
}
```
