import { useState } from 'react';
import type { ReactNode } from 'react';
import { StoreContext, createStore } from './store';
import type { Store, RootState } from './types';

interface StoreProviderProps {
  children: ReactNode;
  initialState?: Partial<RootState>;
}

export function StoreProvider({ children, initialState }: StoreProviderProps) {
  const [store] = useState<Store>(() => createStore(initialState));

  return (
    <StoreContext.Provider value={store}>
      {children}
    </StoreContext.Provider>
  );
}