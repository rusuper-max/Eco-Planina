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
    const [regionId, setRegionId] = useState(null);
    const [regionName, setRegionName] = useState(null);
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
                        setRegionId(impersonated.regionId || impersonated.user?.region_id || null);
                        setRegionName(impersonated.regionName || null);
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

    // Real-time subscription to user profile changes (e.g., when admin changes region_id)
    useEffect(() => {
        if (!user?.id) return;

        const channelName = `user_profile_${user.id}`;
        const subscription = supabase
            .channel(channelName)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'users',
                filter: `id=eq.${user.id}`
            }, async (payload) => {
                console.log('[Auth] User profile updated:', payload.new);
                const newData = payload.new;

                // Update user state with new data
                setUser(prev => ({
                    ...prev,
                    region_id: newData.region_id || null,
                    role: newData.role,
                    name: newData.name,
                    address: newData.address,
                    phone: newData.phone,
                    latitude: newData.latitude,
                    longitude: newData.longitude
                }));

                // Update region name if region_id changed
                if (newData.region_id) {
                    const { data: region } = await supabase
                        .from('regions')
                        .select('id, name')
                        .eq('id', newData.region_id)
                        .is('deleted_at', null)
                        .maybeSingle();
                    setRegionId(region?.id || null);
                    setRegionName(region?.name || null);
                } else {
                    setRegionId(null);
                    setRegionName(null);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [user?.id]);

    // Load user profile from public.users table
    const loadUserProfile = async (authUserData) => {
        try {
            setAuthUser(authUserData);

            const { data: userData, error } = await supabase
                .from('users')
                .select('*')
                .eq('auth_id', authUserData.id)
                .is('deleted_at', null)
                .maybeSingle();

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
                    .maybeSingle();
                companyData = company;
            }

            // Check if company is frozen
            if (companyData?.master_code_id) {
                const { data: mc } = await supabase
                    .from('master_codes')
                    .select('status')
                    .eq('id', companyData.master_code_id)
                    .maybeSingle();
                if (mc?.status === 'frozen') {
                    throw new Error('Vaša firma je zamrznuta. Kontaktirajte administratora.');
                }
            }

            const isAdminRole = userData.role === 'developer' || userData.role === 'admin';

            // Load region data if user has region_id
            let regionData = null;
            if (userData.region_id) {
                const { data: region } = await supabase
                    .from('regions')
                    .select('id, name')
                    .eq('id', userData.region_id)
                    .is('deleted_at', null)
                    .maybeSingle();
                regionData = region;
            }

            const userObj = {
                id: userData.id,
                name: userData.name,
                role: userData.role,
                address: userData.address,
                phone: userData.phone,
                latitude: userData.latitude,
                longitude: userData.longitude,
                is_owner: userData.is_owner || false,
                region_id: userData.region_id || null,
                allowed_waste_types: userData.allowed_waste_types || null
            };

            setUser(userObj);
            setCompanyCode(isAdminRole ? null : companyData?.code || userData.company_code);
            setCompanyName(isAdminRole ? null : companyData?.name || 'Nepoznato');
            setRegionId(regionData?.id || null);
            setRegionName(regionData?.name || null);

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
        setRegionId(null);
        setRegionName(null);
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

    const register = async ({ name, phone, password, address, latitude, longitude, companyCode: inputCode, role }) => {
        setIsLoading(true);
        try {
            // Use same URL and key as supabase client (from env variables)
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

            if (!supabaseUrl || !supabaseAnonKey) {
                throw new Error('Supabase konfiguracija nije postavljena');
            }

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
                    role
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
        const isDevOrAdmin = currentRole === 'developer' || currentRole === 'admin';
        const isCompanyAdminRole = currentRole === 'company_admin' || user?.is_owner;

        if (!isDevOrAdmin && !isCompanyAdminRole) {
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

            // Company admin sme samo korisnike svoje firme i niže role
            if (isCompanyAdminRole) {
                if (targetUser.company_code !== companyCode) {
                    throw new Error('Možete impersonirati samo korisnike svoje firme');
                }
                if (['developer', 'admin', 'company_admin'].includes(targetUser.role)) {
                    throw new Error('Možete impersonirati samo menadžere, vozače i klijente');
                }
            }

            // Save original user session (only if not already impersonating)
            if (!originalUser) {
                const originalSession = { user, companyCode, companyName, regionId, regionName };
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
            const targetRegionId = targetUser.region_id || null;
            let targetRegionName = null;

            if (targetRegionId) {
                const { data: region } = await supabase
                    .from('regions')
                    .select('id, name')
                    .eq('id', targetRegionId)
                    .is('deleted_at', null)
                    .maybeSingle();
                targetRegionName = region?.name || null;
            }

            const userObj = {
                id: targetUser.id,
                name: targetUser.name,
                role: targetUser.role,
                address: targetUser.address,
                phone: targetUser.phone,
                latitude: targetUser.latitude,
                longitude: targetUser.longitude,
                region_id: targetRegionId,
                allowed_waste_types: targetUser.allowed_waste_types || null,
                is_owner: targetUser.is_owner || false
            };

            // Save impersonated user to localStorage for persistence across refreshes
            const impersonatedSession = {
                user: userObj,
                companyCode: newCompanyCode,
                companyName: newCompanyName,
                regionId: targetRegionId,
                regionName: targetRegionName
            };
            localStorage.setItem('eco_impersonated_user', JSON.stringify(impersonatedSession));

            setUser(userObj);
            setCompanyCode(newCompanyCode);
            setCompanyName(newCompanyName);
            setRegionId(targetRegionId);
            setRegionName(targetRegionName);

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
        setRegionId(originalUser.regionId || originalUser.user?.region_id || null);
        setRegionName(originalUser.regionName || null);
        setOriginalUser(null);
        localStorage.removeItem('eco_original_user');
        localStorage.removeItem('eco_impersonated_user');
    };

    const changeUserRole = async (userId, newRole) => {
        const currentRole = user?.role;
        if (currentRole !== 'developer' && currentRole !== 'admin') {
            throw new Error('Nemate dozvolu za ovu akciju');
        }
        if (newRole !== 'client' && newRole !== 'manager' && newRole !== 'driver') {
            throw new Error('Možete menjati samo između Klijent, Menadžer i Vozač uloga');
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
    const isCompanyAdmin = () => user?.role === 'company_admin' || user?.is_owner === true;

    // Reset user password (admin function)
    const resetUserPassword = async (targetUserId, newPassword) => {
        const currentRole = user?.role;
        const canReset = currentRole === 'developer' || currentRole === 'admin' ||
            currentRole === 'company_admin' || user?.is_owner;

        if (!canReset) {
            throw new Error('Nemate dozvolu za ovu akciju');
        }

        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData?.session?.access_token) {
            throw new Error('Niste ulogovani');
        }

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        if (!supabaseUrl) {
            throw new Error('Supabase konfiguracija nije postavljena');
        }

        const response = await fetch(`${supabaseUrl}/functions/v1/reset-user-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionData.session.access_token}`
            },
            body: JSON.stringify({ targetUserId, newPassword })
        });

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Greska pri resetovanju lozinke');
        }

        return result;
    };

    /**
     * Create shadow clients (users with auth_id = NULL)
     * These can be "claimed" when real users register with the same phone
     * @param {Array} clients - Array of { name, phone, address?, note? }
     * @returns {Promise<{ created: number, skipped: number, errors: string[] }>}
     */
    const createShadowClients = async (clients) => {
        if (!companyCode) {
            throw new Error('Niste povezani sa firmom');
        }

        const currentRole = user?.role;
        const canCreate = currentRole === 'manager' || currentRole === 'company_admin' || user?.is_owner;

        if (!canCreate) {
            throw new Error('Nemate dozvolu za ovu akciju');
        }

        // Get first region of this company for new clients
        const { data: regions } = await supabase
            .from('regions')
            .select('id')
            .eq('company_code', companyCode)
            .is('deleted_at', null)
            .order('created_at', { ascending: true })
            .limit(1);

        const regionId = regions?.[0]?.id || null;

        let created = 0;
        let skipped = 0;
        const errors = [];

        for (const client of clients) {
            try {
                // Check if phone already exists
                const { data: existing } = await supabase
                    .from('users')
                    .select('id')
                    .eq('phone', client.phone)
                    .is('deleted_at', null)
                    .single();

                if (existing) {
                    skipped++;
                    continue;
                }

                // Insert shadow contact (no auth_id)
                const { error } = await supabase
                    .from('users')
                    .insert({
                        auth_id: null,  // Shadow contact - no login
                        name: client.name,
                        phone: client.phone,
                        address: client.address || null,
                        manager_note: client.note || null,
                        role: 'client',
                        company_code: companyCode,
                        region_id: regionId,
                        is_owner: false
                    });

                if (error) {
                    errors.push(`${client.name}: ${error.message}`);
                    skipped++;
                } else {
                    created++;
                }
            } catch (err) {
                errors.push(`${client.name}: ${err.message}`);
                skipped++;
            }
        }

        return { created, skipped, errors };
    };

    const value = {
        user,
        authUser,
        companyCode,
        companyName,
        regionId,
        regionName,
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
        resetUserPassword,
        createShadowClients,
        isAdmin,
        isDeveloper,
        isCompanyAdmin,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
