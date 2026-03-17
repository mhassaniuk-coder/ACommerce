import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth as firebaseAuth, db, firebaseInitialized } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { supabase } from '../lib/supabase';
import { USE_FIREBASE } from '../lib/config';
import { User } from '../../types';

interface AuthContextType {
    user: User | null;
    login: (token: string, userData: User) => void;
    logout: () => Promise<void>;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(() => {
        const savedUser = localStorage.getItem('user');
        return savedUser ? JSON.parse(savedUser) : null;
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (USE_FIREBASE && firebaseInitialized && firebaseAuth && db) {
            try {
                const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
                    if (firebaseUser) {
                        try {
                            const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
                            if (userDoc.exists()) {
                                const userData = userDoc.data() as User;
                                setUser(userData);
                                localStorage.setItem('user', JSON.stringify(userData));
                            } else {
                                const userData = {
                                    id: firebaseUser.uid,
                                    email: firebaseUser.email || '',
                                    name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
                                    role: 'user',
                                    joinedAt: Date.now()
                                } as User;
                                setUser(userData);
                                localStorage.setItem('user', JSON.stringify(userData));
                            }
                        } catch (error) {
                            console.error("AuthContext: Error fetching user doc:", error);
                            setUser(null);
                        }
                    } else {
                        setUser(null);
                        localStorage.removeItem('user');
                        localStorage.removeItem('token');
                    }
                    setLoading(false);
                });
                return () => unsubscribe();
            } catch (firebaseError) {
                console.warn("AuthContext: Firebase auth initialization failed:", firebaseError);
                setLoading(false);
            }
        } else if (!USE_FIREBASE) {
            // Supabase Auth
            const client = supabase;
            if (!client) {
                console.warn('AuthContext: Supabase client is null. Auth listener skipped.');
                setLoading(false);
                return;
            }
            const { data: { subscription } } = client.auth.onAuthStateChange(async (event, session) => {
                if (session?.user) {
                    const { data: userData } = await client
                        .from('users')
                        .select('*')
                        .eq('id', session.user.id)
                        .single();

                    if (userData) {
                        const formattedUser = userData as User;
                        setUser(formattedUser);
                        localStorage.setItem('user', JSON.stringify(formattedUser));
                    } else {
                        const formattedUser = {
                            id: session.user.id,
                            email: session.user.email || '',
                            name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
                            role: 'user',
                            joinedAt: Date.now()
                        } as User;
                        setUser(formattedUser);
                        localStorage.setItem('user', JSON.stringify(formattedUser));
                    }
                } else {
                    setUser(null);
                    localStorage.removeItem('user');
                    localStorage.removeItem('token');
                }
                setLoading(false);
            });
            return () => subscription.unsubscribe();
        } else {
            // Firebase disabled or not available, check for local auth
            const savedToken = localStorage.getItem('token');
            const savedUser = localStorage.getItem('user');
            if (savedToken && savedUser) {
                setUser(JSON.parse(savedUser));
            }
            setLoading(false);
        }
    }, []);

    const login = (token: string, userData: User) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
    };

    const logout = async () => {
        try {
            if (USE_FIREBASE) {
                await firebaseSignOut(firebaseAuth);
            } else {
                const client = supabase;
                if (client) {
                    await client.auth.signOut();
                }
            }
            setUser(null);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        } catch (error) {
            console.error("AuthContext: Logout error:", error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};
