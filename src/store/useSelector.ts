import { useState, useEffect, useRef } from 'react';
import { useStore } from './store';
import type { RootState } from './types';

export function useSelector<T>(selector: (state: RootState) => T): T {
    const store = useStore();
    const [selectedState, setSelectedState] = useState(() => selector(store.getState()));
    const selectorRef = useRef(selector);
    const selectedStateRef = useRef(selectedState);

    // Update refs
    selectorRef.current = selector;
    selectedStateRef.current = selectedState;

    useEffect(() => {
        const checkForUpdates = () => {
            const newSelectedState = selectorRef.current(store.getState());

            // Only update if the selected state has actually changed
            if (newSelectedState !== selectedStateRef.current) {
                setSelectedState(newSelectedState);
            }
        };

        // Subscribe to store changes
        const unsubscribe = store.subscribe(checkForUpdates);

        // Check for changes immediately in case the store has changed
        checkForUpdates();

        return unsubscribe;
    }, [store]);

    return selectedState;
}

export function useDispatch() {
    const store = useStore();
    return store.dispatch;
}
