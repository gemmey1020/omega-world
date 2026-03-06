export interface Category {
    id: string;
    name: string;
    icon: string; // We'll map this to lucide-react icons in the UI
}

export interface Subscription {
    status: 'active' | 'expired' | 'suspended';
    reason?: string;
    expires_at?: string;
}

export interface Vendor {
    id: string;
    name: string;
    category_id: string;
    category?: Category;
    isOpenNow: boolean;
    offersFastDelivery: boolean;
    is_checkout_available: boolean;
    subscription: Subscription;
    image_url?: string;
    rating?: number;
    delivery_time_mins?: string;
}

export interface FilterState {
    searchQuery: string;
    categoryId: string | null;
    isOpenNow: boolean;
    isFastDelivery: boolean;
}
