'use client';

import React, { useState } from 'react';
import { Search, Plus, Shield, User } from 'lucide-react';
import UserRow from './user-row';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'dispatcher' | 'customer';
  status: 'active' | 'inactive';
  lastActive: string;
}

interface UserManagementProps {
  adminUsers: User[];
  customerUsers: User[];
}

function UserManagementImpl({ adminUsers, customerUsers }: UserManagementProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">User Management</h1>
          <p className="text-sm text-slate">Manage administrators, dispatchers, and customer accounts</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="h-[56px] px-6 bg-gradient-to-r from-teal to-teal-neon text-navy font-semibold rounded-[18px] flex items-center gap-2 hover:shadow-lg hover:shadow-teal/40 transition-all"
        >
          <Plus className="w-5 h-5" />
          Add New Admin
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate" />
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-[56px] pl-12 pr-4 rounded-[18px] bg-surface border border-teal/20 text-foreground placeholder-slate focus:outline-none focus:border-teal focus:ring-2 focus:ring-teal/20 transition-all"
        />
      </div>

      {/* Admin Users Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-teal" />
          <h2 className="text-lg font-semibold text-foreground">Administrators & Dispatchers</h2>
          <span className="text-xs font-semibold text-slate bg-navy/50 rounded-full px-3 py-1">
            {adminUsers.length}
          </span>
        </div>

        <div className="rounded-[18px] border border-teal/20 backdrop-blur-lg overflow-hidden bg-gradient-to-br from-surface/50 to-navy/50">
          <div className="divide-y divide-border/30">
            {adminUsers.map((user) => (
              <UserRow key={user.id} user={user} />
            ))}
          </div>
        </div>
      </section>

      {/* Customer Users Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-emerald" />
          <h2 className="text-lg font-semibold text-foreground">Customers</h2>
          <span className="text-xs font-semibold text-slate bg-navy/50 rounded-full px-3 py-1">
            {customerUsers.length}
          </span>
        </div>

        <div className="rounded-[18px] border border-emerald/20 backdrop-blur-lg overflow-hidden bg-gradient-to-br from-surface/50 to-navy/50">
          <div className="divide-y divide-border/30">
            {customerUsers.map((user) => (
              <UserRow key={user.id} user={user} />
            ))}
          </div>
        </div>
      </section>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[18px] border border-teal/20 bg-surface p-8 space-y-6">
            <h2 className="text-xl font-bold text-foreground">Add New Administrator</h2>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate mb-2 block">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="Enter full name"
                  className="w-full h-[56px] px-4 rounded-[18px] bg-navy border border-teal/20 text-foreground placeholder-slate focus:outline-none focus:border-teal transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate mb-2 block">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="admin@example.com"
                  className="w-full h-[56px] px-4 rounded-[18px] bg-navy border border-teal/20 text-foreground placeholder-slate focus:outline-none focus:border-teal transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate mb-2 block">
                  Role
                </label>
                <select className="w-full h-[56px] px-4 rounded-[18px] bg-navy border border-teal/20 text-foreground focus:outline-none focus:border-teal transition-all">
                  <option>Super Admin</option>
                  <option>Dispatcher</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 h-[56px] rounded-[18px] border border-slate/30 text-foreground font-semibold hover:bg-slate/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 h-[56px] rounded-[18px] bg-gradient-to-r from-teal to-teal-neon text-navy font-semibold hover:shadow-lg hover:shadow-teal/40 transition-all"
              >
                Create Admin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const UserManagement = React.memo(UserManagementImpl);

export default UserManagement;
