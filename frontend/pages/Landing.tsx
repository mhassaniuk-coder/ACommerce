import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useInView, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import api from '../src/lib/api';
import {
    Store, ShoppingCart, Zap, Shield, Rocket, Globe, ArrowRight, LayoutDashboard,
    Database, CreditCard, ShoppingBag, BarChart3, Users, Smartphone, Check, Play,
    Sparkles, Brain, Image, ShieldCheck, Building2, Search, ChevronDown, X, Mail,
    Twitter, Linkedin, Github, Youtube, Menu, Star, Quote, Clock, DollarSign, Package,
    TrendingUp, HeadphonesIcon, Lock, Cpu, Wand2, Layers, Link2, Gauge, Target
} from 'lucide-react';
import { ThemeToggle } from '../context/ThemeContext';

// Animated Counter Component
const AnimatedCounter: React.FC<{ end: number; suffix?: string; duration?: number }> = ({ end, suffix = '', duration = 2 }) => {
    const [count, setCount] = useState(0);
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true });

    useEffect(() => {
        if (isInView) {
            let startTime: number;
            const animate = (timestamp: number) => {
                if (!startTime) startTime = timestamp;
                const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
                setCount(Math.floor(progress * end));
                if (progress < 1) requestAnimationFrame(animate);
            };
            requestAnimationFrame(animate);
        }
    }, [isInView, end, duration]);

    return <span ref={ref}>{count}{suffix}</span>;
};

// Feature Card Component
const FeatureCard: React.FC<{
    icon: React.ElementType;
    title: string;
    description: string;
    color: string;
    delay: number;
}> = ({ icon: Icon, title, description, color, delay }) => {
    const colorClasses: Record<string, { bg: string; text: string; border: string; glow: string }> = {
        indigo: { bg: 'bg-indigo-500/10', text: 'text-indigo-500', border: 'border-indigo-500/20', glow: 'shadow-indigo-500/25' },
        purple: { bg: 'bg-purple-500/10', text: 'text-purple-500', border: 'border-purple-500/20', glow: 'shadow-purple-500/25' },
        pink: { bg: 'bg-pink-500/10', text: 'text-pink-500', border: 'border-pink-500/20', glow: 'shadow-pink-500/25' },
        emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20', glow: 'shadow-emerald-500/25' },
        amber: { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/20', glow: 'shadow-amber-500/25' },
        cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-500', border: 'border-cyan-500/20', glow: 'shadow-cyan-500/25' },
    };
    const colors = colorClasses[color] || colorClasses.indigo;

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay }}
            viewport={{ once: true }}
            whileHover={{ y: -8, scale: 1.02 }}
            className={`relative p-8 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border ${colors.border} shadow-lg ${colors.glow} group hover:shadow-2xl transition-all duration-300`}
        >
            <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${colors.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
            <div className="relative z-10">
                <div className={`w-14 h-14 ${colors.bg} ${colors.text} rounded-2xl flex items-center justify-center mb-6 border ${colors.border} group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}>
                    <Icon size={28} strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white font-heading">{title}</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">{description}</p>
            </div>
        </motion.div>
    );
};

// Pricing Card Component
const PricingCard: React.FC<{
    plan: string;
    price: string;
    features: string[];
    highlighted?: boolean;
    delay: number;
}> = ({ plan, price, features, highlighted, delay }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay }}
            viewport={{ once: true }}
            className={`relative p-8 rounded-3xl ${highlighted
                ? 'bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white shadow-2xl shadow-indigo-500/30 scale-105 z-10'
                : 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-white/10 shadow-lg'
                }`}
        >
            {highlighted && (
                <motion.div
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    transition={{ delay: delay + 0.3, type: 'spring' }}
                    className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-black uppercase tracking-wider rounded-full shadow-lg"
                >
                    Most Popular
                </motion.div>
            )}
            <div className="text-center mb-8">
                <h3 className={`text-lg font-bold uppercase tracking-wider mb-2 ${highlighted ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>{plan}</h3>
                <div className="flex items-baseline justify-center gap-1">
                    <span className={`text-5xl font-black font-heading ${highlighted ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{price}</span>
                    {price !== 'Free' && <span className={highlighted ? 'text-white/60' : 'text-slate-500'}>/mo</span>}
                </div>
            </div>
            <ul className="space-y-4 mb-8">
                {features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full ${highlighted ? 'bg-white/20' : 'bg-indigo-500/20'} flex items-center justify-center flex-shrink-0`}>
                            <Check size={12} className={highlighted ? 'text-white' : 'text-indigo-500'} />
                        </div>
                        <span className={`text-sm ${highlighted ? 'text-white/90' : 'text-slate-600 dark:text-slate-400'}`}>{feature}</span>
                    </li>
                ))}
            </ul>
            <button className={`w-full py-4 rounded-2xl font-bold uppercase tracking-wider transition-all ${highlighted
                ? 'bg-white text-indigo-600 hover:shadow-xl hover:scale-[1.02]'
                : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:scale-[1.02]'
                }`}>
                Get Started
            </button>
        </motion.div>
    );
};

// Testimonial Card
const TestimonialCard: React.FC<{
    name: string;
    role: string;
    company: string;
    image: string;
    quote: string;
    delay: number;
}> = ({ name, role, company, image, quote, delay }) => {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay }}
            viewport={{ once: true }}
            className="p-8 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-white/10 shadow-lg"
        >
            <Quote size={32} className="text-indigo-500/30 mb-4" />
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-6">"{quote}"</p>
            <div className="flex items-center gap-4">
                <img src={image} alt={name} className="w-12 h-12 rounded-full object-cover" />
                <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">{name}</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{role} at {company}</p>
                </div>
            </div>
            <div className="flex gap-1 mt-4">
                {[...Array(5)].map((_, i) => (
                    <Star key={i} size={14} className="text-amber-400 fill-amber-400" />
                ))}
            </div>
        </motion.div>
    );
};

// Step Card for How It Works
const StepCard: React.FC<{
    number: number;
    title: string;
    description: string;
    delay: number;
}> = ({ number, title, description, delay }) => {
    return (
        <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay }}
            viewport={{ once: true }}
            className="relative flex gap-6"
        >
            <div className="flex-shrink-0">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-indigo-500/30">
                    {number}
                </div>
            </div>
            <div className="pt-2">
                <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white font-heading">{title}</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{description}</p>
            </div>
        </motion.div>
    );
};

// AI Feature Card
const AIFeatureCard: React.FC<{
    icon: React.ElementType;
    title: string;
    description: string;
    delay: number;
}> = ({ icon: Icon, title, description, delay }) => {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay }}
            viewport={{ once: true }}
            whileHover={{ scale: 1.03 }}
            className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/50 shadow-xl overflow-hidden group relative"
        >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center mb-4">
                    <Icon size={24} className="text-white" />
                </div>
                <h3 className="text-lg font-bold mb-2 text-white">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
            </div>
            <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-indigo-500/20 rounded-full blur-2xl" />
        </motion.div>
    );
};

const Landing: React.FC = () => {
    const navigate = useNavigate();
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [activeTestimonial, setActiveTestimonial] = useState(0);
    const [platformStats, setPlatformStats] = useState<{
        activeSellers: number;
        totalProducts: number;
        countries: string;
        uptime: string;
    } | null>(null);
    const [statsLoading, setStatsLoading] = useState(true);
    const heroRef = useRef(null);
    const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
    const heroY = useTransform(scrollYProgress, [0, 1], [0, 200]);
    const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Fetch platform stats
    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await api.get('/platform/stats');
                setPlatformStats(response.data);
            } catch (error) {
                console.error('Failed to fetch platform stats:', error);
                // Use fallback values if API fails
            } finally {
                setStatsLoading(false);
            }
        };
        fetchStats();
    }, []);

    // Auto-rotate testimonials
    useEffect(() => {
        const interval = setInterval(() => {
            setActiveTestimonial((prev) => (prev + 1) % 3);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const features = [
        { icon: Brain, title: 'AI Store Manager', description: 'Intelligent automation handles inventory, pricing, and customer service 24/7 with smart recommendations.', color: 'indigo' },
        { icon: CreditCard, title: 'Stripe Connect', description: 'Seamless payment processing with automatic splits, fraud detection, and global currency support.', color: 'purple' },
        { icon: Image, title: 'Image Compression', description: 'AI-powered image optimization reduces file sizes by 80% while maintaining crystal clear quality.', color: 'pink' },
        { icon: ShieldCheck, title: 'Content Guard', description: 'Advanced AI moderation protects your store from inappropriate content and counterfeit products.', color: 'emerald' },
        { icon: Building2, title: 'Multi-Tenant Architecture', description: 'Scale infinitely with isolated tenant environments, shared resources, and dedicated databases.', color: 'amber' },
        { icon: Search, title: 'Automated SEO', description: 'Smart SEO optimization boosts rankings with auto-generated meta tags, sitemaps, and schema markup.', color: 'cyan' },
    ];

    const pricingPlans = [
        {
            plan: 'Free',
            price: '$0',
            features: ['200 products', '3 stores', '500MB storage', 'Basic SEO tools', 'Basic analytics', '5% commission on sales']
        },
        {
            plan: 'Pro',
            price: '$15',
            features: ['Unlimited products', 'Unlimited stores', '10GB storage', 'Advanced SEO tools', 'Advanced analytics', 'AI-powered features', '2% commission on sales']
        },
        {
            plan: 'Enterprise',
            price: '$99',
            features: ['Everything in PRO', 'Unlimited storage', 'Priority support', 'Custom integrations', '0% commission']
        }
    ];

    const steps = [
        { number: 1, title: 'Sign Up', description: 'Create your free account in seconds with just your email. No credit card required to start.' },
        { number: 2, title: 'Launch Store', description: 'Choose from 100+ stunning templates or build custom. Add products, set prices, configure payments.' },
        { number: 3, title: 'Start Selling', description: 'Share your store instantly. Accept payments globally with Stripe, track orders in real-time.' },
        { number: 4, title: 'AI Grows Your Business', description: 'Let AI optimize your store 24/7. Auto-pricing, inventory predictions, smart marketing campaigns.' },
    ];

    const testimonials = [
        { name: 'Sarah Chen', role: 'Founder', company: 'LuxeBeauty', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop', quote: 'ACommerce transformed my business. The AI features alone saved me 20 hours per week on inventory management.' },
        { name: 'Marcus Rodriguez', role: 'CEO', company: 'TechGear', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop', quote: 'We scaled from 100 to 10,000 products in months. The multi-tenant architecture handles everything flawlessly.' },
        { name: 'Emma Thompson', role: 'Director', company: 'FashionForward', image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop', quote: 'The SEO automation is incredible. Our organic traffic increased 300% within the first quarter.' },
    ];

    const aiFeatures = [
        { icon: Wand2, title: 'Smart Product Descriptions', description: 'AI generates compelling, SEO-optimized descriptions for every product automatically.' },
        { icon: TrendingUp, title: 'Predictive Analytics', description: 'Forecast trends and demand with machine learning trained on millions of transactions.' },
        { icon: HeadphonesIcon, title: 'AI Customer Support', description: '24/7 intelligent chatbot handles inquiries, resolves issues, and boosts satisfaction.' },
        { icon: Target, title: 'Dynamic Pricing', description: 'Real-time price optimization based on competitors, demand, and customer behavior.' },
    ];

    // Platform stats - use real data if available, otherwise show loading or fallback
    const stats = statsLoading ? [
        { value: 0, suffix: '', label: 'Active Sellers' },
        { value: 0, suffix: '', label: 'Products Listed' },
        { value: 0, suffix: '', label: 'Countries' },
        { value: 0, suffix: '%', label: 'Uptime' },
    ] : platformStats ? [
        { value: platformStats.activeSellers, suffix: '+', label: 'Active Sellers' },
        { value: platformStats.totalProducts, suffix: '+', label: 'Products Listed' },
        { value: parseInt(platformStats.countries.replace('+', '')) || 150, suffix: platformStats.countries.includes('+') ? '+' : '', label: 'Countries' },
        { value: parseFloat(platformStats.uptime.replace('%', '')) || 99.9, suffix: '%', label: 'Uptime' },
    ] : [
        { value: 50000, suffix: '+', label: 'Active Sellers' },
        { value: 2000000, suffix: '+', label: 'Products Listed' },
        { value: 150, suffix: '+', label: 'Countries' },
        { value: 99.9, suffix: '%', label: 'Uptime' },
    ];

    const partners = ['Stripe', 'Vercel', 'AWS', 'Google Cloud', 'Supabase', 'Firebase'];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#030712] text-slate-900 dark:text-white selection:bg-indigo-500/30 font-sans overflow-x-hidden">
            {/* Animated Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <motion.div
                    animate={{
                        background: ['radial-gradient(ellipse at 20% 30%, rgba(99, 102, 241, 0.15) 0%, transparent 50%)', 'radial-gradient(ellipse at 80% 70%, rgba(168, 85, 247, 0.15) 0%, transparent 50%)', 'radial-gradient(ellipse at 20% 30%, rgba(99, 102, 241, 0.15) 0%, transparent 50%)']
                    }}
                    transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute inset-0"
                />
                <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />
            </div>

            {/* Navigation */}
            <motion.nav
                initial={{ y: -100 }}
                animate={{ y: 0 }}
                className={`fixed top-0 w-full z-50 transition-all duration-500 ${scrolled ? 'bg-white/80 dark:bg-black/80 backdrop-blur-2xl border-b border-slate-200 dark:border-white/5 py-4' : 'bg-transparent py-6'
                    }`}
            >
                <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
                    <div className="flex items-center gap-3 font-black text-2xl tracking-tighter cursor-pointer group" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:scale-110 transition-transform">
                            <ShoppingBag size={22} className="text-white" />
                        </div>
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-400 font-heading">
                            ACommerce
                        </span>
                    </div>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center gap-8 text-sm font-semibold">
                        <a href="#features" className="text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white transition-colors">Features</a>
                        <a href="#how-it-works" className="text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white transition-colors">How It Works</a>
                        <a href="#pricing" className="text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white transition-colors">Pricing</a>
                        <a href="#testimonials" className="text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white transition-colors">Testimonials</a>
                        <a href="#ai-showcase" className="text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white transition-colors">AI Features</a>
                    </div>

                    <div className="flex items-center gap-4">
                        <ThemeToggle />
                        <button onClick={() => navigate('/login')} className="hidden sm:block text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white transition-colors">Sign In</button>
                        <button onClick={() => navigate('/login')} className="hidden md:block bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-2.5 rounded-full text-sm font-bold uppercase tracking-wider transition-all hover:scale-105 hover:shadow-xl shadow-indigo-500/30">
                            Get Started
                        </button>
                        <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                <AnimatePresence>
                    {mobileMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="md:hidden bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-white/10"
                        >
                            <div className="px-6 py-4 space-y-4">
                                <a href="#features" className="block py-2 text-slate-600 dark:text-slate-300" onClick={() => setMobileMenuOpen(false)}>Features</a>
                                <a href="#how-it-works" className="block py-2 text-slate-600 dark:text-slate-300" onClick={() => setMobileMenuOpen(false)}>How It Works</a>
                                <a href="#pricing" className="block py-2 text-slate-600 dark:text-slate-300" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
                                <a href="#testimonials" className="block py-2 text-slate-600 dark:text-slate-300" onClick={() => setMobileMenuOpen(false)}>Testimonials</a>
                                <a href="#ai-showcase" className="block py-2 text-slate-600 dark:text-slate-300" onClick={() => setMobileMenuOpen(false)}>AI Features</a>
                                <button onClick={() => { navigate('/login'); setMobileMenuOpen(false); }} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-full font-bold">
                                    Get Started
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.nav>

            {/* Hero Section */}
            <section ref={heroRef} className="relative z-10 pt-40 pb-24 md:pt-56 md:pb-40 px-6 overflow-hidden">
                <motion.div style={{ y: heroY, opacity: heroOpacity }}>
                    <div className="max-w-7xl mx-auto text-center">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 dark:bg-white/5 border border-indigo-100 dark:border-white/10 text-indigo-600 dark:text-indigo-300 text-xs font-bold uppercase tracking-wider mb-10"
                        >
                            <Sparkles size={14} className="animate-pulse" />
                            <span>AI-Powered E-Commerce Platform</span>
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.1 }}
                            className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight mb-8 leading-[0.95] font-heading"
                        >
                            Build Your Online Empire with{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 animate-gradient">
                                AI-Powered Commerce
                            </span>
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            className="text-xl md:text-2xl text-slate-500 dark:text-slate-400 max-w-3xl mx-auto mb-12 leading-relaxed"
                        >
                            Launch your online store in minutes with intelligent automation, powerful analytics, and AI that grows your business 24/7.
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.3 }}
                            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
                        >
                            <button onClick={() => navigate('/login')} className="w-full sm:w-auto px-10 py-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-bold text-lg uppercase tracking-wider transition-all shadow-2xl shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:-translate-y-1 hover:scale-105 flex items-center justify-center gap-2">
                                Start Free
                                <ArrowRight size={20} />
                            </button>
                            <button className="w-full sm:w-auto px-10 py-5 bg-white/80 dark:bg-white/5 text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 rounded-2xl font-bold text-lg uppercase tracking-wider transition-all hover:-translate-y-1 hover:scale-105 flex items-center justify-center gap-2 backdrop-blur-xl">
                                <Play size={20} className="fill-current" />
                                Watch Demo
                            </button>
                        </motion.div>

                        {/* Trust Badges */}
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.4 }}
                            className="flex flex-wrap items-center justify-center gap-6 md:gap-10"
                        >
                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                <Shield size={18} className="text-emerald-500" />
                                <span className="text-sm font-semibold">Bank-Level Security</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                <Zap size={18} className="text-amber-500" />
                                <span className="text-sm font-semibold">Free Forever Tier</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                <Brain size={18} className="text-purple-500" />
                                <span className="text-sm font-semibold">AI-Powered</span>
                            </div>
                        </motion.div>

                        {/* Floating 3D Elements */}
                        <motion.div
                            initial={{ opacity: 0, y: 100 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.5 }}
                            className="mt-20 relative"
                        >
                            <div className="absolute -inset-20 bg-gradient-to-b from-indigo-500/20 via-purple-500/10 to-transparent blur-3xl -z-10 rounded-full" />
                            <div className="relative rounded-[2rem] overflow-hidden shadow-2xl border border-slate-200/50 dark:border-white/10 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl p-2">
                                <div className="rounded-[1.5rem] overflow-hidden relative bg-gradient-to-br from-slate-100 to-white dark:from-slate-900 dark:to-slate-800">
                                    <img
                                        src="https://images.unsplash.com/photo-1551288049-bebda4e3f890?q=80&w=2400&auto=format&fit=crop"
                                        alt="Platform Dashboard"
                                        className="w-full h-auto"
                                        loading="lazy"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-white/10 dark:from-black/20 pointer-events-none" />

                                    {/* Floating UI Elements */}
                                    <motion.div
                                        animate={{ y: [-10, 10, -10] }}
                                        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                                        className="absolute top-8 right-8 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-xl p-4 shadow-xl"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
                                                <TrendingUp size={20} className="text-white" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">Revenue</p>
                                                <p className="font-bold text-slate-900 dark:text-white">+127%</p>
                                            </div>
                                        </div>
                                    </motion.div>

                                    <motion.div
                                        animate={{ y: [15, -15, 15] }}
                                        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                                        className="absolute bottom-8 left-8 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-xl p-4 shadow-xl"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center">
                                                <ShoppingCart size={20} className="text-white" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">Orders</p>
                                                <p className="font-bold text-slate-900 dark:text-white">2,847</p>
                                            </div>
                                        </div>
                                    </motion.div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </motion.div>
            </section>

            {/* Stats Section */}
            <section className="relative z-10 py-20 bg-white/50 dark:bg-black/20 backdrop-blur-xl border-y border-slate-200/50 dark:border-white/5">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {stats.map((stat, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: i * 0.1 }}
                                viewport={{ once: true }}
                                className="text-center"
                            >
                                <div className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-2 font-heading">
                                    <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                                </div>
                                <div className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{stat.label}</div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-32 relative z-10">
                <div className="max-w-7xl mx-auto px-6">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        viewport={{ once: true }}
                        className="text-center mb-20"
                    >
                        <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tight font-heading">
                            Everything You Need to <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Succeed</span>
                        </h2>
                        <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
                            Powerful features designed to help you build, launch, and scale your online empire.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {features.map((feature, i) => (
                            <FeatureCard key={i} {...feature} delay={i * 0.1} />
                        ))}
                    </div>
                </div>
            </section>

            {/* How It Works Section */}
            <section id="how-it-works" className="py-32 relative z-10 bg-white/30 dark:bg-black/20 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-6">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        viewport={{ once: true }}
                        className="text-center mb-20"
                    >
                        <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tight font-heading">
                            Launch in <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">Minutes</span>, Not Months
                        </h2>
                        <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
                            From sign-up to your first sale in just four simple steps.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20">
                        <div className="space-y-12">
                            {steps.slice(0, 2).map((step, i) => (
                                <StepCard key={i} {...step} delay={i * 0.2} />
                            ))}
                        </div>
                        <div className="space-y-12 md:mt-20">
                            {steps.slice(2, 4).map((step, i) => (
                                <StepCard key={i + 2} {...step} delay={i * 0.2 + 0.2} />
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="py-32 relative z-10">
                <div className="max-w-7xl mx-auto px-6">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        viewport={{ once: true }}
                        className="text-center mb-20"
                    >
                        <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tight font-heading">
                            Simple, <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-600">Transparent</span> Pricing
                        </h2>
                        <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
                            Start free, upgrade when you're ready. No hidden fees, cancel anytime.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto items-stretch">
                        {pricingPlans.map((plan, i) => (
                            <PricingCard key={i} {...plan} highlighted={i === 1} delay={i * 0.15} />
                        ))}
                    </div>
                </div>
            </section>

            {/* Testimonials Section */}
            <section id="testimonials" className="py-32 relative z-10 bg-gradient-to-b from-white/50 to-indigo-50/30 dark:from-black/20 dark:to-indigo-900/10">
                <div className="max-w-7xl mx-auto px-6">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        viewport={{ once: true }}
                        className="text-center mb-20"
                    >
                        <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tight font-heading">
                            Loved by <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-cyan-500">Thousands</span>
                        </h2>
                        <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
                            See what our merchants have to say about building with ACommerce.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {testimonials.map((testimonial, i) => (
                            <TestimonialCard key={i} {...testimonial} delay={i * 0.15} />
                        ))}
                    </div>

                    {/* Partners */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                        viewport={{ once: true }}
                        className="mt-20 text-center"
                    >
                        <p className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-8">Trusted by Leading Platforms</p>
                        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
                            {/* Stripe */}
                            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-slate-800 shadow-md">
                                <svg viewBox="0 0 60 25" className="h-8 w-auto" fill="#635BFF">
                                    <path d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.33 8.33 0 0 1-4.56 1.1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.02 1.04-.06 1.48zm-6.08-3.48c0-1.87.98-2.83 2.28-2.83 1.2 0 2.18.84 2.38 2.83h-4.66zM40.95 20.3c-1.44 0-2.32-.6-2.9-1.04l-.02 4.63-4.12.87V5.57h3.76l.08 1.02a4.7 4.7 0 0 1 3.23-1.29c2.9 0 5.62 2.6 5.62 7.4 0 5.23-2.7 7.6-5.65 7.6zM40 8.95c-.95 0-1.54.34-1.97.81l.02 6.12c.4.44.98.78 1.95.78 1.52 0 2.54-1.65 2.54-3.87 0-2.15-1.04-3.84-2.54-3.84zM28.24 5.57h4.13v14.44h-4.13V5.57zm0-5.13L32.37 0v3.42l-4.13.88V.44zM20.28 20.3c-2.25 0-3.9-.68-4.71-1.54l-.04 1.35h-4.13V.44l4.16-.88v3.67a5.08 5.08 0 0 1 3.22-1.2v4.14c.2-.08.42-.12.66-.12 1.07 0 1.8.52 2.1 1.47 1.2-.96 2.36-1.47 4.04-1.47 3.4 0 5.85 2.66 5.85 7.38 0 5.29-2.7 7.55-6.15 7.55zm-.54-10.84c-1.27 0-2.13.68-2.63 1.48 0 1.42.74 2.37 2.4 2.37 1.7 0 2.44-.92 2.44-2.23 0-1.3-.74-2.62-2.21-2.62zM9.46 20.08l-.12-.97c-.4.56-.96 1.01-1.96 1.01-1.87 0-3.53-1.6-3.53-7.23 0-5.5 1.58-7.23 3.95-7.23 1.04 0 1.7.45 2.18 1.05l.1-.82h4.12v14.2h-4.14v-1.01zm-2.08-4.89c1.1 0 1.94-.8 1.94-2.3 0-1.64-.94-2.33-2.17-2.33-1.14 0-1.95.84-1.95 2.33 0 1.47.74 2.3 2.18 2.3z" />
                                </svg>
                            </div>
                            {/* Vercel */}
                            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-slate-800 shadow-md">
                                <svg viewBox="0 0 76 65" className="h-8 w-auto" fill="#000000">
                                    <path d="M37.5 0L75 65H0L37.5 0z" />
                                </svg>
                            </div>
                            {/* AWS */}
                            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-slate-800 shadow-md">
                                <svg viewBox="0 0 87.5 50" className="h-8 w-auto" fill="#FF9900">
                                    <path d="M0 47.5L5 42.5L15 47.5L0 47.5zM82.5 40L75 47.5L87.5 47.5L82.5 40zM75 5L82.5 0L75 0L70 5L75 5zM40 17.5L45 15L50 17.5L45 20L40 17.5zM30 25L37.5 10L45 25L37.5 27.5L30 25zM55 25L60 20L65 25L60 27.5L55 25zM15 40L20 35L25 40L20 42.5L15 40zM17.5 30L25 17.5L30 25L25 27.5L17.5 30zM57.5 30L65 25L67.5 27.5L60 35L57.5 30zM45 35L55 25L57.5 30L50 40L45 35zM20 42.5L25 40L27.5 42.5L22.5 45L20 42.5zM70 42.5L67.5 45L62.5 42.5L65 40L70 42.5z" />
                                </svg>
                            </div>
                            {/* Google Cloud */}
                            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-slate-800 shadow-md">
                                <svg viewBox="0 0 100 100" className="h-8 w-auto" fill="#4285F4">
                                    <path d="M50 0C30.4 0 15.3 12.2 8.4 29.4l12.9 7.5c4.3-10.7 14.3-18.4 26.1-18.4 15.3 0 27.7 12.4 27.7 27.7s-12.4 27.7-27.7 27.7c-9.8 0-18.4-5.1-23.3-12.8l-13.3 7.7c7.7 11.9 21.2 20 38.2 20 23.9 0 43.4-19.5 43.4-43.4S73.9 0 50 0z" />
                                    <path d="M27.5 40.4l-12.9-7.5C7.8 44.1 0 56.3 0 70.7c0 14.4 6.6 27.5 17.1 36.1l13.3-7.7C25.4 91.3 18.3 82 18.3 70.7c0-6.7 2.6-12.9 7-17.8l2.2 4.5c-2.7 3.2-4.3 7.4-4.3 11.9 0 6.6 3.1 12.5 7.9 16.3l-3.4 3.4c-6.7-6.7-10.8-16.1-10.8-26.8 0-11.5 6.2-21.7 15.6-27.2l-5-5.4z" />
                                    <path d="M58.1 67.5l12.6-7.3c1.1 3.2 1.7 6.6 1.7 10.2 0 3.6-.6 7-1.7 10.2l-12.6-7.3c.6-1.8.9-3.7.9-5.7s-.3-3.9-.9-5.7v-4.4z" />
                                    <path d="M91.6 60.1l-12.9 7.5c2.2 4.3 3.4 9 3.4 13.9 0 4.9-1.2 9.6-3.4 13.9l12.9 7.5c4.9-8 7.7-17.3 7.7-27.3s-2.8-19.3-7.7-27.5z" />
                                    <path d="M82.2 87.4l-12.6-7.3c-.6 1.8-.9 3.7-.9 5.7s.3 3.9.9 5.7l12.6 7.3c-.6-1.8-.9-3.7-.9-5.7s.3-3.9.9-5.7z" />
                                </svg>
                            </div>
                            {/* Supabase */}
                            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-slate-800 shadow-md">
                                <svg viewBox="0 0 127 114" className="h-8 w-auto" fill="#3ECF8E">
                                    <path d="M2.5 68.2L62.9 4.7c2.9-2.9 7.7-2.9 10.6 0l6.7 6.7c2.9 2.9 2.9 7.7 0 10.6L26.1 84.5h71.2c4.1 0 7.5 3.4 7.5 7.5v.1c0 4.1-3.4 7.5-7.5 7.5H24.9l49.6 49.6c2.9 2.9 2.9 7.7 0 10.6l-6.7 6.7c-2.9 2.9-7.7 2.9-10.6 0L2.5 78.3c-2.9-2.9-2.9-7.7 0-10.6l-.3-.3.3-.2z" />
                                </svg>
                            </div>
                            {/* Firebase */}
                            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-slate-800 shadow-md">
                                <svg viewBox="0 0 24 24" className="h-8 w-auto" fill="#FFCA28">
                                    <path d="M3.89 15.672L6.255.461A.542.542 0 0 1 7 .27l2.245 14.771L22.842 9.94a.542.542 0 0 1 .923.47l-7.036 9.705a.542.542 0 0 1-.461.277l-2.882.378a.542.542 0 0 1-.485-.39L3.891 15.9c-.117-.377.135-.75.485-.392l-.486.164z" />
                                    <path d="M23.763 9.94L9.5 19.241V29.5c0 1.93 1.57 3.5 3.5 3.5h2.5c1.93 0 3.5-1.57 3.5-3.5v-7.5l7.763-6.06z" />
                                </svg>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* AI Showcase Section */}
            <section id="ai-showcase" className="py-32 relative z-10 overflow-hidden">
                {/* Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950" />
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOCAxOC04LjA1OSAxOC0xOC04LjA1OS0xOC0xOC0xOHptMCAzMmMtNy43MzIgMC0xNC02LjI2OC0xNC0xNHM2LjI2OC0xNCAxNC0xNCAxNCA2LjI2OCAxNCAxNC02LjI2OCAxNC0xNCAxNHoiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iLjAyIi8+PC9nPjwvc3ZnPg==')] opacity-20" />

                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        viewport={{ once: true }}
                        className="text-center mb-20"
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-6">
                            <Brain size={14} /> AI-Powered
                        </div>
                        <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tight font-heading text-white">
                            Let AI Grow Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">Business</span>
                        </h2>
                        <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                            Advanced AI features that work 24/7 to optimize your store, engage customers, and drive sales.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {aiFeatures.map((feature, i) => (
                            <AIFeatureCard key={i} {...feature} delay={i * 0.1} />
                        ))}
                    </div>

                    {/* CTA */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                        viewport={{ once: true }}
                        className="mt-16 text-center"
                    >
                        <button onClick={() => navigate('/login')} className="px-10 py-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-bold text-lg uppercase tracking-wider transition-all shadow-2xl shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:-translate-y-1 hover:scale-105 inline-flex items-center gap-2">
                            Try AI Features Free
                            <ArrowRight size={20} />
                        </button>
                    </motion.div>
                </div>
            </section>

            {/* Newsletter Section */}
            <section className="py-20 relative z-10">
                <div className="max-w-4xl mx-auto px-6">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        viewport={{ once: true }}
                        className="p-10 md:p-16 rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-700 text-white text-center relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOCAxOC04LjA1OSAxOC0xOC04LjA1OS0xOC0xOC0xOHptMCAzMmMtNy43MzIgMC0xNC02LjI2OC0xNC0xNHM2LjI2OC0xNCAxNC0xNCAxNCA2LjI2OCAxNCAxNC02LjI2OCAxNC0xNCAxNHoiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iLjAyIi8+PC9nPjwvc3ZnPg==')] opacity-10" />
                        <div className="relative z-10">
                            <h3 className="text-3xl md:text-4xl font-black mb-4 font-heading">Stay Ahead of the Curve</h3>
                            <p className="text-indigo-100 mb-8 max-w-lg mx-auto">Get the latest e-commerce tips, AI insights, and platform updates delivered to your inbox.</p>
                            <form className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto" onSubmit={(e) => e.preventDefault()}>
                                <input type="email" placeholder="Enter your email" className="flex-1 px-6 py-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-indigo-200 focus:outline-none focus:ring-2 focus:ring-white/50 backdrop-blur-xl" />
                                <button type="submit" className="px-8 py-4 bg-white text-indigo-600 rounded-xl font-bold uppercase tracking-wider hover:shadow-xl transition-all hover:scale-105">
                                    Subscribe
                                </button>
                            </form>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-16 border-t border-slate-200 dark:border-white/5 bg-white/30 dark:bg-black/20 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
                        <div className="col-span-2">
                            <div className="flex items-center gap-3 font-black text-2xl tracking-tighter mb-4">
                                <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
                                    <ShoppingBag size={22} className="text-white" />
                                </div>
                                <span className="font-heading">ACommerce</span>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-xs">Build your online empire with AI-powered e-commerce. Start free, scale infinitely.</p>
                            <div className="flex gap-4">
                                <a href="#" className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-indigo-500 hover:text-white transition-all">
                                    <Twitter size={18} />
                                </a>
                                <a href="#" className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-indigo-500 hover:text-white transition-all">
                                    <Linkedin size={18} />
                                </a>
                                <a href="#" className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-indigo-500 hover:text-white transition-all">
                                    <Github size={18} />
                                </a>
                                <a href="#" className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-indigo-500 hover:text-white transition-all">
                                    <Youtube size={18} />
                                </a>
                            </div>
                        </div>
                        <div>
                            <h4 className="font-bold mb-4 text-slate-900 dark:text-white">Product</h4>
                            <ul className="space-y-3">
                                <li><a href="#features" className="text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white transition-colors">Features</a></li>
                                <li><a href="#pricing" className="text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white transition-colors">Pricing</a></li>
                                <li><a href="#" className="text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white transition-colors">Integrations</a></li>
                                <li><a href="#" className="text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white transition-colors">Changelog</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold mb-4 text-slate-900 dark:text-white">Company</h4>
                            <ul className="space-y-3">
                                <li><a href="#" className="text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white transition-colors">About</a></li>
                                <li><a href="#" className="text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white transition-colors">Blog</a></li>
                                <li><a href="#" className="text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white transition-colors">Careers</a></li>
                                <li><a href="#" className="text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white transition-colors">Contact</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold mb-4 text-slate-900 dark:text-white">Legal</h4>
                            <ul className="space-y-3">
                                <li><a href="#" className="text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white transition-colors">Privacy</a></li>
                                <li><a href="#" className="text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white transition-colors">Terms</a></li>
                                <li><a href="#" className="text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white transition-colors">Security</a></li>
                                <li><a href="#" className="text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white transition-colors">Cookies</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="pt-8 border-t border-slate-200 dark:border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
                        <p className="text-sm text-slate-400 dark:text-slate-500">© {new Date().getFullYear()} ACommerce Inc. All rights reserved.</p>
                        <p className="text-sm text-slate-400 dark:text-slate-500">Built with ❤️ for entrepreneurs everywhere.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Landing;
