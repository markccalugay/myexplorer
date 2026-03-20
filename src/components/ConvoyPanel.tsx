import React, { useMemo, useState } from 'react';
import {
    Convoy,
    ConvoyInviteMethod,
    ConvoyParticipantKind,
    ConvoyVehicle,
    Trip,
} from '../types/trip';
import {
    assignMembersToVehicles,
    createInvite,
    createMembers,
    createParticipant,
    createVehicle,
    ensureConvoy,
    getAssignedMemberCount,
    getAssignedVehicleId,
    getTotalMemberCount,
    getUnassignedMembers,
    getVehicleOccupancy,
    getVehicleSeatWarning,
    removeVehicleAndUnassignMembers,
} from '../lib/convoy';
import './ConvoyPanel.css';

type ConvoyOverlay = 'vehicles' | 'invite' | 'assignments' | null;

interface ConvoyPanelProps {
    trip: Trip;
    defaultOverlay?: ConvoyOverlay;
    onOverlayHandled?: () => void;
    onTripChange: (trip: Trip) => void;
}

interface InviteDraft {
    mode: 'manual' | 'invite';
    kind: ConvoyParticipantKind;
    displayName: string;
    contactLabel: string;
    memberNames: string[];
    inviteMethod: ConvoyInviteMethod;
}

const createEmptyInviteDraft = (): InviteDraft => ({
    mode: 'manual',
    kind: 'individual',
    displayName: '',
    contactLabel: '',
    memberNames: [''],
    inviteMethod: 'link',
});

const parseCapacity = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

const sortVehicles = (vehicles: ConvoyVehicle[]) => vehicles.slice().sort((left, right) => left.order - right.order);

export const ConvoyPanel: React.FC<ConvoyPanelProps> = ({
    trip,
    defaultOverlay = null,
    onOverlayHandled,
    onTripChange,
}) => {
    const [activeOverlay, setActiveOverlay] = useState<ConvoyOverlay>(defaultOverlay);
    const [seatCapacityDraft, setSeatCapacityDraft] = useState('');
    const [vehicleNotesDraft, setVehicleNotesDraft] = useState('');
    const [inviteDraft, setInviteDraft] = useState<InviteDraft>(createEmptyInviteDraft);

    const convoy = trip.convoy;
    const vehicles = useMemo(() => sortVehicles(convoy?.vehicles ?? []), [convoy?.vehicles]);
    const participants = convoy?.participants ?? [];
    const assignments = convoy?.assignments ?? [];
    const totalMembers = getTotalMemberCount(participants);
    const assignedMembers = getAssignedMemberCount(participants, assignments);
    const warnings = vehicles.filter((vehicle) => getVehicleSeatWarning(vehicle, assignments)).length;
    const unassignedMembers = useMemo(
        () => getUnassignedMembers(participants, assignments),
        [participants, assignments]
    );

    const updateConvoy = (updater: (current: Convoy) => Convoy) => {
        const ensured = ensureConvoy(trip.id, trip.convoy);
        const nextConvoy = updater(ensured);
        onTripChange({
            ...trip,
            convoy: {
                ...nextConvoy,
                tripId: trip.id,
                updatedAt: new Date().toISOString(),
            },
        });
    };

    const openOverlay = (overlay: ConvoyOverlay) => {
        setActiveOverlay(overlay);
        onOverlayHandled?.();
    };

    const closeOverlay = () => {
        setActiveOverlay(null);
        setSeatCapacityDraft('');
        setVehicleNotesDraft('');
        setInviteDraft(createEmptyInviteDraft());
    };

    const handleAddVehicle = () => {
        updateConvoy((current) => ({
            ...current,
            vehicles: [
                ...current.vehicles,
                createVehicle(current.vehicles.length, parseCapacity(seatCapacityDraft), vehicleNotesDraft.trim() || undefined),
            ],
        }));
        setSeatCapacityDraft('');
        setVehicleNotesDraft('');
    };

    const handleMoveVehicle = (vehicleId: string, direction: -1 | 1) => {
        updateConvoy((current) => {
            const ordered = sortVehicles(current.vehicles);
            const currentIndex = ordered.findIndex((vehicle) => vehicle.id === vehicleId);
            const nextIndex = currentIndex + direction;
            if (currentIndex < 0 || nextIndex < 0 || nextIndex >= ordered.length) return current;
            const nextVehicles = [...ordered];
            const [moved] = nextVehicles.splice(currentIndex, 1);
            nextVehicles.splice(nextIndex, 0, moved);
            return {
                ...current,
                vehicles: nextVehicles.map((vehicle, index) => ({
                    ...vehicle,
                    order: index,
                    label: index === 0 ? 'Lead Car' : `Car ${index + 1}`,
                    updatedAt: new Date().toISOString(),
                })),
            };
        });
    };

    const handleRemoveVehicle = (vehicleId: string) => {
        updateConvoy((current) => removeVehicleAndUnassignMembers(current, vehicleId));
    };

    const handleMemberNameChange = (index: number, value: string) => {
        setInviteDraft((current) => ({
            ...current,
            memberNames: current.memberNames.map((member, memberIndex) => (memberIndex === index ? value : member)),
        }));
    };

    const handleAddMemberField = () => {
        setInviteDraft((current) => ({
            ...current,
            memberNames: [...current.memberNames, ''],
        }));
    };

    const handleCreateParticipant = () => {
        const memberNames = inviteDraft.kind === 'individual'
            ? [inviteDraft.displayName.trim()]
            : inviteDraft.memberNames;
        const members = createMembers(memberNames);
        const displayName = inviteDraft.kind === 'group'
            ? inviteDraft.displayName.trim()
            : members[0]?.displayName || inviteDraft.displayName.trim();

        if (!displayName || members.length === 0) return;

        updateConvoy((current) => {
            const participant = createParticipant(
                inviteDraft.kind,
                displayName,
                members,
                'joined',
                inviteDraft.contactLabel
            );

            const memberVehiclePairs = members.map((member, index) => ({
                memberId: member.id,
                vehicleId: vehicles[index === 0 ? 0 : index]?.id || vehicles[0]?.id,
            }));

            const nextInvites = inviteDraft.mode === 'manual'
                ? current.invites
                : [...current.invites, createInvite(participant.id, inviteDraft.inviteMethod)];

            return {
                ...current,
                participants: [...current.participants, participant],
                invites: nextInvites,
                assignments: assignMembersToVehicles(
                    current.assignments,
                    participant.id,
                    memberVehiclePairs,
                    inviteDraft.mode === 'manual' ? 'organizer' : 'self'
                ),
            };
        });

        closeOverlay();
    };

    const handleReassignMember = (participantId: string, memberId: string, vehicleId: string) => {
        updateConvoy((current) => ({
            ...current,
            assignments: assignMembersToVehicles(
                current.assignments,
                participantId,
                [{ memberId, vehicleId }],
                'self'
            ),
        }));
    };

    const canCreateParticipant = inviteDraft.kind === 'individual'
        ? inviteDraft.displayName.trim().length > 0 && vehicles.length > 0
        : inviteDraft.displayName.trim().length > 0 &&
          createMembers(inviteDraft.memberNames).length > 0 &&
          vehicles.length > 0;

    return (
        <div className="convoy-panel">
            <div className="convoy-panel__grid">
                <div className="convoy-panel__header">
                    <h3>Convoy</h3>
                    <p>Coordinate vehicles, add people, and let families place themselves into the convoy.</p>
                </div>

                <div className="convoy-summary-card">
                    <span className="convoy-summary-card__label">Vehicles</span>
                    <strong>{vehicles.length}</strong>
                </div>
                <div className="convoy-summary-card">
                    <span className="convoy-summary-card__label">Travelers</span>
                    <strong>{totalMembers}</strong>
                </div>
                <div className="convoy-summary-card">
                    <span className="convoy-summary-card__label">Assigned</span>
                    <strong>{assignedMembers}</strong>
                </div>
                <div className="convoy-summary-card">
                    <span className="convoy-summary-card__label">Warnings</span>
                    <strong>{warnings}</strong>
                </div>

                <button type="button" className="convoy-action-btn convoy-action-btn--primary" onClick={() => openOverlay('vehicles')}>
                    Manage Vehicles
                </button>
                <button type="button" className="convoy-action-btn convoy-action-btn--primary" onClick={() => openOverlay('invite')}>
                    Invite / Add People
                </button>
                <button type="button" className="convoy-action-btn convoy-action-btn--secondary" onClick={() => openOverlay('assignments')}>
                    View Assignments
                </button>
                <button type="button" className="convoy-action-btn convoy-action-btn--secondary" onClick={() => openOverlay('vehicles')}>
                    {vehicles.length > 0 ? 'Add Vehicle' : 'Set Up First Vehicle'}
                </button>
            </div>

            {unassignedMembers.length > 0 && (
                <div className="convoy-panel__notice">
                    {unassignedMembers.length} traveler{unassignedMembers.length === 1 ? '' : 's'} still need a vehicle assignment.
                </div>
            )}

            {activeOverlay && (
                <div className="convoy-overlay">
                    <div className="convoy-overlay__scrim" onClick={closeOverlay} />
                    <div className="convoy-overlay__panel">
                        <div className="convoy-overlay__header">
                            <div>
                                <h4>
                                    {activeOverlay === 'vehicles'
                                        ? 'Manage Vehicles'
                                        : activeOverlay === 'invite'
                                        ? 'Invite / Join Convoy'
                                        : 'Assignments Roster'}
                                </h4>
                                <p>
                                    {activeOverlay === 'vehicles'
                                        ? 'Set the convoy order and optional seat guidance for each car.'
                                        : activeOverlay === 'invite'
                                        ? 'Add solo travelers or families and place them into a vehicle during join.'
                                        : 'Review occupancy by vehicle and reassign members when plans change.'}
                                </p>
                            </div>
                            <button type="button" className="convoy-overlay__close" onClick={closeOverlay}>
                                ×
                            </button>
                        </div>

                        {activeOverlay === 'vehicles' && (
                            <div className="convoy-overlay__body">
                                <div className="convoy-form-grid">
                                    <label>
                                        <span>Seat capacity</span>
                                        <input
                                            value={seatCapacityDraft}
                                            onChange={(event) => setSeatCapacityDraft(event.target.value)}
                                            placeholder="Optional"
                                            inputMode="numeric"
                                        />
                                    </label>
                                    <label>
                                        <span>Notes</span>
                                        <input
                                            value={vehicleNotesDraft}
                                            onChange={(event) => setVehicleNotesDraft(event.target.value)}
                                            placeholder="Ex. luggage-heavy vehicle"
                                        />
                                    </label>
                                </div>
                                <button type="button" className="convoy-primary-btn" onClick={handleAddVehicle}>
                                    Add Vehicle
                                </button>

                                <div className="convoy-vehicle-list">
                                    {vehicles.length > 0 ? vehicles.map((vehicle, index) => {
                                        const warning = getVehicleSeatWarning(vehicle, assignments);
                                        return (
                                            <article key={vehicle.id} className="convoy-vehicle-card">
                                                <div>
                                                    <strong>{vehicle.label}</strong>
                                                    <p>
                                                        {getVehicleOccupancy(vehicle.id, assignments)} assigned
                                                        {vehicle.seatCapacity ? ` • ${vehicle.seatCapacity} seats` : ''}
                                                    </p>
                                                    {vehicle.notes && <p>{vehicle.notes}</p>}
                                                    {warning && <span className="convoy-warning-badge">{warning}</span>}
                                                </div>
                                                <div className="convoy-vehicle-card__actions">
                                                    <button type="button" onClick={() => handleMoveVehicle(vehicle.id, -1)} disabled={index === 0}>Up</button>
                                                    <button type="button" onClick={() => handleMoveVehicle(vehicle.id, 1)} disabled={index === vehicles.length - 1}>Down</button>
                                                    <button type="button" onClick={() => handleRemoveVehicle(vehicle.id)}>Remove</button>
                                                </div>
                                            </article>
                                        );
                                    }) : (
                                        <p className="convoy-empty-state">No vehicles yet. Add a lead car to start the convoy.</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeOverlay === 'invite' && (
                            <div className="convoy-overlay__body">
                                <div className="convoy-toggle-group">
                                    <button
                                        type="button"
                                        className={inviteDraft.mode === 'manual' ? 'is-active' : ''}
                                        onClick={() => setInviteDraft((current) => ({ ...current, mode: 'manual' }))}
                                    >
                                        Manual Add
                                    </button>
                                    <button
                                        type="button"
                                        className={inviteDraft.mode === 'invite' ? 'is-active' : ''}
                                        onClick={() => setInviteDraft((current) => ({ ...current, mode: 'invite' }))}
                                    >
                                        Invite Flow
                                    </button>
                                </div>

                                <div className="convoy-toggle-group">
                                    <button
                                        type="button"
                                        className={inviteDraft.kind === 'individual' ? 'is-active' : ''}
                                        onClick={() => setInviteDraft((current) => ({
                                            ...current,
                                            kind: 'individual',
                                            memberNames: [current.displayName || ''],
                                        }))}
                                    >
                                        Individual
                                    </button>
                                    <button
                                        type="button"
                                        className={inviteDraft.kind === 'group' ? 'is-active' : ''}
                                        onClick={() => setInviteDraft((current) => ({
                                            ...current,
                                            kind: 'group',
                                            memberNames: current.memberNames.length > 0 ? current.memberNames : [''],
                                        }))}
                                    >
                                        Family / Group
                                    </button>
                                </div>

                                <div className="convoy-form-grid">
                                    <label>
                                        <span>{inviteDraft.kind === 'group' ? 'Family or group name' : 'Traveler name'}</span>
                                        <input
                                            value={inviteDraft.displayName}
                                            onChange={(event) => setInviteDraft((current) => ({ ...current, displayName: event.target.value }))}
                                            placeholder={inviteDraft.kind === 'group' ? 'Santos Family' : 'Ana Santos'}
                                        />
                                    </label>
                                    <label>
                                        <span>Contact label</span>
                                        <input
                                            value={inviteDraft.contactLabel}
                                            onChange={(event) => setInviteDraft((current) => ({ ...current, contactLabel: event.target.value }))}
                                            placeholder="Optional phone or email"
                                        />
                                    </label>
                                </div>

                                {inviteDraft.mode === 'invite' && (
                                    <div className="convoy-toggle-group">
                                        <button
                                            type="button"
                                            className={inviteDraft.inviteMethod === 'link' ? 'is-active' : ''}
                                            onClick={() => setInviteDraft((current) => ({ ...current, inviteMethod: 'link' }))}
                                        >
                                            Link
                                        </button>
                                        <button
                                            type="button"
                                            className={inviteDraft.inviteMethod === 'code' ? 'is-active' : ''}
                                            onClick={() => setInviteDraft((current) => ({ ...current, inviteMethod: 'code' }))}
                                        >
                                            Code
                                        </button>
                                    </div>
                                )}

                                {inviteDraft.kind === 'group' && (
                                    <div className="convoy-member-list">
                                        {inviteDraft.memberNames.map((memberName, index) => (
                                            <label key={`member-${index}`}>
                                                <span>Member {index + 1}</span>
                                                <input
                                                    value={memberName}
                                                    onChange={(event) => handleMemberNameChange(index, event.target.value)}
                                                    placeholder="Full name"
                                                />
                                            </label>
                                        ))}
                                        <button type="button" className="convoy-secondary-btn" onClick={handleAddMemberField}>
                                            Add Another Member
                                        </button>
                                    </div>
                                )}

                                <div className="convoy-inline-note">
                                    New entries assign themselves into the convoy immediately. You can reassign anyone later from the roster.
                                </div>

                                <button
                                    type="button"
                                    className="convoy-primary-btn"
                                    onClick={handleCreateParticipant}
                                    disabled={!canCreateParticipant}
                                >
                                    {inviteDraft.mode === 'manual' ? 'Add To Convoy' : 'Create Invite And Join'}
                                </button>
                            </div>
                        )}

                        {activeOverlay === 'assignments' && (
                            <div className="convoy-overlay__body">
                                {vehicles.map((vehicle) => {
                                    const occupancy = getVehicleOccupancy(vehicle.id, assignments);
                                    const warning = getVehicleSeatWarning(vehicle, assignments);
                                    const assignedMembersForVehicle = participants.flatMap((participant) => (
                                        participant.members
                                            .filter((member) => getAssignedVehicleId(member.id, assignments) === vehicle.id)
                                            .map((member) => ({ participant, member }))
                                    ));

                                    return (
                                        <section key={vehicle.id} className="convoy-roster-section">
                                            <div className="convoy-roster-section__header">
                                                <div>
                                                    <h5>{vehicle.label}</h5>
                                                    <p>
                                                        {occupancy} assigned
                                                        {vehicle.seatCapacity ? ` • ${vehicle.seatCapacity} seats` : ''}
                                                    </p>
                                                </div>
                                                {warning && <span className="convoy-warning-badge">{warning}</span>}
                                            </div>

                                            {assignedMembersForVehicle.length > 0 ? (
                                                <div className="convoy-roster-list">
                                                    {assignedMembersForVehicle.map(({ participant, member }) => (
                                                        <div key={member.id} className="convoy-roster-row">
                                                            <div>
                                                                <strong>{member.displayName}</strong>
                                                                <p>{participant.displayName}</p>
                                                            </div>
                                                            <select
                                                                value={vehicle.id}
                                                                onChange={(event) => handleReassignMember(participant.id, member.id, event.target.value)}
                                                            >
                                                                {vehicles.map((option) => (
                                                                    <option key={option.id} value={option.id}>
                                                                        {option.label}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="convoy-empty-state">No one is assigned here yet.</p>
                                            )}
                                        </section>
                                    );
                                })}

                                <section className="convoy-roster-section">
                                    <div className="convoy-roster-section__header">
                                        <div>
                                            <h5>Unassigned</h5>
                                            <p>Members removed from a vehicle appear here until reassigned.</p>
                                        </div>
                                    </div>
                                    {unassignedMembers.length > 0 ? (
                                        <div className="convoy-roster-list">
                                            {unassignedMembers.map(({ participant, member }) => (
                                                <div key={member.id} className="convoy-roster-row">
                                                    <div>
                                                        <strong>{member.displayName}</strong>
                                                        <p>{participant.displayName}</p>
                                                    </div>
                                                    <select
                                                        value=""
                                                        onChange={(event) => handleReassignMember(participant.id, member.id, event.target.value)}
                                                    >
                                                        <option value="">Assign to vehicle</option>
                                                        {vehicles.map((vehicle) => (
                                                            <option key={vehicle.id} value={vehicle.id}>
                                                                {vehicle.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="convoy-empty-state">Everyone currently has a vehicle assignment.</p>
                                    )}
                                </section>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
