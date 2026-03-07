'use client';

import React from 'react';
import { AdminCustomerRowModel, AdminStaffRowModel } from '@/lib/admin-user-types';
import { AlertCircle, CheckCircle, MoreVertical } from '@/lib/icons';

type UserRowModel = AdminStaffRowModel | AdminCustomerRowModel;

interface UserRowProps {
  user: UserRowModel;
}

function resolveRoleTone(user: UserRowModel): { label: string; color: string; bg: string; border: string } {
  if ('primaryRole' in user) {
    return {
      super_admin: { label: user.primaryRoleLabel, color: 'text-red', bg: 'bg-red/10', border: 'border-red/20' },
      ops_dispatcher: { label: user.primaryRoleLabel, color: 'text-teal', bg: 'bg-teal/10', border: 'border-teal/20' },
      support_analyst: { label: user.primaryRoleLabel, color: 'text-slate', bg: 'bg-slate/10', border: 'border-slate/20' },
      catalog_manager: { label: user.primaryRoleLabel, color: 'text-teal', bg: 'bg-teal/10', border: 'border-teal/20' },
      merchant_success: { label: user.primaryRoleLabel, color: 'text-emerald', bg: 'bg-emerald/10', border: 'border-emerald/20' },
    }[user.primaryRole] ?? { label: user.primaryRoleLabel, color: 'text-slate', bg: 'bg-slate/10', border: 'border-slate/20' };
  }

  return {
    label: 'Customer',
    color: 'text-emerald',
    bg: 'bg-emerald/10',
    border: 'border-emerald/20',
  };
}

function UserRowImpl({ user }: UserRowProps) {
  const role = resolveRoleTone(user);
  const activityLabel = 'primaryRole' in user ? user.lastSeenLabel : user.lastActiveLabel;
  const secondaryLabel = 'primaryRole' in user
    ? user.zoneName ?? 'No zone assignment'
    : `${user.ordersCount} orders${user.zoneName ? ` • ${user.zoneName}` : ''}`;

  return (
    <div className="group flex min-h-[72px] items-center justify-between px-6 py-4 transition-colors hover:bg-surface/30">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border border-teal/20 bg-gradient-to-br from-teal/30 to-navy text-sm font-bold text-teal">
            {user.initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
            <p className="truncate text-xs text-slate">{user.email ?? 'No email'}</p>
            <p className="mt-1 truncate text-xs text-slate">{secondaryLabel}</p>
          </div>
        </div>
      </div>

      <div className="ml-4 flex items-center gap-4">
        <div className={`omega-badge inline-flex items-center px-3 py-2 border ${role.bg} ${role.border}`}>
          <span className={`text-xs font-semibold ${role.color}`}>{role.label}</span>
        </div>

        <div className="flex min-w-fit items-center gap-2">
          {user.status === 'active' ? (
            <CheckCircle className="h-4 w-4 text-emerald" />
          ) : (
            <AlertCircle className="h-4 w-4 text-slate" />
          )}
          <span className="text-xs text-slate">{user.status === 'active' ? 'Active' : 'Inactive'}</span>
        </div>

        <p className="min-w-fit text-xs text-slate">{activityLabel}</p>

        <button
          type="button"
          className="omega-control inline-flex min-w-[56px] items-center justify-center border border-border bg-transparent text-slate opacity-0 transition-all hover:bg-slate/10 group-hover:opacity-100"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

const UserRow = React.memo(UserRowImpl);

export default UserRow;
