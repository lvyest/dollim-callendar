'use client';

import { useRouter } from 'next/navigation';

import { createClient } from '@/lib/supabase/client';

export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();

  async function logout() {
    await createClient().auth.signOut();
    router.replace('/login');
    router.refresh();
  }

  return (
    <button type="button" onClick={logout} className={className}>
      로그아웃
    </button>
  );
}
