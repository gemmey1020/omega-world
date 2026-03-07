export interface AdminUsersMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
}

export interface AdminStaffRowModel {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  zoneId: number | null;
  zoneName: string | null;
  roles: string[];
  permissions: string[];
  primaryRole: string;
  primaryRoleLabel: string;
  status: 'active' | 'inactive';
  lastSeenAt: string | null;
  lastSeenLabel: string;
  initials: string;
}

export interface AdminCustomerRowModel {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  zoneId: number | null;
  zoneName: string | null;
  ordersCount: number;
  status: 'active' | 'inactive';
  lastActiveAt: string | null;
  lastActiveLabel: string;
  initials: string;
  lifetimeValue: number | null;
}

export interface AdminStaffListResponse {
  data: AdminStaffRowModel[];
  meta: AdminUsersMeta;
}

export interface AdminCustomerListResponse {
  data: AdminCustomerRowModel[];
  meta: AdminUsersMeta;
}

export interface RegisterAdminPayload {
  name: string;
  email: string;
  password: string;
  passwordConfirmation: string;
  role: AdminRoleValue;
  phone?: string;
  zoneId?: number | null;
}

export interface AdminRegisteredUser {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  zoneId: number | null;
  roles: string[];
  permissions: string[];
}

type AdminRoleOption = {
  label: string;
  value: 'super_admin' | 'ops_dispatcher' | 'support_analyst' | 'catalog_manager' | 'merchant_success';
};

export type AdminRoleValue = AdminRoleOption['value'];

export const ADMIN_ROLE_OPTIONS: AdminRoleOption[] = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'ops_dispatcher', label: 'Ops Dispatcher' },
  { value: 'support_analyst', label: 'Support Analyst' },
  { value: 'catalog_manager', label: 'Catalog Manager' },
  { value: 'merchant_success', label: 'Merchant Success' },
];

interface AdminStaffPayload {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  zone_id: number | null;
  zone: { id: number; name: string } | null;
  roles: string[];
  permissions: string[];
  last_seen_at: string | null;
  status: 'active' | 'inactive';
}

interface AdminStaffListApiPayload {
  data: AdminStaffPayload[];
  meta: AdminUsersMeta;
}

interface AdminCustomerPayload {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  zone_id: number | null;
  zone: { id: number; name: string } | null;
  orders_count: number;
  customer_metrics: {
    lifetime_value: number;
    last_order_at: string | null;
  } | null;
  updated_at: string | null;
}

interface AdminCustomerListApiPayload {
  data: AdminCustomerPayload[];
  meta: AdminUsersMeta;
}

interface AdminRegisteredUserPayload {
  data: {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    zone_id: number | null;
    roles: string[];
    permissions: string[];
  };
}

function buildInitials(value: string): string {
  const parts = value
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return 'NA';
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('');
}

function roleLabel(role: string): string {
  const match = ADMIN_ROLE_OPTIONS.find((option) => option.value === role);

  if (match) {
    return match.label;
  }

  return role
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatRelativeTime(iso: string | null): string {
  if (!iso) {
    return 'No recent activity';
  }

  const target = Date.parse(iso);

  if (Number.isNaN(target)) {
    return 'Unknown activity';
  }

  const diffMs = Date.now() - target;
  const diffMinutes = Math.max(Math.floor(diffMs / 60000), 0);

  if (diffMinutes < 1) {
    return 'Just now';
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}

export function mapAdminStaffListResponse(payload: AdminStaffListApiPayload): AdminStaffListResponse {
  return {
    data: payload.data.map((user) => {
      const primaryRole = user.roles[0] ?? 'ops_dispatcher';

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        zoneId: user.zone?.id ?? user.zone_id,
        zoneName: user.zone?.name ?? null,
        roles: user.roles,
        permissions: user.permissions,
        primaryRole,
        primaryRoleLabel: roleLabel(primaryRole),
        status: user.status,
        lastSeenAt: user.last_seen_at,
        lastSeenLabel: formatRelativeTime(user.last_seen_at),
        initials: buildInitials(user.name),
      };
    }),
    meta: payload.meta,
  };
}

export function mapAdminCustomerListResponse(payload: AdminCustomerListApiPayload): AdminCustomerListResponse {
  return {
    data: payload.data.map((user) => {
      const lastActiveAt = user.customer_metrics?.last_order_at ?? user.updated_at;
      const lastActiveMs = lastActiveAt ? Date.parse(lastActiveAt) : Number.NaN;
      const isRecentlyActive = !Number.isNaN(lastActiveMs)
        && Date.now() - lastActiveMs <= 30 * 24 * 60 * 60 * 1000;

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        zoneId: user.zone?.id ?? user.zone_id,
        zoneName: user.zone?.name ?? null,
        ordersCount: Number(user.orders_count ?? 0),
        status: isRecentlyActive ? 'active' : 'inactive',
        lastActiveAt,
        lastActiveLabel: formatRelativeTime(lastActiveAt),
        initials: buildInitials(user.name),
        lifetimeValue: user.customer_metrics?.lifetime_value ?? null,
      };
    }),
    meta: payload.meta,
  };
}

export function mapAdminRegisteredUser(payload: AdminRegisteredUserPayload): AdminRegisteredUser {
  return {
    id: payload.data.id,
    name: payload.data.name,
    email: payload.data.email,
    phone: payload.data.phone,
    zoneId: payload.data.zone_id,
    roles: payload.data.roles,
    permissions: payload.data.permissions,
  };
}
