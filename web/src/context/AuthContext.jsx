import { createContext, useContext, useState, useEffect, useRef } from 'react';
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
    const [pickupRequests, setPickupRequests] = useState([]);
    const [clientRequests, setClientRequests] = useState([]);
    const [processedNotification, setProcessedNotification] = useState(null);
    const [messages, setMessages] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
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
                    await loadUserProfile(data.session.user);
                }

                // Check impersonation
                const imp = localStorage.getItem('eco_original_user');
                if (imp && !cancelled) setOriginalUser(JSON.parse(imp));

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
        setPickupRequests([]);
        setClientRequests([]);
        setOriginalUser(null);
        localStorage.removeItem('eco_session');
        localStorage.removeItem('eco_original_user');
    };

    // Real-time subscriptions for pickup requests
    useEffect(() => {
        if (!companyCode) return;
        fetchPickupRequests(companyCode);
        const channelName = `pickup_requests_web_${companyCode}`;
        const subscription = supabase
            .channel(channelName)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pickup_requests', filter: `company_code=eq.${companyCode}` }, () => fetchPickupRequests(companyCode))
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pickup_requests', filter: `company_code=eq.${companyCode}` }, () => fetchPickupRequests(companyCode))
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'pickup_requests' }, () => fetchPickupRequests(companyCode))
            .subscribe();
        return () => { supabase.removeChannel(subscription); };
    }, [companyCode]);

    // Real-time for client requests
    useEffect(() => {
        if (!user || user.role !== 'client') return;
        fetchClientRequests(user);
        const channelName = `client_requests_${user.id}`;
        const subscription = supabase
            .channel(channelName)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'pickup_requests', filter: `user_id=eq.${user.id}` }, (payload) => {
                if (payload.eventType === 'UPDATE' && payload.new.status === 'processed' && payload.old?.status === 'pending') {
                    setProcessedNotification({ wasteLabel: payload.new.waste_label || payload.new.waste_type, processedAt: payload.new.processed_at });
                }
                fetchClientRequests(user);
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'pickup_requests' }, () => fetchClientRequests(user))
            .subscribe();
        return () => { supabase.removeChannel(subscription); };
    }, [user]);

    const fetchClientRequests = async (currentUser = user) => {
        if (!currentUser) return;
        try {
            const { data, error } = await supabase
                .from('pickup_requests')
                .select('*')
                .eq('user_id', currentUser.id)
                .eq('status', 'pending')
                .is('deleted_at', null)
                .order('created_at', { ascending: false });
            if (error) throw error;
            setClientRequests(data || []);
        } catch (error) {
            console.error('Error fetching client requests:', error);
        }
    };

    const clearProcessedNotification = () => setProcessedNotification(null);

    const fetchClientHistory = async () => {
        if (!user) return [];
        try {
            const { data, error } = await supabase
                .from('processed_requests')
                .select('*')
                .eq('client_id', user.id)
                .is('deleted_at', null)
                .order('processed_at', { ascending: false });
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching client history:', error);
            return [];
        }
    };

    const fetchPickupRequests = async (code = companyCode) => {
        if (!code) return;
        try {
            const { data, error } = await supabase
                .from('pickup_requests')
                .select('*')
                .eq('company_code', code)
                .eq('status', 'pending')
                .is('deleted_at', null)
                .order('created_at', { ascending: false });
            if (error) throw error;
            setPickupRequests(data || []);
        } catch (error) {
            console.error('Error fetching requests:', error);
        }
    };

    // ==========================================
    // NEW: Supabase Auth login/register
    // ==========================================

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

    // ==========================================
    // Impersonation (admin only)
    // ==========================================

    const impersonateUser = async (userId) => {
        const currentRole = user?.role;
        if (currentRole !== 'developer' && currentRole !== 'admin') {
            throw new Error('Nemate dozvolu za ovu akciju');
        }
        try {
            const { data: targetUser, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .is('deleted_at', null)
                .single();
            if (error || !targetUser) throw new Error('Korisnik nije pronađen');

            // Save original user session
            const originalSession = { user, companyCode, companyName };
            setOriginalUser(originalSession);
            localStorage.setItem('eco_original_user', JSON.stringify(originalSession));

            // Get company data for target user
            let companyData = null;
            if (targetUser.company_code) {
                const { data: company } = await supabase
                    .from('companies')
                    .select('*')
                    .eq('code', targetUser.company_code)
                    .is('deleted_at', null)
                    .single();
                companyData = company;
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

            setUser(userObj);
            setCompanyCode(newCompanyCode);
            setCompanyName(newCompanyName);

            return { success: true, role: targetUser.role };
        } catch (error) {
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

    // ==========================================
    // All other existing functions remain same
    // (just add .is('deleted_at', null) to queries)
    // ==========================================

    const removePickupRequest = async (id) => {
        try {
            const { error } = await supabase.from('pickup_requests').delete().eq('id', id);
            if (error) throw error;
            setPickupRequests(prev => prev.filter(req => req.id !== id));
        } catch (error) {
            throw error;
        }
    };

    const markRequestAsProcessed = async (request, proofImageUrl = null, processingNote = null, weightData = null) => {
        try {
            const processedRecord = {
                company_code: request.company_code,
                client_id: request.user_id,
                client_name: request.client_name,
                client_address: request.client_address,
                waste_type: request.waste_type,
                waste_label: request.waste_label,
                fill_level: request.fill_level,
                urgency: request.urgency,
                note: request.note,
                processing_note: processingNote,
                created_at: request.created_at,
                proof_image_url: proofImageUrl,
                request_id: request.id, // Store original request ID for linking with driver history
            };

            if (weightData) {
                console.log('weightData received:', weightData);
                // Store weight directly in the weight column (which exists in DB)
                processedRecord.weight = weightData.weight;
                processedRecord.weight_unit = weightData.weight_unit || 'kg';
            }

            console.log('Inserting processedRecord:', processedRecord);
            const { error: insertError } = await supabase.from('processed_requests').insert([processedRecord]);
            if (insertError) throw insertError;

            // Update driver assignment status to 'completed' if exists
            // This preserves driver history after manager processes the request
            await supabase
                .from('driver_assignments')
                .update({
                    status: 'completed',
                    completed_at: new Date().toISOString()
                })
                .eq('request_id', request.id)
                .is('deleted_at', null);

            const { error: deleteError } = await supabase.from('pickup_requests').delete().eq('id', request.id);
            if (deleteError) throw deleteError;

            setPickupRequests(prev => prev.filter(req => req.id !== request.id));
            setProcessedNotification({ wasteLabel: request.waste_label || request.waste_type });
        } catch (error) {
            throw error;
        }
    };

    const updateProcessedRequest = async (id, updates) => {
        try {
            const { error } = await supabase.from('processed_requests').update(updates).eq('id', id);
            if (error) throw error;
            return { success: true };
        } catch (error) {
            throw error;
        }
    };

    const deleteProcessedRequest = async (id) => {
        try {
            // Soft delete
            const { error } = await supabase
                .from('processed_requests')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', id);
            if (error) throw error;
            return { success: true };
        } catch (error) {
            throw error;
        }
    };

    const fetchCompanyClients = async () => {
        if (!companyCode) return [];
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('company_code', companyCode)
                .eq('role', 'client')
                .is('deleted_at', null)
                .order('name');
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching clients:', error);
            return [];
        }
    };

    const fetchCompanyMembers = async () => {
        if (!companyCode) return [];
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('company_code', companyCode)
                .is('deleted_at', null)
                .order('role', { ascending: false });
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching members:', error);
            return [];
        }
    };

    const fetchProcessedRequests = async () => {
        if (!companyCode) return [];
        try {
            const { data, error } = await supabase
                .from('processed_requests')
                .select('*')
                .eq('company_code', companyCode)
                .is('deleted_at', null)
                .order('processed_at', { ascending: false });
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching processed requests:', error);
            return [];
        }
    };

    const fetchCompanyEquipmentTypes = async () => {
        if (!companyCode) return [];
        try {
            const { data, error } = await supabase
                .from('companies')
                .select('equipment_types')
                .eq('code', companyCode)
                .is('deleted_at', null)
                .single();
            if (error) throw error;
            return data?.equipment_types || [];
        } catch (error) {
            console.error('Error fetching equipment types:', error);
            return [];
        }
    };

    const updateCompanyEquipmentTypes = async (equipmentTypes) => {
        if (!companyCode) throw new Error('Nema kompanije');
        try {
            const { error } = await supabase.from('companies').update({ equipment_types: equipmentTypes }).eq('code', companyCode);
            if (error) throw error;
            return { success: true };
        } catch (error) {
            throw error;
        }
    };

    const fetchCompanyWasteTypes = async () => {
        if (!companyCode) return [];
        try {
            const { data, error } = await supabase
                .from('companies')
                .select('waste_types')
                .eq('code', companyCode)
                .is('deleted_at', null)
                .single();
            if (error) throw error;
            return data?.waste_types || [];
        } catch (error) {
            console.error('Error fetching waste types:', error);
            return [];
        }
    };

    const updateCompanyWasteTypes = async (wasteTypes) => {
        if (!companyCode) throw new Error('Nema kompanije');
        try {
            const { error } = await supabase.from('companies').update({ waste_types: wasteTypes }).eq('code', companyCode);
            if (error) throw error;
            return { success: true };
        } catch (error) {
            throw error;
        }
    };

    const updateClientDetails = async (clientId, equipmentTypes, note, pib) => {
        try {
            const { error } = await supabase.from('users').update({ equipment_types: equipmentTypes, manager_note: note, pib: pib }).eq('id', clientId);
            if (error) throw error;
            return { success: true };
        } catch (error) {
            throw error;
        }
    };

    const addPickupRequest = async (requestData) => {
        if (!user || !companyCode) throw new Error('Niste prijavljeni ili nemate firmu');
        try {
            // Map camelCase to snake_case for database
            const { fillLevel, wasteType, wasteLabel, ...rest } = requestData;
            const { data, error } = await supabase.from('pickup_requests').insert([{
                user_id: user.id,
                company_code: companyCode,
                client_name: user.name,
                client_address: user.address,
                fill_level: fillLevel,
                waste_type: wasteType,
                waste_label: wasteLabel,
                ...rest,
                status: 'pending'
            }]).select().single();
            if (error) throw error;
            return data;
        } catch (error) {
            throw error;
        }
    };

    // Admin functions
    const isAdmin = () => user?.role === 'developer' || user?.role === 'admin';
    const isDeveloper = () => user?.role === 'developer';

    const generateMasterCode = async () => {
        if (!isAdmin()) throw new Error('Nemate dozvolu za ovu akciju');
        try {
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            let code;
            let isUnique = false;
            while (!isUnique) {
                code = 'MC-' + Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
                const { data: existing } = await supabase.from('master_codes').select('id').eq('code', code).maybeSingle();
                if (!existing) isUnique = true;
            }
            const { data, error } = await supabase.from('master_codes').insert([{ code, status: 'available', created_by: user.id }]).select().single();
            if (error) throw error;
            return data;
        } catch (error) {
            throw error;
        }
    };

    const fetchAllMasterCodes = async () => {
        if (!isAdmin()) return [];
        try {
            const { data: codes, error } = await supabase.from('master_codes').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            const creatorIds = [...new Set((codes || []).filter(c => c.created_by).map(c => c.created_by))];
            const companyIds = [...new Set((codes || []).filter(c => c.used_by_company).map(c => c.used_by_company))];
            let creatorsMap = {};
            let companiesMap = {};
            let userCountsMap = {};
            if (creatorIds.length) {
                const { data: creators } = await supabase.from('users').select('id, name').in('id', creatorIds);
                creatorsMap = (creators || []).reduce((acc, c) => { acc[c.id] = c.name; return acc; }, {});
            }
            if (companyIds.length) {
                const { data: companies } = await supabase.from('companies').select('id, name, code').in('id', companyIds);
                companiesMap = (companies || []).reduce((acc, c) => { acc[c.id] = { name: c.name, code: c.code }; return acc; }, {});
                // Get user counts per company code
                const companyCodes = companies?.map(c => c.code) || [];
                if (companyCodes.length) {
                    const { data: users } = await supabase.from('users').select('company_code, role').in('company_code', companyCodes).is('deleted_at', null);
                    userCountsMap = (users || []).reduce((acc, u) => {
                        if (!acc[u.company_code]) acc[u.company_code] = { managers: 0, clients: 0, drivers: 0 };
                        if (u.role === 'manager') acc[u.company_code].managers++;
                        else if (u.role === 'client') acc[u.company_code].clients++;
                        else if (u.role === 'driver') acc[u.company_code].drivers++;
                        return acc;
                    }, {});
                }
            }
            return (codes || []).map(c => {
                const companyCode = companiesMap[c.used_by_company]?.code;
                const userCounts = companyCode ? userCountsMap[companyCode] : null;
                return {
                    ...c,
                    creatorName: creatorsMap[c.created_by] || null,
                    companyName: companiesMap[c.used_by_company]?.name || null,
                    companyCode: companyCode || null,
                    userCounts: userCounts || { managers: 0, clients: 0, drivers: 0 }
                };
            });
        } catch {
            return [];
        }
    };

    const fetchAllUsers = async (filters = {}) => {
        if (!isAdmin()) return [];
        try {
            let query = supabase.from('users').select('*').is('deleted_at', null).order('created_at', { ascending: false });
            if (filters.role) query = query.eq('role', filters.role);
            if (filters.companyCode) query = query.eq('company_code', filters.companyCode);
            const { data: users, error } = await query;
            if (error) throw error;
            const companyCodes = [...new Set((users || []).filter(u => u.company_code).map(u => u.company_code))];
            let companyMap = {};
            if (companyCodes.length) {
                // Fetch companies one by one - use .select() without .single() to avoid 406 errors
                // when company doesn't exist or is deleted
                const companyPromises = companyCodes.map(code =>
                    supabase.from('companies').select('code, name, status, deleted_at').eq('code', code).limit(1)
                );
                const results = await Promise.all(companyPromises);
                results.forEach(({ data: companies }) => {
                    const company = companies?.[0];
                    if (company) {
                        companyMap[company.code] = { name: company.name, status: company.status, deleted: !!company.deleted_at };
                    }
                });
            }
            return (users || []).map(u => ({
                ...u,
                company: u.company_code ? {
                    name: companyMap[u.company_code]?.name || null,
                    status: companyMap[u.company_code]?.status,
                    deleted: companyMap[u.company_code]?.deleted
                } : null
            }));
        } catch (err) {
            console.error('Error fetching users:', err);
            return [];
        }
    };

    const fetchAllCompanies = async () => {
        if (!isAdmin()) return [];
        try {
            const [{ data: companies, error: compError }, { data: users, error: userError }] = await Promise.all([
                supabase.from('companies').select('*').is('deleted_at', null).order('name'),
                supabase.from('users').select('company_code, role').in('role', ['manager', 'client']).is('deleted_at', null)
            ]);
            if (compError) throw compError;
            if (userError) throw userError;
            const counts = (users || []).reduce((acc, u) => {
                if (!acc[u.company_code]) acc[u.company_code] = { managers: 0, clients: 0 };
                if (u.role === 'manager') acc[u.company_code].managers++;
                else if (u.role === 'client') acc[u.company_code].clients++;
                return acc;
            }, {});
            return (companies || []).map(company => ({
                ...company,
                managerCount: counts[company.code]?.managers || 0,
                clientCount: counts[company.code]?.clients || 0
            }));
        } catch {
            return [];
        }
    };

    const promoteToAdmin = async (userId) => {
        if (!isDeveloper()) throw new Error('Samo Developer može da promoviše admina');
        try {
            await supabase.from('users').update({ role: 'admin' }).eq('id', userId);
            return { success: true };
        } catch (error) {
            throw error;
        }
    };

    const demoteFromAdmin = async (userId) => {
        if (!isDeveloper()) throw new Error('Samo Developer može da ukloni admin status');
        try {
            await supabase.from('users').update({ role: 'manager' }).eq('id', userId);
            return { success: true };
        } catch (error) {
            throw error;
        }
    };

    const getAdminStats = async () => {
        if (!isAdmin()) return null;
        try {
            const [{ count: totalUsers }, { count: totalCompanies }, { count: totalCodes }, { count: usedCodes }, { count: totalManagers }, { count: totalClients }, { count: totalDrivers }, { count: totalAdmins }] = await Promise.all([
                supabase.from('users').select('*', { count: 'exact', head: true }).is('deleted_at', null),
                supabase.from('companies').select('*', { count: 'exact', head: true }).is('deleted_at', null),
                supabase.from('master_codes').select('*', { count: 'exact', head: true }),
                supabase.from('master_codes').select('*', { count: 'exact', head: true }).eq('status', 'used'),
                supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'manager').is('deleted_at', null),
                supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'client').is('deleted_at', null),
                supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'driver').is('deleted_at', null),
                supabase.from('users').select('*', { count: 'exact', head: true }).in('role', ['admin', 'developer']).is('deleted_at', null)
            ]);
            return {
                totalUsers: totalUsers || 0,
                totalCompanies: totalCompanies || 0,
                totalCodes: totalCodes || 0,
                usedCodes: usedCodes || 0,
                availableCodes: (totalCodes || 0) - (usedCodes || 0),
                totalManagers: totalManagers || 0,
                totalClients: totalClients || 0,
                totalDrivers: totalDrivers || 0,
                totalAdmins: totalAdmins || 0
            };
        } catch {
            return null;
        }
    };

    const deleteUser = async (userId) => {
        if (!isAdmin()) throw new Error('Nemate dozvolu za ovu akciju');
        try {
            // Soft delete
            await supabase.from('users').update({ deleted_at: new Date().toISOString() }).eq('id', userId);
            return { success: true };
        } catch (error) {
            throw error;
        }
    };

    const updateUser = async (userId, updates) => {
        if (!isAdmin()) throw new Error('Nemate dozvolu za ovu akciju');
        try {
            await supabase.from('users').update(updates).eq('id', userId);
            return { success: true };
        } catch (error) {
            throw error;
        }
    };

    const updateProfile = async (newName) => {
        if (!user) throw new Error('Niste prijavljeni');
        try {
            const { error } = await supabase.from('users').update({ name: newName }).eq('id', user.id);
            if (error) throw error;
            const updatedUser = { ...user, name: newName };
            setUser(updatedUser);
            return { success: true };
        } catch (error) {
            throw error;
        }
    };

    const updateCompanyName = async (newName) => {
        if (!companyCode) throw new Error('Nemate firmu');
        try {
            const { error } = await supabase.from('companies').update({ name: newName }).eq('code', companyCode);
            if (error) throw error;
            setCompanyName(newName);
            return { success: true };
        } catch (error) {
            throw error;
        }
    };

    const updateLocation = async (address, lat, lng) => {
        if (!user) throw new Error('Niste prijavljeni');
        try {
            const { error } = await supabase.from('users').update({ address, latitude: lat, longitude: lng }).eq('id', user.id);
            if (error) throw error;
            setUser({ ...user, address, latitude: lat, longitude: lng });
            return { success: true };
        } catch (error) {
            throw error;
        }
    };

    const toggleCompanyStatus = async (companyCode, newStatus) => {
        if (!isAdmin()) throw new Error('Nemate dozvolu');
        try {
            const { data: company, error: fetchError } = await supabase.from('companies').select('master_code_id').eq('code', companyCode).single();
            if (fetchError) throw fetchError;
            if (company?.master_code_id) {
                const { error: mcError } = await supabase.from('master_codes').update({ status: newStatus === 'frozen' ? 'frozen' : 'used' }).eq('id', company.master_code_id);
                if (mcError) throw mcError;
            }
            const { error } = await supabase.from('companies').update({ status: newStatus }).eq('code', companyCode);
            if (error) throw error;
            return { success: true };
        } catch (error) {
            throw error;
        }
    };

    const deleteCompany = async (companyCode) => {
        if (!isAdmin()) throw new Error('Nemate dozvolu za ovu akciju');
        try {
            // Soft delete
            await supabase.from('companies').update({ deleted_at: new Date().toISOString() }).eq('code', companyCode);
            return { success: true };
        } catch (error) {
            throw error;
        }
    };

    const updateCompany = async (companyCode, updates) => {
        if (!isAdmin()) throw new Error('Nemate dozvolu za ovu akciju');
        try {
            const { error } = await supabase.from('companies').update(updates).eq('code', companyCode);
            if (error) throw error;
            return { success: true };
        } catch (error) {
            throw error;
        }
    };

    const fetchCompanyDetails = async (companyCode) => {
        try {
            const { data, error } = await supabase.from('companies').select('*').eq('code', companyCode).single();
            if (error) throw error;
            return data;
        } catch (error) {
            return null;
        }
    };

    const deleteMasterCode = async (id) => {
        if (!isAdmin()) throw new Error('Nemate dozvolu za ovu akciju');
        try {
            await supabase.from('master_codes').delete().eq('id', id);
            return { success: true };
        } catch (error) {
            throw error;
        }
    };

    const deleteClient = async (clientId) => {
        try {
            // Soft delete
            await supabase.from('users').update({ deleted_at: new Date().toISOString() }).eq('id', clientId);
            return { success: true };
        } catch (error) {
            throw error;
        }
    };

    // Chat functions
    const messagesSubscriptionRef = useRef(null);

    useEffect(() => {
        if (user) fetchUnreadCount();
    }, [user]);

    const fetchMessages = async (partnerId) => {
        if (!user) return [];
        try {
            const { data, error } = await supabase.from('messages').select('*')
                .or(`and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id})`)
                .is('deleted_at', null)
                .order('created_at', { ascending: true });
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching messages:', error);
            return [];
        }
    };

    const sendMessage = async (receiverId, content) => {
        if (!user) throw new Error('Niste prijavljeni');
        try {
            const { data, error } = await supabase.from('messages').insert([{
                sender_id: user.id,
                receiver_id: receiverId,
                company_code: companyCode || 'SUPPORT',
                content: content.trim()
            }]).select().single();
            if (error) throw error;
            return data;
        } catch (error) {
            throw error;
        }
    };

    const markMessagesAsRead = async (senderId) => {
        if (!user) return;
        console.log('[Chat Debug] markMessagesAsRead called with senderId:', senderId);
        try {
            const { data, error, count } = await supabase.from('messages').update({ is_read: true }).eq('sender_id', senderId).eq('receiver_id', user.id).eq('is_read', false).select();
            console.log('[Chat Debug] markMessagesAsRead result:', { updated: data?.length || 0, error });
            if (error) throw error;
            // Immediately update unread count after marking as read
            await fetchUnreadCount();
        } catch (error) {
            console.error('Error marking messages as read:', error);
        }
    };

    const fetchUnreadCount = async () => {
        if (!user) return;
        try {
            const { count, error } = await supabase.from('messages').select('*', { count: 'exact', head: true })
                .eq('receiver_id', user.id).eq('is_read', false).is('deleted_at', null);
            if (!error) setUnreadCount(count || 0);
        } catch (error) {
            console.error('Error fetching unread count:', error);
        }
    };

    const getConversations = async () => {
        if (!user) return [];
        try {
            const { data: allMessages, error } = await supabase.from('messages').select('*')
                .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
                .is('deleted_at', null)
                .order('created_at', { ascending: false });
            if (error) throw error;
            const conversationMap = {};
            (allMessages || []).forEach(msg => {
                const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
                if (!conversationMap[partnerId]) {
                    conversationMap[partnerId] = { partnerId, lastMessage: msg.content, lastMessageAt: msg.created_at, unread: 0 };
                }
                if (msg.receiver_id === user.id && !msg.is_read) conversationMap[partnerId].unread++;
            });
            const partnerIds = Object.keys(conversationMap);
            if (partnerIds.length === 0) return [];
            const { data: partners } = await supabase.from('users').select('id, name, role, phone').in('id', partnerIds);
            const partnerMap = (partners || []).reduce((acc, p) => { acc[p.id] = p; return acc; }, {});
            return Object.values(conversationMap).map(c => ({
                ...c,
                partner: partnerMap[c.partnerId] || { name: 'Nepoznato', role: 'unknown' }
            })).sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
        } catch (error) {
            console.error('Error fetching conversations:', error);
            return [];
        }
    };

    const deleteConversation = async (partnerId) => {
        if (!user) return;
        try {
            // Soft delete all messages with this partner
            await supabase.from('messages')
                .update({ deleted_at: new Date().toISOString() })
                .or(`and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id})`);
            return { success: true };
        } catch (error) {
            throw error;
        }
    };

    const subscribeToMessages = (callback) => {
        if (!user) return () => {};
        const channelName = `messages_${user.id}_${Date.now()}`;
        const subscription = supabase.channel(channelName)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` }, (payload) => {
                callback(payload.new, 'received');
                fetchUnreadCount();
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `sender_id=eq.${user.id}` }, (payload) => {
                callback(payload.new, 'sent');
            })
            .subscribe();
        messagesSubscriptionRef.current = subscription;
        return () => { supabase.removeChannel(subscription); };
    };

    const fetchAdmins = async () => {
        try {
            const { data, error } = await supabase.from('users').select('id, name, role')
                .in('role', ['admin', 'developer'])
                .is('deleted_at', null);
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching admins:', error);
            return [];
        }
    };

    const sendMessageToAdmins = async (content) => {
        if (!user) throw new Error('Niste prijavljeni');
        try {
            const admins = await fetchAdmins();
            if (admins.length === 0) throw new Error('Nema dostupnih admina');
            const msgCompanyCode = companyCode || 'SUPPORT';
            const messages = admins.map(admin => ({
                sender_id: user.id,
                receiver_id: admin.id,
                company_code: msgCompanyCode,
                content: content.trim()
            }));
            const { error } = await supabase.from('messages').insert(messages);
            if (error) throw error;
            return { success: true, sentTo: admins.length };
        } catch (error) {
            throw error;
        }
    };

    const updateMasterCodePrice = async (codeId, priceData) => {
        if (!isAdmin()) throw new Error('Nemate dozvolu za ovu akciju');
        try {
            const { error } = await supabase.from('master_codes').update({
                price: priceData.price ? parseFloat(priceData.price) : null,
                billing_type: priceData.billing_type,
                currency: priceData.currency
            }).eq('id', codeId);
            if (error) throw error;
            return { success: true };
        } catch (error) {
            throw error;
        }
    };

    const value = {
        user, authUser, companyCode, companyName, isLoading, pickupRequests, clientRequests, processedNotification, clearProcessedNotification, fetchClientRequests, fetchClientHistory,
        login, logout, register, removePickupRequest, markRequestAsProcessed, updateProcessedRequest, deleteProcessedRequest, fetchCompanyClients, fetchCompanyMembers, fetchProcessedRequests, fetchCompanyEquipmentTypes,
        updateCompanyEquipmentTypes, fetchCompanyWasteTypes, updateCompanyWasteTypes, updateClientDetails, addPickupRequest, fetchPickupRequests,
        isAdmin, isDeveloper, generateMasterCode, fetchAllMasterCodes, fetchAllUsers, fetchAllCompanies, promoteToAdmin, demoteFromAdmin, getAdminStats, updateMasterCodePrice,
        deleteUser, updateUser, deleteCompany, updateCompany, fetchCompanyDetails, deleteMasterCode, deleteClient,
        updateProfile, updateCompanyName, updateLocation, toggleCompanyStatus,
        originalUser, impersonateUser, exitImpersonation, changeUserRole,
        messages, unreadCount, fetchMessages, sendMessage, markMessagesAsRead, fetchUnreadCount, getConversations, deleteConversation, subscribeToMessages,
        fetchAdmins, sendMessageToAdmins,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
