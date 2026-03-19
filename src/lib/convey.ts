import {
    Convey,
    ConveyAssignment,
    ConveyInvite,
    ConveyInviteMethod,
    ConveyInviteStatus,
    ConveyMember,
    ConveyParticipant,
    ConveyParticipantKind,
    ConveyParticipantStatus,
    ConveyVehicle,
} from '../types/trip';

const createId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createTimestamp = () => new Date().toISOString();

const createVehicleLabel = (order: number) => (order === 0 ? 'Lead Car' : `Car ${order + 1}`);

export const createEmptyConvey = (tripId: string): Convey => {
    const timestamp = createTimestamp();
    return {
        id: createId('convey'),
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
): ConveyVehicle => {
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

export const syncVehicleOrder = (vehicles: ConveyVehicle[]): ConveyVehicle[] =>
    vehicles
        .slice()
        .sort((left, right) => left.order - right.order)
        .map((vehicle, index) => ({
            ...vehicle,
            order: index,
            label: createVehicleLabel(index),
            updatedAt: createTimestamp(),
        }));

export const createMembers = (names: string[]): ConveyMember[] =>
    names
        .map((name) => name.trim())
        .filter(Boolean)
        .map((name, index) => ({
            id: createId('member'),
            displayName: name,
            isPrimary: index === 0,
        }));

export const createParticipant = (
    kind: ConveyParticipantKind,
    displayName: string,
    members: ConveyMember[],
    status: ConveyParticipantStatus = 'joined',
    contactLabel?: string
): ConveyParticipant => {
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
    method: ConveyInviteMethod,
    status: ConveyInviteStatus = 'accepted'
): ConveyInvite => {
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
    assignments: ConveyAssignment[],
    participantId: string,
    memberVehiclePairs: Array<{ memberId: string; vehicleId?: string }>,
    assignedBy = 'self'
): ConveyAssignment[] => {
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
    convey: Convey,
    vehicleId: string
): Convey => {
    const timestamp = createTimestamp();
    return {
        ...convey,
        vehicles: syncVehicleOrder(convey.vehicles.filter((vehicle) => vehicle.id !== vehicleId)),
        assignments: convey.assignments.filter((assignment) => assignment.vehicleId !== vehicleId),
        updatedAt: timestamp,
    };
};

export const getVehicleOccupancy = (vehicleId: string, assignments: ConveyAssignment[]) =>
    assignments.filter((assignment) => assignment.vehicleId === vehicleId).length;

export const getVehicleSeatWarning = (vehicle: ConveyVehicle, assignments: ConveyAssignment[]) => {
    if (!vehicle.seatCapacity) return null;
    const occupancy = getVehicleOccupancy(vehicle.id, assignments);
    return occupancy > vehicle.seatCapacity
        ? `${occupancy}/${vehicle.seatCapacity} seats assigned`
        : null;
};

export const getAssignedVehicleId = (
    memberId: string,
    assignments: ConveyAssignment[]
) => assignments.find((assignment) => assignment.memberId === memberId)?.vehicleId;

export const getAssignedMemberCount = (participants: ConveyParticipant[], assignments: ConveyAssignment[]) => {
    const memberIds = new Set(participants.flatMap((participant) => participant.members.map((member) => member.id)));
    return assignments.filter((assignment) => memberIds.has(assignment.memberId)).length;
};

export const getTotalMemberCount = (participants: ConveyParticipant[]) =>
    participants.reduce((sum, participant) => sum + participant.members.length, 0);

export const getUnassignedMembers = (
    participants: ConveyParticipant[],
    assignments: ConveyAssignment[]
) => participants.flatMap((participant) => (
    participant.members
        .filter((member) => !assignments.some((assignment) => assignment.memberId === member.id))
        .map((member) => ({ participant, member }))
));

export const ensureConvey = (tripId: string, convey?: Convey) => convey ?? createEmptyConvey(tripId);
