import { useState } from 'react';
import { LogIn, Loader2 } from 'lucide-react';
import { useSession } from '@/auth/session';

export function Login() {
  const { signIn } = useSession();
  const [email, setEmail] = useState('admin@demo.co');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signIn(email, password);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-100 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-brand-900 text-base font-bold text-white">
            CP
          </div>
          <h1 className="text-lg font-bold text-ink-900">CrediPlataforma</h1>
          <p className="text-sm text-ink-500">Inicia sesión para continuar</p>
        </div>

        <form onSubmit={submit} className="card space-y-4 p-6">
          <div>
            <label className="label" htmlFor="email">
              Correo
            </label>
            <input
              id="email"
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="password">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <div className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-700">{error}</div>
          )}

          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            {busy ? 'Ingresando...' : 'Ingresar'}
          </button>

          <p className="text-center text-xs text-ink-400">
            Demo: admin@demo.co · Demo1234
          </p>
        </form>
      </div>
    </div>
  );
}
