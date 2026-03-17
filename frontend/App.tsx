import React, { Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { User } from './types';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { CartProvider } from './context/CartContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { canAccessAdminDashboard, getPostLoginRoute } from './src/lib/adminAccess';
import './src/lib/firebase';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './src/context/AuthContext';

const Dashboard = lazy(() => import('./pages/Dashboard').then((module) => ({ default: module.Dashboard })));
const StoreAdmin = lazy(() => import('./pages/StoreAdmin').then((module) => ({ default: module.StoreAdmin })));
const StoreFront = lazy(() => import('./pages/StoreFront').then((module) => ({ default: module.StoreFront })));
const PlatformAdmin = lazy(() => import('./pages/PlatformAdmin').then((module) => ({ default: module.PlatformAdmin })));
const UserProfile = lazy(() => import('./pages/UserProfile').then((module) => ({ default: module.UserProfile })));
const Marketplace = lazy(() => import('./pages/Marketplace'));
const Auth = lazy(() => import('./pages/Auth').then((module) => ({ default: module.Auth })));
const Verification = lazy(() => import('./pages/Verification').then((module) => ({ default: module.Verification })));
const AuthCallback = lazy(() => import('./pages/AuthCallback').then((module) => ({ default: module.AuthCallback })));
const Legal = lazy(() => import('./pages/Legal'));
const DisputeCenter = lazy(() => import('./pages/DisputeCenter'));
const FeedbackPage = lazy(() => import('./pages/FeedbackPage'));
const Landing = lazy(() => import('./pages/Landing'));

export const isFullyVerified = (user: User | null) => {
  return user && user.isVerified !== false && user.kycStatus === 'APPROVED' && user.paymentVerified === true;
};

// --- Route Wrappers ---
const DashboardWrapper: React.FC<{ user: User | null; onLogout: () => void }> = ({ user, onLogout }) => {
  const navigate = useNavigate();

  if (!user) return <Navigate to="/login" replace />;
  if (!isFullyVerified(user)) return <Navigate to="/verify" replace />;

  return <Dashboard user={user} onLogout={onLogout} onNavigate={navigate} />;
};

const StoreAdminWrapper: React.FC<{ user: User | null }> = ({ user }) => {
  const { storeId } = useParams();
  const navigate = useNavigate();
  if (!user) return <Navigate to="/login" replace />;
  if (!isFullyVerified(user)) return <Navigate to="/verify" replace />;
  if (!storeId) return <Navigate to="/dashboard" replace />;
  return <StoreAdmin storeId={storeId} onNavigate={navigate} />;
};

const StoreFrontWrapper: React.FC = () => {
  const { storeId } = useParams();
  const navigate = useNavigate();
  if (!storeId) return <Navigate to="/shop" replace />;
  return <StoreFront storeId={storeId} onNavigate={navigate} />;
};

const PlatformAdminWrapper: React.FC<{ user: User | null; onLogout: () => void }> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  if (!user) return <Navigate to="/login" replace />;
  if (!isFullyVerified(user)) return <Navigate to="/verify" replace />;
  if (!canAccessAdminDashboard(user)) return <Navigate to="/dashboard" replace />;
  return <PlatformAdmin user={user} onNavigate={navigate} onLogout={onLogout} />;
};

const UserProfileWrapper: React.FC<{ user: User | null }> = ({ user: _user }) => {
  const navigate = useNavigate();
  if (!_user) return <Navigate to="/login" replace />;
  if (!isFullyVerified(_user)) return <Navigate to="/verify" replace />;
  return <UserProfile onNavigate={navigate} />;
};

const MarketplaceWrapper: React.FC = () => {
  return <Marketplace />;
};

const VerificationWrapper: React.FC<{ user: User | null }> = ({ user }) => {
  if (!user) return <Navigate to="/login" replace />;
  return <Verification />;
};

const queryClient = new QueryClient();

const RouteLoader: React.FC = () => (
  <div className="min-h-screen bg-[#07070d] text-white flex items-center justify-center">
    <p className="text-sm font-bold tracking-wider uppercase text-white/70">Loading page...</p>
  </div>
);

const AppRoutes = () => {
  const { user, logout, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07070d] text-white flex items-center justify-center">
        <p className="text-sm font-bold tracking-wider uppercase text-white/70">Loading session...</p>
      </div>
    );
  }

  return (
    <Suspense fallback={<RouteLoader />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={user ? <Navigate to={!isFullyVerified(user) ? "/verify" : getPostLoginRoute(user)} replace /> : <Auth />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        {/* Protected Routes */}
        <Route path="/verify" element={<VerificationWrapper user={user} />} />
        <Route path="/dashboard" element={<DashboardWrapper user={user} onLogout={logout} />} />
        <Route path="/admin" element={<PlatformAdminWrapper user={user} onLogout={logout} />} />
        <Route path="/profile" element={<UserProfileWrapper user={user} />} />
        <Route path="/store/:storeId/admin/*" element={<StoreAdminWrapper user={user} />} />

        {/* Public Shop Routes */}
        <Route path="/shop" element={<MarketplaceWrapper />} />
        <Route path="/store/:storeId/*" element={<StoreFrontWrapper />} />

        {/* Legal & Support Routes */}
        <Route path="/legal" element={<Legal />} />
        <Route path="/dispute-center" element={<DisputeCenter />} />
        <Route path="/dispute-center/:mode" element={<DisputeCenter />} />

        {/* Feedback Routes */}
        <Route path="/feedback/:type/:id" element={<FeedbackPage />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <CartProvider>
              <CurrencyProvider>
                <HashRouter>
                  <AppRoutes />
                </HashRouter>
              </CurrencyProvider>
            </CartProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
