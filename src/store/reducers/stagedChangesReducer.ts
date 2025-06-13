import { produce } from 'immer';
import type { StagedChangesState, StagedChangesAction } from '../types';

const initialState: StagedChangesState = {
    changes: [],
    applying: false,
    conflicts: [],
};

export function stagedChangesReducer(
    state: StagedChangesState = initialState,
    action: StagedChangesAction
): StagedChangesState {
    return produce(state, (draft) => {
        switch (action.type) {
            case 'STAGE_CHANGE':
                // Check if change already exists (by id or by property+queue combination)
                const existingIndex = draft.changes.findIndex(
                    (change) =>
                        change.id === action.payload.id ||
                        (change.queueName === action.payload.queueName && change.property === action.payload.property)
                );

                if (existingIndex >= 0) {
                    // Update existing change
                    draft.changes[existingIndex] = action.payload;
                } else {
                    // Add new change
                    draft.changes.push(action.payload);
                }
                break;

            case 'UNSTAGE_CHANGE':
                draft.changes = draft.changes.filter((change) => change.id !== action.payload);
                // Remove related conflicts
                draft.conflicts = draft.conflicts.filter((conflict) => conflict.changeId !== action.payload);
                break;

            case 'CLEAR_ALL_CHANGES':
                draft.changes = [];
                draft.conflicts = [];
                break;

            case 'APPLY_CHANGES_START':
                draft.applying = true;
                break;

            case 'APPLY_CHANGES_SUCCESS':
                draft.applying = false;
                draft.lastApplied = action.payload.timestamp;
                draft.changes = [];
                draft.conflicts = [];
                break;

            case 'APPLY_CHANGES_ERROR':
                draft.applying = false;
                break;

            case 'ADD_CONFLICT':
                // Check if conflict already exists
                const conflictExists = draft.conflicts.some(
                    (conflict) => conflict.changeId === action.payload.changeId
                );

                if (!conflictExists) {
                    draft.conflicts.push(action.payload);
                }
                break;

            case 'REMOVE_CONFLICT':
                draft.conflicts = draft.conflicts.filter((conflict) => conflict.changeId !== action.payload);
                break;

            case 'CLEAR_CONFLICTS':
                draft.conflicts = [];
                break;

            default:
                break;
        }
    });
}
