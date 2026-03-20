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

export type ConvoyParticipantKind = 'individual' | 'group';
export type ConvoyParticipantStatus = 'pending' | 'joined' | 'declined';
export type ConvoyInviteMethod = 'link' | 'code' | 'manual';
export type ConvoyInviteStatus = 'pending' | 'accepted' | 'declined' | 'revoked';
export type ConvoyAssignmentStatus = 'active' | 'removed';

export interface ConvoyVehicle {
    id: string;
    label: string;
    order: number;
    seatCapacity?: number;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

export interface ConvoyMember {
    id: string;
    displayName: string;
    isPrimary?: boolean;
}

export interface ConvoyParticipant {
    id: string;
    kind: ConvoyParticipantKind;
    displayName: string;
    status: ConvoyParticipantStatus;
    invitedBy?: string;
    contactLabel?: string;
    members: ConvoyMember[];
    createdAt: string;
    updatedAt: string;
}

export interface ConvoyInvite {
    id: string;
    participantId: string;
    method: ConvoyInviteMethod;
    token?: string;
    status: ConvoyInviteStatus;
    sentAt?: string;
    respondedAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface ConvoyAssignment {
    id: string;
    participantId: string;
    memberId: string;
    vehicleId: string;
    assignedBy?: string;
    status: ConvoyAssignmentStatus;
    createdAt: string;
    updatedAt: string;
}

export interface Convoy {
    id: string;
    tripId: string;
    vehicles: ConvoyVehicle[];
    participants: ConvoyParticipant[];
    invites: ConvoyInvite[];
    assignments: ConvoyAssignment[];
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
    convoy?: Convoy;
    savedAt?: string;
    updatedAt?: string;
}
