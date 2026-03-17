import React, { useState } from 'react';
import { User, Store, Product } from '../types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../src/lib/api';
import { useAuth } from '../src/context/AuthContext';
import {
    Plus, LogOut, ShoppingBag, 
    ArrowRight, Check,
    User as UserIcon, Shield, Store as StoreIcon,
    Search, Filter, Loader2, X
} from 'lucide-react';
import { StoreCard } from '../components/StoreCard';
import { ThemeToggle } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { canAccessAdminDashboard } from '../src/lib/adminAccess';
import { StoreSwitcher } from '../components/StoreSwitcher';

interface DashboardProps {
    user: User;
    onLogout: () => void;
    onNavigate: (path: string) => void;
}

interface AggregatedProduct extends Product {
    storeId: string;
    storeName: string;
    storeTheme: string;
    salesCount: number;
}

const StoreCreationWizard = React.lazy(() =>
    import('../components/StoreCreationWizard').then((module) => ({ default: module.StoreCreationWizard }))
);

export const Dashboard: React.FC<DashboardProps> = ({ user, onLogout, onNavigate }) => {
    const [viewMode, setViewMode] = useState<'shop' | 'sell'>(() => {
        const saved = localStorage.getItem('acommerce_mode');
        return (saved === 'sell' || saved === 'shop') ? saved : 'shop';
    });
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const { logout } = useAuth();

    // --- Marketplace State ---
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('All');
    const [sortBy, setSortBy] = useState<'trending' | 'newest' | 'price_low' | 'price_high'>('trending');

    // --- Seller Hub State ---
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [activeSellStoreId, setActiveSellStoreId] = useState<string | null>(null);

    // --- Queries ---
    const { data: myStores = [], isLoading: isLoadingMyStores } = useQuery({
        queryKey: ['myStores', user.id],
        queryFn: async () => {
            const res = await api.get<Store[]>('/stores/my/all');
            return res.data;
        }
    });

    const { data: marketStores = [] } = useQuery({
        queryKey: ['publicStoresDashboard'],
        queryFn: async () => {
            const res = await api.get<Store[]>('/stores');
            return res.data;
        }
    });

    // --- Derived State ---
    const allProducts = React.useMemo(() => {
        let products: AggregatedProduct[] = [];
        marketStores.forEach(store => {
            const salesMap: Record<string, number> = {};
            const storeProducts = (store.products || [])
                .filter(p => p.status === 'ACTIVE')
                .map(p => ({
                    ...p,
                    storeId: store.id,
                    storeName: store.name,
                    storeTheme: store.themeColor || 'indigo',
                    salesCount: salesMap[p.id] || 0
                }));
            products = [...products, ...storeProducts];
        });
        return products;
    }, [marketStores]);

    const filteredProducts = React.useMemo(() => {
        let temp = [...allProducts];
        if (search) {
            const lower = search.toLowerCase();
            temp = temp.filter(p =>
                p.name.toLowerCase().includes(lower) ||
                p.description.toLowerCase().includes(lower) ||
                p.storeName.toLowerCase().includes(lower)
            );
        }
        if (category !== 'All') {
            temp = temp.filter(p => p.category === category);
        }
        switch (sortBy) {
            case 'trending': temp.sort((a, b) => b.salesCount - a.salesCount); break;
            case 'newest': temp.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); break;
            case 'price_low': temp.sort((a, b) => a.price - b.price); break;
            case 'price_high': temp.sort((a, b) => b.price - a.price); break;
        }
        return temp;
    }, [search, category, sortBy, allProducts]);

    const handleViewModeChange = (mode: 'shop' | 'sell') => {
        setViewMode(mode);
        localStorage.setItem('acommerce_mode', mode);
    };

    const categories = ['All', ...Array.from(new Set(allProducts.map(p => p.category))).filter(Boolean)];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300 font-sans">
            <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 md:gap-8">
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleViewModeChange('shop')}>
                            <div className="bg-gradient-to-tr from-indigo-600 to-violet-600 p-1.5 rounded-lg shadow-lg shadow-indigo-500/20">
                                <span className="text-white font-black text-lg">AC</span>
                            </div>
                            <span className="text-xl font-black tracking-tight text-gray-900 dark:text-white hidden md:block">ACommerce</span>
                        </div>

                        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                            <button
                                onClick={() => handleViewModeChange('shop')}
                                className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${viewMode === 'shop' ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'}`}
                            >
                                <ShoppingBag size={14} /> Shop
                            </button>
                            <button
                                onClick={() => handleViewModeChange('sell')}
                                className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${viewMode === 'sell' ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'}`}
                            >
                                <StoreIcon size={14} /> Sell
                            </button>
                        </div>
                    </div>

                    {viewMode === 'shop' && (
                        <div className="flex-1 max-w-lg relative hidden md:block">
                            <input
                                className="w-full pl-10 pr-4 py-2 rounded-full bg-gray-100 dark:bg-gray-800 border-none outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium transition-shadow"
                                placeholder="Search marketplace..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                        </div>
                    )}

                    <div className="flex items-center gap-3">
                        <ThemeToggle />
                        <div className="relative">
                            <button onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} className="flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800 px-2 py-1.5 rounded-lg transition-colors">
                                <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">{user.name.charAt(0)}</div>
                            </button>
                            {isUserMenuOpen && (
                                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden z-50 animate-fade-in">
                                    <div className="p-3 border-b border-gray-100 dark:border-gray-800">
                                        <p className="font-bold text-sm text-gray-900 dark:text-white">{user.name}</p>
                                        <p className="text-xs text-gray-500">{user.email}</p>
                                    </div>
                                    <button onClick={() => onNavigate('/profile')} className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-bold flex items-center gap-2"><UserIcon size={16} /> Profile</button>
                                    {canAccessAdminDashboard(user) && (
                                        <button onClick={() => onNavigate('/admin')} className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-bold flex items-center gap-2 text-purple-600"><Shield size={16} /> Admin</button>
                                    )}
                                    <button onClick={() => { logout(); onLogout(); }} className="w-full text-left px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 text-sm font-bold flex items-center gap-2"><LogOut size={16} /> Logout</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8 animate-fade-in pb-20">
                {viewMode === 'shop' && (
                    <div className="space-y-12">
                        {!search && category === 'All' && (
                            <div className="relative rounded-3xl overflow-hidden bg-gray-900 text-white min-h-[300px] flex items-center group">
                                <div className="absolute inset-0 bg-gradient-to-r from-purple-900/90 to-indigo-900/90 z-10"></div>
                                <div className="relative z-20 px-8 md:px-16 max-w-2xl">
                                    <span className="inline-block px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider mb-4 border border-white/20">Global Marketplace</span>
                                    <h1 className="text-4xl md:text-5xl font-black mb-6 leading-tight">Explore the World of <br /> Independent Stores</h1>
                                    <div className="flex gap-4">
                                        <button onClick={() => { document.getElementById('feed')?.scrollIntoView({ behavior: 'smooth' }) }} className="px-6 py-3 bg-white text-gray-900 rounded-full font-bold hover:scale-105 transition-transform flex items-center gap-2 shadow-lg">Start Exploring <ArrowRight size={18} /></button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col md:flex-row gap-6 sticky top-20 z-30 py-4 bg-gray-50/95 dark:bg-gray-950/95 backdrop-blur-sm" id="feed">
                            <div className="flex-1 overflow-x-auto no-scrollbar flex items-center gap-2">
                                {categories.map(c => (
                                    <button key={c} onClick={() => setCategory(c)} className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-colors border ${category === c ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-transparent' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800'}`}>
                                        {c}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-2">
                                <Filter size={16} className="text-gray-400" />
                                <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="px-4 py-2 rounded-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-sm font-bold outline-none cursor-pointer hover:border-indigo-500 transition-colors">
                                    <option value="trending">Trending</option>
                                    <option value="newest">Newest</option>
                                    <option value="price_low">Price: Low</option>
                                    <option value="price_high">Price: High</option>
                                </select>
                            </div>
                        </div>

                        {filteredProducts.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                {filteredProducts.map((product) => (
                                    <div
                                        key={product.id}
                                        onClick={() => onNavigate(`/store/${product.storeId}/product/${product.id}`)}
                                        className="group cursor-pointer bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden hover:shadow-xl hover:border-indigo-500/30 transition-all duration-300"
                                    >
                                        <div className="aspect-[4/5] relative bg-gray-100 dark:bg-gray-800 overflow-hidden">
                                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                            {product.compareAtPrice && product.compareAtPrice > product.price && (
                                                <span className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm">SALE</span>
                                            )}
                                        </div>
                                        <div className="p-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h3 className="font-bold text-gray-900 dark:text-white line-clamp-1 group-hover:text-indigo-600 transition-colors">{product.name}</h3>
                                                    <div className="flex items-center gap-1 mt-1">
                                                        <div className={`w-3 h-3 rounded-full bg-${product.storeTheme}-500`}></div>
                                                        <p className="text-xs text-gray-500">{product.storeName}</p>
                                                    </div>
                                                </div>
                                                <span className="font-bold text-gray-900 dark:text-white">${product.price}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                                    <ShoppingBag size={32} />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">No products found</h3>
                                <p className="text-gray-500 dark:text-gray-400 text-sm">Try adjusting your search or filters.</p>
                                <button onClick={() => { setSearch(''); setCategory('All'); }} className="mt-4 text-indigo-600 font-bold text-sm hover:underline">Clear Filters</button>
                            </div>
                        )}
                    </div>
                )}

                {viewMode === 'sell' && (
                    <div className="animate-fade-in">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">My Stores</h2>
                                <p className="text-gray-500 dark:text-gray-400">Manage your businesses.</p>
                            </div>
                            <div className="flex items-center gap-4">
                                {myStores.length > 0 && (
                                    <StoreSwitcher 
                                        stores={myStores} 
                                        activeStoreId={activeSellStoreId || myStores[0].id} 
                                        onSelect={(id) => onNavigate(`/store/${id}/admin`)}
                                        onCreateNew={() => setIsWizardOpen(true)}
                                    />
                                )}
                                <button
                                    onClick={() => setIsWizardOpen(true)}
                                    className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                                >
                                    <Plus size={20} /> New Store
                                </button>
                            </div>
                        </div>

                        {isLoadingMyStores ? (
                            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>
                        ) : myStores.length === 0 ? (
                            <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800">
                                <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-500">
                                    <StoreIcon size={40} />
                                </div>
                                <h3 className="text-2xl font-bold mb-2 dark:text-white">Start Selling Today</h3>
                                <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">You haven't created any stores yet. Launch your first online business in minutes.</p>
                                <div className="flex gap-4 justify-center">
                                    <button onClick={() => setIsWizardOpen(true)} className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-500/30">Launch Store</button>
                                    <button onClick={() => handleViewModeChange('shop')} className="px-8 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700">Browse Marketplace</button>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {myStores.map(store => (
                                    <StoreCard
                                        key={store.id}
                                        store={store}
                                        onManage={(id) => onNavigate(`/store/${id}/admin`)}
                                        onVisit={(id) => onNavigate(`/store/${id}`)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>

            {isWizardOpen && (
                <React.Suspense
                    fallback={
                        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                            <Loader2 className="text-white animate-spin" size={32} />
                        </div>
                    }
                >
                    <StoreCreationWizard
                        isOpen={isWizardOpen}
                        onClose={() => setIsWizardOpen(false)}
                    />
                </React.Suspense>
            )}
        </div>
    );
};
