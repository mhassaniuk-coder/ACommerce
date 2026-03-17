import React, { useState, useEffect, useCallback } from 'react';
import {
 ShoppingBag,
 ArrowRight,
 User as UserIcon,
 Mail,
 Lock,
 Loader2,
 Eye,
 EyeOff,
 Shield,
 Zap,
 Sparkles,
 CheckCircle2,
 ArrowLeft,
 KeyRound,
 Phone,
 MessageSquare,
 Timer,
 RefreshCw,
 Check,
 X,
 AlertTriangle
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../src/context/AuthContext';
import api from '../src/lib/api';
import { useNavigate } from 'react-router-dom';
import { auth, googleProvider, firebaseInitialized } from '../src/lib/firebase';
import {
 signInWithEmailAndPassword as firebaseSignIn,
 createUserWithEmailAndPassword as firebaseCreateUser,
 sendPasswordResetEmail as firebaseSendPasswordResetEmail,
 signInWithPopup as firebaseSignInWithPopup,
 signInWithPhoneNumber,
 RecaptchaVerifier
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { supabase } from '../src/lib/supabase';
import { USE_FIREBASE } from '../src/lib/config';
import { getPostLoginRoute } from '../src/lib/adminAccess';
import { User } from '../types';
import { getRecaptchaToken } from '../services/recaptchaService';

// Types
type AuthMode = 'signin' | 'signup' | 'forgot_password';
type AuthMethod = 'email' | 'phone';
type VerificationStep = 'input' | 'verify' | 'complete';

interface PasswordRequirement {
 label: string;
 test: (pwd: string) => boolean;
}

interface FormErrors {
 [key: string]: string;
}

// Password requirements
const passwordRequirements: PasswordRequirement[] = [
 { label: 'At least 8 characters', test: (p) => p.length >= 8 },
 { label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
 { label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
 { label: 'One number', test: (p) => /[0-9]/.test(p) },
 { label: 'One special character', test: (p) => /[^a-zA-Z0-9]/.test(p) },
];

// Reusable Input Component
const InputField: React.FC<{
 icon: React.ElementType;
 type: string;
 value: string;
 onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
 label: string;
 autoFocus?: boolean;
 error?: string;
 disabled?: boolean;
 maxLength?: number;
 onKeyDown?: (e: React.KeyboardEvent) => void;
}> = ({ icon: Icon, type, value, onChange, label, autoFocus = false, error, disabled = false, maxLength, onKeyDown }) => {
 const [focused, setFocused] = useState(false);
 const [showPassword, setShowPassword] = useState(false);
 const isFilled = value && value.length > 0;
 const active = focused || isFilled;
 const isPassword = type === 'password';

 return (
  <div className="relative group/input">
   <div className={`absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur opacity-0 group-focus-within/input:opacity-50 transition duration-500 ${disabled ? 'hidden' : ''} ${error ? '!from-red-500 !to-red-500' : ''}`}></div>
   <div className={`relative flex items-center bg-white dark:bg-black/40 border rounded-2xl transition-all duration-300 ${error ? 'border-red-500' : disabled ? 'border-gray-100 dark:border-white/5 opacity-60 bg-gray-50 dark:bg-white/5' : 'border-gray-200 dark:border-white/10 focus-within:border-indigo-500'}`}>
    <Icon className={`absolute left-4 transition-colors duration-300 ${focused ? 'text-indigo-500' : error ? 'text-red-500' : 'text-gray-400'}`} size={20} />
    <label className={`absolute left-12 transition-all duration-300 pointer-events-none ${active ? '-top-3 text-[10px] font-bold tracking-wider uppercase px-2 bg-white dark:bg-[#0a0f1d] text-indigo-500 dark:text-indigo-400 rounded-full' : 'top-4 text-sm text-gray-400'}`}>
     {label}
    </label>
    <input
     type={isPassword && showPassword ? 'text' : type}
     required
     autoFocus={autoFocus}
     value={value}
     onChange={onChange}
     onFocus={() => setFocused(true)}
     onBlur={() => setFocused(false)}
     disabled={disabled}
     maxLength={maxLength}
     onKeyDown={onKeyDown}
     className={`w-full pl-12 pr-12 py-4 bg-transparent border-none outline-none text-slate-900 dark:text-white placeholder-transparent text-sm ${disabled ? 'cursor-not-allowed text-gray-400' : ''}`}
     placeholder={label}
    />
    {isPassword && (
     <button
      type="button"
      onClick={() => setShowPassword(!showPassword)}
      className="absolute right-4 text-gray-400 hover:text-indigo-500 transition-colors"
     >
      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
     </button>
    )}
   </div>
   {error && (
    <p className="mt-2 text-xs font-medium text-red-500 flex items-center gap-1 animate-fade-in">
     <AlertTriangle size={12} /> {error}
    </p>
   )}
  </div>
 );
};

// OTP Input Component
const OTPInput: React.FC<{
 length: number;
 value: string;
 onChange: (value: string) => void;
 error?: string;
}> = ({ length, value, onChange, error }) => {
 const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

 useEffect(() => {
  if (inputRefs.current[0]) {
   inputRefs.current[0].focus();
  }
 }, []);

 const handleChange = (index: number, char: string) => {
  if (!/^\d*$/.test(char)) return;

  const newValue = value.split('');
  newValue[index] = char;
  const finalValue = newValue.join('').slice(0, length);
  onChange(finalValue);

  // Move to next input
  if (char && index < length - 1) {
   inputRefs.current[index + 1]?.focus();
  }
 };

 const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
  if (e.key === 'Backspace' && !value[index] && index > 0) {
   inputRefs.current[index - 1]?.focus();
  }
 };

 const handlePaste = (e: React.ClipboardEvent) => {
  e.preventDefault();
  const pastedData = e.clipboardData.getData('text').slice(0, length);
  onChange(pastedData);
  if (pastedData.length === length) {
   inputRefs.current[length - 1]?.focus();
  } else if (pastedData.length > 0) {
   inputRefs.current[pastedData.length]?.focus();
  }
 };

 return (
  <div className="space-y-3">
   <div className="flex justify-center gap-3" onPaste={handlePaste}>
    {Array.from({ length }).map((_, index) => (
     <input
      key={index}
      ref={(el) => (inputRefs.current[index] = el)}
      type="text"
      inputMode="numeric"
      maxLength={1}
      value={value[index] || ''}
      onChange={(e) => handleChange(index, e.target.value)}
      onKeyDown={(e) => handleKeyDown(index, e)}
      className={`w-14 h-16 text-center text-xl font-bold rounded-xl border-2 outline-none transition-all duration-200 bg-white dark:bg-black/40 ${error
       ? 'border-red-500 text-red-500 focus:border-red-500'
       : value[index]
        ? 'border-indigo-500 text-indigo-500'
        : 'border-gray-200 dark:border-white/10 text-slate-900 dark:text-white focus:border-indigo-500'
       }`}
     />
    ))}
   </div>
   {error && (
    <p className="text-xs font-medium text-red-500 flex items-center justify-center gap-1 animate-fade-in">
     <AlertTriangle size={12} /> {error}
    </p>
   )}
  </div>
 );
};

// Password Strength Indicator
const PasswordStrength: React.FC<{ password: string }> = ({ password }) => {
 const getStrength = () => {
  let score = 0;
  passwordRequirements.forEach((req) => {
   if (req.test(password)) score++;
  });
  return score;
 };

 const score = getStrength();
 const percentage = (score / passwordRequirements.length) * 100;
 const colors = ['bg-gray-200', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-emerald-400', 'bg-emerald-500'];
 const color = password ? colors[score] : colors[0];

 return (
  <div className="space-y-2 mt-4">
   <div className="h-2 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
    <div
     className={`h-full ${color} transition-all duration-500 ease-out`}
     style={{ width: `${percentage}%` }}
    />
   </div>
   <div className="grid grid-cols-2 gap-2">
    {passwordRequirements.map((req, index) => (
     <div
      key={index}
      className={`flex items-center gap-1 text-xs transition-colors ${req.test(password) ? 'text-emerald-500' : 'text-gray-400'
       }`}
     >
      {req.test(password) ? (
       <CheckCircle2 size={12} className="shrink-0" />
      ) : (
       <div className="w-3 h-3 rounded-full border border-gray-300 dark:border-gray-600 shrink-0" />
      )}
      <span>{req.label}</span>
     </div>
    ))}
   </div>
  </div>
 );
};

// Main Auth Form Component
export const AuthForm: React.FC = () => {
 // Auth Mode
 const [mode, setMode] = useState<AuthMode>('signin');
 const [authMethod, setAuthMethod] = useState<AuthMethod>('email');
 const [step, setStep] = useState<1 | 2>(1);

 // Phone Verification State
 const [verificationStep, setVerificationStep] = useState<VerificationStep>('input');
 const [phone, setPhone] = useState('');
 const [otp, setOtp] = useState('');
 const [confirmationResult, setConfirmationResult] = useState<any>(null);
 const [otpTimer, setOtpTimer] = useState(0);
 const [resendDisabled, setResendDisabled] = useState(false);

 // Form State
 const [email, setEmail] = useState('');
 const [name, setName] = useState('');
 const [password, setPassword] = useState('');
 const [confirmPassword, setConfirmPassword] = useState('');

 // Additional Options
 const [rememberMe, setRememberMe] = useState(false);
 const [agreeTerms, setAgreeTerms] = useState(false);

 // UI State
 const [showPassword, setShowPassword] = useState(false);
 const [loading, setLoading] = useState(false);
 const [mounted, setMounted] = useState(false);

 // Recovery State
 const [recoveryEmailSent, setRecoveryEmailSent] = useState(false);

 // Validation Errors
 const [errors, setErrors] = useState<FormErrors>({});

 // Email Verification
 const [verificationEmailSent, setVerificationEmailSent] = useState(false);

 useEffect(() => {
  setMounted(true);
 }, []);

 // OTP Timer Effect
 useEffect(() => {
  if (otpTimer > 0) {
   const timer = setTimeout(() => setOtpTimer(otpTimer - 1), 1000);
   return () => clearTimeout(timer);
  } else {
   setResendDisabled(false);
  }
 }, [otpTimer]);

 const { showToast } = useToast();
 const { login } = useAuth();
 const navigate = useNavigate();

 // Validate Form
 const validateForm = useCallback((): boolean => {
  const newErrors: FormErrors = {};

  if (mode === 'signup') {
   if (!name.trim()) newErrors.name = 'Name is required';
   if (!agreeTerms) newErrors.terms = 'You must agree to the terms and conditions';
  }

  if (authMethod === 'email') {
   if (!email) {
    newErrors.email = 'Email is required';
   } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    newErrors.email = 'Please enter a valid email address';
   }

   if (!password) {
    newErrors.password = 'Password is required';
   } else if (mode === 'signup') {
    if (password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(password)) newErrors.password = 'Password must contain an uppercase letter';
    if (!/[a-z]/.test(password)) newErrors.password = 'Password must contain a lowercase letter';
    if (!/[0-9]/.test(password)) newErrors.password = 'Password must contain a number';
    if (!/[^a-zA-Z0-9]/.test(password)) newErrors.password = 'Password must contain a special character';
    if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
   }
  } else {
   if (!phone) {
    newErrors.phone = 'Phone number is required';
   } else if (!/^\+?[1-9]\d{6,14}$/.test(phone.replace(/\s/g, ''))) {
    newErrors.phone = 'Please enter a valid phone number';
   }
  }

  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
 }, [mode, email, password, confirmPassword, name, phone, agreeTerms, authMethod]);

 // Email Submit Handler
 const handleEmailSubmit = (e: React.FormEvent) => {
  e.preventDefault();

  if (authMethod === 'email') {
   if (!email) {
    setErrors({ email: 'Email is required' });
    return;
   }
   if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setErrors({ email: 'Please enter a valid email address' });
    return;
   }
  }

  if (mode === 'forgot_password') {
   handleForgotPassword();
  } else {
   setStep(2);
  }
 };

 // Forgot Password Handler
 const handleForgotPassword = async () => {
  if (!email) return showToast("Email is required", "error");
  setLoading(true);
  try {
   let recaptchaToken: string | null = null;
   try {
    recaptchaToken = await getRecaptchaToken('FORGOT_PASSWORD');
   } catch (recaptchaError) {
    console.warn('reCAPTCHA failed, continuing without it:', recaptchaError);
   }

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

 // Google Login Handler
 const handleGoogleLogin = async () => {
  try {
   setLoading(true);

   if (USE_FIREBASE && firebaseInitialized && auth && googleProvider) {
    try {
     const result = await firebaseSignInWithPopup(auth, googleProvider);

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

 // Phone OTP Send Handler
 const handleSendOTP = async () => {
  if (!phone) {
   setErrors({ phone: 'Phone number is required' });
   return;
  }

  const cleanPhone = phone.replace(/\s/g, '');
  if (!/^\+?[1-9]\d{6,14}$/.test(cleanPhone)) {
   setErrors({ phone: 'Please enter a valid phone number with country code' });
   return;
  }

  setLoading(true);
  setErrors({});

  try {
   if (USE_FIREBASE && firebaseInitialized && auth) {
    // Setup recaptcha
    const recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
     size: 'invisible',
    });

    const result = await signInWithPhoneNumber(auth, phone, recaptchaVerifier);
    setConfirmationResult(result);
    setVerificationStep('verify');
    setOtpTimer(60);
    showToast('Verification code sent to your phone!', 'success');
   } else {
    // Fallback to backend API
    const response = await api.post('/auth/send-phone-otp', { phone: cleanPhone });
    if (response.data.success) {
     setVerificationStep('verify');
     setOtpTimer(60);
     showToast('Verification code sent to your phone!', 'success');
    }
   }
  } catch (error: any) {
   console.error('OTP Send Error:', error);
   showToast(error.message || 'Failed to send verification code', 'error');
  } finally {
   setLoading(false);
  }
 };

 // OTP Resend Handler
 const handleResendOTP = async () => {
  if (resendDisabled) return;
  setResendDisabled(true);
  setOtpTimer(60);
  await handleSendOTP();
 };

 // OTP Verification Handler
 const handleVerifyOTP = async () => {
  if (!otp || otp.length < 6) {
   setErrors({ otp: 'Please enter the complete verification code' });
   return;
  }

  setLoading(true);
  setErrors({});

  try {
   if (USE_FIREBASE && firebaseInitialized && confirmationResult) {
    const result = await confirmationResult.confirm(otp);

    // Sync with backend
    const response = await api.post('/auth/phone-login', {
     phone: phone,
     uid: result.user.uid
    });

    if (response.data.token) {
     login(response.data.token, response.data.user);
    }

    showToast('Logged in successfully!', 'success');
    navigate(getPostLoginRoute(response.data.user as User));
   } else {
    // Backend verification fallback
    const response = await api.post('/auth/verify-phone-otp', {
     phone: phone,
     code: otp
    });

    if (response.data.token) {
     login(response.data.token, response.data.user);
    }

    showToast('Logged in successfully!', 'success');
    navigate(getPostLoginRoute(response.data.user as User));
   }
  } catch (error: any) {
   console.error('OTP Verify Error:', error);
   setErrors({ otp: 'Invalid or expired verification code' });
   showToast('Invalid verification code', 'error');
  } finally {
   setLoading(false);
  }
 };

 // Phone Sign In (signup mode)
 const handlePhoneSignUp = async () => {
  if (!otp || otp.length < 6) {
   setErrors({ otp: 'Please enter the complete verification code' });
   return;
  }

  setLoading(true);
  setErrors({});

  try {
   // Verify OTP and create account
   const response = await api.post('/auth/verify-phone-register', {
    phone: phone,
    code: otp,
    name: name.trim(),
    rememberMe: rememberMe
   });

   if (response.data.token) {
    login(response.data.token, response.data.user);
   }

   showToast('Account created successfully!', 'success');
   navigate('/verify');
  } catch (error: any) {
   console.error('Phone Register Error:', error);
   setErrors({ otp: 'Invalid or expired verification code' });
   showToast('Invalid verification code', 'error');
  } finally {
   setLoading(false);
  }
 };

 // Final Email Submit Handler
 const handleFinalSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!validateForm()) return;

  setLoading(true);
  try {
   let recaptchaToken: string | null = null;
   const recaptchaAction = mode === 'signup' ? 'REGISTER' : 'LOGIN';
   try {
    recaptchaToken = await getRecaptchaToken(recaptchaAction);
   } catch (recaptchaError) {
    console.warn('reCAPTCHA failed:', recaptchaError);
   }

   if (mode === 'signup') {
    const response = await api.post('/auth/register', {
     email: email.trim().toLowerCase(),
     password,
     name: name.trim(),
     recaptchaToken
    });

    if (response.data.token) {
     login(response.data.token, response.data.user);
    }

    showToast(response.data.message || "Account created successfully! Please check your email to verify your account.", "success");

    // If email verification required, go to verification page
    if (response.data.requireVerification) {
     setVerificationEmailSent(true);
     setVerificationStep('complete');
    } else {
     navigate('/verify');
    }
   } else {
    const response = await api.post('/auth/login', {
     email: email.trim().toLowerCase(),
     password,
     recaptchaToken,
     rememberMe
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

 // Resend Verification Email
 const handleResendVerification = async () => {
  try {
   await api.post('/auth/resend-verification', { email: email.trim().toLowerCase() });
   showToast('Verification email sent! Please check your inbox.', 'success');
  } catch (error: any) {
   showToast(error.message || 'Failed to resend verification email', 'error');
  }
 };

 // Switch Mode
 const switchMode = (newMode: AuthMode) => {
  setMode(newMode);
  setStep(1);
  setPassword('');
  setConfirmPassword('');
  setRecoveryEmailSent(false);
  setVerificationEmailSent(false);
  setVerificationStep('input');
  setErrors({});
 };

 // Switch Auth Method
 const switchAuthMethod = (method: AuthMethod) => {
  setAuthMethod(method);
  setStep(1);
  setErrors({});
 };

 // Format phone number
 const formatPhone = (value: string) => {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
  return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
 };

 return (
  <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-indigo-500/30 transition-colors duration-500">
   {/* Animated Background Orbs */}
   <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
    <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-500/10 blur-[120px] animate-pulse-slow"></div>
    <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-purple-500/10 blur-[120px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
    <div className="absolute top-[40%] left-[30%] w-[30vw] h-[30vw] rounded-full bg-pink-500/5 blur-[100px] animate-pulse-slow" style={{ animationDelay: '4s' }}></div>
   </div>

   <div className="relative min-h-screen grid grid-cols-1 lg:grid-cols-2 z-10">
    {/* Left Side: Branding */}
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

      {/* Auth Method Tabs */}
      {mode !== 'forgot_password' && verificationStep === 'input' && (
       <div className="flex p-1 mb-8 bg-white dark:bg-black/40 rounded-2xl border border-slate-200 dark:border-white/10">
        <button
         onClick={() => switchAuthMethod('email')}
         className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all ${authMethod === 'email' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
         <Mail size={16} className="inline mr-2" /> Email
        </button>
        <button
         onClick={() => switchAuthMethod('phone')}
         className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all ${authMethod === 'phone' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
         <Phone size={16} className="inline mr-2" /> Phone
        </button>
       </div>
      )}

      <div className={`glass-card p-10 md:p-12 rounded-[3rem] shadow-2xl transition-all duration-700 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
       {/* Back Button */}
       {(step > 1 || mode === 'forgot_password' || verificationStep === 'verify') && (
        <button
         onClick={() => {
          if (verificationStep === 'verify') {
           setVerificationStep('input');
           setOtp('');
           setErrors({});
          } else if (mode === 'forgot_password') {
           switchMode('signin');
          } else {
           setStep(1);
          }
         }}
         className="absolute top-10 left-10 text-slate-400 hover:text-indigo-500 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-colors"
        >
         <ArrowLeft size={14} /> Back
        </button>
       )}

       {/* Email Verification Complete */}
       {verificationEmailSent && verificationStep === 'complete' ? (
        <div className="text-center py-6 animate-fade-in">
         <div className="w-24 h-24 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={48} />
         </div>
         <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-4">Check Your Email!</h3>
         <p className="text-slate-600 dark:text-slate-300 mb-2">We've sent a verification link to</p>
         <p className="font-bold text-indigo-600 dark:text-indigo-400 mb-8">{email}</p>
         <button
          onClick={handleResendVerification}
          className="text-sm text-indigo-500 hover:text-indigo-600 font-medium flex items-center justify-center gap-2 mx-auto mb-4"
         >
          <RefreshCw size={16} /> Resend verification email
         </button>
         <button onClick={() => switchMode('signin')} className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-105 transition-transform">Return to Sign In</button>
        </div>
       ) : verificationStep === 'verify' && authMethod === 'phone' ? (
        /* Phone OTP Verification */
        <div className="text-center">
         <div className="mb-8 pt-4">
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-3">
           {mode === 'signup' ? 'Verify Phone' : 'Code Verification'}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
           Enter the 6-digit code sent to
          </p>
          <p className="text-indigo-600 dark:text-indigo-400 font-bold mt-1">{phone}</p>
         </div>

         <OTPInput
          length={6}
          value={otp}
          onChange={setOtp}
          error={errors.otp}
         />

         <div className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-500">
          <Timer size={16} />
          {otpTimer > 0 ? (
           <span>Resend code in {otpTimer}s</span>
          ) : (
           <button
            onClick={handleResendOTP}
            disabled={resendDisabled}
            className="text-indigo-500 hover:text-indigo-600 font-medium disabled:opacity-50"
           >
            Resend code
           </button>
          )}
         </div>

         <button
          onClick={mode === 'signup' ? handlePhoneSignUp : handleVerifyOTP}
          disabled={loading || otp.length < 6}
          className="w-full mt-8 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-indigo-600/30 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
         >
          {loading ? <Loader2 className="animate-spin mx-auto" /> : mode === 'signup' ? 'Create Account' : 'Verify & Sign In'}
         </button>
        </div>
       ) : mode === 'forgot_password' ? (
        /* Forgot Password */
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
          <div className="text-center mb-10 pt-4">
           <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-3">Key Recovery</h2>
           <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Recover access to your digital vault</p>
          </div>

          <InputField
           icon={Mail}
           type="email"
           label="Email Address"
           value={email}
           onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setEmail(e.target.value);
            setErrors({ ...errors, email: '' });
           }}
           autoFocus
           error={errors.email}
          />

          <button
           type="submit"
           disabled={loading}
           className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-indigo-600/30 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
          >
           {loading ? <Loader2 className="animate-spin mx-auto" /> : 'Request Recovery Link'}
          </button>
         </form>
        )
       ) : step === 1 ? (
        /* Step 1: Email/Phone Input */
        <form onSubmit={handleEmailSubmit} className="space-y-6">
         <div className="text-center mb-10 pt-4">
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-3">
           {mode === 'signup' ? 'Initiate Node' : 'Terminal Access'}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
           {mode === 'signup' ? 'Deploy your enterprise node on ACommerce' : 'Security credentials required for entry'}
          </p>
         </div>

         {authMethod === 'email' ? (
          <InputField
           icon={Mail}
           type="email"
           label="Identity Email"
           value={email}
           onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setEmail(e.target.value);
            setErrors({ ...errors, email: '' });
           }}
           autoFocus
           error={errors.email}
          />
         ) : (
          <div className="space-y-2">
           <InputField
            icon={Phone}
            type="tel"
            label="Phone Number (with country code)"
            value={phone}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
             setPhone(e.target.value);
             setErrors({ ...errors, phone: '' });
            }}
            autoFocus
            error={errors.phone}
           />
           <p className="text-xs text-slate-400 ml-1">e.g., +1234567890</p>
          </div>
         )}

         <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-indigo-600/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
         >
          {loading ? <Loader2 className="animate-spin mx-auto" /> : <>Proceed to Authentication <ArrowRight size={16} /></>}
         </button>

         {/* Phone: Send OTP Button */}
         {authMethod === 'phone' && (
          <button
           type="button"
           onClick={handleSendOTP}
           disabled={loading}
           className="w-full py-4 bg-purple-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-purple-600/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
          >
           {loading ? <Loader2 className="animate-spin mx-auto" /> : <>Send Verification Code <MessageSquare size={16} /></>}
          </button>
         )}

         <div className="relative flex items-center py-4">
          <div className="flex-grow border-t border-slate-200 dark:border-white/5"></div>
          <span className="flex-shrink mx-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Social Sync</span>
          <div className="flex-grow border-t border-slate-200 dark:border-white/5"></div>
         </div>

         <button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full py-4 border border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-3"
         >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
           <path fill="currentColor" d="M12.48 10.92v3.28h7.84c-.24 1.84-.92 3.32-2.12 4.4-1.2 1.2-3.08 2.4-6.16 2.4-4.8 0-8.68-3.88-8.68-8.68s3.88-8.68 8.68-8.68c2.6 0 4.52 1.04 5.92 2.36l2.32-2.32C17.96 1.48 15.36 0 12.04 0 5.4 0 0 5.4 0 12s5.4 12 12.04 12c3.56 0 6.24-1.16 8.36-3.32 2.2-2.2 2.88-5.32 2.88-7.76 0-.76-.08-1.52-.16-2H12.48z" />
          </svg>
          Continue with Google
         </button>
        </form>
       ) : (
        /* Step 2: Password/Details */
        <form onSubmit={handleFinalSubmit} className="space-y-6">
         <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl flex items-center justify-between group">
          <div className="flex items-center gap-3">
           <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
            {authMethod === 'email' ? '@' : <Phone size={14} />}
           </div>
           <span className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate max-w-[150px]">
            {authMethod === 'email' ? email : phone}
           </span>
          </div>
          <button type="button" onClick={() => setStep(1)} className="text-[10px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-600">Edit</button>
         </div>

         {mode === 'signup' && (
          <>
           <InputField
            icon={UserIcon}
            type="text"
            label="Full Enterprise Name"
            value={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
             setName(e.target.value);
             setErrors({ ...errors, name: '' });
            }}
            error={errors.name}
           />

           <PasswordStrength password={password} />
          </>
         )}

         {authMethod === 'email' && (
          <>
           <InputField
            icon={Lock}
            type="password"
            label="Security Key"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
             setPassword(e.target.value);
             setErrors({ ...errors, password: '' });
            }}
            autoFocus={mode !== 'signup'}
            error={errors.password}
           />

           {mode === 'signup' && (
            <InputField
             icon={Shield}
             type="password"
             label="Confirm Security Key"
             value={confirmPassword}
             onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setConfirmPassword(e.target.value);
              setErrors({ ...errors, confirmPassword: '' });
             }}
             error={errors.confirmPassword}
            />
           )}
          </>
         )}

         {/* Remember Me & Forgot Password */}
         {mode === 'signin' && authMethod === 'email' && (
          <div className="flex items-center justify-between">
           <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative">
             <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="sr-only peer"
             />
             <div className="w-10 h-6 bg-slate-200 dark:bg-white/10 rounded-full peer-checked:bg-indigo-600 transition-colors"></div>
             <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4"></div>
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">Remember me</span>
           </label>

           <button
            type="button"
            onClick={() => switchMode('forgot_password')}
            className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-500 transition-colors"
           >
            Credential Recovery?
           </button>
          </div>
         )}

         {/* Terms and Conditions */}
         {mode === 'signup' && (
          <div className="space-y-4">
           <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative mt-0.5">
             <input
              type="checkbox"
              checked={agreeTerms}
              onChange={(e) => {
               setAgreeTerms(e.target.checked);
               setErrors({ ...errors, terms: '' });
              }}
              className="sr-only peer"
             />
             <div className={`w-5 h-5 border-2 rounded-md transition-all flex items-center justify-center ${agreeTerms ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 dark:border-slate-600 group-hover:border-indigo-500'}`}>
              {agreeTerms && <Check size={12} className="text-white" />}
             </div>
            </div>
            <span className="text-xs text-slate-500">
             I agree to the{' '}
             <a href="/legal" className="text-indigo-500 hover:underline">Terms of Service</a>
             {' '}and{' '}
             <a href="/legal" className="text-indigo-500 hover:underline">Privacy Policy</a>
            </span>
           </label>
           {errors.terms && (
            <p className="text-xs font-medium text-red-500 flex items-center gap-1">
             <AlertTriangle size={12} /> {errors.terms}
            </p>
           )}
          </div>
         )}

         <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-indigo-600/30 hover:scale-[1.02] active:scale-95 transition-all"
         >
          {loading ? <Loader2 className="animate-spin mx-auto" /> : mode === 'signup' ? 'Complete Initialization' : 'Authorize Entry'}
         </button>
        </form>
       )}

       {/* Mode Switch */}
       {verificationStep === 'input' && mode !== 'forgot_password' && (
        <div className="text-center pt-8 mt-2 border-t border-slate-200 dark:border-white/5">
         <p className="text-sm font-medium text-slate-500">
          {mode === 'signup' ? 'Already part of the ecosystem?' : 'New digital explorer?'}{' '}
          <button
           onClick={() => switchMode(mode === 'signup' ? 'signin' : 'signup')}
           className="font-black text-indigo-500 hover:text-indigo-600 transition-colors uppercase gap-1 inline-flex items-center"
          >
           {mode === 'signup' ? 'Sign In' : 'Sign Up'}
          </button>
         </p>
        </div>
       )}
      </div>

      {/* Hidden reCAPTCHA container */}
      <div id="recaptcha-container" className="hidden"></div>

      <div className="mt-12 text-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-400/50">
       Powered by Aureon Hyperstructure
      </div>
     </div>
    </div>
   </div>
  </div>
 );
};

export default AuthForm;
