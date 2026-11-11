/**
 * Cliente de autenticación con Amazon Cognito usando el endpoint público
 * de Identity Provider (InitiateAuth con USER_PASSWORD_AUTH). Evita añadir el
 * SDK completo; el app client no tiene secreto (SPA).
 *
 * El id token resultante se envía en el header Authorization al API Gateway,
 * cuyo JWT authorizer lo valida.
 */

const REGION = (import.meta.env.VITE_COGNITO_REGION as string) ?? 'us-east-2';
const CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID as string | undefined;
const COGNITO_URL = `https://cognito-idp.${REGION}.amazonaws.com/`;

const STORAGE_KEY = 'plataforma.auth';

export interface AuthTokens {
  idToken: string;
  accessToken: string;
  refreshToken?: string;
  email: string;
  groups: string[];
  expiresAt: number;
}

function decodeJwt(token: string): Record<string, unknown> {
  const payload = token.split('.')[1];
  const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
  return JSON.parse(decodeURIComponent(escape(json)));
}

export function loadTokens(): AuthTokens | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const t = JSON.parse(raw) as AuthTokens;
    if (t.expiresAt <= Date.now()) return null; // expirado
    return t;
  } catch {
    return null;
  }
}

function saveTokens(t: AuthTokens) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
}

export function clearTokens() {
  localStorage.removeItem(STORAGE_KEY);
}

export async function login(email: string, password: string): Promise<AuthTokens> {
  if (!CLIENT_ID) throw new Error('VITE_COGNITO_CLIENT_ID no está configurado.');
  const res = await fetch(COGNITO_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-amz-json-1.1',
      'x-amz-target': 'AWSCognitoIdentityProviderService.InitiateAuth',
    },
    body: JSON.stringify({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: CLIENT_ID,
      AuthParameters: { USERNAME: email, PASSWORD: password },
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    const msg = data?.message || 'Credenciales inválidas';
    throw new Error(msg);
  }
  const r = data.AuthenticationResult;
  if (!r?.IdToken) throw new Error('Respuesta de autenticación inesperada.');

  const claims = decodeJwt(r.IdToken);
  const tokens: AuthTokens = {
    idToken: r.IdToken,
    accessToken: r.AccessToken,
    refreshToken: r.RefreshToken,
    email: (claims.email as string) ?? email,
    groups: (claims['cognito:groups'] as string[]) ?? [],
    expiresAt: Date.now() + (r.ExpiresIn ?? 3600) * 1000,
  };
  saveTokens(tokens);
  return tokens;
}

/** Devuelve el id token vigente para el header Authorization, o null. */
export function getIdToken(): string | null {
  return loadTokens()?.idToken ?? null;
}
