import { Category, Vendor } from '@/types/vendor';

export const mockCategories: Category[] = [
    { id: 'cat-grocer', name: 'Grocer', icon: 'shopping-basket' },
    { id: 'cat-butcher', name: 'Butcher', icon: 'beef' },
    { id: 'cat-bakery', name: 'Bakery', icon: 'croissant' },
    { id: 'cat-pharmacy', name: 'Pharmacy', icon: 'pill' },
    { id: 'cat-supermarket', name: 'Supermarket', icon: 'store' }
];

export const mockVendors: Vendor[] = [
    {
        id: 'v-101',
        name: 'Al-Farouk Groceries',
        category_id: 'cat-grocer',
        isOpenNow: true,
        offersFastDelivery: true,
        is_checkout_available: true,
        subscription: { status: 'active' },
        rating: 4.8,
        delivery_time_mins: '15-20'
    },
    {
        id: 'v-102',
        name: 'Compound Butchers',
        category_id: 'cat-butcher',
        isOpenNow: true,
        offersFastDelivery: false,
        is_checkout_available: false,
        subscription: { status: 'suspended', reason: 'RENEWAL_REQUIRED' },
        rating: 4.5,
        delivery_time_mins: '30-45'
    },
    {
        id: 'v-103',
        name: 'Fresh Morning Bakery',
        category_id: 'cat-bakery',
        isOpenNow: false,
        offersFastDelivery: false,
        is_checkout_available: true,
        subscription: { status: 'active' },
        rating: 4.9,
        delivery_time_mins: '20-30'
    },
    {
        id: 'v-104',
        name: 'El-Ezaby Pharmacy',
        category_id: 'cat-pharmacy',
        isOpenNow: true,
        offersFastDelivery: true,
        is_checkout_available: true,
        subscription: { status: 'active' },
        rating: 5.0,
        delivery_time_mins: '10-15'
    },
    {
        id: 'v-105',
        name: 'Gourmet Supermarket',
        category_id: 'cat-supermarket',
        isOpenNow: true,
        offersFastDelivery: true,
        is_checkout_available: false,
        subscription: { status: 'expired', reason: 'SUBSCRIPTION_EXPIRED' },
        rating: 4.7,
        delivery_time_mins: '20-40'
    }
];
