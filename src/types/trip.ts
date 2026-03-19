export type StopSource = 'manual' | 'auto-pitstop' | 'activity-recommendation';

export interface Stop {
    id: string;
    name: string;
    formattedAddress?: string;     // Full Google Places formatted_address
    location: google.maps.LatLngLiteral;
    type: 'start' | 'stop' | 'destination';
    source?: StopSource;
    isAutoSuggested?: boolean;     // true = inserted automatically
    category?: string;
    description?: string;
    rating?: number;
    googleMapsUri?: string;
    distanceFromPrevious?: number; // km
    durationFromPrevious?: number; // mins
    arrivalTime?: string;          // e.g. "8:15 AM"
}

export type RecommendationSessionStatus =
    | 'idle'
    | 'loadingCandidate'
    | 'awaitingDecision'
    | 'accepted'
    | 'rejected'
    | 'expired';

export type RecommendationVote = 'yes' | 'no';

export interface RecommendationCandidate {
    id: string;
    name: string;
    formattedAddress?: string;
    location: google.maps.LatLngLiteral;
    category?: string;
    description?: string;
    rating?: number;
    googleMapsUri?: string;
}

export interface ActiveNavigationRecommendationSession {
    legKey: string;
    targetStopId: string;
    targetStopName: string;
    status: RecommendationSessionStatus;
    candidate?: RecommendationCandidate;
    startedAt?: number;
    expiresAt?: number;
    votes: Record<string, RecommendationVote>;
    resultLabel?: string;
}

export type ConveyParticipantKind = 'individual' | 'group';
export type ConveyParticipantStatus = 'pending' | 'joined' | 'declined';
export type ConveyInviteMethod = 'link' | 'code' | 'manual';
export type ConveyInviteStatus = 'pending' | 'accepted' | 'declined' | 'revoked';
export type ConveyAssignmentStatus = 'active' | 'removed';

export interface ConveyVehicle {
    id: string;
    label: string;
    order: number;
    seatCapacity?: number;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

export interface ConveyMember {
    id: string;
    displayName: string;
    isPrimary?: boolean;
}

export interface ConveyParticipant {
    id: string;
    kind: ConveyParticipantKind;
    displayName: string;
    status: ConveyParticipantStatus;
    invitedBy?: string;
    contactLabel?: string;
    members: ConveyMember[];
    createdAt: string;
    updatedAt: string;
}

export interface ConveyInvite {
    id: string;
    participantId: string;
    method: ConveyInviteMethod;
    token?: string;
    status: ConveyInviteStatus;
    sentAt?: string;
    respondedAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface ConveyAssignment {
    id: string;
    participantId: string;
    memberId: string;
    vehicleId: string;
    assignedBy?: string;
    status: ConveyAssignmentStatus;
    createdAt: string;
    updatedAt: string;
}

export interface Convey {
    id: string;
    tripId: string;
    vehicles: ConveyVehicle[];
    participants: ConveyParticipant[];
    invites: ConveyInvite[];
    assignments: ConveyAssignment[];
    assignmentLockAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface Trip {
    id: string;
    name: string;
    stops: Stop[];
    totalDistance?: number;
    totalDuration?: number;
    convey?: Convey;
    savedAt?: string;
    updatedAt?: string;
}
