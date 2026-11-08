import { createFileRoute } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, Users, KeyRound, LockKeyhole, Plus, Pencil, Trash2, Search, RefreshCw, Loader2, LogIn, Check, Minus, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import { useSession } from '@/hooks/use-session';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { permissionItems, type Permission, type AppRole, type Assignment, type SecurityData, type AuditEntry } from '@/lib/permissions';

export const Route = createFileRoute('/admin')({
  head: () => ({ meta: [
    { title: 'Roles & Security — Monolith Admin' },
    { name: 'description', content: 'Manage Monolith email access, custom roles, permissions and security audit records.' },
    { property: 'og:title', content: 'Roles & Security — Monolith Admin' },
    { property: 'og:description', content: 'Monolith administration for roles, permissions and security records.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
  ] }),
  component: AdminPage,
});

function AdminPage() {
  const { user, can, accessLoading } = useSession();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [assignment, setAssignment] = useState<Assignment | null | undefined>(undefined);
  const [role, setRole] = useState<AppRole | null | undefined>(undefined);
  const [offset, setOffset] = useState(0);
  const [tab, setTab] = useState('people');
  const [revoking, setRevoking] = useState(false);
  const data = useQuery({ queryKey: ['roles-security', user?.id], enabled: !!user && can('roles.manage'), queryFn: async () => {
    const { data, error } = await supabase.rpc('roles_security_data');
    if (error) throw error;
    return data as unknown as SecurityData;
  } });
  const audit = useQuery({ queryKey: ['security-audit', user?.id, offset], enabled: !!user && can('audit.view') && tab === 'audit', queryFn: async () => {
    const { data, error } = await supabase.rpc('security_audit_page', { p_offset: offset });
    if (error) throw error;
    return data as unknown as { total: number; logs: AuditEntry[] };
  } });
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['roles-security'] });
    void qc.invalidateQueries({ queryKey: ['security-audit'] });
    void qc.invalidateQueries({ queryKey: ['permissions'] });
  };
  async function revoke(a: Assignment) {
    if (!confirm(`Revoke ${a.email}'s assigned access?`)) return;
    setRevoking(true);
    try {
      const { error } = await supabase.rpc('assign_app_role', { p_email: a.email, p_role: null as unknown as string });
      if (error) throw error;
      toast.success('Access revoked'); refresh();
    } catch (e) { toast.error((e as Error).message); } finally { setRevoking(false); }
  }
  const roles = data.data?.roles ?? [];
  const people = data.data?.assignments ?? [];
  const filtered = people.filter(a => a.email.includes(search.trim().toLowerCase()) && (roleFilter === 'all' || a.role_id === roleFilter));
  return <SidebarProvider><AppSidebar /><div className="min-h-screen min-w-0 flex-1">
    <header className="dashboard-header sticky top-0 z-30 flex items-center gap-3 border-b px-5 py-6 lg:px-8"><SidebarTrigger aria-label="Toggle sidebar" /><span className="text-sm font-medium">Admin Panel <span className="mx-2 text-muted-foreground">/</span> Roles &amp; Security</span></header>
    <main className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
      {accessLoading ? <Loader2 className="size-6 animate-spin" /> : !user || !can('roles.manage') ? <div className="py-16 text-center"><LockKeyhole className="mx-auto mb-4 size-10 text-primary" /><h1 className="mb-4 text-xl font-semibold">{user ? 'Access denied' : 'Admin only'}</h1>{!user && <Button onClick={async () => { const r = await lovable.auth.signInWithOAuth('google', { redirect_uri: window.location.origin }); if (r.error) toast.error('Sign-in failed'); }}><LogIn /> Sign in with Google</Button>}</div> : <>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-xs font-medium text-primary">Admin Panel</p><h1 className="text-3xl font-semibold">Roles &amp; Security</h1></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setRole(null)}><Plus /> Create role</Button><Button onClick={() => setAssignment(null)} disabled={!roles.length}><Users /> Assign access</Button></div></div>
        <div className="mb-8 grid gap-4 sm:grid-cols-3">{[
          { label: 'Assigned accounts', value: people.length, Icon: Users },
          { label: 'Roles', value: roles.length, Icon: KeyRound },
          { label: 'Protected administrators', value: people.filter(a => a.protected).length, Icon: ShieldCheck },
        ].map(({ label, value, Icon }) => <div key={label} className="metric-card flex items-center gap-4 rounded-lg border bg-card p-5"><span className="metric-icon flex size-11 items-center justify-center rounded-md"><Icon className="size-5" /></span><div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold">{data.isPending ? '—' : value}</p></div></div>)}</div>
        {data.error && <p role="alert" className="mb-5 text-destructive">Access records could not load. <Button variant="link" onClick={() => data.refetch()}>Retry</Button></p>}
        {data.isPending ? <Loader2 className="size-6 animate-spin" /> : data.data && <Tabs value={tab} onValueChange={setTab}>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><TabsList className="h-auto flex-wrap justify-start gap-1"><TabsTrigger value="people">Role list</TabsTrigger><TabsTrigger value="matrix">Permission matrix</TabsTrigger>{can('audit.view') && <TabsTrigger value="audit">Security &amp; audit logs</TabsTrigger>}</TabsList><Button variant="outline" size="icon" title="Refresh records" aria-label="Refresh records" onClick={refresh}><RefreshCw className={data.isFetching ? 'animate-spin' : ''} /></Button></div>
          <TabsContent value="people">
            <div className="mb-5 flex flex-wrap gap-3"><div className="relative min-w-48 flex-1"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><Input aria-label="Search email" placeholder="Search email…" className="bg-card pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div><div className="w-48"><Select value={roleFilter} onValueChange={setRoleFilter}><SelectTrigger aria-label="Filter by role"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All roles</SelectItem>{roles.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent></Select></div></div>
            <div className="overflow-x-auto rounded-lg border bg-card"><table className="w-full min-w-[650px] text-left text-sm"><thead className="border-b bg-muted/40 text-muted-foreground"><tr><th className="p-4 font-medium">Google email</th><th className="p-4 font-medium">Role</th><th className="p-4 font-medium">Account</th><th className="p-4 font-medium">Last sign-in</th><th className="p-4 text-right font-medium">Access</th></tr></thead><tbody className="divide-y">{filtered.map(a => <tr key={a.id}><td className="p-4"><p className="font-medium">{a.email}</p>{a.protected && <span className="mt-1 inline-flex items-center gap-1 text-xs text-success"><ShieldCheck className="size-3" /> Protected</span>}</td><td className="p-4"><span className="rounded-md bg-info-soft px-2 py-1 text-info">{roles.find(r => r.id === a.role_id)?.name}</span></td><td className="p-4 text-muted-foreground">{a.joined ? 'Registered' : 'Awaiting first sign-in'}</td><td className="p-4 text-xs text-muted-foreground">{a.last_sign_in_at ? new Date(a.last_sign_in_at).toLocaleString() : '—'}</td><td className="p-4"><div className="flex justify-end gap-2">{a.protected ? <LockKeyhole className="size-4 text-muted-foreground" aria-label="Protected administrator" /> : <><Button variant="outline" size="icon" aria-label={`Change role for ${a.email}`} title="Change role" onClick={() => setAssignment(a)}><Pencil /></Button><Button variant="outline" size="icon" aria-label={`Revoke access for ${a.email}`} title="Revoke access" disabled={revoking} onClick={() => revoke(a)}><Trash2 /></Button></>}</div></td></tr>)}</tbody></table>{!filtered.length && <p className="py-12 text-center text-sm text-muted-foreground">No matching accounts.</p>}</div>
          </TabsContent>
          <TabsContent value="matrix"><div className="overflow-x-auto rounded-lg border bg-card"><table className="w-full text-left text-sm"><thead className="border-b bg-muted/40"><tr><th className="min-w-56 p-4 font-medium">Permission</th>{roles.map(r => <th key={r.id} className="min-w-36 p-4 text-center font-medium"><div className="flex items-center justify-center gap-2">{r.name}{r.is_system ? <LockKeyhole className="size-3 text-success" /> : <Button size="icon" variant="ghost" aria-label={`Edit role ${r.name}`} title="Edit role permissions" onClick={() => setRole(r)}><Pencil /></Button>}</div></th>)}</tr></thead><tbody className="divide-y">{permissionItems.map(p => <tr key={p.key}><td className="p-4">{p.label}</td>{roles.map(r => <td key={r.id} className="p-4 text-center">{r.permissions.includes(p.key) ? <Check className="mx-auto size-5 text-success" aria-label="Allowed" /> : <Minus className="mx-auto size-4 text-muted-foreground" aria-label="Not allowed" />}</td>)}</tr>)}</tbody></table></div></TabsContent>
          <TabsContent value="audit"><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-semibold">Security events</h2><span className="text-sm text-muted-foreground">{audit.data?.total ?? '—'} records</span></div>{audit.isPending ? <Loader2 className="size-6 animate-spin" /> : audit.error ? <p role="alert">Logs could not load. <Button variant="link" onClick={() => audit.refetch()}>Retry</Button></p> : <><div className="overflow-x-auto rounded-lg border bg-card"><table className="w-full min-w-[700px] text-left text-sm"><thead className="border-b bg-muted/40 text-muted-foreground"><tr>{['Time', 'Actor', 'Event', 'Target / change'].map(h => <th key={h} className="p-4 font-medium">{h}</th>)}</tr></thead><tbody className="divide-y">{audit.data?.logs.map(log => <tr key={log.id}><td className="p-4 text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString()}</td><td className="p-4">{log.actor_email}</td><td className="p-4"><span className="rounded-md bg-warning-soft px-2 py-1 text-warning">{log.action.replaceAll('.', ' ')}</span></td><td className="max-w-96 break-words p-4"><p>{log.target}</p>{log.details.role && <p className="mt-1 text-xs text-muted-foreground">Role: {log.details.role}</p>}{log.details.permissions && <p className="mt-1 text-xs text-muted-foreground">{log.details.permissions.map(p => permissionItems.find(i => i.key === p)?.label ?? p).join(', ') || 'No permissions'}</p>}</td></tr>)}</tbody></table>{!audit.data?.logs.length && <p className="py-12 text-center text-muted-foreground">No security changes recorded yet.</p>}</div><div className="mt-4 flex items-center justify-end gap-3"><Button variant="outline" size="icon" aria-label="Previous logs" disabled={offset === 0} onClick={() => setOffset(o => Math.max(0, o - 25))}><ChevronLeft /></Button><span className="text-xs text-muted-foreground">Page {offset / 25 + 1}</span><Button variant="outline" size="icon" aria-label="Next logs" disabled={offset + 25 >= (audit.data?.total ?? 0)} onClick={() => setOffset(o => o + 25)}><ChevronRight /></Button></div></>}</TabsContent>
        </Tabs>}
      </>}
      {assignment !== undefined && <AssignDialog assignment={assignment} roles={roles} onClose={() => setAssignment(undefined)} onSaved={refresh} />}
      {role !== undefined && <RoleDialog role={role} onClose={() => setRole(undefined)} onSaved={refresh} />}
    </main></div></SidebarProvider>;
}

function AssignDialog({ assignment, roles, onClose, onSaved }: { assignment: Assignment | null; roles: AppRole[]; onClose: () => void; onSaved: () => void }) {
  const [email, setEmail] = useState(assignment?.email ?? '');
  const [roleId, setRoleId] = useState(assignment?.role_id ?? '');
  const [saving, setSaving] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!roleId) return;
    const selected = roles.find(r => r.id === roleId);
    if (selected?.permissions.includes('roles.manage') && !confirm('This role can grant access to other people. Assign it?')) return;
    setSaving(true);
    try {
      const { error } = await supabase.rpc('assign_app_role', { p_email: email.trim().toLowerCase(), p_role: roleId });
      if (error) throw error;
      toast.success('Role assigned'); onSaved(); onClose();
    } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
  }
  return <Dialog open onOpenChange={o => !o && onClose()}><DialogContent><DialogHeader><DialogTitle>{assignment ? 'Change role' : 'Assign access'}</DialogTitle></DialogHeader><form onSubmit={submit} className="grid gap-5"><div className="grid gap-2"><Label htmlFor="role-email">Google account email</Label><Input id="role-email" type="email" required maxLength={254} disabled={!!assignment} value={email} onChange={e => setEmail(e.target.value)} placeholder="name@gmail.com" /></div><div className="grid gap-2"><Label>Role</Label><Select value={roleId} onValueChange={setRoleId}><SelectTrigger aria-label="Assignment role"><SelectValue placeholder="Select role" /></SelectTrigger><SelectContent>{roles.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent></Select></div><Button type="submit" disabled={saving || !roleId}>{saving && <Loader2 className="animate-spin" />} Save access</Button></form></DialogContent></Dialog>;
}

function RoleDialog({ role, onClose, onSaved }: { role: AppRole | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(role?.name ?? '');
  const [permissions, setPermissions] = useState<Permission[]>(role?.permissions ?? []);
  const [saving, setSaving] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (permissions.includes('roles.manage') && !confirm('This role will be able to manage all roles and grant access. Save these permissions?')) return;
    setSaving(true);
    try {
      const { error } = await supabase.rpc('manage_app_role', { p_id: role?.id ?? null as unknown as string, p_name: name.trim(), p_permissions: permissions });
      if (error) throw error;
      toast.success(role ? 'Role updated' : 'Role created'); onSaved(); onClose();
    } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
  }
  return <Dialog open onOpenChange={o => !o && onClose()}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{role ? 'Edit role permissions' : 'Create role'}</DialogTitle></DialogHeader><form onSubmit={submit} className="grid gap-5"><div className="grid gap-2"><Label htmlFor="role-name">Role name</Label><Input id="role-name" required minLength={2} maxLength={40} value={name} onChange={e => setName(e.target.value)} placeholder="Editor" /></div><div className="divide-y border-y">{permissionItems.map(p => <div key={p.key} className="flex items-center justify-between gap-4 py-3"><Label htmlFor={`permission-${p.key}`}>{p.label}</Label><Switch id={`permission-${p.key}`} checked={permissions.includes(p.key)} onCheckedChange={checked => setPermissions(current => checked ? [...current, p.key] : current.filter(k => k !== p.key))} /></div>)}</div><Button type="submit" disabled={saving}>{saving && <Loader2 className="animate-spin" />} Save role</Button></form></DialogContent></Dialog>;
}