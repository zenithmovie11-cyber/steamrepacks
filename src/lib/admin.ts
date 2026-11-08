// UI-only check; the database enforces the same list via public.is_admin().
export const ADMIN_EMAILS = [
  "noorasadbd@gmail.com",
  "zenithgtastore@gmail.com",
  "ramim980124@gmail.com",
];

export function isAdminEmail(email?: string | null) {
  return !!email && ADMIN_EMAILS.includes(email.trim().toLowerCase());
}
