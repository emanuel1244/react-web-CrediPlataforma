import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Portal, Role, SessionUser } from '@/types/domain';
import { loadTokens, login as cognitoLogin, clearTokens, type AuthTokens } from '@/auth/cognito';

/**
 * Sesión basada en Cognito. El usuario autenticado (email + grupos) viene del
 * JWT; la autorización real la aplica el backend. El selector de portal se
 * conserva para la demo (permite ver las vistas de admin/cobrador/cliente).
 */

function roleFromGroups(groups: string[]): Role {
  const order: Role[] = ['PLATFORM_ADMIN', 'LENDER_ADMIN', 'LENDER_OPERATOR', 'COLLECTION_AGENT', 'CUSTOMER'];
  return order.find((r) => groups.includes(r)) ?? 'CUSTOMER';
}

function userFromTokens(t: AuthTokens): SessionUser {
  return {
    id: t.email,
    name: t.email.split('@')[0],
    email: t.email,
    role: roleFromGroups(t.groups),
    tenantId: 't-demo',
  };
}

interface SessionContextValue {
  authenticated: boolean;
  user: SessionUser | null;
  role: Role | null;
  portal: Portal;
  switchPortal: (portal: Portal) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [tokens, setTokens] = useState<AuthTokens | null>(() => loadTokens());
  const [portal, setPortal] = useState<Portal>('admin');

  const signIn = useCallback(async (email: string, password: string) => {
    const t = await cognitoLogin(email, password);
    setTokens(t);
  }, []);

  const signOut = useCallback(() => {
    clearTokens();
    setTokens(null);
  }, []);

  const value = useMemo<SessionContextValue>(() => {
    const user = tokens ? userFromTokens(tokens) : null;
    return {
      authenticated: tokens !== null,
      user,
      role: user?.role ?? null,
      portal,
      switchPortal: setPortal,
      signIn,
      signOut,
    };
  }, [tokens, portal, signIn, signOut]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession debe usarse dentro de SessionProvider');
  return ctx;
}
