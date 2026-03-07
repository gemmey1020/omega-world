'use client';

import React from 'react';
import { MoreVertical, CheckCircle, AlertCircle } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'dispatcher' | 'customer';
  status: 'active' | 'inactive';
  lastActive: string;
}

interface UserRowProps {
  user: User;
}

function UserRowImpl({ user }: UserRowProps) {
  const roleConfig = {
    super_admin: { label: 'Super Admin', color: 'text-red', bgColor: 'bg-red/10', borderColor: 'border-red/20' },
    dispatcher: { label: 'Dispatcher', color: 'text-teal', bgColor: 'bg-teal/10', borderColor: 'border-teal/20' },
    customer: { label: 'Customer', color: 'text-emerald', bgColor: 'bg-emerald/10', borderColor: 'border-emerald/20' },
  };

  const role = roleConfig[user.role];

  return (
    <div className="min-h-16 flex items-center justify-between px-6 py-4 hover:bg-surface/30 transition-colors group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal/30 to-navy flex-shrink-0 flex items-center justify-center border border-teal/20 text-sm font-bold text-teal">
            {user.name
              .split(' ')
              .map((n) => n[0])
              .join('')}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
            <p className="text-xs text-slate truncate">{user.email}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 ml-4">
        <div className={`inline-flex items-center px-3 py-1 rounded-[10px] ${role.bgColor} border ${role.borderColor}`}>
          <span className={`text-xs font-semibold ${role.color}`}>{role.label}</span>
        </div>

        <div className="flex items-center gap-2 min-w-fit">
          {user.status === 'active' ? (
            <CheckCircle className="w-4 h-4 text-emerald" />
          ) : (
            <AlertCircle className="w-4 h-4 text-slate" />
          )}
          <span className="text-xs text-slate">{user.status === 'active' ? 'Active' : 'Inactive'}</span>
        </div>

        <p className="text-xs text-slate min-w-fit">{user.lastActive}</p>

        <button className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-slate/10 rounded-[10px]">
          <MoreVertical className="w-4 h-4 text-slate" />
        </button>
      </div>
    </div>
  );
}

const UserRow = React.memo(UserRowImpl);

export default UserRow;
