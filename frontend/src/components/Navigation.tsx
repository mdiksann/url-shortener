import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';
import { useLogout } from '@/hooks/useAuth';
import { Button } from '@/components/Button';
import clsx from 'clsx';

export function Navigation() {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  if (!user) {
    return (
      <nav className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-slate-900">
            LinkShort
          </Link>
          <div className="flex gap-3">
            <Link to="/login">
              <Button variant="secondary">Login</Button>
            </Link>
            <Link to="/register">
              <Button>Sign Up</Button>
            </Link>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="border-b border-slate-200 bg-white">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/dashboard" className="text-xl font-bold text-slate-900">
          LinkShort
        </Link>

        <div className="flex gap-6 items-center">
          <Link
            to="/dashboard"
            className={clsx(
              'text-sm font-medium transition-colors',
              isActive('/dashboard')
                ? 'text-slate-900'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            Dashboard
          </Link>
          <Link
            to="/api-keys"
            className={clsx(
              'text-sm font-medium transition-colors',
              isActive('/api-keys')
                ? 'text-slate-900'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            API Keys
          </Link>

          <div className="flex items-center gap-3 pl-6 border-l border-slate-200">
            <span className="text-sm text-slate-600">{user.email}</span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => logout.mutate()}
              isLoading={logout.isPending}
            >
              Logout
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
