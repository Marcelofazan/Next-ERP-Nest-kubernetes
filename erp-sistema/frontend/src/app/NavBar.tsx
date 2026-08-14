'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { clearSession } from '@/lib/api';
import { useSyncExternalStore } from 'react';

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/employees', label: 'Funcionários', icon: '🧑‍💼' },
  { href: '/products', label: 'Produtos', icon: '📦' },
  { href: '/inventory', label: 'Estoque', icon: '🏭' },
  { href: '/orders', label: 'Ordens', icon: '🛒' },
];

interface StoredUser { email?: string; role?: { name: string } }

// Returns the raw JSON string (a primitive) — useSyncExternalStore requires
// getSnapshot to return the same reference when the value hasn't changed.
// Returning a parsed object would create a new reference on every call → infinite loop.
function getSnapshot(): string | null {
  return typeof window !== 'undefined' ? localStorage.getItem('postgres') : null;
}

function getServerSnapshot(): string | null { return null; }

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener('erp:auth-change', callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('erp:auth-change', callback);
  };
}

function parseUser(raw: string | null): StoredUser | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as StoredUser; }
  catch { return null; }
}

export default function NavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const user = parseUser(raw);

  if (pathname === '/login') return null;

  const isAdmin = user?.role?.name === 'admin';

  function handleLogout() {
    clearSession();
    router.push('/login');
  }

  return (
    <nav className="bg-blue-700 text-white shadow-md">
      <div className="px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold tracking-tight shrink-0">🏢 ERP</Link>

        <div className="flex items-center gap-1 overflow-x-auto mx-4 scrollbar-hide">
          {NAV_LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                pathname.startsWith(link.href)
                  ? 'bg-blue-900 text-white'
                  : 'text-blue-100 hover:bg-blue-600'
              }`}
            >
              <span className="text-xs">{link.icon}</span>
              {link.label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              href="/users"
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                pathname.startsWith('/users') ? 'bg-blue-900 text-white' : 'text-blue-100 hover:bg-blue-600'
              }`}
            >
              <span className="text-xs">👥</span>
              Usuários
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {user ? (
            <>
              <span className="text-xs text-blue-200 hidden md:inline max-w-32 truncate" title={user.email}>{user.email}</span>
              <button onClick={handleLogout} className="text-xs bg-blue-900 hover:bg-blue-950 px-3 py-1.5 rounded-lg transition-colors">
                Sair
              </button>
            </>
          ) : (
            <Link href="/login" className="text-xs bg-white text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-lg font-semibold transition-colors">
              Iniciar sessão
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}