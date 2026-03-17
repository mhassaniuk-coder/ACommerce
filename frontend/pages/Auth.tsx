import React, { useState, useEffect } from 'react';
import { ShoppingBag, ArrowRight, User as UserIcon, Mail, Lock, Loader2, Eye, EyeOff, Shield, Zap, Sparkles, CheckCircle2, ArrowLeft, KeyRound } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { ThemeToggle } from '../context/ThemeContext';
import { useAuth } from '../src/context/AuthContext';
import api from '../src/lib/api';
import { useNavigate } from 'react-router-dom';
import { auth, db, googleProvider, firebaseInitialized } from '../src/lib/firebase';
import {
    signInWithEmailAndPassword as firebaseSignIn,
    createUserWithEmailAndPassword as firebaseCreateUser,
    sendPasswordResetEmail as firebaseSendPasswordResetEmail,
    signInWithPopup as firebaseSignInWithPopup
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { supabase } from '../src/lib/supabase';
import { USE_FIREBASE } from '../src/lib/config';
import { getPostLoginRoute } from '../src/lib/adminAccess';
import { User } from '../types';

type AuthMode = 'signin' | 'signup' | 'forgot_password';

const InputField: React.FC<any> = ({ icon: Icon, type, value, onChange, label, autoFocus = false, extraProps = {} }) => {
    const [focused, setFocused] = useState(false);
    const isFilled = value && value.length > 0;
    const active = focused || isFilled;

    return (
        <div className="relative group/input mt-6">
            <div className={`absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur opacity-0 group-focus-within/input:opacity-50 transition duration-500 ${extraProps.disabled ? 'hidden' : ''}`}></div>
            <div className={`relative flex items-center bg-white dark:bg-black/40 border rounded-2xl transition-all duration-300 ${extraProps.disabled ? 'border-gray-100 dark:border-white/5 opacity-60 bg-gray-50 dark:bg-white/5' : 'border-gray-200 dark:border-white/10 focus-within:border-indigo-500'}`}>
                <Icon className={`absolute left-4 transition-colors duration-300 ${focused ? 'text-indigo-500' : 'text-gray-400'}`} size={20} />
                <label className={`absolute left-12 transition-all duration-300 pointer-events-none ${active ? '-top-3 text-[10px] font-bold tracking-wider uppercase px-2 bg-white dark:bg-[#0a0f1d] text-indigo-500 dark:text-indigo-400 rounded-full' : 'top-4 text-sm text-gray-400'}`}>
                    {label}
                </label>
                <input
                    type={type} required autoFocus={autoFocus} value={value} onChange={onChange}
                    onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
                    className={`w-full pl-12 pr-4 py-4 bg-transparent border-none outline-none text-slate-900 dark:text-white placeholder-transparent text-sm ${extraProps.disabled ? 'cursor-not-allowed text-gray-400' : ''}`}
                    placeholder={label}
                    {...extraProps}
                />
            </div>
        </div>
    );
};

export const Auth: React.FC = () => {
    const [mode, setMode] = useState<AuthMode>('signin');
    const [step, setStep] = useState<1 | 2>(1); // Step 1: Email, Step 2: Password/Details

    // Form State
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // UI State
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [mounted, setMounted] = useState(false);

    // Recovery State
    const [recoveryEmailSent, setRecoveryEmailSent] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    const { showToast } = useToast();
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleEmailSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return showToast("Email is required", "error");

        if (mode === 'forgot_password') {
            handleForgotPassword();
        } else {
            setStep(2);
        }
    };

    const handleForgotPassword = async () => {
        if (!email) return showToast("Email is required", "error");
        setLoading(true);
        try {
            // Try Firebase password reset first, fall back to backend
            try {
                if (USE_FIREBASE && firebaseInitialized && auth) {
                    await firebaseSendPasswordResetEmail(auth, email);
                } else if (supabase) {
                    const { error } = await supabase.auth.resetPasswordForEmail(email, {
                        redirectTo: `${window.location.origin}/#/auth/callback`,
                    });
                    if (error) throw error;
                } else {
                    throw new Error('No auth provider available');
                }
            } catch (firebaseErr: any) {
                // If Firebase auth isn't configured, show helpful message
                if (firebaseErr?.code === 'auth/configuration-not-found' || firebaseErr?.code === 'auth/invalid-api-key') {
                    showToast('Password reset is temporarily unavailable. Please contact support.', 'info');
                    setRecoveryEmailSent(true);
                    return;
                }
                throw firebaseErr;
            }
            setRecoveryEmailSent(true);
            showToast("Password reset link sent to your email.", "success");
        } catch (error: any) {
            showToast(error.message || "Failed to send reset link. Please try again.", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            setLoading(true);

            if (USE_FIREBASE && firebaseInitialized && auth && googleProvider) {
                try {
                    const result = await firebaseSignInWithPopup(auth, googleProvider);

                    // Sync with Backend PostgreSQL
                    const response = await api.post('/auth/google', {
                        email: result.user.email,
                        name: result.user.displayName || result.user.email?.split('@')[0],
                        avatar: result.user.photoURL
                    });

                    if (response.data.token) {
                        login(response.data.token, response.data.user);
                    }

                    showToast(`Welcome, ${response.data.user?.name || 'User'}!`, 'success');
                    navigate(getPostLoginRoute(response.data.user as User));
                } catch (firebaseErr: any) {
                    // Firebase Auth not configured — fall back to backend-only Google OAuth
                    if (firebaseErr?.code === 'auth/configuration-not-found' || firebaseErr?.code === 'auth/invalid-api-key') {
                        showToast('Google sign-in is being configured. Please use email sign-in for now.', 'info');
                        return;
                    }
                    throw firebaseErr;
                }
            } else if (supabase) {
                const { error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                        redirectTo: `${window.location.origin}/#/auth/callback`,
                    },
                });
                if (error) throw error;
            } else {
                showToast('Google sign-in is not available. Please use email sign-in.', 'info');
            }
        } catch (error: any) {
            console.error('Google Auth Error:', error);
            const message = error.code === 'auth/popup-blocked'
                ? 'Sign-in popup was blocked. Please allow popups for this site.'
                : error.code === 'auth/configuration-not-found'
                    ? 'Google sign-in is being configured. Please use email sign-in.'
                    : error.message || 'Google sign-in failed.';
            showToast(message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleFinalSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!password) return showToast("Password is required", "error");

        if (mode === 'signup') {
            if (!name.trim()) return showToast("Name is required", "error");
            if (password !== confirmPassword) return showToast("Passwords do not match", "error");
            if (password.length < 6) return showToast("Password must be at least 6 characters", "error");
        }

        setLoading(true);
        try {
            if (mode === 'signup') {
                // Always register via backend API (works regardless of Firebase Auth status)
                const response = await api.post('/auth/register', {
                    email: email.trim().toLowerCase(),
                    password,
                    name: name.trim()
                });

                if (response.data.token) {
                    login(response.data.token, response.data.user);
                }

                showToast("Account created successfully!", "success");
                navigate('/verify');
            } else {
                // Always sign in via backend API
                const response = await api.post('/auth/login', {
                    email: email.trim().toLowerCase(),
                    password
                });

                const userData = response.data.user;
                login(response.data.token, userData);

                showToast("Logged in successfully!", "success");
                if (userData?.isVerified === false) {
                    navigate('/verify');
                } else {
                    navigate(getPostLoginRoute(userData as User));
                }
            }
        } catch (error: any) {
            const msg = error?.response?.data?.error || error.message || (mode === 'signup' ? 'Registration failed' : 'Login failed');
            showToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    const switchMode = (newMode: AuthMode) => {
        setMode(newMode);
        setStep(1);
        setPassword('');
        setConfirmPassword('');
        setRecoveryEmailSent(false);
    };


    // Calculate password strength indicator (Simple example)
    const getPwdStrength = () => {
        let score = 0;
        if (password.length > 6) score += 1;
        if (password.match(/[A-Z]/)) score += 1;
        if (password.match(/[0-9]/)) score += 1;
        if (password.match(/[^a-zA-Z0-9]/)) score += 1;

        return score;
    };

    const strengthScore = getPwdStrength();
    const strengthColors = ['bg-gray-200 dark:bg-white/10', 'bg-red-500', 'bg-yellow-500', 'bg-emerald-400', 'bg-emerald-500'];
    const currentStrengthColor = password.length > 0 ? strengthColors[strengthScore] : strengthColors[0];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-indigo-500/30 transition-colors duration-500">
            {/* Animated Background Orbs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-500/10 blur-[120px] animate-pulse-slow"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-purple-500/10 blur-[120px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
            </div>

            <div className="relative min-h-screen grid grid-cols-1 lg:grid-cols-2 z-10">
                {/* Left Side: Branding & Premium Feel */}
                <div className="hidden lg:flex flex-col justify-between p-16 relative overflow-hidden border-r border-slate-200 dark:border-white/5 bg-white/30 dark:bg-black/20 backdrop-blur-3xl">
                    <div className="flex items-center gap-4 font-black text-3xl tracking-tighter cursor-pointer group" onClick={() => navigate('/')}>
                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/20 group-hover:scale-110 transition-transform">
                            <ShoppingBag className="text-white" size={24} />
                        </div>
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">ACommerce</span>
                    </div>

                    <div className="max-w-xl">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 mb-8 animate-fade-in">
                            <Sparkles size={14} className="animate-pulse" /> Unified Digital Infrastructure
                        </div>
                        <h1 className="text-6xl font-black mb-8 leading-[1.1] tracking-tight animate-slide-up">
                            Gateway to <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">Commerce Elite</span>
                        </h1>
                        <p className="text-xl text-slate-500 dark:text-slate-400 mb-12 leading-relaxed animate-slide-up" style={{ animationDelay: '100ms' }}>
                            Join the world's most advanced marketplace ecosystem. Scale your enterprise with precision-engineered tools and global liquidity.
                        </p>

                        <div className="space-y-6">
                            {[
                                { icon: Zap, title: "Velocity First", desc: "Instant deployment and sub-ms latency" },
                                { icon: Shield, title: "Hyper-Secure", desc: "Military-grade encryption for all assets" },
                                { icon: CheckCircle2, title: "Verified Trust", desc: "Built-in KYC and compliance protocols" }
                            ].map((f, i) => (
                                <div key={i} className="flex items-start gap-4 p-5 rounded-3xl bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/5 hover:border-indigo-500/30 transition-all group animate-slide-up" style={{ animationDelay: `${200 + i * 100}ms` }}>
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <f.icon size={22} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-white uppercase text-xs tracking-widest mb-1">{f.title}</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">{f.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 pt-10 border-t border-slate-200 dark:border-white/5">
                        <span>&copy; {new Date().getFullYear()} AUREON CORE</span>
                        <div className="flex gap-6">
                            <a href="#" className="hover:text-indigo-500 transition-colors">Security</a>
                            <a href="#" className="hover:text-indigo-500 transition-colors">Privacy</a>
                        </div>
                    </div>
                </div>

                {/* Right Side: Auth Forms */}
                <div className="flex items-center justify-center p-8 bg-slate-50/50 dark:bg-slate-950/50 backdrop-blur-sm">
                    <div className="w-full max-w-md">
                        {/* Mobile Logo */}
                        <div className="lg:hidden flex justify-center mb-12">
                            <div className="flex items-center gap-3 font-black text-2xl tracking-tighter" onClick={() => navigate('/')}>
                                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
                                    <ShoppingBag className="text-white" size={20} />
                                </div>
                                <span className="dark:text-white">ACommerce</span>
                            </div>
                        </div>

                        <div className={`glass-card p-10 md:p-12 rounded-[3rem] shadow-2xl transition-all duration-700 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
                            {/* Back Button */}
                            {(step > 1 || mode === 'forgot_password') && (
                                <button
                                    onClick={() => mode === 'forgot_password' ? switchMode('signin') : setStep(1)}
                                    className="absolute top-10 left-10 text-slate-400 hover:text-indigo-500 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-colors"
                                >
                                    <ArrowLeft size={14} /> Back
                                </button>
                            )}

                            <div className="text-center mb-10 pt-4">
                                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-3">
                                    {mode === 'signup' ? 'Initiate Node' : mode === 'forgot_password' ? 'Key Recovery' : 'Terminal Access'}
                                </h2>
                                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                                    {mode === 'signup' ? 'Deploy your enterprise node on ACommerce' : mode === 'forgot_password' ? 'Recover access to your digital vault' : 'Security credentials required for entry'}
                                </p>
                            </div>

                            <div className="space-y-6">
                                {mode === 'forgot_password' ? (
                                    recoveryEmailSent ? (
                                        <div className="text-center py-6 animate-fade-in">
                                            <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                                <CheckCircle2 size={40} />
                                            </div>
                                            <p className="text-slate-600 dark:text-slate-300 font-bold mb-8">Recovery link dispatched to {email}</p>
                                            <button onClick={() => switchMode('signin')} className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-105 transition-transform">Return to Sign In</button>
                                        </div>
                                    ) : (
                                        <form onSubmit={handleEmailSubmit} className="space-y-6">
                                            <InputField icon={Mail} type="email" label="Email Address" value={email} onChange={(e: any) => setEmail(e.target.value)} autoFocus />
                                            <button type="submit" disabled={loading} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-indigo-600/30 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50">
                                                {loading ? <Loader2 className="animate-spin mx-auto" /> : 'Request Recovery Link'}
                                            </button>
                                        </form>
                                    )
                                ) : step === 1 ? (
                                    <form onSubmit={handleEmailSubmit} className="space-y-6">
                                        <InputField icon={Mail} type="email" label="Identity Email" value={email} onChange={(e: any) => setEmail(e.target.value)} autoFocus />

                                        <button type="submit" disabled={loading} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-indigo-600/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
                                            Proceed to Authentication <ArrowRight size={16} />
                                        </button>

                                        <div className="relative flex items-center py-4">
                                            <div className="flex-grow border-t border-slate-200 dark:border-white/5"></div>
                                            <span className="flex-shrink mx-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Social Sync</span>
                                            <div className="flex-grow border-t border-slate-200 dark:border-white/5"></div>
                                        </div>

                                        <button type="button" onClick={handleGoogleLogin} className="w-full py-4 border border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-3">
                                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                                                <path fill="currentColor" d="M12.48 10.92v3.28h7.84c-.24 1.84-.92 3.32-2.12 4.4-1.2 1.2-3.08 2.4-6.16 2.4-4.8 0-8.68-3.88-8.68-8.68s3.88-8.68 8.68-8.68c2.6 0 4.52 1.04 5.92 2.36l2.32-2.32C17.96 1.48 15.36 0 12.04 0 5.4 0 0 5.4 0 12s5.4 12 12.04 12c3.56 0 6.24-1.16 8.36-3.32 2.2-2.2 2.88-5.32 2.88-7.76 0-.76-.08-1.52-.16-2H12.48z" />
                                            </svg>
                                            Continue with Google
                                        </button>
                                    </form>
                                ) : (
                                    <form onSubmit={handleFinalSubmit} className="space-y-6">
                                        <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl flex items-center justify-between group">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">@</div>
                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate max-w-[150px]">{email}</span>
                                            </div>
                                            <button type="button" onClick={() => setStep(1)} className="text-[10px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-600">Edit</button>
                                        </div>

                                        {mode === 'signup' && (
                                            <InputField icon={UserIcon} type="text" label="Full Enterprise Name" value={name} onChange={(e: any) => setName(e.target.value)} />
                                        )}

                                        <div className="relative group/pass">
                                            <InputField icon={Lock} type={showPassword ? "text" : "password"} label="Security Key" value={password} onChange={(e: any) => setPassword(e.target.value)} autoFocus={mode !== 'signup'} />
                                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 mt-3 text-slate-400 hover:text-indigo-500">
                                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>

                                        {mode === 'signup' && (
                                            <div className="relative group/pass">
                                                <InputField icon={Shield} type={showConfirmPassword ? "text" : "password"} label="Confirm Security Key" value={confirmPassword} onChange={(e: any) => setConfirmPassword(e.target.value)} />
                                                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 mt-3 text-slate-400 hover:text-indigo-500">
                                                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                        )}

                                        {mode === 'signin' && (
                                            <div className="flex justify-end">
                                                <button type="button" onClick={() => switchMode('forgot_password')} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-500 transition-colors">Credential Recovery?</button>
                                            </div>
                                        )}

                                        <button type="submit" disabled={loading} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-indigo-600/30 hover:scale-[1.02] active:scale-95 transition-all">
                                            {loading ? <Loader2 className="animate-spin mx-auto" /> : mode === 'signup' ? 'Complete Initialization' : 'Authorize Entry'}
                                        </button>
                                    </form>
                                )}

                                {mode !== 'forgot_password' && (
                                    <div className="text-center pt-8 mt-2 border-t border-slate-200 dark:border-white/5">
                                        <p className="text-sm font-medium text-slate-500">
                                            {mode === 'signup' ? 'Already part of the ecosystem?' : 'New digital explorer?'}{' '}
                                            <button onClick={() => switchMode(mode === 'signup' ? 'signin' : 'signup')} className="font-black text-indigo-500 hover:text-indigo-600 transition-colors uppercase gap-1 inline-flex items-center">
                                                {mode === 'signup' ? 'Sign In' : 'Sign Up'}
                                            </button>
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-12 text-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-400/50">
                            Powered by Aureon Hyperstructure
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
