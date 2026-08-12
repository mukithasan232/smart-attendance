import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export default async function RootPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const role = user.app_metadata?.role || 'USER';

  if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
    redirect('/super-admin/dashboard');
  } else {
    redirect('/dashboard');
  }
}
