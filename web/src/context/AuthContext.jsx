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
    const [companyCode, setCompanyCode] = useState(null);
    const [companyName, setCompanyName] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [pickupRequests, setPickupRequests] = useState([]);
    const [clientRequests, setClientRequests] = useState([]);
    const [processedNotification, setProcessedNotification] = useState(null);
    const [messages, setMessages] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        const savedSession = localStorage.getItem('eco_session');
        if (savedSession) {
            const session = JSON.parse(savedSession);
            setUser(session.user);
            setCompanyCode(session.companyCode);
            setCompanyName(session.companyName);
        }
        setIsLoading(false);
    }, []);

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
            const { data, error } = await supabase.from('pickup_requests').select('*').eq('user_id', currentUser.id).eq('status', 'pending').order('created_at', { ascending: false });
            if (error) throw error;
            setClientRequests(data || []);
        } catch (error) { console.error('Error fetching client requests:', error); }
    };

    const clearProcessedNotification = () => setProcessedNotification(null);

    const fetchPickupRequests = async (code = companyCode) => {
        if (!code) return;
        try {
            const { data, error } = await supabase.from('pickup_requests').select('*').eq('company_code', code).eq('status', 'pending').order('created_at', { ascending: false });
            if (error) throw error;
            setPickupRequests(data || []);
        } catch (error) { console.error('Error fetching requests:', error); }
    };

    const login = async (phone, password) => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.from('users').select('*').eq('phone', phone).eq('password', password);
            if (error) throw error;
            if (!data || data.length === 0) throw new Error('Pogresan broj telefona ili lozinka');
            const userData = data[0];
            let companyData = null;
            const { data: companyByCode } = await supabase.from('companies').select('*').eq('code', userData.company_code).single();
            if (companyByCode) companyData = companyByCode;
            else if (userData.role === 'manager') {
                const { data: companyByManager } = await supabase.from('companies').select('*').eq('manager_id', userData.id).single();
                companyData = companyByManager;
            }
            let actualCompanyCode = companyData?.code || userData.company_code;
            const userObj = { id: userData.id, name: userData.name, role: userData.role, address: userData.address, phone: userData.phone, latitude: userData.latitude, longitude: userData.longitude };
            setUser(userObj);
            setCompanyCode(actualCompanyCode);
            setCompanyName(companyData?.name || 'Nepoznato');
            localStorage.setItem('eco_session', JSON.stringify({ user: userObj, companyCode: actualCompanyCode, companyName: companyData?.name || 'Nepoznato' }));
            return { success: true, role: userData.role };
        } catch (error) { throw error; }
        finally { setIsLoading(false); }
    };

    const logout = () => {
        setUser(null); setCompanyCode(null); setCompanyName(null); setPickupRequests([]);
        localStorage.removeItem('eco_session');
    };

    const register = async ({ name, phone, password, address, companyCode: inputCode, role, joinExisting }) => {
        setIsLoading(true);
        try {
            const { data: existingUser } = await supabase.from('users').select('id').eq('phone', phone).single();
            if (existingUser) throw new Error('Korisnik sa ovim brojem telefona vec postoji');
            if (role === 'client') {
                const { data: company, error: companyError } = await supabase.from('companies').select('*').eq('code', inputCode.toUpperCase()).single();
                if (companyError || !company) throw new Error('Nevažeći kod firme');
                await supabase.from('users').insert([{ name, phone, password, address, role: 'client', company_code: inputCode.toUpperCase() }]).select().single();
                return { success: true };
            } else if (role === 'manager') {
                if (joinExisting) {
                    const { data: company, error: companyError } = await supabase.from('companies').select('*').eq('code', inputCode.toUpperCase()).single();
                    if (companyError || !company) throw new Error('Nevažeći kod firme');
                    await supabase.from('users').insert([{ name, phone, password, address, role: 'manager', company_code: inputCode.toUpperCase() }]).select().single();
                    return { success: true };
                } else {
                    const { data: masterCodeData, error: mcError } = await supabase.from('master_codes').select('*').eq('code', inputCode.toUpperCase()).eq('status', 'available').single();
                    if (mcError || !masterCodeData) throw new Error('Nevažeći ili vec iskorišceni Master Code');
                    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
                    let companyCodeGen; let isUnique = false;
                    while (!isUnique) { companyCodeGen = 'ECO-' + Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join(''); const { data: existing } = await supabase.from('companies').select('id').eq('code', companyCodeGen).single(); if (!existing) isUnique = true; }
                    const { data: companyData } = await supabase.from('companies').insert([{ code: companyCodeGen, name: name + ' Firma', master_code_id: masterCodeData.id }]).select().single();
                    const { data: userData } = await supabase.from('users').insert([{ name, phone, password, address, role: 'manager', company_code: companyCodeGen }]).select().single();
                    await supabase.from('companies').update({ manager_id: userData.id }).eq('id', companyData.id);
                    await supabase.from('master_codes').update({ status: 'used', used_by_company: companyData.id }).eq('id', masterCodeData.id);
                    return { success: true };
                }
            }
        } catch (error) { throw error; }
        finally { setIsLoading(false); }
    };

    const removePickupRequest = async (id) => {
        try { const { error } = await supabase.from('pickup_requests').delete().eq('id', id); if (error) throw error; setPickupRequests(prev => prev.filter(req => req.id !== id)); }
        catch (error) { throw error; }
    };

    const markRequestAsProcessed = async (request) => {
        try {
            const processedRecord = { company_code: companyCode, client_id: request.user_id, client_name: request.client_name, client_address: request.client_address, waste_type: request.waste_type, waste_label: request.waste_label, fill_level: request.fill_level, urgency: request.urgency, note: request.note, created_at: request.created_at, processed_at: new Date().toISOString() };
            await supabase.from('processed_requests').insert([processedRecord]);
            await removePickupRequest(request.id);
            return { success: true };
        } catch (error) { throw error; }
    };

    const fetchCompanyClients = async () => {
        if (!companyCode) return [];
        try { const { data, error } = await supabase.from('users').select('*').eq('role', 'client').eq('company_code', companyCode); if (error) throw error; return data || []; }
        catch { return []; }
    };

    const fetchProcessedRequests = async (filters = {}) => {
        if (!companyCode) return [];
        try { let query = supabase.from('processed_requests').select('*').eq('company_code', companyCode).order('processed_at', { ascending: false }); if (filters.startDate) query = query.gte('processed_at', filters.startDate); if (filters.endDate) query = query.lte('processed_at', filters.endDate); if (filters.clientId) query = query.eq('client_id', filters.clientId); const { data, error } = await query; if (error) throw error; return data || []; }
        catch { return []; }
    };

    const fetchCompanyEquipmentTypes = async () => {
        if (!companyCode) return [];
        try { const { data, error } = await supabase.from('companies').select('equipment_types').eq('code', companyCode).single(); if (error) throw error; return data?.equipment_types || []; }
        catch { return []; }
    };

    const updateCompanyEquipmentTypes = async (equipmentTypes) => {
        if (!companyCode) throw new Error('Niste povezani sa firmom');
        try { const { error } = await supabase.from('companies').update({ equipment_types: equipmentTypes }).eq('code', companyCode); if (error) throw error; return { success: true }; }
        catch (error) { throw error; }
    };

    const updateClientDetails = async (clientId, equipmentTypes, note, pib) => {
        try { const { error } = await supabase.from('users').update({ equipment_types: equipmentTypes, manager_note: note, pib: pib || null }).eq('id', clientId); if (error) throw error; return { success: true }; }
        catch (error) { throw error; }
    };

    const addPickupRequest = async (request) => {
        if (!companyCode) throw new Error('Niste povezani sa firmom');
        try {
            const { data: freshUser } = await supabase.from('users').select('latitude, longitude, address').eq('id', user?.id).single();
            const newRequest = { user_id: user?.id, company_code: companyCode, waste_type: request.wasteType, waste_label: request.wasteLabel, fill_level: request.fillLevel, urgency: request.urgency, note: request.note || '', client_name: user?.name || 'Nepoznat', client_address: freshUser?.address || user?.address || '', client_phone: user?.phone || '', latitude: freshUser?.latitude ? Number(freshUser.latitude) : null, longitude: freshUser?.longitude ? Number(freshUser.longitude) : null, status: 'pending' };
            const { data, error } = await supabase.from('pickup_requests').insert([newRequest]).select().single();
            if (error) throw error;
            return data;
        } catch (error) { throw error; }
    };

    const isAdmin = () => user?.role === 'developer' || user?.role === 'admin';
    const isDeveloper = () => user?.role === 'developer';

    const generateMasterCode = async (note = '') => {
        if (!isAdmin()) throw new Error('Nemate dozvolu za ovu akciju');
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = 'MC-'; for (let i = 0; i < 6; i++) { code += chars.charAt(Math.floor(Math.random() * chars.length)); }
        try { const { data, error } = await supabase.from('master_codes').insert([{ code, created_by: user.id, note, status: 'available' }]).select().single(); if (error) throw error; return data; }
        catch (error) { throw error; }
    };

    const fetchAllMasterCodes = async () => {
        if (!isAdmin()) return [];
        try {
            const { data: codes, error } = await supabase.from('master_codes').select('*').order('created_at', { ascending: false }); if (error) throw error;
            const creatorIds = [...new Set((codes || []).filter(c => c.created_by).map(c => c.created_by))];
            let creatorMap = {};
            if (creatorIds.length > 0) { const { data: creators } = await supabase.from('users').select('id, name').in('id', creatorIds); creatorMap = (creators || []).reduce((acc, u) => { acc[u.id] = u.name; return acc; }, {}); }
            const companyIds = [...new Set((codes || []).filter(c => c.used_by_company).map(c => c.used_by_company))];
            let companyMap = {};
            if (companyIds.length > 0) { const { data: companies } = await supabase.from('companies').select('id, name, code').in('id', companyIds); companyMap = (companies || []).reduce((acc, c) => { acc[c.id] = { name: c.name, code: c.code }; return acc; }, {}); }
            return (codes || []).map(c => ({ ...c, creator: c.created_by ? { name: creatorMap[c.created_by] || null } : null, company: c.used_by_company ? companyMap[c.used_by_company] || null : null }));
        } catch { return []; }
    };

    const fetchAllUsers = async (filters = {}) => {
        if (!isAdmin()) return [];
        try {
            let query = supabase.from('users').select('*').order('name'); if (filters.role) query = query.eq('role', filters.role); if (filters.companyCode) query = query.eq('company_code', filters.companyCode);
            const { data: users, error } = await query; if (error) throw error;
            const companyCodes = [...new Set((users || []).filter(u => u.company_code).map(u => u.company_code))];
            let companyMap = {};
            if (companyCodes.length > 0) { const { data: companies } = await supabase.from('companies').select('code, name').in('code', companyCodes); companyMap = (companies || []).reduce((acc, c) => { acc[c.code] = c.name; return acc; }, {}); }
            return (users || []).map(u => ({ ...u, company: u.company_code ? { name: companyMap[u.company_code] || null } : null }));
        } catch { return []; }
    };

    const fetchAllCompanies = async () => {
        if (!isAdmin()) return [];
        try {
            const { data, error } = await supabase.from('companies').select('*').order('name'); if (error) throw error;
            const companiesWithCounts = await Promise.all((data || []).map(async (company) => {
                const { count: managerCount } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('company_code', company.code).eq('role', 'manager');
                const { count: clientCount } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('company_code', company.code).eq('role', 'client');
                return { ...company, managerCount: managerCount || 0, clientCount: clientCount || 0 };
            }));
            return companiesWithCounts;
        } catch { return []; }
    };

    const promoteToAdmin = async (userId) => { if (!isDeveloper()) throw new Error('Samo Developer može da promoviše admina'); try { await supabase.from('users').update({ role: 'admin' }).eq('id', userId); return { success: true }; } catch (error) { throw error; } };
    const demoteFromAdmin = async (userId) => { if (!isDeveloper()) throw new Error('Samo Developer može da ukloni admin status'); try { await supabase.from('users').update({ role: 'manager' }).eq('id', userId); return { success: true }; } catch (error) { throw error; } };

    const getAdminStats = async () => {
        if (!isAdmin()) return null;
        try {
            const [{ count: totalUsers }, { count: totalCompanies }, { count: totalCodes }, { count: usedCodes }, { count: totalManagers }, { count: totalClients }, { count: totalAdmins }] = await Promise.all([
                supabase.from('users').select('*', { count: 'exact', head: true }),
                supabase.from('companies').select('*', { count: 'exact', head: true }),
                supabase.from('master_codes').select('*', { count: 'exact', head: true }),
                supabase.from('master_codes').select('*', { count: 'exact', head: true }).eq('status', 'used'),
                supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'manager'),
                supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'client'),
                supabase.from('users').select('*', { count: 'exact', head: true }).in('role', ['admin', 'developer'])
            ]);
            return { totalUsers: totalUsers || 0, totalCompanies: totalCompanies || 0, totalCodes: totalCodes || 0, usedCodes: usedCodes || 0, availableCodes: (totalCodes || 0) - (usedCodes || 0), totalManagers: totalManagers || 0, totalClients: totalClients || 0, totalAdmins: totalAdmins || 0 };
        } catch { return null; }
    };

    const deleteUser = async (userId) => { if (!isDeveloper()) throw new Error('Samo Developer može da briše korisnike'); try { await supabase.from('users').delete().eq('id', userId); return { success: true }; } catch (error) { throw error; } };
    const updateUser = async (userId, updates) => { if (!isAdmin()) throw new Error('Nemate dozvolu za ovu akciju'); try { await supabase.from('users').update(updates).eq('id', userId); return { success: true }; } catch (error) { throw error; } };

    // Update current user's profile (name)
    const updateProfile = async (newName) => {
        if (!user) throw new Error('Niste prijavljeni');
        try {
            const { error } = await supabase.from('users').update({ name: newName }).eq('id', user.id);
            if (error) throw error;
            // Update local user state
            setUser(prev => ({ ...prev, name: newName }));
            return { success: true };
        } catch (error) { throw error; }
    };

    // Update company name (for managers)
    const updateCompanyName = async (newCompanyName) => {
        if (!user || !companyCode) throw new Error('Niste prijavljeni');
        if (user.role !== 'manager') throw new Error('Samo menadžer može da menja ime firme');
        try {
            const { error } = await supabase.from('companies').update({ name: newCompanyName }).eq('code', companyCode);
            if (error) throw error;
            // Update local state
            setCompanyName(newCompanyName);
            return { success: true };
        } catch (error) { throw error; }
    };

    const deleteCompany = async (companyCodeToDelete) => {
        if (!isDeveloper()) throw new Error('Samo Developer može da briše firme');
        try {
            const { data: companyData } = await supabase.from('companies').select('id').eq('code', companyCodeToDelete).single();
            if (companyData) { await supabase.from('master_codes').update({ used_by_company: null, status: 'available', pib: null }).eq('used_by_company', companyData.id); }
            await supabase.from('users').delete().eq('company_code', companyCodeToDelete);
            await supabase.from('companies').delete().eq('code', companyCodeToDelete);
            return { success: true };
        } catch (error) { throw error; }
    };

    const updateCompany = async (companyCodeToUpdate, updates) => { if (!isAdmin()) throw new Error('Nemate dozvolu za ovu akciju'); try { await supabase.from('companies').update(updates).eq('code', companyCodeToUpdate); return { success: true }; } catch (error) { throw error; } };

    const deleteMasterCode = async (codeId) => {
        if (!isDeveloper()) throw new Error('Samo Developer može da briše master kodove');
        try {
            const { data: codeData } = await supabase.from('master_codes').select('status').eq('id', codeId).single();
            if (codeData.status === 'used') throw new Error('Ne možete obrisati iskorišćen kod.');
            await supabase.from('master_codes').delete().eq('id', codeId);
            return { success: true };
        } catch (error) { throw error; }
    };

    const fetchCompanyDetails = async (companyCodeToFetch) => {
        if (!isAdmin()) return null;
        try {
            const { data: company } = await supabase.from('companies').select('*').eq('code', companyCodeToFetch).single();
            const { data: users } = await supabase.from('users').select('*').eq('company_code', companyCodeToFetch);
            return { ...company, users: users || [], managers: (users || []).filter(u => u.role === 'manager'), clients: (users || []).filter(u => u.role === 'client') };
        } catch { return null; }
    };

    const deleteClient = async (clientId) => {
        if (user?.role !== 'manager') throw new Error('Samo menadžer može brisati klijente');
        try {
            await supabase.from('pickup_requests').delete().eq('client_id', clientId);
            await supabase.from('users').delete().eq('id', clientId);
            return { success: true };
        } catch (error) { throw error; }
    };

    // Chat functions
    const fetchMessages = async (otherUserId = null) => {
        if (!user) return [];
        try {
            // Admins can see all messages sent to them (no company filter)
            let query = supabase.from('messages').select('*');
            if (!isAdmin() && companyCode) {
                query = query.eq('company_code', companyCode);
            }
            if (otherUserId) {
                query = query.or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`);
            } else {
                query = query.or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);
            }
            const { data, error } = await query.order('created_at', { ascending: true });
            if (error) throw error;
            setMessages(data || []);
            return data || [];
        } catch (error) { console.error('Error fetching messages:', error); return []; }
    };

    const sendMessage = async (receiverId, content, receiverCompanyCode = null) => {
        if (!user) throw new Error('Niste prijavljeni');
        try {
            // Use receiver's company code if provided, or sender's company code, or 'ADMIN' for admin users
            const msgCompanyCode = receiverCompanyCode || companyCode || 'ADMIN';
            const { data, error } = await supabase.from('messages').insert([{
                sender_id: user.id,
                receiver_id: receiverId,
                company_code: msgCompanyCode,
                content: content.trim()
            }]).select().single();
            if (error) throw error;
            return data;
        } catch (error) { throw error; }
    };

    const markMessagesAsRead = async (senderId) => {
        if (!user) return;
        try {
            await supabase.from('messages')
                .update({ read_at: new Date().toISOString() })
                .eq('sender_id', senderId)
                .eq('receiver_id', user.id)
                .is('read_at', null);
            fetchUnreadCount();
        } catch (error) { console.error('Error marking messages as read:', error); }
    };

    const fetchUnreadCount = async () => {
        if (!user) return 0;
        try {
            const { count, error } = await supabase.from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('receiver_id', user.id)
                .is('read_at', null);
            if (error) throw error;
            setUnreadCount(count || 0);
            return count || 0;
        } catch { return 0; }
    };

    const getConversations = async () => {
        if (!user) return [];
        try {
            // Admins see all conversations, others see only their company's
            let query = supabase.from('messages').select('*');
            if (!isAdmin() && companyCode) {
                query = query.eq('company_code', companyCode);
            }
            const { data: allMessages, error } = await query
                .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
                .order('created_at', { ascending: false });
            if (error) throw error;

            // Group by conversation partner
            const conversationsMap = new Map();
            for (const msg of (allMessages || [])) {
                const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
                if (!conversationsMap.has(partnerId)) {
                    conversationsMap.set(partnerId, {
                        partnerId,
                        lastMessage: msg.content,
                        lastMessageAt: msg.created_at,
                        unread: msg.receiver_id === user.id && !msg.read_at ? 1 : 0
                    });
                } else if (msg.receiver_id === user.id && !msg.read_at) {
                    conversationsMap.get(partnerId).unread++;
                }
            }

            // Fetch partner details
            const partnerIds = [...conversationsMap.keys()];
            if (partnerIds.length === 0) return [];
            const { data: partners } = await supabase.from('users').select('id, name, role, phone').in('id', partnerIds);
            const partnerMap = (partners || []).reduce((acc, p) => { acc[p.id] = p; return acc; }, {});

            return [...conversationsMap.values()].map(conv => ({
                ...conv,
                partner: partnerMap[conv.partnerId] || { name: 'Nepoznat', role: 'unknown' }
            })).sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
        } catch (error) { console.error('Error fetching conversations:', error); return []; }
    };

    // Subscribe to new messages
    useEffect(() => {
        if (!user || !companyCode) return;
        fetchUnreadCount();
        const channelName = `messages_${user.id}`;
        const subscription = supabase
            .channel(channelName)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` }, () => {
                fetchUnreadCount();
            })
            .subscribe();
        return () => { supabase.removeChannel(subscription); };
    }, [user, companyCode]);

    // Fetch all admin users (for contact admin feature)
    const fetchAdmins = async () => {
        try {
            const { data, error } = await supabase.from('users').select('id, name, role, phone').in('role', ['admin', 'developer']);
            if (error) throw error;
            return data || [];
        } catch (error) { console.error('Error fetching admins:', error); return []; }
    };

    // Send message to all admins (support message)
    const sendMessageToAdmins = async (content) => {
        if (!user) throw new Error('Niste prijavljeni');
        try {
            const admins = await fetchAdmins();
            if (admins.length === 0) throw new Error('Nema dostupnih admina');

            // Use company code if available, otherwise use 'SUPPORT' for support messages
            const msgCompanyCode = companyCode || 'SUPPORT';

            // Send message to each admin
            const messages = admins.map(admin => ({
                sender_id: user.id,
                receiver_id: admin.id,
                company_code: msgCompanyCode,
                content: content.trim()
            }));

            const { error } = await supabase.from('messages').insert(messages);
            if (error) throw error;
            return { success: true, sentTo: admins.length };
        } catch (error) { throw error; }
    };

    const value = {
        user, companyCode, companyName, isLoading, pickupRequests, clientRequests, processedNotification, clearProcessedNotification, fetchClientRequests,
        login, logout, register, removePickupRequest, markRequestAsProcessed, fetchCompanyClients, fetchProcessedRequests, fetchCompanyEquipmentTypes,
        updateCompanyEquipmentTypes, updateClientDetails, addPickupRequest, fetchPickupRequests,
        isAdmin, isDeveloper, generateMasterCode, fetchAllMasterCodes, fetchAllUsers, fetchAllCompanies, promoteToAdmin, demoteFromAdmin, getAdminStats,
        deleteUser, updateUser, deleteCompany, updateCompany, fetchCompanyDetails, deleteMasterCode, deleteClient,
        // Profile updates
        updateProfile, updateCompanyName,
        // Chat
        messages, unreadCount, fetchMessages, sendMessage, markMessagesAsRead, fetchUnreadCount, getConversations,
        // Admin contact
        fetchAdmins, sendMessageToAdmins,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
