import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { canAccess, type Permission } from '@/lib/permissions';

export function useSession() {
  const [user, setUser] = useState<User | null>(null);
  const qc = useQueryClient();
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      setUser(s?.user ?? null);
      if (event === 'SIGNED_OUT') qc.removeQueries({ predicate: q => q.queryKey[0] !== 'posts' && q.queryKey[0] !== 'hero-slides' });
    });
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    return () => data.subscription.unsubscribe();
  }, [qc]);
  const access = useQuery({ queryKey: ['permissions', user?.id], enabled: !!user, refetchInterval: 15000, queryFn: async () => {
    const { data, error } = await supabase.rpc('my_permissions');
    if (error) throw error;
    return data;
  } });
  const permissions = user ? access.data ?? [] : [];
  const can = (permission: Permission) => canAccess(permissions, permission);
  return { user, isAdmin: can('roles.manage'), can, permissions, accessLoading: !!user && access.isPending };
}
