import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { setSentryUser, clearSentryUser } from '../config/sentry';

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
            // Validate inputs
            if (!phone || phone.trim().length < 6) {
                throw new Error('Unesite validan broj telefona');
            }
            if (!password || password.length < 4) {
                throw new Error('Unesite lozinku (minimum 4 karaktera)');
            }

            // Convert phone to fake email format
            const fakeEmail = `${phone.replace(/[^0-9]/g, '')}@eco.local`;
            console.log('[Auth] Attempting login for:', fakeEmail);

            const { data, error } = await supabase.auth.signInWithPassword({
                email: fakeEmail,
                password: password
            });

            if (error) {
                console.error('[Auth] Login error:', error.message, error.status);

                // Translate Supabase errors to user-friendly Serbian messages
                if (error.message?.includes('Invalid login credentials')) {
                    throw new Error('Pogrešan broj telefona ili lozinka. Proverite unos.');
                } else if (error.message?.includes('Email not confirmed')) {
                    throw new Error('Nalog nije aktiviran. Kontaktirajte administratora.');
                } else if (error.message?.includes('Too many requests')) {
                    throw new Error('Previše pokušaja. Sačekajte par minuta pa probajte ponovo.');
                } else if (error.message?.includes('Network')) {
                    throw new Error('Problem sa internetom. Proverite konekciju.');
                } else {
                    throw new Error(`Greška pri prijavi: ${error.message}`);
                }
            }

            if (!data?.user) {
                throw new Error('Prijava nije uspela. Pokušajte ponovo.');
            }

            console.log('[Auth] Login successful, loading profile...');

            // Load user profile and get the role immediately
            const userProfile = await loadUserProfile(data.user);

            if (!userProfile) {
                throw new Error('Korisnički profil nije pronađen. Kontaktirajte administratora.');
            }

            // Set Sentry user context for error tracking
            setSentryUser({
                id: userProfile.id,
                name: userProfile.name,
                role: userProfile.role,
                company_code: userProfile.company_code
            });

            console.log('[Auth] Login complete, role:', userProfile.role);
            return { success: true, role: userProfile?.role };
        } catch (error) {
            console.error('[Auth] Login failed:', error.message);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        console.log('[Auth] Logout started');

        // Clear Sentry user context
        clearSentryUser();

        // STEP 1: Clear local React state IMMEDIATELY
        clearSession();
        setIsLoading(false);

        // STEP 2: Clear ALL Supabase storage (localStorage + IndexedDB)
        clearSupabaseStorage();

        // STEP 3: Try to sign out from Supabase server (may fail if session already expired - that's OK)
        try {
            // Use local scope to avoid 403 errors when session is already invalid server-side
            await supabase.auth.signOut({ scope: 'local' });
        } catch (error) {
            // Ignore errors - session might already be invalid, that's fine
            console.log('[Auth] SignOut error (ignored):', error?.message);
        }

        // STEP 4: Clear storage AGAIN to ensure nothing was restored by signOut
        clearSupabaseStorage();

        // STEP 5: Force page reload to completely reset all state
        // This is the nuclear option but guarantees clean logout
        window.location.href = '/login';
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
                        latitude: client.latitude || null,
                        longitude: client.longitude || null,
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
