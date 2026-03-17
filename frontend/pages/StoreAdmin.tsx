import React, { useState, useEffect } from 'react';
import { Store, Order, Customer, ChatSession, DiscountCode, BlogPost, Product, Page, ChatMessage } from '../types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../src/lib/api';
import { useAuth } from '../src/context/AuthContext';
import { generateProductDescription, generateMarketingContent, generateSEOData, generatePriceSuggestion, generateBlogPost, generateRelatedProducts } from '../services/geminiService';
import { ThemeToggle } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import {
    LayoutDashboard, Package, Settings, ArrowLeft, Users, ShoppingCart,
    Plus, Trash2, Search, Sparkles, Loader2, Image as ImageIcon,
    Mail, Megaphone, TrendingUp, DollarSign, Menu, X, Tag, Printer, Download, Lock, Unlock,
    HelpCircle, BookOpen, Clock, AlertTriangle, PenTool, CheckSquare, Square, Inbox, Share2, Copy, QrCode,
    Filter, ChevronDown, ChevronRight, Edit2, Send, MessageSquare, ExternalLink, Save, Instagram, FileText, Eye, Upload, Calendar, Globe, Box, Archive, Map, Printer as PrintIcon, MoreHorizontal, User, BarChart2, Star, Award,
    Facebook, Twitter, Zap, Brain, Activity, Rocket,
    Store as StoreIcon
} from 'lucide-react';
import { StoreSwitcher } from '../components/StoreSwitcher';
import { PlanTier } from '../types';

interface StoreAdminProps {
    storeId: string;
    onNavigate: (path: string) => void;
}

const StoreCreationWizard = React.lazy(() =>
    import('../components/StoreCreationWizard').then((module) => ({ default: module.StoreCreationWizard }))
);

// --- Chart Component ---
const SalesChart: React.FC<{ data: number[] }> = ({ data }) => {
    if (data.length === 0) return <div className="h-40 flex items-center justify-center text-gray-400 text-sm">No sales data yet</div>;

    const max = Math.max(...data, 100);
    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * 100;
        const y = 100 - (val / max) * 100;
        return `${x},${y}`;
    }).join(' ');

    return (
        <div className="h-48 w-full overflow-hidden relative">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                <defs>
                    <linearGradient id="gradient" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                    </linearGradient>
                </defs>
                <path d={`M0,100 ${points} 100,100`} fill="url(#gradient)" className="text-indigo-500" />
                <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" className="text-indigo-600" />
            </svg>
        </div>
    );
};

export const StoreAdmin: React.FC<StoreAdminProps> = ({ storeId, onNavigate }) => {
    // Removed useState for store to rely on useQuery
    const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'orders' | 'customers' | 'marketing' | 'settings' | 'discounts' | 'blog' | 'inbox' | 'pages' | 'abandoned' | 'staff' | 'reviews' | 'autopilot'>('dashboard');
    const [inboxTab, setInboxTab] = useState<'messages' | 'chat'>('chat');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

    const { showToast } = useToast();

    // Analytics State
    const [timeRange, setTimeRange] = useState('7d');

    // Product Management State
    const [productView, setProductView] = useState<'list' | 'edit'>('list');
    const [editingProductId, setEditingProductId] = useState<string | null>(null);
    const [prodForm, setProdForm] = useState<Partial<Product>>({});
    const [prodTab, setProdTab] = useState<'general' | 'pricing' | 'inventory' | 'shipping' | 'seo'>('general');
    const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
    const [isBulkEditing, setIsBulkEditing] = useState(false);
    const [bulkChanges, setBulkChanges] = useState<Record<string, Partial<Product>>>({});

    // Blog State
    const [blogViewMode, setBlogViewMode] = useState<'list' | 'edit'>('list');
    const [blogTopic, setBlogTopic] = useState('');
    const [isGeneratingBlog, setIsGeneratingBlog] = useState(false);
    const [editPostId, setEditPostId] = useState<string | null>(null);
    const [blogPostForm, setBlogPostForm] = useState<Partial<BlogPost>>({});

    // Marketing AI
    const [marketingPrompt, setMarketingPrompt] = useState('');
    const [marketingResult, setMarketingResult] = useState('');
    const [isGeneratingMarketing, setIsGeneratingMarketing] = useState(false);

    // Discount State
    const [newDiscountCode, setNewDiscountCode] = useState('');
    const [newDiscountValue, setNewDiscountValue] = useState('');
    const [newDiscountType, setNewDiscountType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');

    // Customer State
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [customerSearch, setCustomerSearch] = useState('');
    const [customerSort, setCustomerSort] = useState<'spent' | 'orders' | 'recent'>('recent');
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

    // Chat State
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
    const [adminChatInput, setAdminChatInput] = useState('');

    // Advanced AI Features State
    const [aiSentimentInput, setAiSentimentInput] = useState('');
    const [aiSentimentResult, setAiSentimentResult] = useState<any>(null);
    const [isAnalyzingSentiment, setIsAnalyzingSentiment] = useState(false);
    
    const [aiTranslateText, setAiTranslateText] = useState('');
    const [aiTargetLang, setAiTargetLang] = useState('Spanish');
    const [aiTranslateResult, setAiTranslateResult] = useState('');
    const [isTranslating, setIsTranslating] = useState(false);
    
    const [aiSegmentationResult, setAiSegmentationResult] = useState<any>(null);
    const [isSegmenting, setIsSegmenting] = useState(false);
    
    const [aiRecommendationResult, setAiRecommendationResult] = useState<any>(null);
    const [isGeneratingRecs, setIsGeneratingRecs] = useState(false);

    // Pages State
    const [pageViewMode, setPageViewMode] = useState<'list' | 'edit'>('list');
    const [editingPageId, setEditingPageId] = useState<string | null>(null);
    const [pageForm, setPageForm] = useState<Partial<Page>>({});

    // Settings State
    const [settingsTab, setSettingsTab] = useState<'general' | 'payments' | 'shipping' | 'social' | 'loyalty' | 'theme'>('general');

    // Order Details Modal
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [orderSearch, setOrderSearch] = useState('');

    // Multi-store Management
    const [isWizardOpen, setIsWizardOpen] = useState(false);


    // Filter State
    const [productSearch, setProductSearch] = useState('');
    const [productCategoryFilter, setProductCategoryFilter] = useState('All');
    const [productStatusFilter, setProductStatusFilter] = useState('All');
    const [orderStatusFilter, setOrderStatusFilter] = useState('All');
    const [orderFulfillmentFilter, setOrderFulfillmentFilter] = useState('All');



    const { user } = useAuth();
    const queryClient = useQueryClient();

    // --- Main Store Query ---
    const {
        data: store,
        isLoading,
        isError: isStoreError
    } = useQuery({
        queryKey: ['storeAdmin', storeId],
        queryFn: async () => {
            const res = await api.get(`/stores/${storeId}/admin`);
            return res.data as Store;
        },
        enabled: !!user
    });

    const { data: abandonedCarts = [] } = useQuery({
        queryKey: ['abandonedCarts', storeId],
        queryFn: async () => {
            const res = await api.get(`/cart/${storeId}/abandoned`);
            return res.data as any[];
        },
        enabled: !!user
    });

    const { data: myStores = [] } = useQuery({
        queryKey: ['myStores', user?.id],
        queryFn: async () => {
            const res = await api.get<Store[]>('/stores/my/all');
            return res.data;
        },
        enabled: !!user
    });

    const loadStore = () => {
        queryClient.invalidateQueries({ queryKey: ['store', storeId] });
        queryClient.invalidateQueries({ queryKey: ['storeAdmin', storeId] });
        queryClient.invalidateQueries({ queryKey: ['abandonedCarts', storeId] });
    };

    // --- Mutations ---
    const createProductMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await api.post(`/stores/${storeId}/products`, data);
            return res.data;
        },
        onSuccess: () => {
            showToast('Product created', 'success');
            loadStore();
            setProductView('list');
        },
        onError: () => showToast('Failed to create product', 'error')
    });

    const updateProductMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => {
            const res = await api.patch(`/stores/${storeId}/products/${id}`, data);
            return res.data;
        },
        onSuccess: () => {
            showToast('Product updated', 'success');
            loadStore();
            setProductView('list');
        },
        onError: () => showToast('Failed to update product', 'error')
    });

    const deleteProductMutation = useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/stores/${storeId}/products/${id}`);
        },
        onSuccess: () => {
            showToast('Product deleted', 'success');
            loadStore();
        }
    });

    const duplicateProductMutation = useMutation({
        mutationFn: async (original: Product) => {
            const { id, ...data } = original;
            const res = await api.post(`/stores/${storeId}/products`, { ...data, name: `${data.name} (Copy)` });
            return res.data;
        },
        onSuccess: () => {
            showToast('Product duplicated', 'success');
            loadStore();
        }
    });

    const handleBulkUpdate = async () => {
        if (Object.keys(bulkChanges).length === 0) {
            setIsBulkEditing(false);
            return;
        }
        const promises = Object.entries(bulkChanges).map(([id, changes]) =>
            updateProductMutation.mutateAsync({ id, data: changes })
        );
        try {
            await Promise.all(promises);
            showToast('Bulk update successful', 'success');
            setBulkChanges({});
            setIsBulkEditing(false);
        } catch (e) {
            showToast('Some updates failed', 'error');
        }
    };

    // --- Order Mutations ---
    const updateOrderMutation = useMutation({
        mutationFn: async ({ orderId, status }: { orderId: string, status: any }) => {
            await api.patch(`/orders/${storeId}/${orderId}`, status);
        },
        onSuccess: () => {
            showToast('Order updated', 'success');
            loadStore();
        }
    });

    // --- Page Mutations ---
    const createPageMutation = useMutation({
        mutationFn: async (data: any) => {
            // Mock API or implement endpoint
            // await api.post(`/stores/${storeId}/pages`, data);
            showToast('Pages API not ready', 'info');
        },
        onSuccess: loadStore
    });
    const updatePageMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string, data: any }) => {
            // await api.patch(`/stores/${storeId}/pages/${id}`, data);
            showToast('Pages API not ready', 'info');
        },
        onSuccess: loadStore
    });
    const deletePageMutation = useMutation({
        mutationFn: async (id: string) => {
            // await api.delete(`/stores/${storeId}/pages/${id}`);
            showToast('Pages API not ready', 'info');
        },
        onSuccess: loadStore
    });

    // --- Discount Mutations ---
    const createDiscountMutation = useMutation({
        mutationFn: async (data: any) => {
            await api.post(`/stores/${storeId}/discounts`, data);
            // showToast('Discounts API ready', 'info');
        },
        onSuccess: loadStore
    });
    const deleteDiscountMutation = useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/stores/${storeId}/discounts/${id}`);
            // showToast('Discounts API ready', 'info');
        },
        onSuccess: loadStore
    });



    // --- Settings & Chat Mutations ---
    const updateStoreMutation = useMutation({
        mutationFn: async (data: any) => {
            // For now assume update store settings defaults to mock or generic update
            // await api.patch(`/stores/${storeId}`, data); 
            showToast('Settings update not fully wired', 'info');
        },
        onSuccess: loadStore
    });

    const sendChatMutation = useMutation({
        mutationFn: async ({ chatId, message }: { chatId: string, message: string }) => {
            // await api.post(`/stores/${storeId}/chat/${chatId}`, { message });
            showToast('Chat API not ready', 'info');
        },
        onSuccess: loadStore
    });

    const markChatReadMutation = useMutation({
        mutationFn: async (chatId: string) => {
            // await api.post(`/stores/${storeId}/chat/${chatId}/read`);
        },
        onSuccess: loadStore
    });

    const handleInviteStaff = async () => {
        const email = window.prompt('Enter staff email to invite:');
        if (!email) return;
        try {
            await api.post(`/stores/${storeId}/invites`, { email });
            showToast('Invite sent successfully', 'success');
        } catch (error) {
            showToast('Failed to send invite', 'error');
        }
    };

    // --- Export Helpers ---
    const exportStoreData = (s: Store) => {
        const data = JSON.stringify(s, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `store-${s.name}-${new Date().toISOString()}.json`;
        a.click();
    };

    const exportCustomers = (s: Store) => {
        const headers = ['ID', 'Name', 'Email', 'Orders', 'Spent'];
        const rows = s.customers.map(c => [c.id, c.name, c.email, c.ordersCount, c.totalSpent]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `customers-${s.name}.csv`;
        a.click();
    };

    if (isLoading) return <div className="min-h-screen flex items-center justify-center dark:bg-gray-950 dark:text-white text-gray-900 bg-white"><Loader2 className="animate-spin mr-2" /> Loading store...</div>;
    if (isStoreError || !store) return <div className="min-h-screen flex items-center justify-center dark:bg-gray-950 dark:text-white text-gray-900 bg-white">Failed to load store admin data.</div>;

    // --- Dashboard Metrics ---
    const totalRevenue = store.orders.reduce((sum, o) => sum + o.total, 0);
    const totalOrders = store.orders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const recentSalesData = [120, 200, 150, 300, 250, 400, 350]; // Simulated for UI
    const fulfillmentRate = totalOrders > 0 ? (store.orders.filter(o => o.fulfillmentStatus === 'FULFILLED').length / totalOrders) * 100 : 0;

    // --- Product Handlers ---
    const handleEditProduct = (p: Product) => {
        setEditingProductId(p.id);
        setProdForm({ ...p });
        setProdTab('general');
        setProductView('edit');
    };

    const handleCreateProduct = () => {
        setEditingProductId(null);
        setProdForm({
            name: '', description: '', price: 0, stock: 0, status: 'ACTIVE',
            images: [], category: '', variants: [], trackQuantity: true,
            taxable: true, isDigital: false
        });
        setProdTab('general');
        setProductView('edit');
    };

    const handleSaveProduct = () => {
        if (!prodForm.name || prodForm.price === undefined) {
            showToast('Name and Price are required', 'error');
            return;
        }

        const productData: any = {
            ...prodForm,
            imageUrl: prodForm.images && prodForm.images.length > 0 ? prodForm.images[0] : '',
            price: Number(prodForm.price),
            stock: Number(prodForm.stock),
            weight: prodForm.weight ? Number(prodForm.weight) : undefined,
            costPerItem: prodForm.costPerItem ? Number(prodForm.costPerItem) : undefined,
            compareAtPrice: prodForm.compareAtPrice ? Number(prodForm.compareAtPrice) : undefined,
        };

        if (editingProductId) {
            updateProductMutation.mutate({ id: editingProductId, data: productData });
        } else {
            createProductMutation.mutate(productData);
        }
    };

    const handleGenerateProductDesc = async () => {
        if (!prodForm.name) return;
        setIsGeneratingDesc(true);
        const desc = await generateProductDescription(prodForm.name, prodForm.category || '');
        setProdForm(prev => ({ ...prev, description: desc }));
        setIsGeneratingDesc(false);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setProdForm(prev => ({
                    ...prev,
                    images: [...(prev.images || []), reader.result as string]
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    // --- Order Handlers ---
    const handleUpdateOrderStatus = (id: string, updates: Partial<Order>) => {
        updateOrderMutation.mutate({ orderId: id, status: updates });
        if (selectedOrder && selectedOrder.id === id) {
            setSelectedOrder(prev => prev ? ({ ...prev, ...updates }) : null);
        }
    };

    const filteredOrders = store.orders.filter(o =>
        (o.id.toLowerCase().includes(orderSearch.toLowerCase()) ||
            o.customer.name.toLowerCase().includes(orderSearch.toLowerCase()) ||
            o.customer.email.toLowerCase().includes(orderSearch.toLowerCase())) &&
        (orderStatusFilter === 'All' || o.status === orderStatusFilter) &&
        (orderFulfillmentFilter === 'All' || o.fulfillmentStatus === orderFulfillmentFilter)
    );

    const filteredProducts = store.products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
            p.vendor.toLowerCase().includes(productSearch.toLowerCase());
        const matchesCategory = productCategoryFilter === 'All' || p.category === productCategoryFilter;
        const matchesStatus = productStatusFilter === 'All' || p.status === productStatusFilter;
        return matchesSearch && matchesCategory && matchesStatus;
    });

    // --- Page Handlers ---
    const handleEditPage = (page: Page) => {
        setEditingPageId(page.id);
        setPageForm({ ...page });
        setPageViewMode('edit');
    };

    const handleCreatePage = () => {
        setEditingPageId(null);
        setPageForm({ title: '', content: '', slug: '', isVisible: true });
        setPageViewMode('edit');
    };

    const handleSavePage = () => {
        if (!pageForm.title || !pageForm.content) {
            showToast('Title and Content are required', 'error');
            return;
        }
        const pageData: any = {
            ...pageForm,
            slug: pageForm.slug || pageForm.title.toLowerCase().replace(/\s+/g, '-')
        };

        if (editingPageId) {
            updatePageMutation.mutate({ id: editingPageId, data: pageData });
        } else {
            createPageMutation.mutate(pageData);
        }
        setPageViewMode('list');
    };

    // --- Blog Mutations ---
    const createBlogMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await api.post(`/stores/${storeId}/blog`, data);
            return res.data;
        },
        onSuccess: () => {
            showToast('Blog post created', 'success');
            loadStore();
        },
        onError: () => showToast('Failed to create blog post', 'error')
    });




    const updateBlogMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string, data: any }) => {
            const res = await api.patch(`/stores/${storeId}/blog/${id}`, data);
            return res.data;
        },
        onSuccess: () => {
            showToast('Blog post updated', 'success');
            loadStore();
        },
        onError: () => showToast('Failed to update blog post', 'error')
    });

    const deleteBlogMutation = useMutation({
        mutationFn: async (id: string) => {
            throw new Error('Blog API not available');
        },
        onError: () => showToast('Blog API not ready', 'info')
    });

    // --- Blog Handlers ---
    const handleCreateBlogPost = () => {
        setEditPostId(null);
        setBlogPostForm({
            title: '',
            content: '',
            status: 'DRAFT',
            tags: [],
            date: Date.now(),
            author: user?.name || 'Admin',
            views: 0,
            slug: ''
        });
        setBlogViewMode('edit');
    };

    const handleEditBlogPost = (post: BlogPost) => {
        setEditPostId(post.id);
        setBlogPostForm({ ...post });
        setBlogViewMode('edit');
    };

    const handleSaveBlogPost = () => {
        if (!blogPostForm.title || !blogPostForm.content) {
            showToast('Title and Content are required', 'error');
            return;
        }

        const postData = {
            ...blogPostForm,
            slug: blogPostForm.slug || blogPostForm.title.toLowerCase().replace(/\s+/g, '-'),
            updatedAt: Date.now()
        };

        if (editPostId) {
            updateBlogMutation.mutate({ id: editPostId, data: postData });
        } else {
            createBlogMutation.mutate(postData);
        }
        setBlogViewMode('list');
    };

    // --- Discount Handlers ---
    const handleCreateDiscount = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDiscountCode || !newDiscountValue) return;
        createDiscountMutation.mutate({
            code: newDiscountCode.toUpperCase(),
            value: Number(newDiscountValue),
            type: newDiscountType,
            active: true
        });
        setNewDiscountCode('');
        setNewDiscountValue('');
    };

    // --- Marketing AI ---
    const handleGenerateMarketing = async (type: 'email' | 'social') => {
        setIsGeneratingMarketing(true);
        const res = await generateMarketingContent(type, marketingPrompt || store.name);
        setMarketingResult(res);
        setIsGeneratingMarketing(false);
    };

    // --- Chat Handlers ---
    const handleSendChat = (e: React.FormEvent) => {
        e.preventDefault();
        if (!adminChatInput || !selectedChatId) return;
        sendChatMutation.mutate({ chatId: selectedChatId, message: adminChatInput });
        setAdminChatInput('');
    };

    // --- Advanced AI Handlers ---
    const handleAnalyzeSentiment = async () => {
        if (!aiSentimentInput) return;
        setIsAnalyzingSentiment(true);
        try {
            const res = await api.post('/ai/sentiment', { content: aiSentimentInput });
            setAiSentimentResult(res.data);
            showToast('Sentiment analysis complete', 'success');
        } catch (error) {
            showToast('Analysis failed', 'error');
        } finally {
            setIsAnalyzingSentiment(false);
        }
    };

    const handleTranslate = async () => {
        if (!aiTranslateText) return;
        setIsTranslating(true);
        try {
            const res = await api.post('/ai/translate', { 
                text: aiTranslateText, 
                targetLanguage: aiTargetLang 
            });
            setAiTranslateResult(res.data.translatedText);
            showToast('Translation complete', 'success');
        } catch (error) {
            showToast('Translation failed', 'error');
        } finally {
            setIsTranslating(false);
        }
    };

    const handleSegmentCustomers = async () => {
        setIsSegmenting(true);
        try {
            const res = await api.post('/ai/segmentation', { storeId });
            setAiSegmentationResult(res.data);
            showToast('Customer segmentation complete', 'success');
        } catch (error) {
            showToast('Segmentation failed', 'error');
        } finally {
            setIsSegmenting(false);
        }
    };

    const handleGetRecommendations = async () => {
        setIsGeneratingRecs(true);
        try {
            const res = await api.post('/ai/recommendations', { 
                categories: Array.from(new Set(store.products.map(p => p.category))),
                limit: 5
            });
            setAiRecommendationResult(res.data);
            showToast('Recommendations generated', 'success');
        } catch (error) {
            showToast('Failed to generate recommendations', 'error');
        } finally {
            setIsGeneratingRecs(false);
        }
    };

    const handleSaveSettings = (updates: Partial<typeof store.settings>) => {
        updateStoreMutation.mutate({ settings: { ...store.settings, ...updates } });
    };

    // --- Blog Handlers ---
    const handleSaveBlog = () => {
        if (!blogPostForm.title || !blogPostForm.content) return;
        const postData = { ...blogPostForm, tags: typeof blogPostForm.tags === 'string' ? (blogPostForm.tags as string).split(',').map(t => t.trim()) : blogPostForm.tags } as any;

        if (editPostId) {
            updateBlogMutation.mutate({ id: editPostId, data: postData });
        } else {
            createBlogMutation.mutate(postData);
        }
        setBlogViewMode('list');
    };

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-950 font-sans transition-colors duration-300 overflow-hidden">
            {/* Sidebar */}
            <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transform transition-transform duration-300 lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col`}>
                <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex justify-between items-center mb-6">
                        <button onClick={() => onNavigate('/')} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors text-xs font-black uppercase tracking-widest">
                            <ArrowLeft size={14} /> Hub
                        </button>
                        <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-gray-500"><X size={20} /></button>
                    </div>
                    
                    <StoreSwitcher 
                        stores={myStores}
                        activeStoreId={storeId}
                        onSelect={(id) => onNavigate(`/store/${id}/admin`)}
                        onCreateNew={() => setIsWizardOpen(true)}
                    />
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {[
                        { id: 'dashboard', icon: LayoutDashboard, label: 'Overview' },
                        { id: 'orders', icon: ShoppingCart, label: 'Orders', badge: store.orders?.filter(o => o.status === 'PENDING').length },
                        { id: 'products', icon: Package, label: 'Products' },
                        { id: 'customers', icon: Users, label: 'Customers' },
                        { id: 'inbox', icon: Inbox, label: 'Inbox & Chat', badge: (store.messages?.filter(m => !m.read).length || 0) + (store.chatSessions?.reduce((acc, s) => acc + s.unreadAdmin, 0) || 0) > 0 ? (store.messages?.filter(m => !m.read).length || 0) + (store.chatSessions?.reduce((acc, s) => acc + s.unreadAdmin, 0) || 0) : undefined },
                        { id: 'discounts', icon: Tag, label: 'Discounts' },
                        { id: 'pages', icon: FileText, label: 'Pages' },
                        { id: 'blog', icon: BookOpen, label: 'Blog & Content' },
                        { id: 'reviews', icon: Star, label: 'Reviews' },
                        { id: 'marketing', icon: Megaphone, label: 'AI Marketing' },
                        { id: 'autopilot', icon: Rocket, label: 'Auto Pilot' },
                        { id: 'abandoned', icon: ShoppingCart, label: 'Abandoned Carts' },
                        { id: 'settings', icon: Settings, label: 'Settings' },
                        { id: 'staff', icon: Users, label: 'Staff' }
                    ].map(item => (
                        <button
                            key={item.id}
                            onClick={() => { setActiveTab(item.id as any); setIsSidebarOpen(false); }}
                            className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-200 font-medium text-sm ${activeTab === item.id
                                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-md'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <item.icon size={18} />
                                <span>{item.label}</span>
                            </div>
                            {item.badge ? (
                                <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{item.badge}</span>
                            ) : null}
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-gray-100 dark:border-gray-800">
                    <ThemeToggle />
                    <button
                        onClick={() => onNavigate(`/store/${store.id}`)}
                        className="mt-3 w-full flex items-center justify-center gap-2 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white py-3 rounded-xl text-sm font-bold border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-700 transition-colors"
                    >
                        View Storefront <ArrowLeft className="rotate-180" size={14} />
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950 scroll-smooth">
                {/* Mobile Header */}
                <div className="lg:hidden bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between sticky top-0 z-30">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsSidebarOpen(true)} className="text-gray-600 dark:text-gray-300"><Menu /></button>
                        <h1 className="font-bold text-gray-900 dark:text-white text-lg">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h1>
                    </div>
                    <ThemeToggle />
                </div>

                <div className="p-4 md:p-8 max-w-7xl mx-auto h-full flex flex-col text-gray-900 dark:text-white">

                    {/* Dashboard Tab */}
                    {activeTab === 'dashboard' && (
                        <div className="animate-fade-in space-y-8">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Store Overview</h1>
                                    <p className="text-gray-500 dark:text-gray-400 text-sm">Here's what's happening in your store today.</p>
                                </div>
                                <div className="flex gap-2">
                                    <select className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm">
                                        <option>Last 7 Days</option>
                                        <option>Last 30 Days</option>
                                        <option>This Year</option>
                                    </select>
                                    <button onClick={() => exportStoreData(store)} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
                                        <Download size={16} /> Export
                                    </button>
                                </div>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                                {[
                                    { label: 'Total Revenue', val: `$${totalRevenue.toFixed(2)}`, icon: DollarSign, color: 'green', change: '+12%' },
                                    { label: 'Total Orders', val: totalOrders, icon: ShoppingCart, color: 'blue', change: '+5%' },
                                    { label: 'Avg Order Value', val: `$${avgOrderValue.toFixed(2)}`, icon: TrendingUp, color: 'purple', change: '0%' },
                                    { label: 'Fulfillment Rate', val: `${fulfillmentRate.toFixed(0)}%`, icon: Box, color: 'orange', change: '+2%' }
                                ].map((stat, i) => (
                                    <div key={i} className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className={`p-2.5 rounded-xl bg-${stat.color}-50 dark:bg-${stat.color}-900/20 text-${stat.color}-600 dark:text-${stat.color}-400`}>
                                                <stat.icon size={20} />
                                            </div>
                                            <span className={`text-xs font-bold px-2 py-1 rounded-full bg-${stat.color}-50 dark:bg-${stat.color}-900/30 text-${stat.color}-600 dark:text-${stat.color}-400`}>{stat.change}</span>
                                        </div>
                                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.label}</h3>
                                        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stat.val}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Low Stock Alerts */}
                            {store.products?.filter(p => p.trackQuantity && p.stock <= 5).length > 0 && (
                                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6">
                                    <h3 className="text-red-700 dark:text-red-400 font-bold mb-4 flex items-center gap-2"><AlertTriangle size={20} /> Low Stock Alerts</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {store.products.filter(p => p.trackQuantity && p.stock <= 5).map(p => (
                                            <div key={p.id} className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-red-100 dark:border-red-900/50 flex items-center gap-4">
                                                <img src={p.imageUrl} className="w-12 h-12 rounded-lg object-cover" />
                                                <div>
                                                    <p className="font-bold text-sm">{p.name}</p>
                                                    <p className="text-xs text-red-500 font-bold">{p.stock} remaining</p>
                                                </div>
                                                <button onClick={() => { setEditingProductId(p.id); setProductView('edit'); setActiveTab('products'); }} className="ml-auto text-xs font-bold text-indigo-600 hover:underline">Restock</button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Sales Chart */}
                                <div className="lg:col-span-2 bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
                                    <h3 className="font-bold text-lg mb-6">Sales Performance</h3>
                                    <SalesChart data={recentSalesData} />
                                </div>

                                {/* Top Products */}
                                <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
                                    <h3 className="font-bold text-lg mb-4">Top Products</h3>
                                    <div className="space-y-4">
                                        {store.products.slice(0, 5).map((p, i) => (
                                            <div key={p.id} className="flex items-center gap-3">
                                                <span className="font-bold text-gray-400 w-4">{i + 1}</span>
                                                <img src={p.imageUrl} className="w-10 h-10 rounded-lg object-cover bg-gray-100" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-sm truncate">{p.name}</p>
                                                    <p className="text-xs text-gray-500">{p.stock} in stock</p>
                                                </div>
                                                <span className="text-sm font-bold">${p.price}</span>
                                            </div>
                                        ))}
                                        {store.products.length === 0 && <p className="text-gray-500 text-sm">No products yet.</p>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Product Management Tab */}
                    {activeTab === 'products' && (
                        <div className="animate-fade-in h-full flex flex-col">
                            {productView === 'list' ? (
                                <>
                                    <div className="flex flex-col gap-4 mb-6">
                                        <div className="flex justify-between items-center">
                                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Products</h1>
                                            <div className="flex gap-2">
                                                {isBulkEditing ? (
                                                    <>
                                                        <button onClick={() => { setIsBulkEditing(false); setBulkChanges({}); }} className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">Cancel</button>
                                                        <button onClick={handleBulkUpdate} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700">Save Changes</button>
                                                    </>
                                                ) : (
                                                    <button onClick={() => setIsBulkEditing(true)} className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800">
                                                        <Edit2 size={16} /> Bulk Edit
                                                    </button>
                                                )}
                                                <button onClick={handleCreateProduct} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 flex items-center gap-2">
                                                    <Plus size={18} /> Add Product
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-4">
                                            <div className="relative flex-1 min-w-[200px]">
                                                <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
                                                <input
                                                    className="w-full pl-10 p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl"
                                                    placeholder="Search products..."
                                                    value={productSearch}
                                                    onChange={e => setProductSearch(e.target.value)}
                                                />
                                            </div>
                                            <select
                                                className="p-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900"
                                                value={productCategoryFilter}
                                                onChange={e => setProductCategoryFilter(e.target.value)}
                                            >
                                                <option value="All">All Categories</option>
                                                {Array.from(new Set(store.products.map(p => p.category))).map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                            <select
                                                className="p-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900"
                                                value={productStatusFilter}
                                                onChange={e => setProductStatusFilter(e.target.value)}
                                            >
                                                <option value="All">All Status</option>
                                                <option value="ACTIVE">Active</option>
                                                <option value="DRAFT">Draft</option>
                                                <option value="ARCHIVED">Archived</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
                                        <table className="w-full text-left">
                                            <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                                                <tr>
                                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Product</th>
                                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Inventory</th>
                                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Vendor</th>
                                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                                {filteredProducts.map(p => (
                                                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                        <td className="px-6 py-4 flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded bg-gray-100 overflow-hidden"><img src={p.imageUrl} className="w-full h-full object-cover" /></div>
                                                            <span className="font-bold text-gray-900 dark:text-white">{p.name}</span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-2 py-1 rounded text-xs font-bold ${p.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{p.status || 'ACTIVE'}</span>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm">
                                                            {isBulkEditing ? (
                                                                <input
                                                                    type="number"
                                                                    className="w-20 p-1 border border-gray-300 rounded"
                                                                    value={bulkChanges[p.id]?.stock ?? p.stock}
                                                                    onChange={e => setBulkChanges({ ...bulkChanges, [p.id]: { ...bulkChanges[p.id], stock: Number(e.target.value) } })}
                                                                />
                                                            ) : (
                                                                <span className={p.stock <= 0 ? 'text-red-500 font-bold' : ''}>{p.stock} in stock</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm font-bold">
                                                            {isBulkEditing ? (
                                                                <input
                                                                    type="number"
                                                                    className="w-20 p-1 border border-gray-300 rounded"
                                                                    value={bulkChanges[p.id]?.price ?? p.price}
                                                                    onChange={e => setBulkChanges({ ...bulkChanges, [p.id]: { ...bulkChanges[p.id], price: Number(e.target.value) } })}
                                                                />
                                                            ) : (
                                                                <span>${p.price}</span>
                                                            )}
                                                        </td>

                                                        <td className="px-6 py-4 text-right">
                                                            <div className="flex justify-end gap-2">
                                                                <button onClick={() => duplicateProductMutation.mutate(p)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-500" title="Duplicate"><Copy size={16} /></button>
                                                                <button onClick={() => handleEditProduct(p)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-blue-500"><Edit2 size={16} /></button>
                                                                <button onClick={() => { if (confirm('Delete?')) deleteProductMutation.mutate(p.id); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-red-500"><Trash2 size={16} /></button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            ) : (
                                <div className="flex-1 overflow-hidden flex flex-col">
                                    {/* Product Editor Header */}
                                    <div className="flex justify-between items-center mb-6">
                                        <button onClick={() => setProductView('list')} className="flex items-center gap-2 text-gray-500 font-bold hover:text-gray-900"><ArrowLeft size={18} /> Back</button>
                                        <button onClick={handleSaveProduct} className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 flex items-center gap-2"><Save size={18} /> Save Product</button>
                                    </div>

                                    <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20">
                                        {/* Main Content */}
                                        <div className="lg:col-span-2 space-y-6">
                                            {/* Title & Desc */}
                                            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
                                                <div className="mb-4">
                                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Title</label>
                                                    <input className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-transparent text-xl font-bold" value={prodForm.name} onChange={e => setProdForm({ ...prodForm, name: e.target.value })} placeholder="Short Sleeve T-Shirt" />
                                                </div>
                                                <div className="relative">
                                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Description</label>
                                                    <textarea rows={6} className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-transparent text-sm" value={prodForm.description} onChange={e => setProdForm({ ...prodForm, description: e.target.value })} />
                                                    <button onClick={handleGenerateProductDesc} disabled={isGeneratingDesc} className="absolute top-8 right-2 p-1 bg-indigo-50 text-indigo-600 rounded text-xs font-bold flex items-center gap-1">{isGeneratingDesc ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} AI Write</button>
                                                </div>
                                            </div>

                                            {/* Media */}
                                            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
                                                <h3 className="font-bold mb-4">Media</h3>
                                                <div className="grid grid-cols-4 gap-4">
                                                    {prodForm.images?.map((img, i) => (
                                                        <div key={i} className="aspect-square rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 relative group">
                                                            <img src={img} className="w-full h-full object-cover" />
                                                            <button onClick={() => setProdForm(p => ({ ...p, images: p.images?.filter((_, idx) => idx !== i) }))} className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"><X size={12} /></button>
                                                        </div>
                                                    ))}
                                                    <label className="aspect-square rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 transition-colors">
                                                        <Upload size={24} className="text-gray-400 mb-2" />
                                                        <span className="text-xs font-bold text-gray-500">Add Image</span>
                                                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                                    </label>
                                                </div>
                                            </div>

                                            {/* Pricing */}
                                            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
                                                <h3 className="font-bold mb-4">Pricing</h3>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Price</label>
                                                        <div className="relative"><span className="absolute left-3 top-2.5 text-gray-500">$</span><input type="number" className="w-full pl-6 p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent" value={prodForm.price} onChange={e => setProdForm({ ...prodForm, price: Number(e.target.value) })} /></div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Compare-at Price</label>
                                                        <div className="relative"><span className="absolute left-3 top-2.5 text-gray-500">$</span><input type="number" className="w-full pl-6 p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent" value={prodForm.compareAtPrice} onChange={e => setProdForm({ ...prodForm, compareAtPrice: Number(e.target.value) })} /></div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Cost per Item</label>
                                                        <div className="relative"><span className="absolute left-3 top-2.5 text-gray-500">$</span><input type="number" className="w-full pl-6 p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent" value={prodForm.costPerItem} onChange={e => setProdForm({ ...prodForm, costPerItem: Number(e.target.value) })} /></div>
                                                        {prodForm.price && prodForm.costPerItem && (
                                                            <p className="text-xs text-gray-500 mt-1">Margin: {((1 - (prodForm.costPerItem / prodForm.price)) * 100).toFixed(0)}% Profit: ${prodForm.price - prodForm.costPerItem}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="mt-4 flex items-center gap-2">
                                                    <input type="checkbox" checked={prodForm.taxable} onChange={e => setProdForm({ ...prodForm, taxable: e.target.checked })} className="rounded text-indigo-600" />
                                                    <label className="text-sm font-medium">Charge tax on this product</label>
                                                </div>
                                            </div>

                                            {/* Inventory */}
                                            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
                                                <h3 className="font-bold mb-4">Inventory</h3>
                                                <div className="grid grid-cols-2 gap-4 mb-4">
                                                    <div>
                                                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">SKU (Stock Keeping Unit)</label>
                                                        <input className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent" value={prodForm.sku || ''} onChange={e => setProdForm({ ...prodForm, sku: e.target.value })} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Barcode (ISBN, UPC, GTIN)</label>
                                                        <input className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent" value={prodForm.barcode || ''} onChange={e => setProdForm({ ...prodForm, barcode: e.target.value })} />
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 mb-4">
                                                    <input type="checkbox" checked={prodForm.trackQuantity} onChange={e => setProdForm({ ...prodForm, trackQuantity: e.target.checked })} className="rounded text-indigo-600" />
                                                    <label className="text-sm font-medium">Track quantity</label>
                                                </div>
                                                {prodForm.trackQuantity && (
                                                    <div>
                                                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Quantity</label>
                                                        <input type="number" className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent" value={prodForm.stock} onChange={e => setProdForm({ ...prodForm, stock: Number(e.target.value) })} />
                                                        <div className="mt-2 flex items-center gap-2">
                                                            <input type="checkbox" checked={prodForm.continueSellingOutOfStock} onChange={e => setProdForm({ ...prodForm, continueSellingOutOfStock: e.target.checked })} className="rounded text-indigo-600" />
                                                            <label className="text-sm font-medium text-gray-500">Continue selling when out of stock</label>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Shipping */}
                                            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
                                                <h3 className="font-bold mb-4">Shipping</h3>
                                                <div className="flex items-center gap-2 mb-4">
                                                    <input type="checkbox" checked={!prodForm.isDigital} onChange={e => setProdForm({ ...prodForm, isDigital: !e.target.checked })} className="rounded text-indigo-600" />
                                                    <label className="text-sm font-medium">This is a physical product</label>
                                                </div>
                                                {prodForm.isDigital && (
                                                    <div className="mb-4">
                                                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Digital File Link</label>
                                                        <input className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent" placeholder="https://example.com/file.zip" value={prodForm.digitalFileUrl || ''} onChange={e => setProdForm({ ...prodForm, digitalFileUrl: e.target.value })} />
                                                    </div>
                                                )}
                                                {!prodForm.isDigital && (
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Weight</label>
                                                            <input type="number" className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent" value={prodForm.weight || ''} onChange={e => setProdForm({ ...prodForm, weight: Number(e.target.value) })} />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Unit</label>
                                                            <select className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent" value={prodForm.weightUnit || 'kg'} onChange={e => setProdForm({ ...prodForm, weightUnit: e.target.value as any })}>
                                                                <option value="kg">kg</option>
                                                                <option value="lb">lb</option>
                                                                <option value="oz">oz</option>
                                                                <option value="g">g</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* AI Related Products */}
                                            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
                                                <h3 className="font-bold mb-4 flex items-center gap-2"><Sparkles className="text-indigo-600" size={18} /> AI Related Products</h3>
                                                <p className="text-sm text-gray-500 mb-4">Generate related product suggestions to improve cross-selling.</p>

                                                <div className="flex flex-wrap gap-2 mb-4">
                                                    {prodForm.relatedProducts?.map((rp, i) => (
                                                        <div key={i} className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded-full text-sm font-bold flex items-center gap-2">
                                                            {rp}
                                                            <button onClick={() => setProdForm(prev => ({ ...prev, relatedProducts: prev.relatedProducts?.filter((_, idx) => idx !== i) }))}><X size={14} /></button>
                                                        </div>
                                                    ))}
                                                </div>

                                                <button
                                                    onClick={async () => {
                                                        if (!prodForm.name) return alert("Please enter a product name first.");
                                                        const related = await generateRelatedProducts(prodForm.name, prodForm.category || 'General');
                                                        setProdForm(prev => ({ ...prev, relatedProducts: [...(prev.relatedProducts || []), ...related] }));
                                                    }}
                                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm flex items-center gap-2"
                                                >
                                                    <Sparkles size={16} /> Generate Suggestions
                                                </button>
                                            </div>

                                            {/* SEO */}
                                            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
                                                <div className="flex justify-between items-center mb-4">
                                                    <h3 className="font-bold">Search Engine Listing</h3>
                                                    <button onClick={async () => {
                                                        if (!prodForm.name) return;
                                                        const data = await generateSEOData(prodForm.name, prodForm.description || '');
                                                        setProdForm({ ...prodForm, seoTitle: data.title, seoDescription: data.meta });
                                                    }} className="text-indigo-600 text-xs font-bold flex items-center gap-1 hover:underline"><Sparkles size={12} /> Generate AI SEO</button>
                                                </div>
                                                <div className="mb-4">
                                                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Page Title</label>
                                                    <input className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent" value={prodForm.seoTitle || ''} onChange={e => setProdForm({ ...prodForm, seoTitle: e.target.value })} />
                                                    <p className="text-xs text-gray-400 mt-1">Recommended characters: 0/70</p>
                                                </div>
                                                <div className="mb-4">
                                                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Meta Description</label>
                                                    <textarea className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent" rows={3} value={prodForm.seoDescription || ''} onChange={e => setProdForm({ ...prodForm, seoDescription: e.target.value })} />
                                                    <p className="text-xs text-gray-400 mt-1">Recommended characters: 0/320</p>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">URL Handle</label>
                                                    <div className="flex items-center gap-1 text-gray-500 text-sm">
                                                        <span>/products/</span>
                                                        <input className="flex-1 p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent" value={prodForm.slug || ''} onChange={e => setProdForm({ ...prodForm, slug: e.target.value })} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Sidebar */}
                                        <div className="space-y-6">
                                            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
                                                <h3 className="font-bold mb-4">Product Status</h3>
                                                <select className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent mb-4" value={prodForm.status} onChange={e => setProdForm({ ...prodForm, status: e.target.value as any })}>
                                                    <option value="ACTIVE">Active</option>
                                                    <option value="DRAFT">Draft</option>
                                                    <option value="ARCHIVED">Archived</option>
                                                </select>
                                            </div>

                                            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
                                                <h3 className="font-bold mb-4">Organization</h3>
                                                <div className="mb-4">
                                                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Product Category</label>
                                                    <input className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent" value={prodForm.category} onChange={e => setProdForm({ ...prodForm, category: e.target.value })} />
                                                </div>
                                                <div className="mb-4">
                                                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Product Type</label>
                                                    <input className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent" value={prodForm.productType || ''} onChange={e => setProdForm({ ...prodForm, productType: e.target.value })} />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Vendor</label>
                                                    <input className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent" value={prodForm.vendor || ''} onChange={e => setProdForm({ ...prodForm, vendor: e.target.value })} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Orders Tab */}
                    {activeTab === 'orders' && (
                        <div className="animate-fade-in h-full flex flex-col">
                            {selectedOrder ? (
                                <div className="flex-1 overflow-y-auto">
                                    <div className="flex items-center gap-4 mb-6">
                                        <button onClick={() => setSelectedOrder(null)} className="text-gray-500 hover:text-gray-900 font-bold flex items-center gap-2"><ArrowLeft size={18} /> Orders</button>
                                        <h1 className="text-2xl font-bold dark:text-white">Order #{selectedOrder.id.slice(0, 8).toUpperCase()}</h1>
                                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs font-bold">{new Date(selectedOrder.date).toLocaleString()}</span>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                        {/* ... (Existing Order Details UI) ... */}
                                        {/* Using simplified placeholder for brevity as logic is identical to previous version, ensuring it renders */}
                                        <div className="lg:col-span-2 space-y-6">
                                            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-700">
                                                <h3 className="font-bold text-gray-900 dark:text-white mb-4">Items</h3>
                                                {selectedOrder.items.map(item => (
                                                    <div key={item.id} className="flex gap-4 py-4 border-t border-gray-100 dark:border-gray-800">
                                                        <img src={item.imageUrl} className="w-16 h-16 object-cover rounded-lg border border-gray-100" />
                                                        <div className="flex-1">
                                                            <p className="font-bold text-sm">{item.name}</p>
                                                            <p className="text-xs text-gray-500">SKU: {item.sku || 'N/A'}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-sm font-bold">${item.price}</p>
                                                            <p className="text-xs text-gray-500">x {item.quantity}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                                <div className="border-t border-gray-100 dark:border-gray-800 pt-4 mt-2">
                                                    <div className="flex justify-between font-bold text-lg mt-4"><span>Total</span><span>${selectedOrder.total.toFixed(2)}</span></div>
                                                </div>
                                                <div className="mt-6 border-t border-gray-100 dark:border-gray-800 pt-6">
                                                    <h4 className="font-bold mb-4">Update Status</h4>
                                                    <div className="flex gap-2">
                                                        <select
                                                            className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent text-sm"
                                                            value={selectedOrder.status}
                                                            onChange={(e) => updateOrderMutation.mutate({ orderId: selectedOrder.id, status: { status: e.target.value } })}
                                                        >
                                                            <option value="PENDING">Pending</option>
                                                            <option value="PROCESSING">Processing</option>
                                                            <option value="SHIPPED">Shipped</option>
                                                            <option value="DELIVERED">Delivered</option>
                                                            <option value="CANCELLED">Cancelled</option>
                                                        </select>
                                                        <select
                                                            className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent text-sm"
                                                            value={selectedOrder.fulfillmentStatus}
                                                            onChange={(e) => updateOrderMutation.mutate({ orderId: selectedOrder.id, status: { fulfillmentStatus: e.target.value } })}
                                                        >
                                                            <option value="UNFULFILLED">Unfulfilled</option>
                                                            <option value="PARTIAL">Partial</option>
                                                            <option value="FULFILLED">Fulfilled</option>
                                                        </select>
                                                        <button onClick={() => {
                                                            const note = prompt('Add a timeline note (optional):');
                                                            if (note) updateOrderMutation.mutate({ orderId: selectedOrder.id, status: { notes: note } });
                                                        }} className="px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm font-bold hover:bg-gray-200 dark:hover:bg-gray-700">Add Note</button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-6">
                                            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-700">
                                                <h3 className="font-bold mb-4">Customer</h3>
                                                <p className="text-sm font-bold text-indigo-600 mb-1">{selectedOrder.customer.name}</p>
                                                <p className="text-sm text-gray-500 mb-4">{selectedOrder.customer.email}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex justify-between items-center mb-6">
                                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Orders</h1>
                                        <div className="flex gap-2">
                                            <button className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-bold">Export</button>
                                        </div>
                                    </div>

                                    <div className="mb-4 flex flex-wrap gap-2">
                                        <div className="relative flex-1 min-w-[200px]">
                                            <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
                                            <input
                                                className="w-full pl-10 p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl"
                                                placeholder="Filter orders..."
                                                value={orderSearch}
                                                onChange={e => setOrderSearch(e.target.value)}
                                            />
                                        </div>
                                        <select
                                            className="p-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900"
                                            value={orderStatusFilter}
                                            onChange={e => setOrderStatusFilter(e.target.value)}
                                        >
                                            <option value="All">All Status</option>
                                            <option value="PENDING">Pending</option>
                                            <option value="PROCESSING">Processing</option>
                                            <option value="SHIPPED">Shipped</option>
                                            <option value="DELIVERED">Delivered</option>
                                            <option value="CANCELLED">Cancelled</option>
                                        </select>
                                        <select
                                            className="p-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900"
                                            value={orderFulfillmentFilter}
                                            onChange={e => setOrderFulfillmentFilter(e.target.value)}
                                        >
                                            <option value="All">All Fulfillment</option>
                                            <option value="UNFULFILLED">Unfulfilled</option>
                                            <option value="PARTIAL">Partial</option>
                                            <option value="FULFILLED">Fulfilled</option>
                                        </select>
                                    </div>

                                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden flex-1">
                                        <table className="w-full text-left">
                                            <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                                                <tr>
                                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Order</th>
                                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Date</th>
                                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Customer</th>
                                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Total</th>
                                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                                {filteredOrders.map(order => (
                                                    <tr key={order.id} onClick={() => setSelectedOrder(order)} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer">
                                                        <td className="px-6 py-4 font-bold text-sm">#{order.id.slice(0, 6).toUpperCase()}</td>
                                                        <td className="px-6 py-4 text-sm text-gray-500">{new Date(order.date).toLocaleDateString()}</td>
                                                        <td className="px-6 py-4 text-sm font-bold">{order.customer.name}</td>
                                                        <td className="px-6 py-4 text-sm">${order.total.toFixed(2)}</td>
                                                        <td className="px-6 py-4"><span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">{order.fulfillmentStatus}</span></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Customers Tab */}
                    {activeTab === 'customers' && (
                        <div className="animate-fade-in space-y-6">
                            <div className="flex justify-between items-center">
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Customers</h1>
                                <button onClick={() => exportCustomers(store)} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-bold"><Download size={16} /> Export CSV</button>
                            </div>
                            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                                        <tr>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Name</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Orders</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Spent</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Points</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Wishlist</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Last Order</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {store.customers.map(c => (
                                            <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                <td className="px-6 py-4">
                                                    <p className="font-bold">{c.name}</p>
                                                    <p className="text-xs text-gray-500">{c.email}</p>
                                                </td>
                                                <td className="px-6 py-4">{c.ordersCount}</td>
                                                <td className="px-6 py-4">${c.totalSpent.toFixed(2)}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-1 text-indigo-600 font-bold">
                                                        <Award size={14} />
                                                        {c.loyaltyPoints || 0}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {c.wishlist?.length || 0}
                                                </td>
                                                <td className="px-6 py-4 text-gray-500">{new Date(c.lastOrderDate).toLocaleDateString()}</td>
                                            </tr>
                                        ))}
                                        {store.customers.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-500">No customers yet.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Inbox Tab */}
                    {activeTab === 'inbox' && (
                        <div className="animate-fade-in h-[calc(100vh-120px)] flex bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                            <div className="w-80 border-r border-gray-200 dark:border-gray-800 flex flex-col">
                                <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                                    <h2 className="font-bold mb-2">Inbox</h2>
                                    <div className="flex gap-2">
                                        <button onClick={() => setInboxTab('chat')} className={`flex-1 py-1 text-xs font-bold rounded ${inboxTab === 'chat' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>Live Chat</button>
                                        <button onClick={() => setInboxTab('messages')} className={`flex-1 py-1 text-xs font-bold rounded ${inboxTab === 'messages' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>Messages</button>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto">
                                    {inboxTab === 'chat' ? (
                                        store.chatSessions?.map(session => (
                                            <button key={session.id} onClick={() => { setSelectedChatId(session.id); markChatReadMutation.mutate(session.id); }} className={`w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-800 ${selectedChatId === session.id ? 'bg-indigo-50 dark:bg-indigo-900/10' : ''}`}>
                                                <div className="flex justify-between mb-1">
                                                    <span className="font-bold text-sm">{session.customerName}</span>
                                                    {session.unreadAdmin > 0 && <span className="bg-red-500 text-white text-[10px] px-2 rounded-full">{session.unreadAdmin}</span>}
                                                </div>
                                                <p className="text-xs text-gray-500 truncate">{session.lastMessage}</p>
                                            </button>
                                        ))
                                    ) : (
                                        store.messages?.map(msg => (
                                            <div key={msg.id} className="p-4 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                                                <p className="font-bold text-sm">{msg.name}</p>
                                                <p className="text-xs text-gray-500 mb-1">{msg.email}</p>
                                                <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">{msg.message}</p>
                                            </div>
                                        ))
                                    )}
                                    {((inboxTab === 'chat' && (!store.chatSessions || store.chatSessions.length === 0)) || (inboxTab === 'messages' && (!store.messages || store.messages.length === 0))) && (
                                        <div className="p-8 text-center text-gray-400 text-sm">No items found.</div>
                                    )}
                                </div>
                            </div>
                            <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900">
                                {selectedChatId && inboxTab === 'chat' ? (
                                    <>
                                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                            {store.chatSessions.find(s => s.id === selectedChatId)?.messages.map(m => (
                                                <div key={m.id} className={`flex ${m.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                                                    <div className={`max-w-[70%] p-3 rounded-2xl text-sm ${m.sender === 'admin' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-bl-none'}`}>
                                                        {m.content}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <form onSubmit={handleSendChat} className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex gap-2">
                                            <input
                                                className="flex-1 p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent"
                                                placeholder="Type reply..."
                                                value={adminChatInput}
                                                onChange={e => setAdminChatInput(e.target.value)}
                                            />
                                            <button className="bg-indigo-600 text-white p-2 rounded-lg"><Send size={20} /></button>
                                        </form>
                                    </>
                                ) : (
                                    <div className="flex-1 flex items-center justify-center text-gray-400">Select a conversation</div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Discounts Tab */}
                    {activeTab === 'discounts' && (
                        <div className="animate-fade-in space-y-6">
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Discounts</h1>
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800">
                                    <h3 className="font-bold mb-4">Create Discount</h3>
                                    <form onSubmit={handleCreateDiscount} className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Code</label>
                                            <input className="w-full p-2 border rounded-lg bg-transparent" placeholder="SUMMER2025" value={newDiscountCode} onChange={e => setNewDiscountCode(e.target.value)} required />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Type</label>
                                                <select className="w-full p-2 border rounded-lg bg-transparent" value={newDiscountType} onChange={e => setNewDiscountType(e.target.value as any)}>
                                                    <option value="PERCENTAGE">Percentage (%)</option>
                                                    <option value="FIXED">Fixed Amount ($)</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Value</label>
                                                <input type="number" className="w-full p-2 border rounded-lg bg-transparent" placeholder="10" value={newDiscountValue} onChange={e => setNewDiscountValue(e.target.value)} required />
                                            </div>
                                        </div>
                                        <button className="w-full py-2 bg-indigo-600 text-white rounded-lg font-bold">Create Code</button>
                                    </form>
                                </div>
                                <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
                                    <table className="w-full text-left">
                                        <thead className="bg-gray-50 dark:bg-gray-800/50">
                                            <tr>
                                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Code</th>
                                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Value</th>
                                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Used</th>
                                                <th className="px-6 py-4 text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {store.discounts.map(d => (
                                                <tr key={d.id} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                                                    <td className="px-6 py-4 font-mono font-bold">{d.code}</td>
                                                    <td className="px-6 py-4">{d.type === 'PERCENTAGE' ? `${d.value}%` : `$${d.value}`}</td>
                                                    <td className="px-6 py-4">{d.usageCount}</td>
                                                    <td className="px-6 py-4 text-right"><button onClick={() => deleteDiscountMutation.mutate(d.id)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button></td>
                                                </tr>
                                            ))}
                                            {store.discounts.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-gray-500">No active discounts.</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Pages Tab */}
                    {activeTab === 'pages' && (
                        <div className="animate-fade-in space-y-6">
                            {pageViewMode === 'list' ? (
                                <>
                                    <div className="flex justify-between items-center">
                                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pages</h1>
                                        <button onClick={handleCreatePage} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold"><Plus size={18} /> New Page</button>
                                    </div>
                                    <div className="grid gap-4">
                                        {store.pages?.map(page => (
                                            <div key={page.id} className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 flex justify-between items-center">
                                                <div>
                                                    <h3 className="font-bold text-lg">{page.title}</h3>
                                                    <p className="text-xs text-gray-500">/pages/{page.slug}</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleEditPage(page)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded hover:text-blue-600"><Edit2 size={16} /></button>
                                                    <button onClick={() => { if (confirm('Delete?')) deletePageMutation.mutate(page.id); }} className="p-2 bg-gray-100 dark:bg-gray-800 rounded hover:text-red-600"><Trash2 size={16} /></button>
                                                </div>
                                            </div>
                                        ))}
                                        {(!store.pages || store.pages.length === 0) && <div className="text-center p-8 text-gray-500">No custom pages created.</div>}
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center">
                                        <button onClick={() => setPageViewMode('list')} className="flex items-center gap-2 font-bold text-gray-500"><ArrowLeft size={18} /> Back</button>
                                        <button onClick={handleSavePage} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold">Save Page</button>
                                    </div>
                                    <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 space-y-4">
                                        <div>
                                            <label className="block text-sm font-bold mb-1">Page Title</label>
                                            <input className="w-full p-3 border rounded-xl bg-transparent font-bold text-lg" value={pageForm.title} onChange={e => setPageForm({ ...pageForm, title: e.target.value })} placeholder="e.g. FAQ" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold mb-1">Content (HTML supported)</label>
                                            <textarea className="w-full p-3 border rounded-xl bg-transparent font-mono text-sm h-64" value={pageForm.content} onChange={e => setPageForm({ ...pageForm, content: e.target.value })} placeholder="<p>Your content here...</p>" />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Marketing Tab */}
                    {activeTab === 'marketing' && (
                        <div className="animate-fade-in space-y-6">
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Marketing Generator</h1>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800">
                                    <h3 className="font-bold mb-4 flex items-center gap-2"><Sparkles className="text-indigo-600" /> Content Generator</h3>
                                    <textarea className="w-full p-3 border rounded-xl bg-transparent mb-4 h-32" placeholder="Describe your promotion (e.g. Summer Sale 20% off all shoes)" value={marketingPrompt} onChange={e => setMarketingPrompt(e.target.value)} />
                                    <div className="flex gap-2">
                                        <button onClick={() => handleGenerateMarketing('email')} disabled={isGeneratingMarketing} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-bold flex items-center justify-center gap-2"><Mail size={16} /> Email Copy</button>
                                        <button onClick={() => handleGenerateMarketing('social')} disabled={isGeneratingMarketing} className="flex-1 py-2 bg-pink-600 text-white rounded-lg font-bold flex items-center justify-center gap-2"><Instagram size={16} /> Social Post</button>
                                    </div>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800">
                                    <h3 className="font-bold mb-4 text-gray-500 uppercase text-xs">Generated Result</h3>
                                    {isGeneratingMarketing ? (
                                        <div className="flex items-center justify-center h-40"><Loader2 className="animate-spin text-indigo-600" /></div>
                                    ) : (
                                        <>
                                            <div className="prose dark:prose-invert text-sm whitespace-pre-wrap mb-4">{marketingResult || 'Result will appear here...'}</div>
                                            {marketingResult && (
                                                <button onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(marketingResult)}`, '_blank')} className="px-4 py-2 bg-sky-500 text-white rounded-lg font-bold text-xs flex items-center gap-2 hover:bg-sky-600">
                                                    <Twitter size={14} /> Share to Twitter
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Abandoned Carts Tab */}
                    {activeTab === 'abandoned' && (
                        <div className="animate-fade-in space-y-6">
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Abandoned Carts</h1>
                            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 dark:bg-gray-800/50">
                                        <tr>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">User / Email</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Items</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Last Updated</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {abandonedCarts.map((cart: any) => (
                                            <tr key={cart.id}>
                                                <td className="px-6 py-4">
                                                    <p className="font-bold">{cart.email || 'Guest'}</p>
                                                    <p className="text-xs text-gray-500">{cart.userId ? 'Registered' : 'Guest'}</p>
                                                </td>
                                                <td className="px-6 py-4 text-sm">{Array.isArray(cart.items) ? cart.items.length : 0} items</td>
                                                <td className="px-6 py-4 text-sm text-gray-500">{new Date(cart.updatedAt).toLocaleString()}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <button className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-200">Send Recovery Email</button>
                                                </td>
                                            </tr>
                                        ))}
                                        {abandonedCarts.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-gray-500">No abandoned carts found.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Auto Pilot Tab */}
                    {activeTab === 'autopilot' && (
                        <div className="animate-fade-in space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                        <Rocket className="text-indigo-600" size={28} /> AI Auto Pilot
                                    </h1>
                                    <p className="text-gray-500 dark:text-gray-400 mt-1">Full AI automation for your store operations</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-500">Auto Pilot</span>
                                    <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-indigo-600">
                                        <span className="inline-block h-4 w-4 transform rounded-full bg-white transition" />
                                    </button>
                                </div>
                            </div>

                            {/* AI Dashboard Overview */}
                            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white">
                                <div className="flex items-center gap-3 mb-4">
                                    <Brain size={24} />
                                    <h2 className="text-xl font-bold">AI Dashboard</h2>
                                </div>
                                <p className="text-indigo-100 mb-4">Your AI assistant is actively managing store operations, analyzing data, and optimizing performance.</p>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="bg-white/20 rounded-xl p-3">
                                        <div className="text-2xl font-bold">5</div>
                                        <div className="text-xs text-indigo-100">Active Automations</div>
                                    </div>
                                    <div className="bg-white/20 rounded-xl p-3">
                                        <div className="text-2xl font-bold">12</div>
                                        <div className="text-xs text-indigo-100">Insights Generated</div>
                                    </div>
                                    <div className="bg-white/20 rounded-xl p-3">
                                        <div className="text-2xl font-bold">25</div>
                                        <div className="text-xs text-indigo-100">Decisions Automated</div>
                                    </div>
                                    <div className="bg-white/20 rounded-xl p-3">
                                        <div className="text-2xl font-bold">98%</div>
                                        <div className="text-xs text-indigo-100">Efficiency</div>
                                    </div>
                                </div>
                            </div>

                            {/* Smart Suggestions */}
                            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                    <Zap className="text-yellow-500" size={20} /> Smart Suggestions
                                </h3>
                                <div className="space-y-3">
                                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border-l-4 border-indigo-500">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <div className="font-bold text-indigo-700 dark:text-indigo-300">Optimize Pricing</div>
                                                <div className="text-sm text-gray-600 dark:text-gray-400">Consider reviewing pricing strategy for competitive positioning</div>
                                            </div>
                                            <span className="text-xs bg-indigo-100 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded">Medium</span>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border-l-4 border-green-500">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <div className="font-bold text-green-700 dark:text-green-300">Upselling Opportunity</div>
                                                <div className="text-sm text-gray-600 dark:text-gray-400">AI recommends adding product bundles to increase average order value</div>
                                            </div>
                                            <span className="text-xs bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300 px-2 py-1 rounded">Low</span>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border-l-4 border-orange-500">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <div className="font-bold text-orange-700 dark:text-orange-300">Restock Inventory</div>
                                                <div className="text-sm text-gray-600 dark:text-gray-400">5 products need restocking soon</div>
                                            </div>
                                            <span className="text-xs bg-orange-100 dark:bg-orange-800 text-orange-700 dark:text-orange-300 px-2 py-1 rounded">High</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Smart AI Tools Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Sentiment Analysis Tool */}
                                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex flex-col">
                                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                        <Activity className="text-blue-500" size={20} /> Sentiment Analyzer
                                    </h3>
                                    <textarea
                                        className="flex-1 min-h-[100px] p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-transparent mb-4 text-sm"
                                        placeholder="Paste customer feedback or reviews to analyze sentiment..."
                                        value={aiSentimentInput}
                                        onChange={e => setAiSentimentInput(e.target.value)}
                                    />
                                    <button
                                        onClick={handleAnalyzeSentiment}
                                        disabled={isAnalyzingSentiment || !aiSentimentInput}
                                        className="w-full py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isAnalyzingSentiment ? <Loader2 className="animate-spin" size={16} /> : <Zap size={16} />}
                                        Analyze Sentiment
                                    </button>
                                    {aiSentimentResult && (
                                        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${
                                                    aiSentimentResult.sentiment === 'positive' ? 'bg-green-100 text-green-700' :
                                                    aiSentimentResult.sentiment === 'negative' ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-700'
                                                }`}>
                                                    {aiSentimentResult.sentiment}
                                                </span>
                                                <span className="text-xs font-bold text-gray-500">Score: {aiSentimentResult.score}</span>
                                            </div>
                                            <p className="text-sm text-gray-700 dark:text-gray-300 italic">"{aiSentimentResult.summary}"</p>
                                        </div>
                                    )}
                                </div>

                                {/* Content Translator Tool */}
                                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex flex-col">
                                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                        <Globe className="text-purple-500" size={20} /> AI Content Translator
                                    </h3>
                                    <textarea
                                        className="flex-1 min-h-[100px] p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-transparent mb-4 text-sm"
                                        placeholder="Enter product description or marketing copy to translate..."
                                        value={aiTranslateText}
                                        onChange={e => setAiTranslateText(e.target.value)}
                                    />
                                    <div className="flex gap-2">
                                        <select
                                            className="p-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-sm font-bold"
                                            value={aiTargetLang}
                                            onChange={e => setAiTargetLang(e.target.value)}
                                        >
                                            <option value="Spanish">Spanish</option>
                                            <option value="French">French</option>
                                            <option value="German">German</option>
                                            <option value="Chinese">Chinese</option>
                                            <option value="Japanese">Japanese</option>
                                            <option value="Arabic">Arabic</option>
                                        </select>
                                        <button
                                            onClick={handleTranslate}
                                            disabled={isTranslating || !aiTranslateText}
                                            className="flex-1 py-2 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {isTranslating ? <Loader2 className="animate-spin" size={16} /> : <Rocket size={16} />}
                                            Translate Now
                                        </button>
                                    </div>
                                    {aiTranslateResult && (
                                        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                                            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{aiTranslateResult}</p>
                                            <button 
                                                onClick={() => { navigator.clipboard.writeText(aiTranslateResult); showToast('Copied to clipboard', 'success'); }}
                                                className="mt-2 text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
                                            >
                                                <Copy size={12} /> Copy Result
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Segmentation & Recommendations */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Audience Segmentation */}
                                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="font-bold text-lg flex items-center gap-2">
                                            <Users className="text-orange-500" size={20} /> Audience Segmentation
                                        </h3>
                                        <button
                                            onClick={handleSegmentCustomers}
                                            disabled={isSegmenting}
                                            className="px-4 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-orange-200 transition-colors"
                                        >
                                            {isSegmenting ? <Loader2 className="animate-spin" size={16} /> : <Activity size={16} />}
                                            {aiSegmentationResult ? 'Refresh Segments' : 'Analyze Audience'}
                                        </button>
                                    </div>

                                    {aiSegmentationResult ? (
                                        <div className="space-y-4">
                                            {aiSegmentationResult.segments.map((segment: any, i: number) => (
                                                <div key={ segment.name } className="p-4 border border-gray-100 dark:border-gray-800 rounded-2xl bg-gray-50 dark:bg-gray-800/50">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h4 className="font-bold text-gray-900 dark:text-white">{segment.name}</h4>
                                                        <span className="text-xs font-bold px-2 py-0.5 bg-white dark:bg-gray-700 rounded-full border border-gray-200 dark:border-gray-600">{segment.size} customers</span>
                                                    </div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{segment.description}</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {segment.traits.map((trait: string) => (
                                                            <span key={trait} className="text-[10px] bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-bold">{trait}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-100 dark:border-orange-800">
                                                <p className="text-xs text-orange-800 dark:text-orange-300 font-medium">
                                                    <strong>AI Insight:</strong> {aiSegmentationResult.marketing_insight}
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="h-40 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-2xl">
                                            <Users size={32} className="mb-2 opacity-50" />
                                            <p className="text-sm">Run analysis to identify customer profiles</p>
                                        </div>
                                    )}
                                </div>

                                {/* Smart Product Recommendations */}
                                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="font-bold text-lg flex items-center gap-2">
                                            <Sparkles className="text-yellow-500" size={20} /> Smart Recommendations
                                        </h3>
                                        <button
                                            onClick={handleGetRecommendations}
                                            disabled={isGeneratingRecs}
                                            className="px-4 py-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-yellow-200 transition-colors"
                                        >
                                            {isGeneratingRecs ? <Loader2 className="animate-spin" size={16} /> : <Zap size={16} />}
                                            {aiRecommendationResult ? 'Update Recs' : 'Get Predictions'}
                                        </button>
                                    </div>

                                    {aiRecommendationResult ? (
                                        <div className="space-y-4">
                                            {aiRecommendationResult.recommendedProducts?.map((product: any) => (
                                                <div key={product.id} className="flex items-center gap-4 p-3 border border-gray-100 dark:border-gray-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                                    <img src={product.imageUrl} className="w-12 h-12 rounded-xl object-cover" />
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-bold text-sm truncate">{product.name}</h4>
                                                        <p className="text-xs text-indigo-600 font-bold">${product.price}</p>
                                                    </div>
                                                    <button className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"><ExternalLink size={16} /></button>
                                                </div>
                                            ))}
                                            <div className="mt-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800">
                                                <p className="text-xs text-indigo-800 dark:text-indigo-300 font-medium italic">
                                                    "{aiRecommendationResult.insight}"
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="h-40 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-2xl">
                                            <Sparkles size={32} className="mb-2 opacity-50" />
                                            <p className="text-sm">Get AI predictions on high-performing products</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Settings Tab */}
                    {activeTab === 'settings' && (
                        <div className="animate-fade-in space-y-6">
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Store Settings</h1>
                            <div className="flex gap-4 border-b border-gray-200 dark:border-gray-800 pb-2 overflow-x-auto">
                                {['general', 'payments', 'shipping', 'social', 'loyalty', 'theme'].map(t => (
                                    <button key={t} onClick={() => setSettingsTab(t as any)} className={`px-4 py-2 font-bold text-sm capitalize ${settingsTab === t ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}>{t}</button>
                                ))}
                            </div>
                            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800">
                                {settingsTab === 'general' && (
                                    <div className="space-y-4 max-w-lg">
                                        <div><label className="block text-sm font-bold mb-1">Store Name</label><input className="w-full p-2 border rounded-lg bg-transparent" value={store.name} onChange={e => handleSaveSettings({ name: e.target.value } as any)} /></div>
                                        <div><label className="block text-sm font-bold mb-1">Description</label><textarea className="w-full p-2 border rounded-lg bg-transparent" value={store.description} onChange={e => handleSaveSettings({ description: e.target.value } as any)} /></div>
                                        <div><label className="block text-sm font-bold mb-1">Support Email</label><input className="w-full p-2 border rounded-lg bg-transparent" placeholder="support@store.com" /></div>
                                        <div className="flex items-center gap-2 pt-2"><input type="checkbox" checked={store.settings.maintenanceMode} onChange={e => handleSaveSettings({ maintenanceMode: e.target.checked })} /><label className="font-bold">Maintenance Mode</label></div>
                                    </div>
                                )}
                                {settingsTab === 'payments' && (
                                    <div className="space-y-4">
                                        <div className="p-4 border rounded-xl flex justify-between items-center bg-gray-50 dark:bg-gray-800">
                                            <div className="flex items-center gap-4"><div className="w-10 h-6 bg-blue-600 rounded"></div><span className="font-bold">Stripe / Credit Card</span></div>
                                            <button className="text-green-600 font-bold text-sm">Connected</button>
                                        </div>
                                        <div className="p-4 border rounded-xl flex justify-between items-center bg-gray-50 dark:bg-gray-800">
                                            <div className="flex items-center gap-4"><div className="w-10 h-6 bg-blue-400 rounded"></div><span className="font-bold">PayPal</span></div>
                                            <button className="text-gray-500 font-bold text-sm">Connect</button>
                                        </div>
                                        <div><label className="block text-sm font-bold mb-1">Store Currency</label><select className="w-full p-2 border rounded-lg bg-transparent max-w-xs" value={store.settings.currency} onChange={e => handleSaveSettings({ currency: e.target.value })}><option value="USD">USD</option><option value="EUR">EUR</option></select></div>
                                    </div>
                                )}
                                {settingsTab === 'shipping' && (
                                    <div className="space-y-4 max-w-lg">
                                        <div><label className="block text-sm font-bold mb-1">Flat Rate Shipping Fee</label><input type="number" className="w-full p-2 border rounded-lg bg-transparent" value={store.settings.shippingFee} onChange={e => handleSaveSettings({ shippingFee: Number(e.target.value) })} /></div>
                                        <div><label className="block text-sm font-bold mb-1">Free Shipping Threshold</label><input type="number" className="w-full p-2 border rounded-lg bg-transparent" value={store.settings.freeShippingThreshold} onChange={e => handleSaveSettings({ freeShippingThreshold: Number(e.target.value) })} /></div>
                                    </div>
                                )}
                                {settingsTab === 'social' && (
                                    <div className="space-y-4 max-w-lg">
                                        <div className="relative"><Facebook className="absolute left-3 top-2.5 text-blue-600" size={18} /><input className="w-full pl-10 p-2 border rounded-lg bg-transparent" placeholder="Facebook URL" value={store.settings.socialLinks?.facebook || ''} onChange={e => handleSaveSettings({ socialLinks: { ...store.settings.socialLinks, facebook: e.target.value } })} /></div>
                                        <div className="relative"><Instagram className="absolute left-3 top-2.5 text-pink-600" size={18} /><input className="w-full pl-10 p-2 border rounded-lg bg-transparent" placeholder="Instagram URL" value={store.settings.socialLinks?.instagram || ''} onChange={e => handleSaveSettings({ socialLinks: { ...store.settings.socialLinks, instagram: e.target.value } })} /></div>
                                        <div className="relative"><Twitter className="absolute left-3 top-2.5 text-sky-500" size={18} /><input className="w-full pl-10 p-2 border rounded-lg bg-transparent" placeholder="Twitter URL" value={store.settings.socialLinks?.twitter || ''} onChange={e => handleSaveSettings({ socialLinks: { ...store.settings.socialLinks, twitter: e.target.value } })} /></div>
                                    </div>
                                )}
                                {settingsTab === 'loyalty' && (
                                    <div className="space-y-6 max-w-lg">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg"><Award size={24} /></div>
                                            <div>
                                                <h3 className="font-bold text-lg">Loyalty Program</h3>
                                                <p className="text-sm text-gray-500">Reward customers for their purchases.</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={store.settings.loyaltyProgram?.enabled || false}
                                                onChange={e => handleSaveSettings({ loyaltyProgram: { ...store.settings.loyaltyProgram, enabled: e.target.checked } as any })}
                                                className="w-5 h-5 text-indigo-600 rounded"
                                            />
                                            <label className="font-bold">Enable Loyalty Program</label>
                                        </div>

                                        <div className={!store.settings.loyaltyProgram?.enabled ? 'opacity-50 pointer-events-none' : ''}>
                                            <div className="mb-4">
                                                <label className="block text-sm font-bold mb-1">Points per $1 Spent</label>
                                                <input
                                                    type="number"
                                                    className="w-full p-2 border rounded-lg bg-transparent"
                                                    value={store.settings.loyaltyProgram?.pointsPerDollar || 1}
                                                    onChange={e => handleSaveSettings({ loyaltyProgram: { ...store.settings.loyaltyProgram, pointsPerDollar: Number(e.target.value) } as any })}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold mb-1">Minimum Points for Redemption</label>
                                                <input
                                                    type="number"
                                                    className="w-full p-2 border rounded-lg bg-transparent"
                                                    value={store.settings.loyaltyProgram?.minimumRedemption || 500}
                                                    onChange={e => handleSaveSettings({ loyaltyProgram: { ...store.settings.loyaltyProgram, minimumRedemption: Number(e.target.value) } as any })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Re-implementing Blog briefly to ensure it works with new layout */}
                    {activeTab === 'blog' && (
                        <div className="animate-fade-in h-full flex flex-col">
                            {/* ... (Existing Blog List/Edit Code) ... */}
                            {blogViewMode === 'list' ? (
                                <>
                                    <div className="flex justify-between items-center mb-6">
                                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Blog Posts ({store.blogPosts?.length || 0})</h1>
                                        <button onClick={() => { setBlogPostForm({}); setBlogViewMode('edit'); setEditPostId(null); }} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 flex items-center gap-2">
                                            <Plus size={18} /> New Post
                                        </button>
                                    </div>
                                    <div className="grid gap-4">
                                        {store.blogPosts?.map(post => (
                                            <div key={post.id} className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 flex justify-between items-center">
                                                <div>
                                                    <h3 className="font-bold">{post.title}</h3>
                                                    <p className="text-xs text-gray-500">{new Date(post.date).toLocaleDateString()} • {post.status}</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => { setBlogPostForm(post); setEditPostId(post.id); setBlogViewMode('edit'); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-blue-500"><Edit2 size={16} /></button>
                                                    <button onClick={() => { if (confirm('Delete?')) deleteBlogMutation.mutate(post.id); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-red-500"><Trash2 size={16} /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center">
                                        <button onClick={() => setBlogViewMode('list')} className="flex items-center gap-2 font-bold text-gray-500"><ArrowLeft size={18} /> Back</button>
                                        <button onClick={handleSaveBlog} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold">Save Post</button>
                                    </div>
                                    <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl space-y-4 border border-gray-200 dark:border-gray-800">
                                        <input className="w-full p-3 border rounded-xl bg-transparent text-xl font-bold" placeholder="Post Title" value={blogPostForm.title} onChange={e => setBlogPostForm({ ...blogPostForm, title: e.target.value })} />
                                        <textarea className="w-full p-3 border rounded-xl bg-transparent h-64" placeholder="Write content..." value={blogPostForm.content} onChange={e => setBlogPostForm({ ...blogPostForm, content: e.target.value })} />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'staff' && (
                        <div className="animate-fade-in space-y-6">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-2xl font-bold dark:text-white">Staff Management</h2>
                                    <p className="text-gray-500 dark:text-gray-400">Manage access to your store.</p>
                                </div>
                                <button onClick={handleInviteStaff} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 flex items-center gap-2">
                                    <Plus size={18} /> Invite Staff
                                </button>
                            </div>

                            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 dark:bg-gray-800 text-xs uppercase text-gray-500 font-bold border-b border-gray-100 dark:border-gray-800">
                                        <tr>
                                            <th className="p-4">Name</th>
                                            <th className="p-4">Email</th>
                                            <th className="p-4">Role</th>
                                            <th className="p-4">Joined</th>
                                            <th className="p-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {/* Owner explicitly */}
                                        <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                            <td className="p-4 font-bold dark:text-white">{user?.name} (You)</td>
                                            <td className="p-4 text-gray-500">{user?.email}</td>
                                            <td className="p-4"><span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-bold">OWNER</span></td>
                                            <td className="p-4 text-gray-500">{new Date(store.createdAt).toLocaleDateString()}</td>
                                            <td className="p-4"></td>
                                        </tr>
                                        {/* Mock Staff or existing */}
                                        {store.staff?.map(s => (
                                            <tr key={s.userId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                <td className="p-4 font-bold dark:text-white">{s.name}</td>
                                                <td className="p-4 text-gray-500">{s.email}</td>
                                                <td className="p-4"><span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-bold">{s.role.toUpperCase()}</span></td>
                                                <td className="p-4 text-gray-500">{new Date(s.joinedAt).toLocaleDateString()}</td>
                                                <td className="p-4 text-right">
                                                    <button className="text-red-500 hover:text-red-700 text-sm font-bold">Remove</button>
                                                </td>
                                            </tr>
                                        ))}
                                        {(!store.staff || store.staff.length === 0) && (
                                            <tr>
                                                <td colSpan={5} className="p-8 text-center text-gray-500">No other staff members yet.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'staff' && (
                        <div className="animate-fade-in space-y-6">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-2xl font-bold dark:text-white">Staff Management</h2>
                                    <p className="text-gray-500 dark:text-gray-400">Manage access to your store.</p>
                                </div>
                                <button onClick={handleInviteStaff} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 flex items-center gap-2">
                                    <Plus size={18} /> Invite Staff
                                </button>
                            </div>

                            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 dark:bg-gray-800 text-xs uppercase text-gray-500 font-bold border-b border-gray-100 dark:border-gray-800">
                                        <tr>
                                            <th className="p-4">Name</th>
                                            <th className="p-4">Email</th>
                                            <th className="p-4">Role</th>
                                            <th className="p-4">Joined</th>
                                            <th className="p-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {/* Owner explicitly */}
                                        <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                            <td className="p-4 font-bold dark:text-white">{user?.name} (You)</td>
                                            <td className="p-4 text-gray-500">{user?.email}</td>
                                            <td className="p-4"><span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-bold">OWNER</span></td>
                                            <td className="p-4 text-gray-500">{new Date(store.createdAt).toLocaleDateString()}</td>
                                            <td className="p-4"></td>
                                        </tr>
                                        {store.staff?.map(s => (
                                            <tr key={s.userId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                <td className="p-4 font-bold dark:text-white">{s.name}</td>
                                                <td className="p-4 text-gray-500">{s.email}</td>
                                                <td className="p-4"><span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-bold">{s.role.toUpperCase()}</span></td>
                                                <td className="p-4 text-gray-500">{new Date(s.joinedAt).toLocaleDateString()}</td>
                                                <td className="p-4 text-right">
                                                    <button className="text-red-500 hover:text-red-700 text-sm font-bold">Remove</button>
                                                </td>
                                            </tr>
                                        ))}
                                        {(!store.staff || store.staff.length === 0) && (
                                            <tr>
                                                <td colSpan={5} className="p-8 text-center text-gray-500">No other staff members yet.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'reviews' && (
                        <div className="animate-fade-in space-y-6">
                            <h2 className="text-2xl font-bold dark:text-white">Product Reviews</h2>
                            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 dark:bg-gray-800 text-xs uppercase text-gray-500 font-bold border-b border-gray-100 dark:border-gray-800">
                                        <tr>
                                            <th className="p-4">Product</th>
                                            <th className="p-4">Rating</th>
                                            <th className="p-4">Review</th>
                                            <th className="p-4">Customer</th>
                                            <th className="p-4">Date</th>
                                            <th className="p-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {store.products.flatMap(p => p.reviews?.map(r => ({ ...r, product: p })) || [])
                                            .sort((a, b) => b.date - a.date)
                                            .map(r => (
                                                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                    <td className="p-4 flex items-center gap-3">
                                                        <img src={r.product.imageUrl} className="w-8 h-8 rounded object-cover" />
                                                        <span className="font-bold text-sm dark:text-white">{r.product.name}</span>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex text-yellow-500">
                                                            {[...Array(5)].map((_, i) => (
                                                                <Star key={i} size={14} fill={i < r.rating ? "currentColor" : "none"} className={i < r.rating ? "" : "text-gray-300 dark:text-gray-700"} />
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate">{r.comment}</td>
                                                    <td className="p-4 text-sm font-bold dark:text-gray-300">{r.customerName}</td>
                                                    <td className="p-4 text-xs text-gray-500">{new Date(r.date).toLocaleDateString()}</td>
                                                    <td className="p-4 text-right">
                                                        <button onClick={() => {
                                                            if (confirm('Delete review?')) {
                                                                const updatedReviews = r.product.reviews?.filter(rev => rev.id !== r.id) || [];
                                                                updateProductMutation.mutate({ id: r.product.id, data: { reviews: updatedReviews } });
                                                            }
                                                        }} className="text-red-500 hover:text-red-700 p-2 rounded hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 size={16} /></button>
                                                    </td>
                                                </tr>
                                            ))}
                                        {store.products.flatMap(p => p.reviews || []).length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="p-8 text-center text-gray-500">No reviews yet.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'reviews' && (
                        <div className="animate-fade-in space-y-6">
                            <h2 className="text-2xl font-bold dark:text-white">Product Reviews</h2>
                            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 dark:bg-gray-800 text-xs uppercase text-gray-500 font-bold border-b border-gray-100 dark:border-gray-800">
                                        <tr>
                                            <th className="p-4">Product</th>
                                            <th className="p-4">Rating</th>
                                            <th className="p-4">Review</th>
                                            <th className="p-4">Customer</th>
                                            <th className="p-4">Date</th>
                                            <th className="p-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {store.products.flatMap(p => p.reviews?.map(r => ({ ...r, product: p })) || [])
                                            .sort((a, b) => b.date - a.date)
                                            .map(r => (
                                                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                    <td className="p-4 flex items-center gap-3">
                                                        <img src={r.product.imageUrl} className="w-8 h-8 rounded object-cover" />
                                                        <span className="font-bold text-sm dark:text-white">{r.product.name}</span>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex text-yellow-500">
                                                            {[...Array(5)].map((_, i) => (
                                                                <Star key={i} size={14} fill={i < r.rating ? "currentColor" : "none"} className={i < r.rating ? "" : "text-gray-300 dark:text-gray-700"} />
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate">{r.comment}</td>
                                                    <td className="p-4 text-sm font-bold dark:text-gray-300">{r.customerName}</td>
                                                    <td className="p-4 text-xs text-gray-500">{new Date(r.date).toLocaleDateString()}</td>
                                                    <td className="p-4 text-right">
                                                        <button onClick={() => {
                                                            if (confirm('Delete review?')) {
                                                                const updatedReviews = r.product.reviews?.filter(rev => rev.id !== r.id) || [];
                                                                updateProductMutation.mutate({ id: r.product.id, data: { reviews: updatedReviews } });
                                                            }
                                                        }} className="text-red-500 hover:text-red-700 p-2 rounded hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 size={16} /></button>
                                                    </td>
                                                </tr>
                                            ))}
                                        {store.products.flatMap(p => p.reviews || []).length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="p-8 text-center text-gray-500">No reviews yet.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Premium Store Creation Wizard */}
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
            </main>
        </div>
    );
};
