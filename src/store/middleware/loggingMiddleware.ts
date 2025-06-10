import type { Middleware } from '../types';

export const loggingMiddleware: Middleware = (store) => (next) => (action) => {
  if (process.env.NODE_ENV === 'development' && !import.meta.env.VITEST) {
    const prevState = store.getState();
    console.group(`🔄 Action: ${action.type}`);
    console.log('📥 Action:', action);
    console.log('📊 Previous State:', prevState);
    
    const result = next(action);
    
    console.log('📊 Next State:', store.getState());
    console.groupEnd();
    
    return result;
  }
  
  return next(action);
};