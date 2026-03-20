import { describe, expect, it } from 'vitest';
import {
    assignMembersToVehicles,
    createMembers,
    ensureConvoy,
    getAssignedMemberCount,
    getTotalMemberCount,
    getUnassignedMembers,
    removeVehicleAndUnassignMembers,
    syncVehicleOrder,
} from './convoy';
import type { Convoy, ConvoyAssignment, ConvoyParticipant, ConvoyVehicle } from '../types/trip';

const createParticipant = (
    id: string,
    memberIds: string[],
    displayName: string
): ConvoyParticipant => ({
    id,
    kind: 'group',
    displayName,
    status: 'joined',
    members: memberIds.map((memberId, index) => ({
        id: memberId,
        displayName: `Member ${index + 1}`,
        isPrimary: index === 0,
    })),
    createdAt: '2026-03-20T00:00:00.000Z',
    updatedAt: '2026-03-20T00:00:00.000Z',
});

describe('convoy helpers', () => {
    it('trims member names and marks the first member as primary', () => {
        const members = createMembers(['  Alice  ', '', 'Bob', '   Carol   ']);

        expect(members).toHaveLength(3);
        expect(members[0]).toMatchObject({
            displayName: 'Alice',
            isPrimary: true,
        });
        expect(members[1]).toMatchObject({
            displayName: 'Bob',
            isPrimary: false,
        });
    });

    it('keeps convoy counts and unassigned member lookups aligned', () => {
        const participants = [
            createParticipant('participant-1', ['member-1', 'member-2'], 'Family One'),
            createParticipant('participant-2', ['member-3'], 'Family Two'),
        ];
        const assignments: ConvoyAssignment[] = [
            {
                id: 'assignment-1',
                participantId: 'participant-1',
                memberId: 'member-1',
                vehicleId: 'vehicle-1',
                assignedBy: 'self',
                status: 'active',
                createdAt: '2026-03-20T00:00:00.000Z',
                updatedAt: '2026-03-20T00:00:00.000Z',
            },
        ];

        expect(getTotalMemberCount(participants)).toBe(3);
        expect(getAssignedMemberCount(participants, assignments)).toBe(1);
        expect(getUnassignedMembers(participants, assignments)).toHaveLength(2);
    });

    it('reorders vehicles and removes assignments for deleted vehicles', () => {
        const vehicles: ConvoyVehicle[] = [
            {
                id: 'vehicle-2',
                label: 'Car 2',
                order: 1,
                createdAt: '2026-03-20T00:00:00.000Z',
                updatedAt: '2026-03-20T00:00:00.000Z',
            },
            {
                id: 'vehicle-1',
                label: 'Lead Car',
                order: 0,
                createdAt: '2026-03-20T00:00:00.000Z',
                updatedAt: '2026-03-20T00:00:00.000Z',
            },
        ];
        const convoy: Convoy = {
            id: 'convoy-1',
            tripId: 'trip-1',
            vehicles,
            participants: [],
            invites: [],
            assignments: [
                {
                    id: 'assignment-1',
                    participantId: 'participant-1',
                    memberId: 'member-1',
                    vehicleId: 'vehicle-2',
                    assignedBy: 'self',
                    status: 'active',
                    createdAt: '2026-03-20T00:00:00.000Z',
                    updatedAt: '2026-03-20T00:00:00.000Z',
                },
            ],
            createdAt: '2026-03-20T00:00:00.000Z',
            updatedAt: '2026-03-20T00:00:00.000Z',
        };

        const rebalanced = syncVehicleOrder(vehicles);
        expect(rebalanced).toEqual([
            expect.objectContaining({ id: 'vehicle-1', order: 0, label: 'Lead Car' }),
            expect.objectContaining({ id: 'vehicle-2', order: 1, label: 'Car 2' }),
        ]);

        const updatedConvoy = removeVehicleAndUnassignMembers(convoy, 'vehicle-2');
        expect(updatedConvoy.vehicles).toEqual([
            expect.objectContaining({ id: 'vehicle-1', order: 0, label: 'Lead Car' }),
        ]);
        expect(updatedConvoy.assignments).toHaveLength(0);
    });

    it('returns the existing convoy or creates a new one when missing', () => {
        const existing: Convoy = {
            id: 'convoy-existing',
            tripId: 'trip-1',
            vehicles: [],
            participants: [],
            invites: [],
            assignments: [],
            createdAt: '2026-03-20T00:00:00.000Z',
            updatedAt: '2026-03-20T00:00:00.000Z',
        };

        expect(ensureConvoy('trip-1', existing)).toBe(existing);
        expect(ensureConvoy('trip-2')).toMatchObject({
            tripId: 'trip-2',
            vehicles: [],
            participants: [],
            invites: [],
            assignments: [],
        });
    });

    it('assigns members to vehicles and skips entries without a vehicle', () => {
        const assignments = assignMembersToVehicles(
            [
                {
                    id: 'assignment-old',
                    participantId: 'participant-1',
                    memberId: 'member-1',
                    vehicleId: 'vehicle-old',
                    assignedBy: 'self',
                    status: 'active',
                    createdAt: '2026-03-20T00:00:00.000Z',
                    updatedAt: '2026-03-20T00:00:00.000Z',
                },
            ],
            'participant-2',
            [
                { memberId: 'member-1', vehicleId: 'vehicle-new' },
                { memberId: 'member-2' },
            ]
        );

        expect(assignments).toHaveLength(1);
        expect(assignments[0]).toMatchObject({
            participantId: 'participant-2',
            memberId: 'member-1',
            vehicleId: 'vehicle-new',
            assignedBy: 'self',
            status: 'active',
        });
    });
});
