# Mobile Routing Proxy Contract

This document defines the routing proxy contract the React Native app now expects.

It is intentionally backend-first:

- the phone app does **not** call Google Routes directly
- the proxy owns Google credentials, rate limits, retries, logging, and error mapping
- the mobile app consumes a normalized route payload and persists the last known route locally

## Endpoint

`POST /routes/compute`

## Request Shape

```json
{
  "routeKey": "stop-a:14.59950,120.98420|stop-b:13.75650,121.05830",
  "stops": [
    {
      "id": "stop-a",
      "name": "Origin",
      "formattedAddress": "Manila, Philippines",
      "location": {
        "lat": 14.5995,
        "lng": 120.9842
      }
    },
    {
      "id": "stop-b",
      "name": "Destination",
      "formattedAddress": "Batangas City, Philippines",
      "location": {
        "lat": 13.7565,
        "lng": 121.0583
      }
    }
  ]
}
```

## Response Shape

```json
{
  "route": {
    "provider": "google-routes",
    "refreshedAt": "2026-03-28T01:23:45.000Z",
    "totalDistanceMeters": 118500,
    "totalDurationMillis": 7800000,
    "encodedPolyline": "encoded-polyline-value",
    "legs": [
      {
        "distanceMeters": 118500,
        "durationMillis": 7800000
      }
    ]
  }
}
```

## Mobile Expectations

- the mobile app computes and sends the `routeKey`
- the proxy may validate the incoming `routeKey`, but the client treats the request as source-of-truth for the current stop order
- the response should stay provider-neutral apart from the explicit `provider` label
- the mobile app persists:
  - `routeKey`
  - `refreshedAt`
  - `totalDistanceMeters`
  - `totalDurationMillis`
  - `encodedPolyline`
  - `legs`

## Failure Semantics

The proxy should return normal HTTP failure codes so the mobile client can distinguish:

- invalid trip shape
- authentication or quota failure
- upstream Google routing failure
- transient server failure

The current mobile implementation treats any non-`2xx` response as a route-refresh failure and keeps the last known local payload as stale when available.
