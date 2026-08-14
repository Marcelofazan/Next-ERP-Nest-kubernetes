'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getUser } from '@/lib/api';

const PUBLIC_PATHS = ['/', '/login'];

// Client-side fallback guard. Real protection is enforced by middleware.ts (server-side cookie check).
export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const isPublic = PUBLIC_PATHS.includes(pathname);
    if (!isPublic && !getUser()) router.replace('/login');
  }, [pathname, router]);

  return <>{children}</>;
}
