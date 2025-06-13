import type { RootState, Action } from '../types';
import { configurationReducer } from './configurationReducer';
import { stagedChangesReducer } from './stagedChangesReducer';
import { uiReducer } from './uiReducer';
import { activityReducer } from './activityReducer';

export function rootReducer(state: RootState | undefined, action: Action): RootState {
    // Initialize state if undefined
    if (!state) {
        return {
            configuration: configurationReducer(undefined, action as any),
            stagedChanges: stagedChangesReducer(undefined, action as any),
            ui: uiReducer(undefined, action as any),
            activity: activityReducer(undefined, action as any),
        };
    }

    return {
        configuration: configurationReducer(state.configuration, action as any),
        stagedChanges: stagedChangesReducer(state.stagedChanges, action as any),
        ui: uiReducer(state.ui, action as any),
        activity: activityReducer(state.activity, action as any),
    };
}
