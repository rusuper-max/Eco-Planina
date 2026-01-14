import { createContext, useContext } from 'react';
import { supabase } from '../config/supabase';
import { useAuth } from './AuthContext';

const AdminContext = createContext(null);

export const useAdmin = () => {
    const context = useContext(AdminContext);
    if (!context) {
        throw new Error('useAdmin must be used within AdminProvider');
    }
    return context;
};

export const AdminProvider = ({ children }) => {
    const { user, isAdmin, isDeveloper } = useAuth();

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
                const { data: companies } = await supabase.from('companies').select('id, name, code, status').in('id', companyIds);
                companiesMap = (companies || []).reduce((acc, c) => { acc[c.id] = { name: c.name, code: c.code, status: c.status }; return acc; }, {});
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
                const company = companiesMap[c.used_by_company];
                const companyCode = company?.code;
                const userCounts = companyCode ? userCountsMap[companyCode] : null;
                return {
                    ...c,
                    creatorName: creatorsMap[c.created_by] || null,
                    companyName: company?.name || null,
                    companyCode: companyCode || null,
                    companyStatus: company?.status || null,
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
                // Fetch companies one by one - use select('*') to get all available columns
                const companyPromises = companyCodes.map(code =>
                    supabase.from('companies').select('*').eq('code', code).limit(1)
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
                supabase.from('users').select('id, name, company_code, role').in('role', ['manager', 'client', 'driver', 'company_admin']).is('deleted_at', null)
            ]);
            if (compError) throw compError;
            if (userError) throw userError;
            const counts = (users || []).reduce((acc, u) => {
                if (!acc[u.company_code]) acc[u.company_code] = { managers: 0, clients: 0, drivers: 0, owner: null };
                if (u.role === 'manager') acc[u.company_code].managers++;
                else if (u.role === 'client') acc[u.company_code].clients++;
                else if (u.role === 'driver') acc[u.company_code].drivers++;
                else if (u.role === 'company_admin') acc[u.company_code].owner = u.name;
                return acc;
            }, {});
            return (companies || []).map(company => ({
                ...company,
                ownerName: counts[company.code]?.owner || null,
                managerCount: counts[company.code]?.managers || 0,
                clientCount: counts[company.code]?.clients || 0,
                driverCount: counts[company.code]?.drivers || 0
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

    const toggleCompanyStatus = async (companyCode, newStatus) => {
        if (!isAdmin()) throw new Error('Nemate dozvolu');
        try {
            const { data: company, error: fetchError } = await supabase.from('companies').select('master_code_id').eq('code', companyCode).maybeSingle();
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

    const deleteMasterCode = async (id) => {
        if (!isAdmin()) throw new Error('Nemate dozvolu za ovu akciju');
        try {
            console.log('DEBUG deleteMasterCode - id:', id);
            const { error, count } = await supabase
                .from('master_codes')
                .delete()
                .eq('id', id)
                .select();

            console.log('DEBUG deleteMasterCode - error:', error, 'count:', count);

            if (error) {
                console.error('Delete master code error:', error);
                throw new Error(error.message || 'Greška pri brisanju koda');
            }
            return { success: true };
        } catch (error) {
            console.error('deleteMasterCode catch:', error);
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
        generateMasterCode,
        fetchAllMasterCodes,
        fetchAllUsers,
        fetchAllCompanies,
        promoteToAdmin,
        demoteFromAdmin,
        getAdminStats,
        deleteUser,
        updateUser,
        toggleCompanyStatus,
        deleteCompany,
        updateCompany,
        deleteMasterCode,
        updateMasterCodePrice,
    };

    return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
};

export default AdminContext;
