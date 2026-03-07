'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AdminApiError,
  fetchAdminCustomersPage,
  fetchAdminStaffPage,
  fetchAdminZoneHealth,
  registerAdmin,
} from '@/lib/admin-api';
import {
  AdminCustomerListResponse,
  AdminCustomerRowModel,
  AdminRegisteredUser,
  AdminStaffListResponse,
  AdminStaffRowModel,
  RegisterAdminPayload,
} from '@/lib/admin-user-types';
import { AdminZoneHealthModel } from '@/lib/admin-zone-types';
import UserManagement from './user-management';

const STAFF_PAGE_SIZE = 50;
const CUSTOMER_PAGE_SIZE = 50;

export default function UsersPageClient() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [staffUsers, setStaffUsers] = useState<AdminStaffRowModel[]>([]);
  const [staffMeta, setStaffMeta] = useState<AdminStaffListResponse['meta'] | null>(null);
  const [staffError, setStaffError] = useState<AdminApiError | null>(null);
  const [isStaffLoading, setIsStaffLoading] = useState(true);
  const [isStaffLoadingMore, setIsStaffLoadingMore] = useState(false);
  const staffNextPageRef = useRef(1);

  const [customerUsers, setCustomerUsers] = useState<AdminCustomerRowModel[]>([]);
  const [customerMeta, setCustomerMeta] = useState<AdminCustomerListResponse['meta'] | null>(null);
  const [customerError, setCustomerError] = useState<AdminApiError | null>(null);
  const [isCustomerLoading, setIsCustomerLoading] = useState(true);
  const [isCustomerLoadingMore, setIsCustomerLoadingMore] = useState(false);
  const customerNextPageRef = useRef(1);

  const [zones, setZones] = useState<AdminZoneHealthModel[]>([]);
  const [zonesError, setZonesError] = useState<AdminApiError | null>(null);
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchQuery]);

  const loadStaffPage = useCallback(
    async (page: number, replace: boolean, search: string, signal?: AbortSignal) => {
      const payload = await fetchAdminStaffPage(page, STAFF_PAGE_SIZE, search, signal);

      setStaffMeta(payload.meta);
      setStaffUsers((current) => {
        if (replace) {
          return payload.data;
        }

        const seenIds = new Set(current.map((user) => user.id));
        const merged = [...current];

        for (const user of payload.data) {
          if (!seenIds.has(user.id)) {
            merged.push(user);
            seenIds.add(user.id);
          }
        }

        return merged;
      });
      staffNextPageRef.current = page + 1;
    },
    [],
  );

  const loadCustomerPage = useCallback(
    async (page: number, replace: boolean, search: string, signal?: AbortSignal) => {
      const payload = await fetchAdminCustomersPage(page, CUSTOMER_PAGE_SIZE, search, signal);

      setCustomerMeta(payload.meta);
      setCustomerUsers((current) => {
        if (replace) {
          return payload.data;
        }

        const seenIds = new Set(current.map((user) => user.id));
        const merged = [...current];

        for (const user of payload.data) {
          if (!seenIds.has(user.id)) {
            merged.push(user);
            seenIds.add(user.id);
          }
        }

        return merged;
      });
      customerNextPageRef.current = page + 1;
    },
    [],
  );

  const reloadUsers = useCallback(async (
    search: string,
    staffSignal?: AbortSignal,
    customerSignal?: AbortSignal,
  ) => {
    setIsStaffLoading(true);
    setIsCustomerLoading(true);
    setStaffError(null);
    setCustomerError(null);

    await Promise.allSettled([
      loadStaffPage(1, true, search, staffSignal).catch((caughtError) => {
        if (!staffSignal?.aborted) {
          setStaffUsers([]);
          setStaffMeta(null);
          setStaffError(
            caughtError instanceof AdminApiError
              ? caughtError
              : new AdminApiError('Failed to load staff.', 500),
          );
        }
      }),
      loadCustomerPage(1, true, search, customerSignal).catch((caughtError) => {
        if (!customerSignal?.aborted) {
          setCustomerUsers([]);
          setCustomerMeta(null);
          setCustomerError(
            caughtError instanceof AdminApiError
              ? caughtError
              : new AdminApiError('Failed to load customers.', 500),
          );
        }
      }),
    ]);

    if (!staffSignal?.aborted) {
      setIsStaffLoading(false);
    }

    if (!customerSignal?.aborted) {
      setIsCustomerLoading(false);
    }
  }, [loadCustomerPage, loadStaffPage]);

  useEffect(() => {
    const staffAbort = new AbortController();
    const customerAbort = new AbortController();
    void reloadUsers(debouncedSearch, staffAbort.signal, customerAbort.signal);

    return () => {
      staffAbort.abort();
      customerAbort.abort();
    };
  }, [debouncedSearch, reloadUsers]);

  useEffect(() => {
    const abortController = new AbortController();

    const run = async () => {
      setZonesError(null);

      try {
        const payload = await fetchAdminZoneHealth(abortController.signal);
        setZones(payload.data);
      } catch (caughtError) {
        if (!abortController.signal.aborted) {
          setZonesError(
            caughtError instanceof AdminApiError
              ? caughtError
              : new AdminApiError('Failed to load zones for admin onboarding.', 500),
          );
        }
      }
    };

    void run();

    return () => {
      abortController.abort();
    };
  }, []);

  const handleLoadMoreStaff = useCallback(async () => {
    if (isStaffLoadingMore || !staffMeta || staffNextPageRef.current > staffMeta.last_page) {
      return;
    }

    setIsStaffLoadingMore(true);
    setStaffError(null);

    try {
      await loadStaffPage(staffNextPageRef.current, false, debouncedSearch);
    } catch (caughtError) {
      setStaffError(
        caughtError instanceof AdminApiError
          ? caughtError
          : new AdminApiError('Failed to load more staff.', 500),
      );
    } finally {
      setIsStaffLoadingMore(false);
    }
  }, [debouncedSearch, isStaffLoadingMore, loadStaffPage, staffMeta]);

  const handleLoadMoreCustomers = useCallback(async () => {
    if (isCustomerLoadingMore || !customerMeta || customerNextPageRef.current > customerMeta.last_page) {
      return;
    }

    setIsCustomerLoadingMore(true);
    setCustomerError(null);

    try {
      await loadCustomerPage(customerNextPageRef.current, false, debouncedSearch);
    } catch (caughtError) {
      setCustomerError(
        caughtError instanceof AdminApiError
          ? caughtError
          : new AdminApiError('Failed to load more customers.', 500),
      );
    } finally {
      setIsCustomerLoadingMore(false);
    }
  }, [customerMeta, debouncedSearch, isCustomerLoadingMore, loadCustomerPage]);

  const handleCreateAdmin = useCallback(async (payload: RegisterAdminPayload): Promise<AdminRegisteredUser> => {
    setIsCreatingAdmin(true);

    try {
      const createdUser = await registerAdmin(payload);
      await loadStaffPage(1, true, debouncedSearch);
      return createdUser;
    } finally {
      setIsCreatingAdmin(false);
    }
  }, [debouncedSearch, loadStaffPage]);

  return (
    <UserManagement
      searchQuery={searchQuery}
      onSearchQueryChange={setSearchQuery}
      adminUsers={staffUsers}
      adminMeta={staffMeta}
      adminError={staffError}
      isAdminLoading={isStaffLoading}
      isAdminLoadingMore={isStaffLoadingMore}
      onRetryAdmins={() => {
        void reloadUsers(debouncedSearch);
      }}
      onLoadMoreAdmins={() => {
        void handleLoadMoreStaff();
      }}
      customerUsers={customerUsers}
      customerMeta={customerMeta}
      customerError={customerError}
      isCustomerLoading={isCustomerLoading}
      isCustomerLoadingMore={isCustomerLoadingMore}
      onRetryCustomers={() => {
        void reloadUsers(debouncedSearch);
      }}
      onLoadMoreCustomers={() => {
        void handleLoadMoreCustomers();
      }}
      zones={zones}
      zonesError={zonesError}
      onCreateAdmin={handleCreateAdmin}
      isCreatingAdmin={isCreatingAdmin}
    />
  );
}
