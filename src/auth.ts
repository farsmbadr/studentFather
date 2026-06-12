export interface UserInfo {
  id: string;
  name: string;
  username: string;
  role: string;
  permissions: string[];
  is_super_admin?: boolean;
}

const KEY = 'baderp-user';

export function getCurrentUser(): UserInfo {
  const raw = localStorage.getItem(KEY);
  if (raw) {
    try { return JSON.parse(raw); }
    catch {}
  }
  return { id: '', name: 'مدير النظام', username: 'admin', role: 'مدير', permissions: ['all'] };
}

export function setCurrentUser(user: UserInfo) {
  localStorage.setItem(KEY, JSON.stringify(user));
}

export function clearCurrentUser() {
  localStorage.removeItem(KEY);
}
