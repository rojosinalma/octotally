import { createContext, use } from 'react';

export interface Auth {
  /** The instance asks for a password (AUTH_PASSWORD is set). */
  required: boolean;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<Auth>({ required: false, logout: async () => {} });

export const useAuth = (): Auth => use(AuthContext);
