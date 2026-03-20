import {
    Convoy,
    ConvoyAssignment,
    ConvoyInvite,
    ConvoyInviteMethod,
    ConvoyInviteStatus,
    ConvoyMember,
    ConvoyParticipant,
    ConvoyParticipantKind,
    ConvoyParticipantStatus,
    ConvoyVehicle,
} from '../types/trip';

const createId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createTimestamp = () => new Date().toISOString();

const createVehicleLabel = (order: number) => (order === 0 ? 'Lead Car' : `Car ${order + 1}`);

export const createEmptyConvoy = (tripId: string): Convoy => {
    const timestamp = createTimestamp();
    return {
        id: createId('convoy'),
        tripId,
        vehicles: [],
        participants: [],
        invites: [],
        assignments: [],
        createdAt: timestamp,
        updatedAt: timestamp,
    };
};

export const createVehicle = (
    order: number,
    seatCapacity?: number,
    notes?: string
): ConvoyVehicle => {
    const timestamp = createTimestamp();
    return {
        id: createId('vehicle'),
        label: createVehicleLabel(order),
        order,
        seatCapacity,
        notes,
        createdAt: timestamp,
        updatedAt: timestamp,
    };
};

export const syncVehicleOrder = (vehicles: ConvoyVehicle[]): ConvoyVehicle[] =>
    vehicles
        .slice()
        .sort((left, right) => left.order - right.order)
        .map((vehicle, index) => ({
            ...vehicle,
            order: index,
            label: createVehicleLabel(index),
            updatedAt: createTimestamp(),
        }));

export const createMembers = (names: string[]): ConvoyMember[] =>
    names
        .map((name) => name.trim())
        .filter(Boolean)
        .map((name, index) => ({
            id: createId('member'),
            displayName: name,
            isPrimary: index === 0,
        }));

export const createParticipant = (
    kind: ConvoyParticipantKind,
    displayName: string,
    members: ConvoyMember[],
    status: ConvoyParticipantStatus = 'joined',
    contactLabel?: string
): ConvoyParticipant => {
    const timestamp = createTimestamp();
    return {
        id: createId('participant'),
        kind,
        displayName: displayName.trim(),
        status,
        contactLabel: contactLabel?.trim() || undefined,
        members,
        createdAt: timestamp,
        updatedAt: timestamp,
    };
};

export const createInvite = (
    participantId: string,
    method: ConvoyInviteMethod,
    status: ConvoyInviteStatus = 'accepted'
): ConvoyInvite => {
    const timestamp = createTimestamp();
    return {
        id: createId('invite'),
        participantId,
        method,
        token: method === 'manual' ? undefined : Math.random().toString(36).slice(2, 8).toUpperCase(),
        status,
        sentAt: timestamp,
        respondedAt: status === 'accepted' ? timestamp : undefined,
        createdAt: timestamp,
        updatedAt: timestamp,
    };
};

export const assignMembersToVehicles = (
    assignments: ConvoyAssignment[],
    participantId: string,
    memberVehiclePairs: Array<{ memberId: string; vehicleId?: string }>,
    assignedBy = 'self'
): ConvoyAssignment[] => {
    const activeAssignments = assignments.filter(
        (assignment) => !memberVehiclePairs.some((pair) => pair.memberId === assignment.memberId)
    );

    const nextAssignments = memberVehiclePairs
        .filter((pair) => pair.vehicleId)
        .map((pair) => {
            const timestamp = createTimestamp();
            return {
                id: createId('assignment'),
                participantId,
                memberId: pair.memberId,
                vehicleId: pair.vehicleId as string,
                assignedBy,
                status: 'active' as const,
                createdAt: timestamp,
                updatedAt: timestamp,
            };
        });

    return [...activeAssignments, ...nextAssignments];
};

export const removeVehicleAndUnassignMembers = (
    convoy: Convoy,
    vehicleId: string
): Convoy => {
    const timestamp = createTimestamp();
    return {
        ...convoy,
        vehicles: syncVehicleOrder(convoy.vehicles.filter((vehicle) => vehicle.id !== vehicleId)),
        assignments: convoy.assignments.filter((assignment) => assignment.vehicleId !== vehicleId),
        updatedAt: timestamp,
    };
};

export const getVehicleOccupancy = (vehicleId: string, assignments: ConvoyAssignment[]) =>
    assignments.filter((assignment) => assignment.vehicleId === vehicleId).length;

export const getVehicleSeatWarning = (vehicle: ConvoyVehicle, assignments: ConvoyAssignment[]) => {
    if (!vehicle.seatCapacity) return null;
    const occupancy = getVehicleOccupancy(vehicle.id, assignments);
    return occupancy > vehicle.seatCapacity
        ? `${occupancy}/${vehicle.seatCapacity} seats assigned`
        : null;
};

export const getAssignedVehicleId = (
    memberId: string,
    assignments: ConvoyAssignment[]
) => assignments.find((assignment) => assignment.memberId === memberId)?.vehicleId;

export const getAssignedMemberCount = (participants: ConvoyParticipant[], assignments: ConvoyAssignment[]) => {
    const memberIds = new Set(participants.flatMap((participant) => participant.members.map((member) => member.id)));
    return assignments.filter((assignment) => memberIds.has(assignment.memberId)).length;
};

export const getTotalMemberCount = (participants: ConvoyParticipant[]) =>
    participants.reduce((sum, participant) => sum + participant.members.length, 0);

export const getUnassignedMembers = (
    participants: ConvoyParticipant[],
    assignments: ConvoyAssignment[]
) => participants.flatMap((participant) => (
    participant.members
        .filter((member) => !assignments.some((assignment) => assignment.memberId === member.id))
        .map((member) => ({ participant, member }))
));

export const ensureConvoy = (tripId: string, convoy?: Convoy) => convoy ?? createEmptyConvoy(tripId);
