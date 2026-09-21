import { useContext } from 'react';
import type { AuthContextValue } from './authContextObject';
import { AuthContext } from './authContextObject';

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth doit être utilisé à l'intérieur de <AuthProvider>.");
  }
  return context;
}
