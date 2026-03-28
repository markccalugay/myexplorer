import {createServer} from 'node:http';

const GOOGLE_ROUTES_ENDPOINT = 'https://routes.googleapis.com/directions/v2:computeRoutes';
const port = Number(process.env.PORT ?? 8787);
const apiKey = process.env.MYEXPLORER_GOOGLE_ROUTES_API_KEY;

const formatDurationMillis = (durationValue) => {
  if (typeof durationValue !== 'string') {
    return 0;
  }

  const seconds = Number(durationValue.replace('s', ''));
  return Number.isFinite(seconds) ? seconds * 1000 : 0;
};

const sendJson = (response, statusCode, body) => {
  response.writeHead(statusCode, {'Content-Type': 'application/json'});
  response.end(JSON.stringify(body));
};

const validatePayload = (payload) => {
  if (!payload || typeof payload !== 'object') {
    return 'Request body is required.';
  }

  if (!Array.isArray(payload.stops) || payload.stops.length < 2) {
    return 'At least two ordered stops are required.';
  }

  const hasInvalidStop = payload.stops.some((stop) => (
    !stop ||
    typeof stop.id !== 'string' ||
    typeof stop.name !== 'string' ||
    !stop.location ||
    !Number.isFinite(Number(stop.location.lat)) ||
    !Number.isFinite(Number(stop.location.lng))
  ));

  return hasInvalidStop ? 'Each stop must include id, name, and numeric lat/lng coordinates.' : null;
};

const normalizeRouteResponse = (route, routeKey) => {
  const legs = (route.legs ?? []).map((leg) => ({
    distanceMeters: Number(leg.distanceMeters ?? 0),
    durationMillis: formatDurationMillis(leg.duration),
  }));

  return {
    route: {
      provider: 'google-routes',
      routeKey,
      refreshedAt: new Date().toISOString(),
      totalDistanceMeters: legs.reduce((sum, leg) => sum + leg.distanceMeters, 0),
      totalDurationMillis: legs.reduce((sum, leg) => sum + leg.durationMillis, 0),
      encodedPolyline: route.polyline?.encodedPolyline ?? null,
      legs,
    },
  };
};

const createGooglePayload = (stops) => ({
  origin: {
    location: {
      latLng: {
        latitude: Number(stops[0].location.lat),
        longitude: Number(stops[0].location.lng),
      },
    },
  },
  destination: {
    location: {
      latLng: {
        latitude: Number(stops.at(-1).location.lat),
        longitude: Number(stops.at(-1).location.lng),
      },
    },
  },
  intermediates: stops.slice(1, -1).map((stop) => ({
    location: {
      latLng: {
        latitude: Number(stop.location.lat),
        longitude: Number(stop.location.lng),
      },
    },
  })),
  travelMode: 'DRIVE',
  polylineQuality: 'OVERVIEW',
});

const server = createServer((request, response) => {
  if (request.method !== 'POST' || request.url !== '/routes/compute') {
    sendJson(response, 404, {error: 'Not found'});
    return;
  }

  if (!apiKey) {
    sendJson(response, 500, {
      error: 'Missing MYEXPLORER_GOOGLE_ROUTES_API_KEY for the mobile routing proxy.',
    });
    return;
  }

  let rawBody = '';
  request.on('data', (chunk) => {
    rawBody += chunk;
  });

  request.on('end', async () => {
    try {
      const payload = JSON.parse(rawBody || '{}');
      const validationError = validatePayload(payload);
      if (validationError) {
        sendJson(response, 400, {error: validationError});
        return;
      }

      const googleResponse = await fetch(GOOGLE_ROUTES_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask':
            'routes.legs.distanceMeters,routes.legs.duration,routes.polyline.encodedPolyline',
        },
        body: JSON.stringify(createGooglePayload(payload.stops)),
      });

      if (!googleResponse.ok) {
        const errorBody = await googleResponse.text();
        sendJson(response, 502, {
          error: errorBody || 'Google Routes request failed.',
        });
        return;
      }

      const data = await googleResponse.json();
      const route = data.routes?.[0];
      if (!route) {
        sendJson(response, 404, {error: 'No route was returned for the supplied stops.'});
        return;
      }

      sendJson(response, 200, normalizeRouteResponse(route, payload.routeKey));
    } catch (error) {
      sendJson(response, 500, {
        error: error instanceof Error ? error.message : 'Unexpected routing proxy failure.',
      });
    }
  });
});

server.listen(port, () => {
  console.log(`MyExplorer mobile routing proxy listening on http://localhost:${port}`);
});
