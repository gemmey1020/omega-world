'use client';

import React from 'react';
import UserManagement from './user-management';

const MOCK_ADMIN_USERS = [
  {
    id: 'USER-ADMIN-001',
    name: 'Sarah Chen',
    email: 'sarah.chen@omega.local',
    role: 'super_admin' as const,
    status: 'active' as const,
    lastActive: '2 minutes ago',
  },
  {
    id: 'USER-ADMIN-002',
    name: 'James Mitchell',
    email: 'james.mitchell@omega.local',
    role: 'dispatcher' as const,
    status: 'active' as const,
    lastActive: '5 minutes ago',
  },
  {
    id: 'USER-ADMIN-003',
    name: 'Emma Rodriguez',
    email: 'emma.rodriguez@omega.local',
    role: 'dispatcher' as const,
    status: 'active' as const,
    lastActive: '12 minutes ago',
  },
  {
    id: 'USER-ADMIN-004',
    name: 'David Kim',
    email: 'david.kim@omega.local',
    role: 'dispatcher' as const,
    status: 'inactive' as const,
    lastActive: '3 days ago',
  },
];

const MOCK_CUSTOMER_USERS = [
  {
    id: 'USER-CUST-001',
    name: 'Acme Corporation',
    email: 'orders@acme-corp.com',
    role: 'customer' as const,
    status: 'active' as const,
    lastActive: '1 hour ago',
  },
  {
    id: 'USER-CUST-002',
    name: 'TechStart Inc.',
    email: 'supply@techstart.io',
    role: 'customer' as const,
    status: 'active' as const,
    lastActive: '23 minutes ago',
  },
  {
    id: 'USER-CUST-003',
    name: 'Global Retail Ltd',
    email: 'logistics@globalretail.co.uk',
    role: 'customer' as const,
    status: 'active' as const,
    lastActive: '1 day ago',
  },
  {
    id: 'USER-CUST-004',
    name: 'Marketplace Plus',
    email: 'admin@marketplace-plus.com',
    role: 'customer' as const,
    status: 'inactive' as const,
    lastActive: '15 days ago',
  },
  {
    id: 'USER-CUST-005',
    name: 'Express Goods',
    email: 'team@expressgoods.net',
    role: 'customer' as const,
    status: 'active' as const,
    lastActive: '45 minutes ago',
  },
];

export default function UsersPageClient() {
  return <UserManagement adminUsers={MOCK_ADMIN_USERS} customerUsers={MOCK_CUSTOMER_USERS} />;
}
