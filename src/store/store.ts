import { createContext, useContext } from 'react';
import { enableMapSet } from 'immer';
import type { RootState, Action, Dispatch, Store, Middleware } from './types';
import { rootReducer } from './reducers/rootReducer';
import { loggingMiddleware } from './middleware/loggingMiddleware';
import { persistenceMiddleware, loadPersistedState } from './middleware/persistenceMiddleware';
import { validationMiddleware } from './middleware/validationMiddleware';

// Enable Immer plugins
enableMapSet();

export function createStore(initialState?: Partial<RootState>, enhancer?: (store: Store) => Store): Store {
    const persistedState = loadPersistedState();

    // Merge initial state with persisted state
    let state = rootReducer(undefined, { type: '@@INIT' } as any);

    if (persistedState) {
        state = {
            ...state,
            ui: {
                ...state.ui,
                ...persistedState.ui,
            },
        };
    }

    if (initialState) {
        state = {
            ...state,
            ...initialState,
        };
    }

    const listeners: (() => void)[] = [];

    const getState = (): RootState => state;

    const subscribe = (listener: () => void): (() => void) => {
        listeners.push(listener);

        return () => {
            const index = listeners.indexOf(listener);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        };
    };

    // Middleware chain
    const middlewares: Middleware[] = [loggingMiddleware, validationMiddleware, persistenceMiddleware];

    const dispatch: Dispatch = (action: Action) => {
        // Apply middleware chain
        const middlewareAPI = { getState, dispatch, subscribe };
        const chain = middlewares.map((middleware) => middleware(middlewareAPI));
        const composedDispatch = chain.reduceRight(
            (next, middleware) => middleware(next),
            (action: Action) => {
                state = rootReducer(state, action);
                listeners.forEach((listener) => listener());
                return action;
            }
        );

        return composedDispatch(action);
    };

    const store: Store = {
        getState,
        dispatch,
        subscribe,
    };

    return enhancer ? enhancer(store) : store;
}

// React Context for the store
export const StoreContext = createContext<Store | null>(null);

export function useStore(): Store {
    const store = useContext(StoreContext);
    if (!store) {
        throw new Error('useStore must be used within a StoreProvider');
    }
    return store;
}
