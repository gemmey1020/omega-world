'use client';

import React, { useState } from 'react';
import { AdminApiError } from '@/lib/admin-api';
import {
  ADMIN_ROLE_OPTIONS,
  AdminCustomerRowModel,
  AdminRegisteredUser,
  AdminStaffRowModel,
  AdminUsersMeta,
  RegisterAdminPayload,
} from '@/lib/admin-user-types';
import { AdminZoneHealthModel } from '@/lib/admin-zone-types';
import { OmegaEmptyState } from '@/components/shared/omega-empty-state';
import { OmegaErrorPanel } from '@/components/shared/omega-error-panel';
import { Plus, Search, Shield, User } from '@/lib/icons';
import UserRow from './user-row';

interface UserManagementProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  adminUsers: AdminStaffRowModel[];
  adminMeta: AdminUsersMeta | null;
  adminError: AdminApiError | null;
  isAdminLoading: boolean;
  isAdminLoadingMore: boolean;
  onRetryAdmins: () => void;
  onLoadMoreAdmins: () => void;
  customerUsers: AdminCustomerRowModel[];
  customerMeta: AdminUsersMeta | null;
  customerError: AdminApiError | null;
  isCustomerLoading: boolean;
  isCustomerLoadingMore: boolean;
  onRetryCustomers: () => void;
  onLoadMoreCustomers: () => void;
  zones: AdminZoneHealthModel[];
  zonesError: AdminApiError | null;
  onCreateAdmin: (payload: RegisterAdminPayload) => Promise<AdminRegisteredUser>;
  isCreatingAdmin: boolean;
}

interface AdminFormState {
  name: string;
  email: string;
  password: string;
  passwordConfirmation: string;
  role: RegisterAdminPayload['role'];
  phone: string;
  zoneId: string;
}

const initialFormState: AdminFormState = {
  name: '',
  email: '',
  password: '',
  passwordConfirmation: '',
  role: 'ops_dispatcher',
  phone: '',
  zoneId: '',
};

function UserManagementImpl({
  searchQuery,
  onSearchQueryChange,
  adminUsers,
  adminMeta,
  adminError,
  isAdminLoading,
  isAdminLoadingMore,
  onRetryAdmins,
  onLoadMoreAdmins,
  customerUsers,
  customerMeta,
  customerError,
  isCustomerLoading,
  isCustomerLoadingMore,
  onRetryCustomers,
  onLoadMoreCustomers,
  zones,
  zonesError,
  onCreateAdmin,
  isCreatingAdmin,
}: UserManagementProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState<AdminFormState>(initialFormState);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalErrorStatus, setModalErrorStatus] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const hasMoreAdmins = adminMeta !== null && adminUsers.length < adminMeta.total;
  const hasMoreCustomers = customerMeta !== null && customerUsers.length < customerMeta.total;

  const updateForm = (field: keyof AdminFormState, value: string) => {
    const errorKeysByField: Record<keyof AdminFormState, string[]> = {
      name: ['name'],
      email: ['email'],
      password: ['password'],
      passwordConfirmation: ['password_confirmation'],
      role: ['role'],
      phone: ['phone'],
      zoneId: ['zone_id'],
    };

    setForm((current) => ({
      ...current,
      [field]: value,
    }));
    setFieldErrors((current) => {
      const keysToClear = errorKeysByField[field];
      const hasAnyKey = keysToClear.some((key) => key in current);

      if (!hasAnyKey) {
        return current;
      }

      const next = { ...current };
      for (const key of keysToClear) {
        delete next[key];
      }
      return next;
    });
    setModalError(null);
    setModalErrorStatus(null);
  };

  const resetModal = () => {
    setForm(initialFormState);
    setFieldErrors({});
    setModalError(null);
    setModalErrorStatus(null);
  };

  const closeModal = () => {
    setShowAddModal(false);
    resetModal();
  };

  const handleSubmit = async () => {
    setFieldErrors({});
    setModalError(null);
    setModalErrorStatus(null);
    setSuccessMessage(null);

    try {
      await onCreateAdmin({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        passwordConfirmation: form.passwordConfirmation,
        role: form.role,
        phone: form.phone.trim() || undefined,
        zoneId: form.zoneId !== '' ? Number(form.zoneId) : null,
      });

      setSuccessMessage('Administrator created and staff list refreshed.');
      closeModal();
    } catch (caughtError) {
      if (caughtError instanceof AdminApiError) {
        setFieldErrors(caughtError.fieldErrors);
        setModalError(caughtError.message);
        setModalErrorStatus(caughtError.status);
        return;
      }

      setModalError('Failed to create the administrator account.');
      setModalErrorStatus(500);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">User Management</h1>
          <p className="text-sm text-slate">
            Live administrators, dispatchers, and customer accounts wired to the Command Center backend.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setSuccessMessage(null);
            setShowAddModal(true);
          }}
          className="omega-control inline-flex items-center justify-center gap-2 bg-gradient-to-r from-teal to-teal-neon px-6 text-sm font-semibold text-navy transition-all hover:shadow-lg hover:shadow-teal/40"
        >
          <Plus className="h-5 w-5" />
          Add New Admin
        </button>
      </div>

      {successMessage && (
        <div className="rounded-[18px] border border-emerald/20 bg-emerald/10 px-4 py-3 text-sm text-emerald">
          {successMessage}
        </div>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate" />
        <input
          type="text"
          placeholder="Search by name or email…"
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          className="omega-control w-full border border-teal/20 bg-surface pl-12 pr-4 text-foreground placeholder-slate focus:outline-none focus:border-teal focus:ring-2 focus:ring-teal/20 transition-all"
        />
      </div>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-teal" />
          <h2 className="text-lg font-semibold text-foreground">Administrators & Dispatchers</h2>
          <span className="omega-badge bg-navy/50 px-3 py-1 text-xs font-semibold text-slate">
            {adminMeta?.total ?? adminUsers.length}
          </span>
        </div>

        {adminError ? (
          <OmegaErrorPanel
            status={adminError.status}
            message={adminError.message}
            onRetry={onRetryAdmins}
          />
        ) : isAdminLoading ? (
          <div className="rounded-[18px] border border-teal/20 bg-gradient-to-br from-surface/50 to-navy/50 px-6 py-10 text-sm text-slate">
            Loading staff…
          </div>
        ) : adminUsers.length === 0 ? (
          <OmegaEmptyState
            title="No staff matched this view"
            message="Try a different search term or onboard a new administrator."
            actionLabel="Retry"
            onAction={onRetryAdmins}
          />
        ) : (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-[18px] border border-teal/20 bg-gradient-to-br from-surface/50 to-navy/50 backdrop-blur-lg">
              <div className="divide-y divide-border/30">
                {adminUsers.map((user) => (
                  <UserRow key={`staff-${user.id}`} user={user} />
                ))}
              </div>
            </div>
            {hasMoreAdmins && (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={onLoadMoreAdmins}
                  className="omega-control inline-flex items-center justify-center border border-teal/30 bg-teal/10 px-6 text-sm font-semibold text-teal transition-colors hover:bg-teal/15"
                >
                  {isAdminLoadingMore ? 'Loading more staff…' : 'Load more staff'}
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-emerald" />
          <h2 className="text-lg font-semibold text-foreground">Customers</h2>
          <span className="omega-badge bg-navy/50 px-3 py-1 text-xs font-semibold text-slate">
            {customerMeta?.total ?? customerUsers.length}
          </span>
        </div>

        {customerError ? (
          <OmegaErrorPanel
            status={customerError.status}
            message={customerError.message}
            onRetry={onRetryCustomers}
          />
        ) : isCustomerLoading ? (
          <div className="rounded-[18px] border border-emerald/20 bg-gradient-to-br from-surface/50 to-navy/50 px-6 py-10 text-sm text-slate">
            Loading customers…
          </div>
        ) : customerUsers.length === 0 ? (
          <OmegaEmptyState
            title="No customers matched this view"
            message="Customer activity will surface here once the backend returns matching records."
            actionLabel="Retry"
            onAction={onRetryCustomers}
          />
        ) : (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-[18px] border border-emerald/20 bg-gradient-to-br from-surface/50 to-navy/50 backdrop-blur-lg">
              <div className="divide-y divide-border/30">
                {customerUsers.map((user) => (
                  <UserRow key={`customer-${user.id}`} user={user} />
                ))}
              </div>
            </div>
            {hasMoreCustomers && (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={onLoadMoreCustomers}
                  className="omega-control inline-flex items-center justify-center border border-emerald/30 bg-emerald/10 px-6 text-sm font-semibold text-emerald transition-colors hover:bg-emerald/15"
                >
                  {isCustomerLoadingMore ? 'Loading more customers…' : 'Load more customers'}
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[18px] border border-teal/20 bg-surface p-8 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-foreground">Add New Administrator</h2>
              <p className="text-sm text-slate">
                Create a real admin account through the secured backend onboarding endpoint.
              </p>
            </div>

            {modalError && (
              <div className="mt-6">
                <OmegaErrorPanel
                  status={modalErrorStatus}
                  message={modalError}
                />
              </div>
            )}

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                label="Full Name"
                error={fieldErrors.name?.[0]}
                input={(
                  <input
                    type="text"
                    value={form.name}
                    onChange={(event) => updateForm('name', event.target.value)}
                    placeholder="Enter full name"
                    className="omega-control w-full border border-teal/20 bg-navy px-4 text-foreground placeholder-slate focus:outline-none focus:border-teal"
                  />
                )}
              />

              <FormField
                label="Email"
                error={fieldErrors.email?.[0]}
                input={(
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => updateForm('email', event.target.value)}
                    placeholder="admin@example.com"
                    className="omega-control w-full border border-teal/20 bg-navy px-4 text-foreground placeholder-slate focus:outline-none focus:border-teal"
                  />
                )}
              />

              <FormField
                label="Password"
                error={fieldErrors.password?.[0]}
                input={(
                  <input
                    type="password"
                    value={form.password}
                    onChange={(event) => updateForm('password', event.target.value)}
                    placeholder="Minimum 12 characters"
                    className="omega-control w-full border border-teal/20 bg-navy px-4 text-foreground placeholder-slate focus:outline-none focus:border-teal"
                  />
                )}
              />

              <FormField
                label="Confirm Password"
                error={fieldErrors.password_confirmation?.[0]}
                input={(
                  <input
                    type="password"
                    value={form.passwordConfirmation}
                    onChange={(event) => updateForm('passwordConfirmation', event.target.value)}
                    placeholder="Repeat the password"
                    className="omega-control w-full border border-teal/20 bg-navy px-4 text-foreground placeholder-slate focus:outline-none focus:border-teal"
                  />
                )}
              />

              <FormField
                label="Role"
                error={fieldErrors.role?.[0]}
                input={(
                  <select
                    value={form.role}
                    onChange={(event) => updateForm('role', event.target.value)}
                    className="omega-control w-full border border-teal/20 bg-navy px-4 text-foreground focus:outline-none focus:border-teal"
                  >
                    {ADMIN_ROLE_OPTIONS.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                )}
              />

              <FormField
                label="Phone"
                error={fieldErrors.phone?.[0]}
                input={(
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(event) => updateForm('phone', event.target.value)}
                    placeholder="+201000000000"
                    className="omega-control w-full border border-teal/20 bg-navy px-4 text-foreground placeholder-slate focus:outline-none focus:border-teal"
                  />
                )}
              />

              <div className="md:col-span-2">
                <FormField
                  label="Zone"
                  error={fieldErrors.zone_id?.[0] ?? zonesError?.message}
                  input={(
                    <select
                      value={form.zoneId}
                      onChange={(event) => updateForm('zoneId', event.target.value)}
                      className="omega-control w-full border border-teal/20 bg-navy px-4 text-foreground focus:outline-none focus:border-teal disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={zones.length === 0}
                    >
                      <option value="">No zone assignment</option>
                      {zones.map((zone) => (
                        <option key={zone.id} value={zone.id}>
                          {zone.name}
                        </option>
                      ))}
                    </select>
                  )}
                />
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={closeModal}
                className="omega-control flex-1 border border-slate/30 bg-transparent font-semibold text-foreground transition-colors hover:bg-slate/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleSubmit();
                }}
                disabled={isCreatingAdmin}
                className="omega-control flex-1 bg-gradient-to-r from-teal to-teal-neon font-semibold text-navy transition-all hover:shadow-lg hover:shadow-teal/40 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCreatingAdmin ? 'Creating admin…' : 'Create Admin'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FormField({
  label,
  error,
  input,
}: {
  label: string;
  error?: string;
  input: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate">
        {label}
      </label>
      {input}
      {error && <p className="mt-2 text-xs text-red">{error}</p>}
    </div>
  );
}

const UserManagement = React.memo(UserManagementImpl);

export default UserManagement;
