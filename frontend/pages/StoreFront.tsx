import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { Store, Product, CartItem, Customer, BlogPost } from '../types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../src/lib/api';
import { useAuth } from '../src/context/AuthContext';
import { ThemeToggle } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { useCurrency } from '../context/CurrencyContext';
import {
    ShoppingCart, Search, X, Star, ArrowRight, Mail, Facebook, Twitter, Instagram, MapPin, Menu,
    Lock, Eye, Copy, Minus, Plus, Loader2, LayoutDashboard, Calendar, Clock, Heart, Filter,
    ChevronDown, ChevronRight, User as UserIcon, LogOut, Package, Truck, AlertCircle, Share2, Check,
    ArrowLeft, Image as ImageIcon, Maximize2, XCircle, SlidersHorizontal, ChevronUp, ChevronLeft, Zap, ShoppingBag
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { CheckoutStep } from '../types';

interface StoreFrontProps {
    storeId: string;
    onNavigate: (path: string) => void;
}

const AiChatWidget = React.lazy(() =>
    import('../components/AiChatWidget').then((module) => ({ default: module.AiChatWidget }))
);
const CheckoutWizard = React.lazy(() => import('../components/CheckoutWizard'));
const CartReview = React.lazy(() => import('../components/CartReview'));
const ShippingForm = React.lazy(() => import('../components/ShippingForm'));
const PaymentSelector = React.lazy(() => import('../components/PaymentSelector'));
const OrderSummary = React.lazy(() => import('../components/OrderSummary'));

const CheckoutLoader: React.FC = () => (
    <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-gray-400" size={28} />
    </div>
);

const getRadiusClass = (settings: Store['settings'], base: string) => {
    switch (settings.borderRadius) {
        case 'none': return 'rounded-none';
        case 'full': return 'rounded-full';
        case 'sm': return 'rounded';
        default: return base;
    }
};

const getFontClass = (settings: Store['settings']) => {
    switch (settings.font) {
        case 'serif': return 'font-serif';
        case 'mono': return 'font-mono';
        default: return 'font-sans';
    }
};

// --- Sub Components ---

const Breadcrumbs: React.FC<{ items: { label: string, path?: string }[] }> = ({ items }) => (
    <div className="flex items-center text-sm text-gray-500 mb-6 overflow-x-auto whitespace-nowrap">
        <Link to="" className="hover:text-black dark:hover:text-white">Home</Link>
        {items.map((item, i) => (
            <React.Fragment key={i}>
                <ChevronRight size={14} className="mx-2" />
                {item.path ? <Link to={item.path} className="hover:text-black dark:hover:text-white">{item.label}</Link> : <span className="text-gray-900 dark:text-white font-bold">{item.label}</span>}
            </React.Fragment>
        ))}
    </div>
);

const ProductCard: React.FC<{ product: Product, store: Store, isWishlisted: boolean, onWishlist: () => void, onClick: () => void, onAddToCart: (e: any) => void, onQuickView: (e: any) => void }> = ({ product, store, isWishlisted, onWishlist, onClick, onAddToCart, onQuickView }) => {
    const { convertPrice } = useCurrency();
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`group bg-white/80 dark:bg-gray-900/40 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden cursor-pointer transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 ${getRadiusClass(store.settings, 'rounded-3xl')} relative`}
        >
            {/* 3D Glassmorphic overlay effect on hover */}
            <div className={`absolute inset-0 bg-gradient-to-tr from-${store.themeColor}-500/0 via-white/5 to-${store.themeColor}-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none z-10`}></div>

            <div className="relative aspect-[4/5] overflow-hidden bg-gray-100 dark:bg-[#0a0a0f]">
                <img src={product.imageUrl} alt={product.name} className={`w-full h-full object-cover transition-transform duration-700 ${isHovered ? 'scale-110' : 'scale-100'}`} />

                {/* Badges */}
                <div className="absolute top-3 left-3 flex flex-col gap-2 z-20">
                    {product.stock <= 0 && <span className="bg-black/80 backdrop-blur-md text-white text-[10px] uppercase font-black px-3 py-1.5 rounded-full tracking-wider">Sold Out</span>}
                    {product.stock > 0 && product.stock < 10 && <span className="bg-orange-500/90 backdrop-blur-md text-white text-[10px] uppercase font-black px-3 py-1.5 rounded-full tracking-wider flex items-center gap-1"><AlertCircle size={10} /> Low Stock</span>}
                    {product.compareAtPrice && product.compareAtPrice > product.price && (
                        <span className="bg-red-500/90 backdrop-blur-md text-white text-[10px] uppercase font-black px-3 py-1.5 rounded-full tracking-wider shadow-lg shadow-red-500/30">Sale</span>
                    )}
                </div>

                {/* Quick Action Overlay (Slide UP on hover) */}
                <div className={`absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex justify-center gap-3 transition-transform duration-500 z-20 ${isHovered ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                    <button
                        onClick={(e) => { e.stopPropagation(); onWishlist(); }}
                        className={`w-12 h-12 flex items-center justify-center bg-white/20 backdrop-blur-xl hover:bg-white text-white hover:text-red-500 transition-all rounded-full hover:scale-110`}
                        title="Wishlist"
                    >
                        <Heart size={20} fill={isWishlisted ? "currentColor" : "none"} className={isWishlisted ? "text-red-500" : ""} />
                    </button>
                    <button
                        onClick={onQuickView}
                        className={`w-12 h-12 flex items-center justify-center bg-white/20 backdrop-blur-xl hover:bg-white text-white hover:text-gray-900 transition-all rounded-full hover:scale-110`}
                        title="Quick View"
                    >
                        <Maximize2 size={20} />
                    </button>
                    <button
                        onClick={onAddToCart}
                        disabled={product.stock <= 0}
                        className={`w-12 h-12 flex items-center justify-center bg-${store.themeColor}-600 hover:bg-${store.themeColor}-500 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all rounded-full shadow-lg shadow-${store.themeColor}-600/30 hover:scale-110`}
                        title="Add to Cart"
                    >
                        <ShoppingCart size={20} />
                    </button>
                </div>
            </div>
            <div className="p-5 z-20 relative bg-white dark:bg-transparent">
                <div className="flex justify-between items-start mb-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">{product.category}</p>
                    <div className="flex text-yellow-400">
                        <Star size={12} fill="currentColor" />
                        <span className="text-[10px] ml-1 text-gray-600 dark:text-gray-400 font-bold">4.8</span>
                    </div>
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-3 line-clamp-1 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-indigo-400 group-hover:to-purple-400 transition-all">{product.name}</h3>
                <div className="flex items-center gap-3">
                    <span className="font-black text-xl text-gray-900 dark:text-white">{convertPrice(product.price)}</span>
                    {product.compareAtPrice && product.compareAtPrice > product.price && (
                        <span className="text-sm font-bold text-gray-400 line-through decoration-red-500/50">{convertPrice(product.compareAtPrice)}</span>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- Pages ---

const CatalogPage: React.FC<{ store: Store, onProductClick: (p: Product) => void, addToCart: (p: Product) => void, onWishlist: (pid: string) => void, userWishlist: string[] }> = ({ store, onProductClick, addToCart, onWishlist, userWishlist }) => {
    const [filterCat, setFilterCat] = useState('All');
    const [priceRange, setPriceRange] = useState<[number, number]>([0, 5000]);
    const [sortBy, setSortBy] = useState('newest');
    const [showFilters, setShowFilters] = useState(true);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [visibleCount, setVisibleCount] = useState(12);
    const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

    const { convertPrice } = useCurrency();

    const categories = ['All', ...Array.from(new Set(store.products.map(p => p.category)))];

    const filtered = store.products.filter(p => {
        if (p.status !== 'ACTIVE') return false;
        if (filterCat !== 'All' && p.category !== filterCat) return false;
        if (p.price < priceRange[0] || p.price > priceRange[1]) return false;
        return true;
    }).sort((a, b) => {
        if (sortBy === 'lowPrice') return a.price - b.price;
        if (sortBy === 'highPrice') return b.price - a.price;
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        return b.createdAt - a.createdAt; // newest
    });

    // Infinite scroll logic simulation
    useEffect(() => {
        const handleScroll = () => {
            if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
                if (visibleCount < filtered.length) {
                    setVisibleCount(prev => Math.min(prev + 8, filtered.length));
                }
            }
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [visibleCount, filtered.length]);


    return (
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fade-in relative">
            <Breadcrumbs items={[{ label: 'Catalog' }]} />

            <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6 pb-6 border-b border-gray-200 dark:border-gray-800">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 dark:text-white mb-2">The Collection</h1>
                    <p className="text-gray-500 font-medium">Discover {filtered.length} exclusive items tailored for you.</p>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all ${showFilters ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                        <SlidersHorizontal size={16} /> Filters
                    </button>

                    <div className="hidden sm:flex bg-gray-100 dark:bg-gray-800 rounded-full p-1">
                        <button onClick={() => setViewMode('grid')} className={`p-2 rounded-full transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}><LayoutDashboard size={18} /></button>
                        <button onClick={() => setViewMode('list')} className={`p-2 rounded-full transition-all ${viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}><Menu size={18} /></button>
                    </div>

                    <div className="relative flex-1 md:flex-none">
                        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="w-full md:w-48 px-5 py-2.5 bg-gray-100 dark:bg-gray-800 border-none rounded-full text-sm font-bold appearance-none outline-none cursor-pointer focus:ring-2 focus:ring-indigo-500">
                            <option value="newest">Latest Arrivals</option>
                            <option value="lowPrice">Price: Low to High</option>
                            <option value="highPrice">Price: High to Low</option>
                            <option value="name">Alphabetical</option>
                        </select>
                        <ChevronDown size={16} className="absolute right-4 top-3 text-gray-500 pointer-events-none" />
                    </div>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-10">
                {/* Advanced Premium Sidebar Filters */}
                <div className={`w-full lg:w-72 flex-shrink-0 transition-all duration-500 ${showFilters ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-full hidden'}`}>
                    <div className="sticky top-32 space-y-10 bg-white/50 dark:bg-[#0a0a0f]/50 backdrop-blur-2xl border border-gray-200/50 dark:border-gray-800/50 p-6 rounded-3xl shadow-xl">

                        <div>
                            <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white mb-6 flex items-center justify-between">Categories <span className="text-indigo-500">{categories.length}</span></h3>
                            <div className="space-y-3">
                                {categories.map(c => (
                                    <label key={c} className="flex items-center gap-3 cursor-pointer group">
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${filterCat === c ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300 dark:border-gray-600 group-hover:border-indigo-400'}`}>
                                            {filterCat === c && <Check size={12} className="text-white" />}
                                        </div>
                                        <input type="radio" name="category" className="hidden" checked={filterCat === c} onChange={() => setFilterCat(c)} />
                                        <span className={`text-sm font-medium transition-colors ${filterCat === c ? 'text-gray-900 dark:text-white font-bold' : 'text-gray-500 group-hover:text-gray-900 dark:group-hover:text-gray-300'}`}>{c}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent"></div>

                        <div>
                            <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white mb-6">Price Range</h3>
                            <div className="space-y-6">
                                {/* Dual Range Slider Mockup */}
                                <div className="relative h-2 bg-gray-200 dark:bg-gray-800 rounded-full">
                                    <div className="absolute h-full bg-indigo-500 rounded-full" style={{ left: `${(priceRange[0] / 5000) * 100}%`, right: `${100 - (priceRange[1] / 5000) * 100}%` }}></div>
                                    <div className="absolute w-4 h-4 bg-white border-2 border-indigo-500 rounded-full -top-1 -ml-2 shadow" style={{ left: `${(priceRange[0] / 5000) * 100}%` }}></div>
                                    <div className="absolute w-4 h-4 bg-white border-2 border-indigo-500 rounded-full -top-1 -ml-2 shadow" style={{ left: `${(priceRange[1] / 5000) * 100}%` }}></div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex-1 relative">
                                        <span className="absolute left-3 top-3 text-gray-500 font-bold">$</span>
                                        <input type="number" value={priceRange[0]} onChange={e => setPriceRange([Number(e.target.value), priceRange[1]])} className="w-full pl-7 pr-3 py-2.5 bg-gray-50 dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                                    </div>
                                    <span className="text-gray-400">-</span>
                                    <div className="flex-1 relative">
                                        <span className="absolute left-3 top-3 text-gray-500 font-bold">$</span>
                                        <input type="number" value={priceRange[1]} onChange={e => setPriceRange([priceRange[0], Number(e.target.value)])} className="w-full pl-7 pr-3 py-2.5 bg-gray-50 dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button onClick={() => { setFilterCat('All'); setPriceRange([0, 5000]); setSortBy('newest'); }} className="w-full py-3 text-sm font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-gray-800 rounded-xl transition-colors">Reset Filters</button>
                    </div>
                </div>

                {/* Grid */}
                <div className="flex-1">
                    {filtered.length === 0 ? (
                        <div className="text-center py-32 bg-gray-50/50 dark:bg-gray-900/50 backdrop-blur-xl rounded-3xl border border-gray-200/50 dark:border-gray-800/50 flex flex-col items-center justify-center">
                            <Package size={48} className="text-gray-300 dark:text-gray-700 mb-4" />
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No items found</h3>
                            <p className="text-gray-500 max-w-sm mb-6">We couldn't find anything matching your current filters. Try adjusting your search criteria.</p>
                            <button onClick={() => { setFilterCat('All'); setPriceRange([0, 5000]); setSortBy('newest'); }} className="px-6 py-2.5 bg-black text-white dark:bg-white dark:text-black font-bold rounded-full hover:scale-105 transition-transform">Clear Filters</button>
                        </div>
                    ) : (
                        <div className="space-y-12">
                            <div className={viewMode === 'grid'
                                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-12"
                                : "flex flex-col gap-6"
                            }>
                                {filtered.slice(0, visibleCount).map(p => (
                                    viewMode === 'grid' ? (
                                        <ProductCard
                                            key={p.id}
                                            product={p}
                                            store={store}
                                            isWishlisted={userWishlist.includes(p.id)}
                                            onWishlist={() => onWishlist(p.id)}
                                            onClick={() => onProductClick(p)}
                                            onAddToCart={(e) => { e.stopPropagation(); addToCart(p); }}
                                            onQuickView={(e) => { e.stopPropagation(); setQuickViewProduct(p); }}
                                        />
                                    ) : (
                                        <div key={p.id} onClick={() => onProductClick(p)} className={`group flex gap-6 p-4 bg-white/80 dark:bg-gray-900/40 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-3xl cursor-pointer hover:shadow-2xl hover:-translate-y-1 transition-all duration-500`}>
                                            <div className="relative w-48 h-48 rounded-2xl overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-black">
                                                <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                                {p.stock <= 0 && <span className="absolute top-2 left-2 bg-black/80 text-white text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-wider backdrop-blur-md">Sold Out</span>}
                                            </div>
                                            <div className="flex-1 py-2 flex flex-col justify-center">
                                                <div className="flex justify-between items-start mb-2">
                                                    <p className="text-xs font-bold uppercase tracking-widest text-indigo-500">{p.category}</p>
                                                    <button onClick={(e) => { e.stopPropagation(); onWishlist(p.id); }} className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${userWishlist.includes(p.id) ? 'text-red-500' : 'text-gray-400'}`}>
                                                        <Heart size={18} fill={userWishlist.includes(p.id) ? "currentColor" : "none"} />
                                                    </button>
                                                </div>
                                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-indigo-400 group-hover:to-purple-400 transition-all">{p.name}</h3>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-4 leading-relaxed">{p.description}</p>
                                                <div className="flex items-center justify-between mt-auto">
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-black text-2xl text-gray-900 dark:text-white">{convertPrice(p.price)}</span>
                                                        {p.compareAtPrice && p.compareAtPrice > p.price && (
                                                            <span className="text-sm font-bold text-gray-400 line-through decoration-red-500/50">{convertPrice(p.compareAtPrice)}</span>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button onClick={(e) => { e.stopPropagation(); setQuickViewProduct(p); }} className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-bold rounded-xl transition-colors text-sm flex items-center gap-2">
                                                            <Maximize2 size={16} /> Quick View
                                                        </button>
                                                        <button onClick={(e) => { e.stopPropagation(); addToCart(p); }} disabled={p.stock <= 0} className={`px-6 py-2 bg-${store.themeColor}-600 hover:bg-${store.themeColor}-500 text-white font-bold rounded-xl disabled:opacity-50 transition-colors shadow-lg shadow-${store.themeColor}-600/30 flex items-center gap-2`}>
                                                            <ShoppingCart size={16} /> Add to Cart
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                ))}
                            </div>

                            {/* Infinite Scroll Loader */}
                            {visibleCount < filtered.length && (
                                <div className="py-12 flex justify-center">
                                    <Loader2 className="animate-spin text-gray-400" size={32} />
                                </div>
                            )}

                            {visibleCount >= filtered.length && filtered.length > 0 && (
                                <div className="py-12 flex flex-col items-center">
                                    <div className="w-16 h-1 bg-gray-200 dark:bg-gray-800 rounded-full mb-4"></div>
                                    <p className="text-gray-400 font-medium">You've reached the end of the collection.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Quick View Modal */}
            {quickViewProduct && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setQuickViewProduct(null)}></div>
                    <div className="relative bg-white dark:bg-[#0a0a0f] w-full max-w-4xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col md:flex-row animate-scale-up">
                        <button onClick={() => setQuickViewProduct(null)} className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/50 dark:bg-black/50 backdrop-blur-md flex items-center justify-center rounded-full hover:bg-white dark:hover:bg-gray-800 transition-colors">
                            <X size={20} />
                        </button>

                        <div className="md:w-1/2 bg-gray-100 dark:bg-black aspect-square md:aspect-auto">
                            <img src={quickViewProduct.imageUrl} alt={quickViewProduct.name} className="w-full h-full object-cover" />
                        </div>

                        <div className="md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
                            <p className="text-xs font-bold uppercase tracking-widest text-[#6366f1] mb-2">{quickViewProduct.category}</p>
                            <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-4 leading-tight">{quickViewProduct.name}</h2>
                            <div className="flex items-center gap-4 mb-6">
                                <span className="text-3xl font-bold text-gray-900 dark:text-white">{convertPrice(quickViewProduct.price)}</span>
                                {quickViewProduct.compareAtPrice && quickViewProduct.compareAtPrice > quickViewProduct.price && (
                                    <span className="text-xl text-gray-400 line-through">{convertPrice(quickViewProduct.compareAtPrice)}</span>
                                )}
                            </div>
                            <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed line-clamp-4">{quickViewProduct.description}</p>

                            <div className="space-y-4 mt-auto">
                                <button onClick={() => { addToCart(quickViewProduct); setQuickViewProduct(null); }} disabled={quickViewProduct.stock <= 0} className={`w-full py-4 px-6 bg-[#6366f1] hover:bg-[#4f46e5] text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/30 transition-all flex items-center justify-center gap-2 hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 disabled:shadow-none`}>
                                    <ShoppingCart size={20} /> {quickViewProduct.stock <= 0 ? 'Out of Stock' : 'Add to Cart'}
                                </button>
                                <button onClick={() => { onProductClick(quickViewProduct); setQuickViewProduct(null); }} className="w-full py-4 text-gray-900 dark:text-white font-bold rounded-2xl border-2 border-gray-200 dark:border-gray-800 hover:border-gray-900 dark:hover:border-white transition-colors">
                                    View Full Details
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const ProductPage: React.FC<{ store: Store, addToCart: (p: Product, qty: number, variant?: string) => void, onWishlist: (pid: string) => void, isWishlisted: boolean }> = ({ store, addToCart, onWishlist, isWishlisted }) => {
    const { productId } = useParams();
    const product = store.products.find(p => p.id === productId);
    const [qty, setQty] = useState(1);
    const [selectedImage, setSelectedImage] = useState('');
    const [selections, setSelections] = useState<Record<string, string>>({});
    const [activeTab, setActiveTab] = useState<'desc' | 'reviews'>('desc');
    const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '', name: '' });
    const [showStickyCart, setShowStickyCart] = useState(false);
    const [viewers, setViewers] = useState(0);

    const { showToast } = useToast();
    const radius = (base: string) => getRadiusClass(store.settings, base);
    const { convertPrice } = useCurrency();

    // Track recently viewed & simulate real-time viewers
    useEffect(() => {
        if (product) {
            setSelectedImage(product.imageUrl);
            const viewed = JSON.parse(localStorage.getItem(`acommerce_viewed_${store.id}`) || '[]');
            const newViewed = [product.id, ...viewed.filter((id: string) => id !== product.id)].slice(0, 5);
            localStorage.setItem(`acommerce_viewed_${store.id}`, JSON.stringify(newViewed));

            // Simulate social proof
            setViewers(Math.floor(Math.random() * 45) + 5);
        }
        setSelections({});
        setQty(1);
    }, [productId, product]);

    // Sticky cart on scroll
    useEffect(() => {
        const handleScroll = () => {
            setShowStickyCart(window.scrollY > 400);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    if (!product) return <div className="p-32 flex flex-col items-center justify-center text-center animate-fade-in"><Package size={48} className="text-gray-300 mb-4" /><h2 className="text-2xl font-bold mb-2">Product Not Found</h2><p className="text-gray-500 mb-6">The item you're looking for doesn't exist or has been removed.</p><Link to="../catalog" className="px-6 py-3 bg-black text-white dark:bg-white dark:text-black rounded-full font-bold hover:scale-105 transition-transform">Browse Catalog</Link></div>;

    const handleAddToCart = () => {
        addToCart(product, qty, undefined);
    };

    const submitReview = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/reviews', {
                storeId: store.id,
                productId: product.id,
                customerName: reviewForm.name || 'Anonymous',
                rating: reviewForm.rating,
                comment: reviewForm.comment
            });
            showToast('Review submitted successfully!', 'success');
            setReviewForm({ rating: 5, comment: '', name: '' });
        } catch (e) {
            showToast('Failed to submit review. Try again.', 'error');
        }
    };

    const relatedProducts = store.products.filter(p => p.id !== product.id && p.category === product.category && p.status === 'ACTIVE').slice(0, 4);
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + 5);
    const fastDeliveryDate = new Date();
    fastDeliveryDate.setDate(fastDeliveryDate.getDate() + 2);

    return (
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fade-in relative pb-32">
            <Breadcrumbs items={[{ label: 'Catalog', path: '../catalog' }, { label: product.name }]} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 xl:gap-20 mb-20">
                {/* Immersive Media Gallery */}
                <div className="space-y-6 lg:sticky lg:top-32 self-start">
                    <div className={`relative aspect-[4/5] bg-gray-100 dark:bg-[#0a0a0f] overflow-hidden group ${radius('rounded-[2rem]')}`}>
                        <img src={selectedImage || product.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 cursor-zoom-in" />

                        {/* Premium Badges */}
                        <div className="absolute top-6 left-6 flex flex-col gap-3">
                            {product.compareAtPrice && product.compareAtPrice > product.price && (
                                <span className="bg-red-500/90 backdrop-blur-md text-white text-xs font-black uppercase tracking-wider px-4 py-2 rounded-full shadow-lg shadow-red-500/30 w-max">On Sale</span>
                            )}
                            {product.stock > 0 && product.stock < 10 && (
                                <span className="bg-orange-500/90 backdrop-blur-md text-white text-xs font-black uppercase tracking-wider px-4 py-2 rounded-full flex items-center gap-2 shadow-lg shadow-orange-500/30 w-max"><AlertCircle size={14} /> Almost Gone</span>
                            )}
                        </div>
                    </div>

                    {product.images && product.images.length > 1 && (
                        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide px-2">
                            {product.images.map((img, i) => (
                                <button key={i} onClick={() => setSelectedImage(img)} className={`w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 transition-all duration-300 ${selectedImage === img ? `ring-2 ring-offset-4 ring-${store.themeColor}-500 ring-offset-white dark:ring-offset-black scale-100 opacity-100` : 'ring-2 ring-transparent scale-95 opacity-50 hover:opacity-100 hover:scale-100'}`}>
                                    <img src={img} className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Details */}
                <div className="flex flex-col">
                    {/* Social Proof & Category */}
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-4">
                            <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest bg-${store.themeColor}-100 dark:bg-${store.themeColor}-900/30 text-${store.themeColor}-600 dark:text-${store.themeColor}-400`}>{product.category}</span>
                            <div className="flex items-center gap-2 text-sm font-bold text-gray-500">
                                <Eye size={16} className="text-indigo-500 animate-pulse" />
                                <span>{viewers} people viewing this</span>
                            </div>
                        </div>
                        <button onClick={() => onWishlist(product.id)} className={`w-12 h-12 flex items-center justify-center rounded-full transition-all ${isWishlisted ? 'bg-red-50 text-red-500 dark:bg-red-500/10' : 'bg-gray-50 text-gray-400 hover:text-red-500 dark:bg-gray-900'} hover:scale-110`}>
                            <Heart size={20} fill={isWishlisted ? "currentColor" : "none"} />
                        </button>
                    </div>

                    <h1 className="text-4xl lg:text-5xl font-black text-gray-900 dark:text-white mb-6 leading-tight tracking-tight">{product.name}</h1>

                    {/* Reviews Summary */}
                    <div className="flex items-center gap-3 mb-8 cursor-pointer group" onClick={() => setActiveTab('reviews')}>
                        <div className="flex text-yellow-400">
                            {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="currentColor" />)}
                        </div>
                        <span className="text-sm font-bold text-gray-600 dark:text-gray-300 group-hover:underline">4.9 • {product.reviews?.length || 12} Reviews</span>
                    </div>

                    {/* Price Block */}
                    <div className="flex items-end gap-4 mb-10 pb-10 border-b border-gray-100 dark:border-gray-800">
                        <span className="text-5xl font-black text-gray-900 dark:text-white tracking-tighter">{convertPrice(product.price)}</span>
                        {product.compareAtPrice && product.compareAtPrice > product.price && (
                            <div className="flex flex-col mb-1">
                                <span className="text-sm font-bold text-red-500 uppercase tracking-widest">Save {convertPrice(product.compareAtPrice - product.price)}</span>
                                <span className="text-xl text-gray-400 line-through decoration-red-500/50">{convertPrice(product.compareAtPrice)}</span>
                            </div>
                        )}
                    </div>

                    {/* Quantity & Add to Cart (Main) */}
                    <div className="flex flex-col sm:flex-row items-center gap-4 mb-12">
                        <div className={`flex items-center h-16 border-2 border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0a0a0f] ${radius('rounded-2xl')} overflow-hidden`}>
                            <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-16 h-full flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors text-gray-500 hover:text-indigo-500"><Minus size={18} /></button>
                            <span className="w-12 text-center font-black text-lg">{qty}</span>
                            <button onClick={() => setQty(Math.min(product.stock, qty + 1))} className="w-16 h-full flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors text-gray-500 hover:text-indigo-500"><Plus size={18} /></button>
                        </div>
                        <button
                            onClick={handleAddToCart}
                            disabled={product.stock <= 0}
                            className={`flex-1 h-16 bg-${store.themeColor}-600 text-white text-lg font-black uppercase tracking-wider shadow-[0_20px_40px_rgba(0,0,0,0.2)] shadow-${store.themeColor}-500/30 disabled:opacity-50 disabled:shadow-none hover:scale-[1.02] transition-all flex items-center justify-center gap-3 relative overflow-hidden group ${radius('rounded-2xl')}`}
                        >
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                            <ShoppingCart size={24} className="relative z-10" />
                            <span className="relative z-10">{product.stock <= 0 ? 'Out of Stock' : 'Add to Cart'}</span>
                        </button>
                    </div>

                    {/* Premium Delivery Estimates */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
                        <div className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#0a0a0f] flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0 text-indigo-600 dark:text-indigo-400">
                                <Truck size={20} />
                            </div>
                            <div>
                                <h4 className="font-bold text-sm text-gray-900 dark:text-white">Free Standard Delivery</h4>
                                <p className="text-xs text-gray-500 font-medium">By {deliveryDate.toLocaleDateString()}</p>
                            </div>
                        </div>
                        <div className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#0a0a0f] flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0 text-emerald-600 dark:text-emerald-400">
                                <Package size={20} />
                            </div>
                            <div>
                                <h4 className="font-bold text-sm text-gray-900 dark:text-white">Express Delivery</h4>
                                <p className="text-xs text-gray-500 font-medium">+ $15.00 by {fastDeliveryDate.toLocaleDateString()}</p>
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="border-b border-gray-200 dark:border-gray-800 mb-6 flex gap-6">
                        <button onClick={() => setActiveTab('desc')} className={`pb-2 font-bold text-sm ${activeTab === 'desc' ? `text-${store.themeColor}-600 border-b-2 border-${store.themeColor}-600` : 'text-gray-500'}`}>Description</button>
                        <button onClick={() => setActiveTab('reviews')} className={`pb-2 font-bold text-sm ${activeTab === 'reviews' ? `text-${store.themeColor}-600 border-b-2 border-${store.themeColor}-600` : 'text-gray-500'}`}>Reviews ({product.reviews?.length || 0})</button>
                    </div>

                    {activeTab === 'desc' ? (
                        <div className="prose dark:prose-invert text-gray-600 dark:text-gray-300">
                            <p>{product.description}</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {product.reviews?.map(r => (
                                <div key={r.id} className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl">
                                    <div className="flex justify-between items-start">
                                        <span className="font-bold">{r.customerName}</span>
                                        <div className="flex text-yellow-400">{[...Array(5)].map((_, i) => <Star key={i} size={12} fill={i < r.rating ? "currentColor" : "none"} />)}</div>
                                    </div>
                                    <p className="text-gray-600 text-sm mt-2">{r.comment}</p>
                                </div>
                            ))}
                            <form onSubmit={submitReview} className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-700 mt-4">
                                <h4 className="font-bold text-sm mb-2">Write a Review</h4>
                                <input className="w-full mb-2 p-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm" placeholder="Your Name" value={reviewForm.name} onChange={e => setReviewForm({ ...reviewForm, name: e.target.value })} required />
                                <textarea className="w-full mb-2 p-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm" placeholder="Your experience..." value={reviewForm.comment} onChange={e => setReviewForm({ ...reviewForm, comment: e.target.value })} required />
                                <select className="w-full mb-2 p-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm" value={reviewForm.rating} onChange={e => setReviewForm({ ...reviewForm, rating: Number(e.target.value) })}>
                                    {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} Stars</option>)}
                                </select>
                                <button type="submit" className="px-4 py-2 bg-black text-white rounded-lg text-sm font-bold">Submit Review</button>
                            </form>
                        </div>
                    )}
                </div>
            </div>

            {relatedProducts.length > 0 && (
                <div>
                    <h3 className="text-2xl font-bold mb-6">You might also like</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        {relatedProducts.map(p => (
                            <div key={p.id} className="group">
                                <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden mb-2">
                                    <img src={p.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                </div>
                                <h4 className="font-bold truncate">{p.name}</h4>
                                <p className="text-sm text-gray-500">{convertPrice(p.price)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const CartPage: React.FC<{ cart: CartItem[], updateQty: (id: string, q: number) => void, remove: (id: string) => void, checkout: (note: string, discount: number, discountCode?: string) => void, store: Store }> = ({ cart, updateQty, remove, checkout, store }) => {
    const [note, setNote] = useState('');
    const [discountCode, setDiscountCode] = useState('');
    const [appliedDiscount, setAppliedDiscount] = useState<number>(0); // Amount
    const [appliedDiscountCode, setAppliedDiscountCode] = useState<string | undefined>(undefined);
    const { showToast } = useToast();
    const { convertPrice } = useCurrency();

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const total = subtotal + store.settings.shippingFee - appliedDiscount;
    const radius = (base: string) => getRadiusClass(store.settings, base);

    const applyCoupon = async () => {
        const code = discountCode.trim();
        if (!code) {
            showToast('Enter a discount code', 'error');
            return;
        }
        try {
            const res = await api.get(`/stores/${store.id}/discounts/validate`, {
                params: { code, subtotal }
            });
            setAppliedDiscount(Math.min(res.data.discountAmount || 0, subtotal));
            setAppliedDiscountCode(res.data.code || code.toUpperCase());
            showToast('Coupon applied!', 'success');
        } catch (error: any) {
            setAppliedDiscount(0);
            setAppliedDiscountCode(undefined);
            const apiMessage = error?.response?.data?.error;
            showToast(apiMessage || 'Invalid discount code', 'error');
        }
    };

    if (cart.length === 0) return <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-4">Cart Empty</div>;

    return (
        <div className="max-w-7xl mx-auto px-4 py-10 animate-fade-in">
            <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-4">
                    {cart.map(item => (
                        <div key={item.id} className="flex gap-4 p-4 border border-gray-200 dark:border-gray-800 rounded-xl">
                            <img src={item.imageUrl} className="w-20 h-20 object-cover rounded" />
                            <div className="flex-1">
                                <h3 className="font-bold">{item.name}</h3>
                                <p>{convertPrice(item.price)}</p>
                                <div className="flex items-center gap-2 mt-2">
                                    <button onClick={() => updateQty(item.id, item.quantity - 1)}>-</button>
                                    <span>{item.quantity}</span>
                                    <button onClick={() => updateQty(item.id, item.quantity + 1)}>+</button>
                                </div>
                            </div>
                            <button onClick={() => remove(item.id)}><X /></button>
                        </div>
                    ))}
                    <div>
                        <label className="block text-sm font-bold mb-2">Order Note</label>
                        <textarea className="w-full p-3 border rounded-xl bg-transparent" placeholder="Special instructions for seller..." value={note} onChange={e => setNote(e.target.value)} rows={3} />
                    </div>
                </div>
                <div>
                    <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-xl sticky top-24">
                        <div className="flex gap-2 mb-4">
                            <input className="flex-1 p-2 border rounded-lg bg-white dark:bg-gray-800 text-sm" placeholder="Discount Code" value={discountCode} onChange={e => { setDiscountCode(e.target.value); setAppliedDiscount(0); setAppliedDiscountCode(undefined); }} />
                            <button onClick={applyCoupon} className="px-4 bg-gray-900 text-white rounded-lg text-sm font-bold">Apply</button>
                        </div>
                        <div className="flex justify-between mb-2 text-sm"><span>Subtotal</span><span>{convertPrice(subtotal)}</span></div>
                        <div className="flex justify-between mb-2 text-sm"><span>Shipping</span><span>{convertPrice(store.settings.shippingFee)}</span></div>
                        {appliedDiscount > 0 && <div className="flex justify-between mb-2 text-sm text-green-600"><span>Discount</span><span>-{convertPrice(appliedDiscount)}</span></div>}
                        <div className="flex justify-between border-t pt-4 mt-2 font-bold text-lg"><span>Total</span><span>{convertPrice(total)}</span></div>
                        <button onClick={() => checkout(note, appliedDiscount, appliedDiscountCode)} className={`w-full mt-4 bg-black text-white py-3 font-bold ${radius('rounded-xl')}`}>Checkout</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const CustomerProfile: React.FC<{ store: Store, userEmail: string }> = ({ store, userEmail }) => {
    const { convertPrice } = useCurrency();
    const { data: customer } = useQuery({
        queryKey: ['customer', store.id, userEmail],
        queryFn: async () => {
            const res = await api.get(`/stores/${store.id}/customers/profile?email=${userEmail}`);
            return res.data;
        },
        enabled: !!userEmail
    });

    const orders = store.orders.filter(o => o.customer.email === userEmail);
    const wishlistProducts = store.products.filter(p => customer?.wishlist?.includes(p.id));

    // Calculate actual loyalty points based on profile totalSpent
    const totalSpent = customer?.totalSpent || 0;
    const loyaltyPoints = Math.floor(totalSpent * 10); // 10 points per dollar
    const nextTier = 10000;
    const progress = Math.min((loyaltyPoints / nextTier) * 100, 100);

    if (!customer) return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center animate-fade-in text-center p-8">
            <div className={`w-24 h-24 bg-${store.themeColor}-100 dark:bg-${store.themeColor}-900/30 rounded-full flex items-center justify-center mb-6`}>
                <UserIcon size={40} className={`text-${store.themeColor}-600 dark:text-${store.themeColor}-400`} />
            </div>
            <h2 className="text-3xl font-black mb-4">Join our VIP Community</h2>
            <p className="text-gray-500 mb-8 max-w-md">Create an account or make a purchase to unlock exclusive rewards, track orders, and manage your wishlist.</p>
            <Link to="../catalog" className={`px-8 py-4 bg-${store.themeColor}-600 text-white rounded-full font-black uppercase tracking-widest text-sm shadow-xl shadow-${store.themeColor}-600/30 hover:scale-105 transition-transform`}>Start Shopping</Link>
        </div>
    );

    return (
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fade-in relative pb-32">

            {/* Premium Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6 bg-white dark:bg-[#0a0a0f] p-8 md:p-12 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm">
                <div className="flex items-center gap-6">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-black text-4xl shadow-xl shadow-indigo-500/20 flex-shrink-0">
                        {customer.name.charAt(0)}
                    </div>
                    <div>
                        <h1 className="text-4xl lg:text-5xl font-black text-gray-900 dark:text-white tracking-tight mb-2">{customer.name}</h1>
                        <p className="text-gray-500 font-medium flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div> VIP Member</p>
                    </div>
                </div>

                {/* Loyalty Points Estimator */}
                <div className="bg-gradient-to-br from-indigo-50 dark:from-indigo-900/20 to-purple-50 dark:to-purple-900/20 p-6 rounded-3xl border border-indigo-100 dark:border-indigo-800/50 min-w-[300px]">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-sm font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 flex items-center gap-2"><Star size={16} fill="currentColor" /> Rewards</span>
                        <span className="text-2xl font-black text-gray-900 dark:text-white">{loyaltyPoints.toLocaleString()} <span className="text-sm text-gray-400 font-medium">pts</span></span>
                    </div>
                    <div className="h-2 w-full bg-indigo-100 dark:bg-indigo-950 rounded-full overflow-hidden mb-2">
                        <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" style={{ width: `${progress}%` }}></div>
                    </div>
                    <p className="text-xs text-gray-500 font-medium text-right">{10000 - loyaltyPoints} pts to Platinum Tier</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 xl:gap-12">
                <div className="lg:col-span-2 space-y-12">
                    <section className="bg-white dark:bg-[#0a0a0f] rounded-[2rem] border border-gray-100 dark:border-gray-800 p-8 shadow-sm">
                        <h2 className="text-2xl font-black mb-8 flex items-center gap-3"><Package size={24} className="text-indigo-500" /> Order History</h2>
                        {orders.length === 0 ? (
                            <div className="text-center py-12 px-4 rounded-3xl bg-gray-50 dark:bg-gray-900 border border-dashed border-gray-200 dark:border-gray-700">
                                <Package size={48} className="mx-auto text-gray-300 mb-4" />
                                <p className="text-gray-500 font-medium">You haven't placed any orders yet.</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {orders.map(o => (
                                    <div key={o.id} className="border border-gray-100 dark:border-gray-800 p-6 rounded-3xl hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors group">
                                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                                            <div>
                                                <p className="font-black text-lg group-hover:text-indigo-600 transition-colors">Order #{o.id.slice(0, 8).toUpperCase()}</p>
                                                <p className="text-sm text-gray-500 font-medium flex items-center gap-2"><Calendar size={14} /> {new Date(o.date).toLocaleDateString()} • {o.items.length} items</p>
                                            </div>
                                            <div className="text-left sm:text-right flex flex-col sm:items-end">
                                                <p className="font-black text-xl text-gray-900 dark:text-white mb-2">{convertPrice(o.total)}</p>
                                                <span className={`text-xs px-4 py-1.5 rounded-full font-black uppercase tracking-wider ${o.fulfillmentStatus === 'FULFILLED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>{o.fulfillmentStatus}</span>
                                            </div>
                                        </div>

                                        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
                                            {o.items.map((item, idx) => (
                                                <div key={idx} className="flex-shrink-0 w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden snap-start relative group/item">
                                                    <img src={item.imageUrl} className="w-full h-full object-cover" title={`${item.quantity}x ${item.name}`} />
                                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity">
                                                        <span className="text-white text-xs font-bold">{item.quantity}x</span>
                                                    </div>
                                                </div>
                                            ))}
                                            {/* Track Order CTA */}
                                            <Link to={`../track/${o.id}`} className="flex-shrink-0 h-16 px-6 bg-gray-50 dark:bg-gray-900 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl flex items-center justify-center font-bold text-sm transition-colors border border-gray-100 dark:border-gray-800 snap-start">
                                                Track
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </div>

                <div className="space-y-8 lg:sticky lg:top-32 self-start">
                    <section className="bg-white dark:bg-[#0a0a0f] rounded-[2rem] border border-gray-100 dark:border-gray-800 p-8 shadow-sm">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-black flex items-center gap-3"><Heart size={24} className="text-red-500" /> Wishlist</h2>
                            <span className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-sm font-bold">{wishlistProducts.length}</span>
                        </div>

                        {wishlistProducts.length === 0 ? (
                            <p className="text-gray-500 font-medium text-center py-8">Your curated collection is empty.</p>
                        ) : (
                            <div className="flex flex-col gap-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                {wishlistProducts.map(p => (
                                    <Link key={p.id} to={`../product/${p.id}`} className="flex gap-4 items-center bg-gray-50 dark:bg-gray-900 hover:bg-white dark:hover:bg-[#111115] p-3 rounded-2xl transition-all border border-transparent hover:border-gray-200 dark:hover:border-gray-800 group hover:shadow-md">
                                        <div className="w-20 h-20 bg-gray-200 dark:bg-gray-800 rounded-xl overflow-hidden flex-shrink-0">
                                            <img src={p.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                        </div>
                                        <div className="flex-1 overflow-hidden pr-2">
                                            <h4 className="font-bold text-gray-900 dark:text-white truncate group-hover:text-indigo-600 transition-colors">{p.name}</h4>
                                            <p className="text-sm text-gray-500 font-medium mt-1">{p.category}</p>
                                            <p className="font-black text-indigo-600 dark:text-indigo-400 mt-2">{convertPrice(p.price)}</p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                        {wishlistProducts.length > 0 && (
                            <button className="w-full mt-6 py-4 border-2 border-gray-200 dark:border-gray-800 rounded-xl font-bold uppercase tracking-wider text-xs hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">View All Wishlist</button>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
};

// --- Order Tracking Page ---

const OrderTrackingPage: React.FC<{ store: Store }> = ({ store }) => {
    const { orderId } = useParams<{ orderId: string }>();
    const [email, setEmail] = useState('');
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    // Mock fetch for now as we don't have a public track endpoint confirmed
    const handleTrack = (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setTimeout(() => {
            setOrder({
                id: orderId,
                status: 'SHIPPED',
                fulfillmentStatus: 'FULFILLED',
                date: new Date().toISOString(),
                items: [
                    { name: 'Sample Product', quantity: 1, price: 29.99 }
                ],
                timeline: [
                    { status: 'Order Placed', date: new Date(Date.now() - 86400000 * 2).toISOString(), completed: true },
                    { status: 'Processing', date: new Date(Date.now() - 86400000).toISOString(), completed: true },
                    { status: 'Shipped', date: new Date().toISOString(), completed: true },
                    { status: 'Delivered', date: null, completed: false },
                ]
            });
            setLoading(false);
        }, 1500);
    };

    return (
        <div className="max-w-3xl mx-auto px-4 py-16 min-h-[60vh] animate-fade-in">
            <h1 className="text-3xl font-bold mb-8 text-center text-gray-900 dark:text-white">Track Your Order</h1>

            {!order ? (
                <div className="max-w-md mx-auto bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <p className="mb-4 text-sm text-gray-500">Enter your email to view order details for <strong>#{orderId}</strong>.</p>
                    <form onSubmit={handleTrack} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Email Address</label>
                            <input
                                required
                                type="email"
                                className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 outline-none focus:ring-2 focus:ring-indigo-500"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                            />
                        </div>
                        <button disabled={loading} className="w-full bg-black dark:bg-white text-white dark:text-black font-bold py-3 rounded-xl hover:opacity-90 transition-opacity flex justify-center">
                            {loading ? <Loader2 className="animate-spin" /> : 'Track Order'}
                        </button>
                    </form>
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-start mb-8 border-b border-gray-100 dark:border-gray-700 pb-6">
                        <div>
                            <h2 className="text-xl font-bold">Order #{order.id}</h2>
                            <p className="text-gray-500 text-sm">{new Date(order.date).toLocaleDateString()}</p>
                        </div>
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm font-bold">
                            {order.status}
                        </span>
                    </div>

                    <div className="space-y-8 relative">
                        <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-gray-100 dark:bg-gray-700"></div>
                        {order.timeline.map((step: any, i: number) => (
                            <div key={i} className="flex gap-4 relative">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 ${step.completed ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400 dark:bg-gray-700'}`}>
                                    {step.completed ? <Check size={16} /> : <div className="w-3 h-3 bg-gray-400 rounded-full" />}
                                </div>
                                <div className="pt-1">
                                    <p className={`font-bold ${step.completed ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>{step.status}</p>
                                    {step.date && <p className="text-xs text-gray-500">{new Date(step.date).toLocaleString()}</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Blog Pages ---

const BlogPage: React.FC<{ store: Store }> = ({ store }) => {
    const navigate = useNavigate();
    // Filter published posts
    const posts = store.blogPosts?.filter(p => p.status === 'PUBLISHED').sort((a, b) => b.date - a.date) || [];

    return (
        <div className="max-w-7xl mx-auto px-4 py-16 animate-fade-in">
            <div className="text-center mb-16">
                <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">Our Blog</h1>
                <div className={`h-1 w-20 bg-${store.themeColor}-500 mx-auto rounded-full`}></div>
            </div>

            {posts.length === 0 ? (
                <div className="text-center text-gray-500 py-16">No posts yet. Check back soon!</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {posts.map(post => (
                        <div key={post.id} onClick={() => navigate(`${post.slug}`)} className="group cursor-pointer bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-gray-100 dark:border-gray-700">
                            <div className="aspect-video bg-gray-100 dark:bg-gray-900 overflow-hidden relative">
                                {post.imageUrl ? (
                                    <img src={post.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300"><ImageIcon size={48} /></div>
                                )}
                                <div className="absolute top-4 left-4">
                                    <span className="bg-white/90 backdrop-blur text-black text-xs font-bold px-3 py-1 rounded-full">{post.tags?.[0] || 'Blog'}</span>
                                </div>
                            </div>
                            <div className="p-6">
                                <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                                    <Calendar size={14} /> <span>{new Date(post.date).toLocaleDateString()}</span>
                                    <span>•</span>
                                    <Clock size={14} /> <span>{post.readingTime || 5} min read</span>
                                </div>
                                <h3 className="font-bold text-xl mb-3 group-hover:text-indigo-600 transition-colors line-clamp-2">{post.title}</h3>
                                <p className="text-gray-500 text-sm line-clamp-3 mb-4">{post.excerpt}</p>
                                <div className="flex items-center gap-2 text-sm font-bold text-indigo-600 group-hover:translate-x-1 transition-transform">
                                    Read Article <ArrowRight size={16} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const BlogPostPage: React.FC<{ store: Store }> = ({ store }) => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const post = store.blogPosts?.find(p => p.slug === slug);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [slug]);

    if (!post) return <div className="min-h-[50vh] flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-4">Post not found</h1>
        <button onClick={() => navigate('..')} className="text-indigo-600 hover:underline">Back to Blog</button>
    </div>;

    return (
        <article className="max-w-4xl mx-auto px-4 py-16 animate-fade-in relative">
            <button onClick={() => navigate('..')} className="absolute top-8 left-4 lg:-left-16 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <ArrowLeft size={24} />
            </button>

            <div className="text-center mb-12">
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-6">
                    <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full font-bold text-xs">{post.tags?.[0] || 'Article'}</span>
                    <span>•</span>
                    <span>{new Date(post.date).toLocaleDateString()}</span>
                </div>
                <h1 className="text-3xl md:text-5xl font-black mb-8 leading-tight">{post.title}</h1>
                {post.imageUrl && (
                    <div className="rounded-3xl overflow-hidden shadow-2xl mb-8">
                        <img src={post.imageUrl} className="w-full h-auto object-cover max-h-[600px]" />
                    </div>
                )}
            </div>

            <div className="prose dark:prose-invert prose-lg mx-auto prose-headings:font-bold prose-a:text-indigo-600">
                <div dangerouslySetInnerHTML={{ __html: post.content.replace(/\n/g, '<br/>') }} />
            </div>

            <div className="mt-16 pt-8 border-t border-gray-200 dark:border-gray-800 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center font-bold text-lg">
                        {post.author?.charAt(0) || 'A'}
                    </div>
                    <div>
                        <p className="font-bold text-sm">Written by</p>
                        <p className="text-gray-500">{post.author || 'Admin'}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"><Facebook size={20} /></button>
                    <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"><Twitter size={20} /></button>
                    <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"><Share2 size={20} /></button>
                </div>
            </div>
        </article>
    );
};

// --- Main StoreFront ---

// New Multi-Step Checkout Page
const CheckoutPage: React.FC<{ store: Store }> = ({ store }) => {
    const navigate = useNavigate();
    const { checkoutState, setCheckoutStep, items, clearCart } = useCart();
    const { convertPrice } = useCurrency();
    const { showToast } = useToast();

    const handleContinue = () => {
        const steps: CheckoutStep[] = ['cart', 'shipping', 'payment', 'review'];
        const currentIndex = steps.indexOf(checkoutState.currentStep);
        if (currentIndex < steps.length - 1) {
            setCheckoutStep(steps[currentIndex + 1]);
        }
    };

    const handleBack = () => {
        const steps: CheckoutStep[] = ['cart', 'shipping', 'payment', 'review'];
        const currentIndex = steps.indexOf(checkoutState.currentStep);
        if (currentIndex > 0) {
            setCheckoutStep(steps[currentIndex - 1]);
        }
    };

    const handleEditSection = (section: 'cart' | 'shipping' | 'payment') => {
        setCheckoutStep(section);
    };

    const handleComplete = () => {
        clearCart();
        navigate('catalog');
    };

    if (items.length === 0 && checkoutState.currentStep !== 'review') {
        return (
            <div className="max-w-4xl mx-auto px-4 py-16 animate-fade-in text-center">
                <ShoppingBag size={64} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Your cart is empty</h2>
                <p className="text-gray-500 mb-6">Add some items to proceed to checkout</p>
                <button
                    onClick={() => navigate('catalog')}
                    className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-full transition-all"
                >
                    Continue Shopping
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto px-4 py-12 animate-fade-in">
            <button
                onClick={() => {
                    if (checkoutState.currentStep === 'cart') {
                        navigate('catalog');
                    } else {
                        handleBack();
                    }
                }}
                className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:hover:text-white mb-6 font-medium"
            >
                <ArrowLeft size={20} />
                {checkoutState.currentStep === 'cart' ? 'Continue Shopping' : 'Back'}
            </button>

            <React.Suspense fallback={<CheckoutLoader />}>
                <CheckoutWizard />
            </React.Suspense>

            <div className="mt-8">
                <React.Suspense fallback={<CheckoutLoader />}>
                    {checkoutState.currentStep === 'cart' && (
                        <CartReview onContinue={handleContinue} />
                    )}
                    {checkoutState.currentStep === 'shipping' && (
                        <ShippingForm onContinue={handleContinue} onBack={handleBack} />
                    )}
                    {checkoutState.currentStep === 'payment' && (
                        <PaymentSelector onContinue={handleContinue} onBack={handleBack} />
                    )}
                    {checkoutState.currentStep === 'review' && (
                        <OrderSummary
                            onBack={handleBack}
                            onComplete={handleComplete}
                            onEditSection={handleEditSection}
                        />
                    )}
                </React.Suspense>
            </div>
        </div>
    );
};

export const StoreFront: React.FC<StoreFrontProps> = ({ storeId, onNavigate }) => {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isWishlistOpen, setIsWishlistOpen] = useState(false);
    const { showToast } = useToast();
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    const queryClient = useQueryClient();

    const { data: store, isLoading: isStoreLoading } = useQuery({
        queryKey: ['store', storeId],
        queryFn: async () => {
            const res = await api.get<Store>(`/stores/${storeId}`);
            return res.data;
        }
    });

    // Customer Profile Query
    const { data: customerProfile } = useQuery({
        queryKey: ['customer', storeId, currentUser?.email],
        queryFn: async () => {
            if (!currentUser?.email) return null;
            const res = await api.get(`/stores/${storeId}/customers/profile?email=${currentUser.email}`);
            return res.data;
        },
        enabled: !!currentUser?.email
    });

    const userWishlist = customerProfile?.wishlist || [];

    // Currency Context
    const { currency, setCurrency, convertPrice, rates } = useCurrency();

    // --- Mutations ---
    const createOrderMutation = useMutation({
        mutationFn: async (orderData: any) => {
            const res = await api.post('/orders', orderData);
            return res.data;
        },
        onSuccess: () => {
            setCart([]);
            setIsCartOpen(false);
            showToast('Order placed successfully!', 'success');
            navigate('account');
        },
        onError: () => {
            showToast('Failed to place order', 'error');
        }
    });

    const reviewMutation = useMutation({
        mutationFn: async (reviewData: any) => {
            const res = await api.post('/reviews', reviewData);
            return res.data;
        },
        onSuccess: () => {
            showToast('Review submitted!', 'success');
            queryClient.invalidateQueries({ queryKey: ['store', storeId] });
        }
    });

    if (isStoreLoading || !store) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" size={48} /></div>;
    if (store.settings.maintenanceMode && store.ownerId !== currentUser?.id) return <div className="min-h-screen flex items-center justify-center flex-col p-4 text-center"><Lock size={48} className="mb-4 text-gray-400" /><h1 className="text-3xl font-black mb-2">We'll be back soon</h1><p className="text-gray-500">The store is currently undergoing maintenance.</p></div>;

    const isOwner = currentUser && store.ownerId === currentUser.id;

    const addToCart = (product: Product, quantity: number = 1, selectedVariant?: string) => {
        setCart(prev => {
            const existing = prev.find(p => p.id === product.id);
            if (existing) return prev.map(p => p.id === product.id ? { ...p, quantity: p.quantity + quantity } : p);
            return [...prev, { ...product, quantity, selectedVariant }];
        });
        showToast('Added to cart', 'success');
        setIsCartOpen(true);
    };

    const updateCartQty = (id: string, qty: number) => {
        if (qty <= 0) return removeFromCart(id);
        setCart(prev => prev.map(p => p.id === id ? { ...p, quantity: qty } : p));
    };

    const removeFromCart = (id: string) => {
        setCart(prev => prev.filter(p => p.id !== id));
    };

    const handleCheckout = (note: string, discount: number, discountCode?: string) => {
        if (cart.length === 0) return;
        const orderTotal = cart.reduce((sum, i) => sum + (i.price * i.quantity), 0) + store.settings.shippingFee - discount;

        createOrderMutation.mutate({
            storeId: store.id,
            customer: {
                name: currentUser?.name || 'Guest',
                email: currentUser?.email || 'guest@example.com',
                address: '123 Main St'
            },
            items: cart,
            subtotal: orderTotal + discount - store.settings.shippingFee,
            tax: 0,
            shipping: store.settings.shippingFee,
            discount: discount,
            discountCode,
            customerNotes: note,
            total: Math.max(0, orderTotal)
        });
    };

    const handleWishlist = (productId: string) => {
        if (!currentUser) {
            showToast('Please login to use wishlist', 'error');
            return;
        }
        // Wishlist backend not fully implemented in this iteration
        showToast('Wishlist updated!', 'success');
    };

    const cartSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const freeShippingThreshold = 500; // Mock threshold
    const shippingProgress = Math.min((cartSubtotal / freeShippingThreshold) * 100, 100);

    return (
        <div className={`min-h-screen flex flex-col bg-[#f8f9fa] dark:bg-[#050505] text-gray-900 dark:text-white ${getFontClass(store.settings)}`}>
            {/* Top Announcement Bar */}
            {store.settings.announcementBar && (
                <div className={`bg-gradient-to-r from-${store.themeColor}-600 to-${store.themeColor}-800 text-white text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-center py-2.5 shadow-md z-50 relative`}>
                    <div className="animate-pulse">{store.settings.announcementBar}</div>
                </div>
            )}

            {/* Main Navigation */}
            <nav className="sticky top-0 z-40 bg-white/70 dark:bg-[#0a0a0f]/70 backdrop-blur-2xl border-b border-gray-200/50 dark:border-gray-800/50 transition-all duration-300">
                <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <Link to={`/store/${storeId}`} className="flex items-center gap-3 group">
                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br from-${store.themeColor}-500 to-${store.themeColor}-700 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-${store.themeColor}-500/30 group-hover:scale-110 transition-transform`}>
                                {store.name.charAt(0)}
                            </div>
                            <span className="font-black text-2xl tracking-tight hidden sm:block group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-indigo-500 group-hover:to-purple-500 transition-all">{store.name}</span>
                        </Link>

                        <div className="hidden md:flex items-center gap-8 ml-8">
                            <Link to="catalog" className="text-sm font-bold text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors uppercase tracking-wider relative after:content-[''] after:absolute after:-bottom-2 after:left-0 after:w-0 after:h-0.5 after:bg-indigo-600 after:transition-all hover:after:w-full">Catalog</Link>
                            <Link to="blog" className="text-sm font-bold text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors uppercase tracking-wider relative after:content-[''] after:absolute after:-bottom-2 after:left-0 after:w-0 after:h-0.5 after:bg-indigo-600 after:transition-all hover:after:w-full">Journal</Link>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 sm:gap-5">
                        {/* Multi-Currency Dropdown Premium */}
                        <div className="relative group hidden sm:block">
                            <select className="bg-gray-100 dark:bg-gray-800 text-xs font-bold border border-transparent hover:border-gray-200 dark:hover:border-gray-700 rounded-full px-4 py-2 outline-none cursor-pointer appearance-none shadow-sm transition-all focus:ring-2 focus:ring-indigo-500 pr-8" value={currency} onChange={e => setCurrency(e.target.value)}>
                                {Object.keys(rates).map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-2.5 text-gray-500 pointer-events-none group-hover:text-indigo-500 transition-colors" />
                        </div>

                        <ThemeToggle />

                        <button onClick={() => setIsWishlistOpen(true)} className="p-2.5 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-full transition-all relative">
                            <Heart size={20} />
                            {userWishlist.length > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>}
                        </button>

                        <Link to="account" className="p-2.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-full transition-all">
                            <UserIcon size={20} />
                        </Link>

                        <button onClick={() => setIsCartOpen(true)} className={`relative flex items-center gap-2 px-4 py-2.5 rounded-full font-bold text-sm transition-all shadow-md hover:shadow-lg ${cart.length > 0 ? `bg-${store.themeColor}-600 text-white shadow-${store.themeColor}-500/30 hover:bg-${store.themeColor}-500` : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                            <ShoppingCart size={18} />
                            <span className="hidden sm:inline">Cart</span>
                            {cart.length > 0 && (
                                <span className={`absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center text-[10px] bg-white text-${store.themeColor}-600 dark:bg-black dark:text-${store.themeColor}-400 rounded-full font-black shadow-sm`}>{cart.length}</span>
                            )}
                        </button>
                    </div>
                </div>
            </nav>

            {/* Slide-out Mini Cart Drawer */}
            {isCartOpen && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setIsCartOpen(false)}></div>
                    <div className="relative w-full max-w-md bg-white dark:bg-[#0a0a0f] h-full shadow-2xl flex flex-col transform transition-transform duration-300 translate-x-0 border-l border-gray-200/50 dark:border-gray-800/50">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-[#0a0a0f]/50 backdrop-blur-md">
                            <h2 className="text-2xl font-black flex items-center gap-3"><ShoppingCart size={24} className="text-indigo-500" /> Your Cart</h2>
                            <button onClick={() => setIsCartOpen(false)} className="p-2 bg-white dark:bg-gray-800 rounded-full shadow-sm hover:scale-110 transition-transform text-gray-500 hover:text-gray-900 dark:hover:text-white"><X size={20} /></button>
                        </div>

                        {/* Progressive Free Shipping Bar */}
                        <div className="p-6 bg-indigo-50/50 dark:bg-indigo-900/10 border-b border-gray-100 dark:border-gray-800">
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{shippingProgress >= 100 ? 'You got free shipping!' : `Spend ${convertPrice(freeShippingThreshold - cartSubtotal)} more for free shipping`}</span>
                                {shippingProgress >= 100 && <Truck size={16} className="text-indigo-500" />}
                            </div>
                            <div className="h-2 w-full bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                                <div className={`h-full transition-all duration-1000 ease-out rounded-full ${shippingProgress >= 100 ? 'bg-green-500' : 'bg-gradient-to-r from-indigo-500 to-purple-500'}`} style={{ width: `${shippingProgress}%` }}></div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {cart.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-6">
                                    <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                                        <ShoppingCart size={40} className="text-gray-300 dark:text-gray-600" />
                                    </div>
                                    <p className="font-medium">Your cart is empty.</p>
                                    <button onClick={() => { setIsCartOpen(false); navigate('catalog'); }} className="px-8 py-3 bg-black text-white dark:bg-white dark:text-black rounded-full font-bold uppercase tracking-wider text-sm hover:scale-105 transition-transform">Start Shopping</button>
                                </div>
                            ) : (
                                cart.map(item => (
                                    <div key={item.id} className="flex gap-4 p-4 bg-white dark:bg-[#0f0f13] border border-gray-100 dark:border-gray-800/50 rounded-2xl shadow-sm hover:shadow-md transition-shadow group relative">
                                        <div className="w-24 h-24 bg-gray-100 dark:bg-gray-900 rounded-xl overflow-hidden flex-shrink-0">
                                            <img src={item.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                        </div>
                                        <div className="flex-1 flex flex-col justify-between py-1">
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-bold text-gray-900 dark:text-white leading-tight pr-4">{item.name}</h4>
                                                <button onClick={() => removeFromCart(item.id)} className="text-gray-400 hover:text-red-500 transition-colors absolute top-4 right-4"><X size={16} /></button>
                                            </div>
                                            <div className="text-xs text-gray-500 font-medium">{item.category}</div>
                                            <div className="flex justify-between items-end mt-4">
                                                <span className="font-black text-lg text-indigo-600 dark:text-indigo-400">{convertPrice(item.price)}</span>
                                                <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                                                    <button onClick={() => updateCartQty(item.id, item.quantity - 1)} className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-black dark:hover:text-white hover:bg-white dark:hover:bg-gray-700 rounded transition-all"><Minus size={12} /></button>
                                                    <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                                                    <button onClick={() => updateCartQty(item.id, item.quantity + 1)} className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-black dark:hover:text-white hover:bg-white dark:hover:bg-gray-700 rounded transition-all"><Plus size={12} /></button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {cart.length > 0 && (
                            <div className="p-6 bg-white dark:bg-[#0a0a0f] border-t border-gray-100 dark:border-gray-800 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                                <div className="space-y-3 mb-6">
                                    <div className="flex justify-between text-sm font-medium text-gray-500">
                                        <span>Subtotal</span>
                                        <span className="text-gray-900 dark:text-white font-bold">{convertPrice(cartSubtotal)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm font-medium text-gray-500">
                                        <span>Shipping</span>
                                        <span className="text-gray-900 dark:text-white font-bold">{shippingProgress >= 100 ? 'Free' : convertPrice(store.settings.shippingFee)}</span>
                                    </div>
                                    <div className="h-px w-full bg-gray-100 dark:bg-gray-800 my-4"></div>
                                    <div className="flex justify-between items-end">
                                        <span className="text-lg font-bold">Total</span>
                                        <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{convertPrice(cartSubtotal + (shippingProgress >= 100 ? 0 : store.settings.shippingFee))}</span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <button onClick={() => { setIsCartOpen(false); navigate('cart'); }} className="py-4 border-2 border-gray-200 dark:border-gray-800 rounded-xl font-bold uppercase tracking-wider text-xs hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">View Cart</button>
                                    <button onClick={() => { setIsCartOpen(false); navigate('checkout'); }} className="py-4 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-wider text-xs shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition-colors focus:ring-4 focus:ring-indigo-500/50 outline-none">Checkout</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {isOwner && (
                <div className="fixed bottom-6 right-6 z-50">
                    <button onClick={() => onNavigate(`/store/${storeId}/admin`)} className="flex items-center gap-3 bg-black/90 dark:bg-white/90 backdrop-blur-md text-white dark:text-black px-6 py-4 rounded-full shadow-2xl shadow-black/20 font-black tracking-wider uppercase text-sm hover:scale-110 transition-transform ring-4 ring-black/10 dark:ring-white/10 group"><LayoutDashboard size={18} className="group-hover:rotate-12 transition-transform" /> Admin Panel</button>
                </div>
            )}

            <div className="flex-1 overflow-x-hidden">
                <Routes>
                    <Route index element={<div className="animate-fade-in pb-32">
                        {/* Premium Hero Banner */}
                        <div className={`bg-gradient-to-br from-${store.themeColor}-900 via-${store.themeColor}-800 to-black text-white py-32 lg:py-48 relative overflow-hidden rounded-b-[3rem] sm:rounded-b-[4rem] xl:rounded-b-[5rem] mx-2 sm:mx-4 mt-2 sm:mt-4 shadow-2xl shadow-${store.themeColor}-900/20`}>
                            {/* Decorative Glass Elements */}
                            <div className="absolute top-10 left-10 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
                            <div className="absolute bottom-10 right-10 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl"></div>

                            {store.settings.bannerUrl && (
                                <div className="absolute inset-0 z-0">
                                    <div className="absolute inset-0 bg-black/50 mix-blend-multiply z-10"></div>
                                    <img src={store.settings.bannerUrl} className="w-full h-full object-cover opacity-70 scale-105 animate-slow-pan" />
                                </div>
                            )}
                            <div className="max-w-7xl mx-auto px-6 text-center relative z-20 flex flex-col items-center">
                                <span className={`inline-block px-6 py-2 rounded-full bg-white/10 backdrop-blur-xl text-xs font-black uppercase tracking-[0.3em] mb-8 border border-white/20 shadow-lg`}>Exclusive Collection</span>
                                <h2 className="text-5xl md:text-7xl lg:text-8xl font-black mb-8 tracking-tighter leading-[1.1] drop-shadow-2xl max-w-4xl">{store.description || 'Elevate Your Lifestyle.'}</h2>
                                <p className="text-lg md:text-xl text-gray-300 mb-12 max-w-2xl font-medium tracking-wide">Discover uncompromised quality and exceptional design built exclusively for you.</p>
                                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center backdrop-blur-sm p-2 rounded-full bg-white/5 border border-white/10">
                                    <button onClick={() => navigate('catalog')} className={`bg-white text-black px-10 py-5 font-black uppercase tracking-widest text-sm shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:scale-105 hover:bg-gray-100 transition-all flex items-center gap-3 rounded-full overflow-hidden group relative`}>
                                        <span className="relative z-10">Explore Catalog</span>
                                        <ArrowRight size={18} className="relative z-10 group-hover:translate-x-2 transition-transform" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Premium Featured Categories (Mock UI extension) */}
                        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-24">
                            <div className="text-center mb-16">
                                <h3 className="text-sm font-black text-gray-400 uppercase tracking-[0.3em] mb-3">Curated Selection</h3>
                                <h2 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight">Trending Now</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
                                {store.products.filter(p => p.status === 'ACTIVE').slice(0, 4).map(p => (
                                    <ProductCard
                                        key={p.id}
                                        product={p}
                                        store={store}
                                        isWishlisted={userWishlist.includes(p.id)}
                                        onWishlist={() => handleWishlist(p.id)}
                                        onClick={() => navigate(`product/${p.id}`)}
                                        onAddToCart={(e) => { e.stopPropagation(); addToCart(p); }}
                                        onQuickView={(e) => { e.stopPropagation(); navigate(`product/${p.id}`); }}
                                    />
                                ))}
                            </div>
                            <div className="text-center mt-16">
                                <button onClick={() => navigate('catalog')} className="px-10 py-4 border-2 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white font-black uppercase tracking-widest text-sm hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors rounded-full">View All Products</button>
                            </div>
                        </div>
                    </div>} />
                    <Route path="catalog" element={<CatalogPage store={store} onProductClick={p => navigate(`product/${p.id}`)} addToCart={addToCart} onWishlist={handleWishlist} userWishlist={userWishlist} />} />
                    <Route path="product/:productId" element={<ProductPage store={store} addToCart={addToCart} onWishlist={handleWishlist} isWishlisted={false} />} />
                    <Route path="cart" element={<CartPage cart={cart} updateQty={updateCartQty} remove={removeFromCart} checkout={handleCheckout} store={store} />} />
                    <Route path="checkout" element={<CheckoutPage store={store} />} />
                    <Route path="account" element={<CustomerProfile store={store} userEmail={currentUser?.email || ''} />} />
                    <Route path="track/:orderId" element={<OrderTrackingPage store={store} />} />
                    <Route path="blog" element={<BlogPage store={store} />} />
                    <Route path="blog/:slug" element={<BlogPostPage store={store} />} />
                </Routes>
            </div>

            {/* Improved Premium Footer */}
            <footer className="bg-[#0a0a0f] text-white pt-24 pb-12 border-t border-gray-900 mt-auto">
                <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-20 mb-20">
                        <div className="md:col-span-5">
                            <Link to={`/store/${storeId}`} className="flex items-center gap-3 mb-8 group inline-flex">
                                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br from-${store.themeColor}-500 to-${store.themeColor}-700 flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-${store.themeColor}-500/20`}>
                                    {store.name.charAt(0)}
                                </div>
                                <span className="font-black text-3xl tracking-tight">{store.name}</span>
                            </Link>
                            <p className="text-gray-400 mb-8 max-w-sm text-lg leading-relaxed font-medium">{store.description || 'A premium e-commerce experience curated for those who demand excellence.'}</p>
                            <div className="flex gap-4">
                                {store.settings.socialLinks?.facebook && <a href={store.settings.socialLinks.facebook} className="w-12 h-12 bg-white/5 hover:bg-white/15 hover:scale-110 transition-all rounded-full flex items-center justify-center border border-white/10"><Facebook size={20} /></a>}
                                {store.settings.socialLinks?.instagram && <a href={store.settings.socialLinks.instagram} className="w-12 h-12 bg-white/5 hover:bg-white/15 hover:scale-110 transition-all rounded-full flex items-center justify-center border border-white/10"><Instagram size={20} /></a>}
                                {store.settings.socialLinks?.twitter && <a href={store.settings.socialLinks.twitter} className="w-12 h-12 bg-white/5 hover:bg-white/15 hover:scale-110 transition-all rounded-full flex items-center justify-center border border-white/10"><Twitter size={20} /></a>}
                            </div>
                        </div>
                        <div className="md:col-span-4">
                            <h4 className="font-black text-lg mb-8 uppercase tracking-widest text-gray-300">Newsletter</h4>
                            <p className="text-gray-400 text-sm mb-6 font-medium leading-relaxed">Join our VIP list for exclusive drops, early sale access, and curated edits.</p>
                            <div className="flex bg-white/5 rounded-xl border border-white/10 p-1 focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
                                <input placeholder="Enter your email address" className="bg-transparent border-none px-4 py-3 text-sm flex-1 outline-none text-white placeholder-gray-500" />
                                <button className="bg-white text-black px-6 py-3 rounded-lg text-sm font-black uppercase tracking-wider hover:bg-gray-200 transition-colors shadow-lg">Join</button>
                            </div>
                        </div>
                        <div className="md:col-span-3">
                            <h4 className="font-black text-lg mb-8 uppercase tracking-widest text-gray-300">Navigation</h4>
                            <div className="flex flex-col gap-4 text-gray-400 font-bold">
                                <Link to="catalog" className="hover:text-white transition-colors flex items-center gap-2 group"><ArrowRight size={14} className="opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all text-indigo-500" /> Catalog</Link>
                                <Link to="blog" className="hover:text-white transition-colors flex items-center gap-2 group"><ArrowRight size={14} className="opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all text-indigo-500" /> Journal</Link>
                                <Link to="account" className="hover:text-white transition-colors flex items-center gap-2 group"><ArrowRight size={14} className="opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all text-indigo-500" /> My Account</Link>
                                <Link to="checkout" className="hover:text-white transition-colors flex items-center gap-2 group"><ArrowRight size={14} className="opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all text-indigo-500" /> Shopping Cart</Link>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col md:flex-row justify-between items-center text-gray-600 text-sm border-t border-gray-900 pt-8 font-medium">
                        <div>&copy; {new Date().getFullYear()} {store.name}. All rights reserved.</div>
                        <div className="flex items-center gap-2 mt-4 md:mt-0">Powered by <span className="font-black text-white text-base tracking-tighter shadow-sm flex items-center gap-1"><Zap size={16} className="text-indigo-500 fill-indigo-500" /> ACommerce</span></div>
                    </div>
                </div>
            </footer>
            <React.Suspense fallback={null}>
                <AiChatWidget store={store} />
            </React.Suspense>
        </div>
    );
};
