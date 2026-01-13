import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../config/supabase';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [authUser, setAuthUser] = useState(null); // Supabase Auth user
    const [companyCode, setCompanyCode] = useState(null);
    const [companyName, setCompanyName] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [originalUser, setOriginalUser] = useState(null);

    // Clear corrupted Supabase storage (fixes Chrome-specific issues)
    const clearSupabaseStorage = () => {
        console.log('[Auth] Clearing corrupted storage...');
        try {
            // Clear Supabase-related localStorage keys
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));

            // Also try to clear IndexedDB for supabase
            if (window.indexedDB) {
                indexedDB.deleteDatabase('supabase-auth-token');
            }
            console.log('[Auth] Storage cleared');
        } catch (e) {
            console.error('[Auth] Error clearing storage:', e);
        }
    };

    // Initialize auth on mount - with storage recovery for Chrome
    useEffect(() => {
        let cancelled = false;
        let timeoutHit = false;

        // Force finish after 3 seconds - if timeout hits, clear storage
        const timeout = setTimeout(() => {
            console.log('[Auth] Force timeout - clearing storage');
            timeoutHit = true;
            clearSupabaseStorage();
            if (!cancelled) setIsLoading(false);
        }, 3000);

        (async () => {
            try {
                console.log('[Auth] Starting init...');

                // Race between getSession and a shorter timeout
                const sessionPromise = supabase.auth.getSession();
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Session timeout')), 2500)
                );

                let data;
                try {
                    const result = await Promise.race([sessionPromise, timeoutPromise]);
                    data = result.data;
                } catch (raceError) {
                    console.log('[Auth] Session fetch slow, clearing storage');
                    clearSupabaseStorage();
                    if (!cancelled) setIsLoading(false);
                    return;
                }

                console.log('[Auth] Got session:', !!data?.session);

                if (cancelled || timeoutHit) return;

                if (data?.session?.user) {
                    // Check if there's an active impersonation
                    const impersonatedData = localStorage.getItem('eco_impersonated_user');
                    const originalData = localStorage.getItem('eco_original_user');

                    if (impersonatedData && originalData) {
                        // Restore impersonation state
                        console.log('[Auth] Restoring impersonation...');
                        const impersonated = JSON.parse(impersonatedData);
                        const original = JSON.parse(originalData);

                        setUser(impersonated.user);
                        setCompanyCode(impersonated.companyCode);
                        setCompanyName(impersonated.companyName);
                        setOriginalUser(original);
                        setAuthUser(data.session.user);
                    } else {
                        // Normal login - load profile from auth user
                        await loadUserProfile(data.session.user);
                    }
                } else {
                    // No session - clear any stale impersonation data
                    localStorage.removeItem('eco_impersonated_user');
                    localStorage.removeItem('eco_original_user');
                }

            } catch (e) {
                console.error('[Auth] Init error:', e);
                // On any error, clear storage to recover
                clearSupabaseStorage();
            } finally {
                clearTimeout(timeout);
                if (!cancelled && !timeoutHit) {
                    console.log('[Auth] Init complete');
                    setIsLoading(false);
                }
            }
        })();

        return () => { cancelled = true; clearTimeout(timeout); };
    }, []);

    // Load user profile from public.users table
    const loadUserProfile = async (authUserData) => {
        try {
            setAuthUser(authUserData);

            const { data: userData, error } = await supabase
                .from('users')
                .select('*')
                .eq('auth_id', authUserData.id)
                .is('deleted_at', null)
                .single();

            if (error || !userData) {
                console.error('Failed to load user profile:', error);
                return;
            }

            // Load company data if user has company_code
            let companyData = null;
            if (userData.company_code) {
                const { data: company } = await supabase
                    .from('companies')
                    .select('*')
                    .eq('code', userData.company_code)
                    .is('deleted_at', null)
                    .single();
                companyData = company;
            }

            // Check if company is frozen
            if (companyData?.master_code_id) {
                const { data: mc } = await supabase
                    .from('master_codes')
                    .select('status')
                    .eq('id', companyData.master_code_id)
                    .single();
                if (mc?.status === 'frozen') {
                    throw new Error('Vaša firma je zamrznuta. Kontaktirajte administratora.');
                }
            }

            const isAdminRole = userData.role === 'developer' || userData.role === 'admin';
            const userObj = {
                id: userData.id,
                name: userData.name,
                role: userData.role,
                address: userData.address,
                phone: userData.phone,
                latitude: userData.latitude,
                longitude: userData.longitude
            };

            setUser(userObj);
            setCompanyCode(isAdminRole ? null : companyData?.code || userData.company_code);
            setCompanyName(isAdminRole ? null : companyData?.name || 'Nepoznato');

            // Return user data for immediate use (before state updates propagate)
            return userObj;

        } catch (error) {
            console.error('Load profile error:', error);
            throw error;
        }
    };

    const clearSession = () => {
        setUser(null);
        setAuthUser(null);
        setCompanyCode(null);
        setCompanyName(null);
        setOriginalUser(null);
        localStorage.removeItem('eco_session');
        localStorage.removeItem('eco_original_user');
        localStorage.removeItem('eco_impersonated_user');
    };

    const login = async (phone, password) => {
        setIsLoading(true);
        try {
            // Convert phone to fake email format
            const fakeEmail = `${phone.replace(/[^0-9]/g, '')}@eco.local`;

            const { data, error } = await supabase.auth.signInWithPassword({
                email: fakeEmail,
                password: password
            });

            if (error) {
                throw new Error('Pogrešan broj telefona ili lozinka');
            }

            // Load user profile and get the role immediately
            const userProfile = await loadUserProfile(data.user);

            return { success: true, role: userProfile?.role };
        } catch (error) {
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        // Clear local state immediately for instant UI feedback
        clearSession();
        setIsLoading(false);

        // Then sign out from Supabase (don't wait for it)
        supabase.auth.signOut().catch(error => {
            console.error('Logout error:', error);
        });
    };

    const register = async ({ name, phone, password, address, latitude, longitude, companyCode: inputCode, role, joinExisting }) => {
        setIsLoading(true);
        try {
            // Use same URL and key as supabase client
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vmsfsstxxndpxbsdylog.supabase.co';
            const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtc2Zzc3R4eG5kcHhic2R5bG9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MDcyMzQsImV4cCI6MjA4MzQ4MzIzNH0.pivFU5_iCsiG0VlV__5LOl6pgCj7Uc6R-xJcTn5c4ds';

            // Call Edge Function for secure registration
            const response = await fetch(`${supabaseUrl}/functions/v1/auth-register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${supabaseAnonKey}`
                },
                body: JSON.stringify({
                    name,
                    phone,
                    password,
                    address,
                    latitude,
                    longitude,
                    companyCode: inputCode,
                    role,
                    joinExisting
                })
            });

            // Check if response is OK before parsing
            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = 'Registracija nije uspela';
                try {
                    const errorJson = JSON.parse(errorText);
                    errorMessage = errorJson.error || errorMessage;
                } catch {
                    console.error('Registration error response:', errorText);
                }
                throw new Error(errorMessage);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Registracija nije uspela');
            }

            return { success: true };
        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const impersonateUser = async (userId) => {
        const currentRole = user?.role;
        if (currentRole !== 'developer' && currentRole !== 'admin') {
            throw new Error('Nemate dozvolu za ovu akciju');
        }
        try {
            console.log('[Impersonate] Starting for userId:', userId);

            // Use limit(1) instead of single() to avoid 406 errors
            const { data: users, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .is('deleted_at', null)
                .limit(1);

            console.log('[Impersonate] Query result:', { users, error });

            const targetUser = users?.[0];
            if (error) {
                console.error('[Impersonate] DB error:', error);
                throw new Error('Greška pri učitavanju korisnika: ' + error.message);
            }
            if (!targetUser) {
                console.error('[Impersonate] User not found for id:', userId);
                throw new Error('Korisnik nije pronađen');
            }

            // Save original user session (only if not already impersonating)
            if (!originalUser) {
                const originalSession = { user, companyCode, companyName };
                setOriginalUser(originalSession);
                localStorage.setItem('eco_original_user', JSON.stringify(originalSession));
            }

            // Get company data for target user
            let companyData = null;
            if (targetUser.company_code) {
                const { data: companies } = await supabase
                    .from('companies')
                    .select('*')
                    .eq('code', targetUser.company_code)
                    .limit(1);
                companyData = companies?.[0];
            }

            // Set new session as target user
            const isAdminRole = targetUser.role === 'developer' || targetUser.role === 'admin';
            const newCompanyCode = isAdminRole ? null : (companyData?.code || targetUser.company_code)?.trim() || null;
            const newCompanyName = isAdminRole ? null : (companyData?.name || 'Nepoznato');
            const userObj = {
                id: targetUser.id,
                name: targetUser.name,
                role: targetUser.role,
                address: targetUser.address,
                phone: targetUser.phone,
                latitude: targetUser.latitude,
                longitude: targetUser.longitude
            };

            // Save impersonated user to localStorage for persistence across refreshes
            const impersonatedSession = { user: userObj, companyCode: newCompanyCode, companyName: newCompanyName };
            localStorage.setItem('eco_impersonated_user', JSON.stringify(impersonatedSession));

            setUser(userObj);
            setCompanyCode(newCompanyCode);
            setCompanyName(newCompanyName);

            console.log('[Impersonate] Success, role:', targetUser.role);
            return { success: true, role: targetUser.role };
        } catch (error) {
            console.error('[Impersonate] Error:', error);
            throw error;
        }
    };

    const exitImpersonation = () => {
        if (!originalUser) return;
        setUser(originalUser.user);
        setCompanyCode(originalUser.companyCode?.trim() || null);
        setCompanyName(originalUser.companyName);
        setOriginalUser(null);
        localStorage.removeItem('eco_original_user');
        localStorage.removeItem('eco_impersonated_user');
    };

    const changeUserRole = async (userId, newRole) => {
        const currentRole = user?.role;
        if (currentRole !== 'developer' && currentRole !== 'admin') {
            throw new Error('Nemate dozvolu za ovu akciju');
        }
        if (newRole !== 'client' && newRole !== 'manager') {
            throw new Error('Možete menjati samo između Klijent i Menadžer uloga');
        }
        try {
            const { error } = await supabase.from('users').update({ role: newRole }).eq('id', userId);
            if (error) throw error;
            return { success: true };
        } catch (error) {
            throw error;
        }
    };

    const isAdmin = () => user?.role === 'developer' || user?.role === 'admin';
    const isDeveloper = () => user?.role === 'developer';

    const value = {
        user,
        authUser,
        companyCode,
        companyName,
        isLoading,
        originalUser,
        setUser,
        setCompanyName,
        clearSupabaseStorage,
        loadUserProfile,
        clearSession,
        login,
        logout,
        register,
        impersonateUser,
        exitImpersonation,
        changeUserRole,
        isAdmin,
        isDeveloper,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
