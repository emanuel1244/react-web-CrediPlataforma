import { RouterProvider } from 'react-router-dom';
import { SessionProvider, useSession } from '@/auth/session';
import { ToastProvider } from '@/components/ui/Toast';
import { Login } from '@/pages/Login';
import { router } from '@/app/router';

/** Muestra el login si no hay sesión; el router protegido si la hay. */
function Gate() {
  const { authenticated } = useSession();
  if (!authenticated) return <Login />;
  return <RouterProvider router={router} />;
}

export default function App() {
  return (
    <ToastProvider>
      <SessionProvider>
        <Gate />
      </SessionProvider>
    </ToastProvider>
  );
}
