import {planLegacyWebTripMigration} from './legacyMigration';
import type {Trip} from './domain';

describe('legacyMigration planning and validation', () => {
  const representativeWebTrip = {
    id: 'web-trip-1',
    name: 'Manila to Tagaytay',
    stops: [
      {
        id: 'ws-1',
        name: 'Rizal Park',
        location: {lat: 14.5831, lng: 120.9794},
        type: 'start',
        source: 'manual',
        isAutoSuggested: false,
        customStopTag: 'heritage',
      },
      {
        id: 'ws-2',
        name: 'Sky Ranch Tagaytay',
        location: {lat: 14.0956, lng: 120.9371},
        type: 'destination',
        source: 'activity-recommendation',
        isAutoSuggested: true,
        rating: 4.6,
      },
    ],
    convoy: {
      id: 'convoy-1',
      tripId: 'web-trip-1',
      vehicles: [
        {
          id: 'v-1',
          label: 'Lead Car',
          order: 0,
          seatCapacity: 5,
          createdAt: '2026-03-20T08:00:00.000Z',
          updatedAt: '2026-03-20T08:00:00.000Z',
        },
      ],
      participants: [
        {
          id: 'p-1',
          kind: 'individual',
          displayName: 'Mark',
          status: 'joined',
          members: [{id: 'm-1', displayName: 'Mark', isPrimary: true}],
          createdAt: '2026-03-20T08:00:00.000Z',
          updatedAt: '2026-03-20T08:00:00.000Z',
        },
      ],
      invites: [
        {
          id: 'inv-1',
          participantId: 'p-1',
          method: 'code',
          token: 'ABC123',
          status: 'accepted',
          createdAt: '2026-03-20T08:00:00.000Z',
          updatedAt: '2026-03-20T08:00:00.000Z',
        },
      ],
      assignments: [
        {
          id: 'asg-1',
          participantId: 'p-1',
          memberId: 'm-1',
          vehicleId: 'v-1',
          status: 'active',
          createdAt: '2026-03-20T08:00:00.000Z',
          updatedAt: '2026-03-20T08:00:00.000Z',
        },
      ],
      createdAt: '2026-03-20T08:00:00.000Z',
      updatedAt: '2026-03-20T08:00:00.000Z',
    },
    savedAt: '2026-03-20T08:00:00.000Z',
    updatedAt: '2026-03-21T09:00:00.000Z',
    legacyTripNote: 'Bring jackets',
  };

  test('preserves convoy, stop metadata, and unknown legacy fields, and is idempotent on repeat runs', () => {
    const rawSavedTripsJson = JSON.stringify([representativeWebTrip]);

    const firstPlan = planLegacyWebTripMigration({
      rawSavedTripsJson,
      existingMobileTrips: [],
      importedAtIso: '2026-11-23T01:00:00.000Z',
    });

    expect(firstPlan.errors).toHaveLength(0);
    expect(firstPlan.rejectedTrips).toHaveLength(0);
    expect(firstPlan.tripsToImport).toHaveLength(1);
    const imported = firstPlan.tripsToImport[0];
    expect(imported.convoy?.vehicles[0].label).toBe('Lead Car');
    expect(imported.convoy?.participants[0].displayName).toBe('Mark');
    expect(imported.convoy?.invites[0].token).toBe('ABC123');
    expect(imported.convoy?.assignments[0].vehicleId).toBe('v-1');
    expect(imported.legacyTripNote).toBe('Bring jackets');
    expect(imported.stops[0].customStopTag).toBe('heritage');
    expect(imported.stops[1].source).toBe('activity-recommendation');
    expect(imported.stops[1].isAutoSuggested).toBe(true);

    // Repeat run with already-imported mobile trips -> skipped as exact duplicate
    const secondPlan = planLegacyWebTripMigration({
      rawSavedTripsJson,
      existingMobileTrips: firstPlan.nextMobileTrips,
      importedAtIso: '2026-11-23T02:00:00.000Z',
    });
    expect(secondPlan.tripsToImport).toHaveLength(0);
    expect(secondPlan.skippedDuplicateIds).toEqual(['web-trip-1']);
  });

  test('handles ID collisions with differing content without overwriting mobile trips', () => {
    const existingMobile: Trip = {
      id: 'web-trip-1',
      name: 'Mobile Edited Baguio',
      stops: [
        {id: 'm1', name: 'Manila', location: {lat: 14.59, lng: 120.98}, type: 'start'},
        {id: 'm2', name: 'Baguio', location: {lat: 16.4, lng: 120.59}, type: 'destination'},
      ],
    };

    const plan = planLegacyWebTripMigration({
      rawSavedTripsJson: JSON.stringify([representativeWebTrip]),
      existingMobileTrips: [existingMobile],
      importedAtIso: '2026-11-23T01:00:00.000Z',
    });

    expect(plan.renamedCollisionIds).toEqual([
      {originalId: 'web-trip-1', importedId: 'web-trip-1-web-1'},
    ]);
    expect(plan.nextMobileTrips).toHaveLength(2);
    expect(
      plan.nextMobileTrips.find(t => t.id === 'web-trip-1')?.name,
    ).toBe('Mobile Edited Baguio');
    expect(
      plan.nextMobileTrips.find(t => t.id === 'web-trip-1-web-1')?.name,
    ).toBe('Manila to Tagaytay (Imported from Web)');

    // Re-running after collision import is also idempotent
    const repeat = planLegacyWebTripMigration({
      rawSavedTripsJson: JSON.stringify([representativeWebTrip]),
      existingMobileTrips: plan.nextMobileTrips,
    });
    expect(repeat.tripsToImport).toHaveLength(0);
    expect(repeat.skippedDuplicateIds).toEqual(['web-trip-1']);
  });

  test('rejects trips with invalid middle stops or malformed JSON without partial trips', () => {
    const invalidMidTrip = {
      id: 'bad-mid',
      name: 'Broken 3-Stop',
      stops: [
        {id: 's1', name: 'Start', location: {lat: 14.5, lng: 120.9}},
        {id: 's2', name: 'Corrupt Mid', location: {lat: 99, lng: 120.9}},
        {id: 's3', name: 'End', location: {lat: 14.1, lng: 120.9}},
      ],
    };

    const plan = planLegacyWebTripMigration({
      rawSavedTripsJson: JSON.stringify([invalidMidTrip, representativeWebTrip]),
      existingMobileTrips: [],
    });

    expect(plan.rejectedTrips).toHaveLength(1);
    expect(plan.rejectedTrips[0].tripId).toBe('bad-mid');
    expect(plan.rejectedTrips[0].reason).toContain('Corrupt Mid');
    expect(plan.tripsToImport).toHaveLength(1);
    expect(plan.tripsToImport[0].id).toBe('web-trip-1');

    const malformed = planLegacyWebTripMigration({
      rawSavedTripsJson: '{not-valid-json',
      rawNavSessionJson: '{also-bad',
      existingMobileTrips: [],
    });
    expect(malformed.errors).toEqual([
      'Legacy saved trips JSON is malformed.',
      'Legacy navigation session JSON is malformed.',
    ]);
    expect(malformed.tripsToImport).toHaveLength(0);
  });
});
