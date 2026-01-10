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

  // Load session from localStorage
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

  // Subscribe to real-time updates
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

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [companyCode]);

  const fetchPickupRequests = async (code = companyCode) => {
    if (!code) return;
    try {
      const { data, error } = await supabase
        .from('pickup_requests')
        .select('*')
        .eq('company_code', code)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setPickupRequests(data || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
    }
  };

  const login = async (phone, password) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('phone', phone)
        .eq('password', password);

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('Pogresan broj telefona ili lozinka');
      }

      const userData = data[0];
      const { data: companyData } = await supabase
        .from('companies')
        .select('*')
        .eq('code', userData.company_code)
        .single();

      const userObj = {
        id: userData.id,
        name: userData.name,
        role: userData.role,
        address: userData.address,
        phone: userData.phone,
        latitude: userData.latitude,
        longitude: userData.longitude,
      };

      setUser(userObj);
      setCompanyCode(userData.company_code);
      setCompanyName(companyData?.name || 'Nepoznato');

      localStorage.setItem('eco_session', JSON.stringify({
        user: userObj,
        companyCode: userData.company_code,
        companyName: companyData?.name || 'Nepoznato'
      }));

      return { success: true, role: userData.role };
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setCompanyCode(null);
    setCompanyName(null);
    setPickupRequests([]);
    localStorage.removeItem('eco_session');
  };

  const removePickupRequest = async (id) => {
    try {
      const { error } = await supabase
        .from('pickup_requests')
        .delete()
        .eq('id', id);
      if (error) throw error;
      setPickupRequests(prev => prev.filter(req => req.id !== id));
    } catch (error) {
      console.error('Error removing request:', error);
      throw error;
    }
  };

  const markRequestAsProcessed = async (request) => {
    try {
      const processedRecord = {
        company_code: companyCode,
        client_id: request.user_id,
        client_name: request.client_name,
        client_address: request.client_address,
        waste_type: request.waste_type,
        waste_label: request.waste_label,
        fill_level: request.fill_level,
        urgency: request.urgency,
        note: request.note,
        created_at: request.created_at,
        processed_at: new Date().toISOString(),
      };

      const { error: insertError } = await supabase
        .from('processed_requests')
        .insert([processedRecord]);
      if (insertError) throw insertError;

      await removePickupRequest(request.id);
      return { success: true };
    } catch (error) {
      console.error('Error marking request as processed:', error);
      throw error;
    }
  };

  const fetchCompanyClients = async () => {
    if (!companyCode) return [];
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'client')
        .eq('company_code', companyCode);
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching clients:', error);
      return [];
    }
  };

  const fetchProcessedRequests = async (filters = {}) => {
    if (!companyCode) return [];
    try {
      let query = supabase
        .from('processed_requests')
        .select('*')
        .eq('company_code', companyCode)
        .order('processed_at', { ascending: false });

      if (filters.startDate) query = query.gte('processed_at', filters.startDate);
      if (filters.endDate) query = query.lte('processed_at', filters.endDate);
      if (filters.clientId) query = query.eq('client_id', filters.clientId);

      const { data, error } = await query;
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
        .single();
      if (error) throw error;
      return data?.equipment_types || [];
    } catch (error) {
      console.error('Error fetching equipment types:', error);
      return [];
    }
  };

  const updateClientDetails = async (clientId, equipmentTypes, note) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ equipment_types: equipmentTypes, manager_note: note })
        .eq('id', clientId);
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error updating client:', error);
      throw error;
    }
  };

  const addPickupRequest = async (request) => {
    if (!companyCode) throw new Error('Niste povezani sa firmom');
    try {
      const { data: freshUser } = await supabase
        .from('users')
        .select('latitude, longitude, address')
        .eq('id', user?.id)
        .single();

      const newRequest = {
        user_id: user?.id,
        company_code: companyCode,
        waste_type: request.wasteType,
        waste_label: request.wasteLabel,
        fill_level: request.fillLevel,
        urgency: request.urgency,
        note: request.note || '',
        client_name: user?.name || 'Nepoznat',
        client_address: freshUser?.address || user?.address || '',
        client_phone: user?.phone || '',
        latitude: freshUser?.latitude ? Number(freshUser.latitude) : null,
        longitude: freshUser?.longitude ? Number(freshUser.longitude) : null,
        status: 'pending',
      };

      const { data, error } = await supabase
        .from('pickup_requests')
        .insert([newRequest])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding request:', error);
      throw error;
    }
  };

  // =====================================================
  // ADMIN FUNCTIONS
  // =====================================================

  const isAdmin = () => {
    return user?.role === 'god' || user?.role === 'admin';
  };

  const isGod = () => {
    return user?.role === 'god';
  };

  const generateMasterCode = async (note = '') => {
    if (!isAdmin()) throw new Error('Nemate dozvolu za ovu akciju');

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'MC-';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    try {
      const { data, error } = await supabase
        .from('master_codes')
        .insert([{
          code,
          created_by: user.id,
          note,
          status: 'available'
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error generating master code:', error);
      throw error;
    }
  };

  const fetchAllMasterCodes = async () => {
    if (!isAdmin()) return [];
    try {
      // Fetch master codes without FK joins
      const { data: codes, error } = await supabase
        .from('master_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch creator names
      const creatorIds = [...new Set((codes || []).filter(c => c.created_by).map(c => c.created_by))];
      let creatorMap = {};
      if (creatorIds.length > 0) {
        const { data: creators } = await supabase
          .from('users')
          .select('id, name')
          .in('id', creatorIds);
        creatorMap = (creators || []).reduce((acc, u) => { acc[u.id] = u.name; return acc; }, {});
      }

      // Fetch company info for used codes
      const companyIds = [...new Set((codes || []).filter(c => c.used_by_company).map(c => c.used_by_company))];
      let companyMap = {};
      if (companyIds.length > 0) {
        const { data: companies } = await supabase
          .from('companies')
          .select('id, name, code')
          .in('id', companyIds);
        companyMap = (companies || []).reduce((acc, c) => { acc[c.id] = { name: c.name, code: c.code }; return acc; }, {});
      }

      // Enrich codes with related data
      return (codes || []).map(c => ({
        ...c,
        creator: c.created_by ? { name: creatorMap[c.created_by] || null } : null,
        company: c.used_by_company ? companyMap[c.used_by_company] || null : null
      }));
    } catch (error) {
      console.error('Error fetching master codes:', error);
      return [];
    }
  };

  const fetchAllUsers = async (filters = {}) => {
    if (!isAdmin()) return [];
    try {
      let query = supabase
        .from('users')
        .select('*')
        .order('name');

      if (filters.role) query = query.eq('role', filters.role);
      if (filters.companyCode) query = query.eq('company_code', filters.companyCode);

      const { data: users, error } = await query;
      if (error) throw error;

      // Fetch company names separately
      const companyCodes = [...new Set((users || []).filter(u => u.company_code).map(u => u.company_code))];
      let companyMap = {};

      if (companyCodes.length > 0) {
        const { data: companies } = await supabase
          .from('companies')
          .select('code, name')
          .in('code', companyCodes);

        companyMap = (companies || []).reduce((acc, c) => {
          acc[c.code] = c.name;
          return acc;
        }, {});
      }

      // Enrich users with company info
      return (users || []).map(u => ({
        ...u,
        company: u.company_code ? { name: companyMap[u.company_code] || null } : null
      }));
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  };

  const fetchAllCompanies = async () => {
    if (!isAdmin()) return [];
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('name');

      if (error) throw error;

      // Get user counts for each company
      const companiesWithCounts = await Promise.all(
        (data || []).map(async (company) => {
          const { count: managerCount } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('company_code', company.code)
            .eq('role', 'manager');

          const { count: clientCount } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('company_code', company.code)
            .eq('role', 'client');

          return {
            ...company,
            managerCount: managerCount || 0,
            clientCount: clientCount || 0
          };
        })
      );

      return companiesWithCounts;
    } catch (error) {
      console.error('Error fetching companies:', error);
      return [];
    }
  };

  const promoteToAdmin = async (userId) => {
    if (!isGod()) throw new Error('Samo GOD moze da promoviše admina');
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: 'admin' })
        .eq('id', userId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error promoting user:', error);
      throw error;
    }
  };

  const demoteFromAdmin = async (userId) => {
    if (!isGod()) throw new Error('Samo GOD moze da ukloni admin status');
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: 'manager' })
        .eq('id', userId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error demoting user:', error);
      throw error;
    }
  };

  const getAdminStats = async () => {
    if (!isAdmin()) return null;
    try {
      const [
        { count: totalUsers },
        { count: totalCompanies },
        { count: totalCodes },
        { count: usedCodes },
        { count: totalManagers },
        { count: totalClients },
        { count: totalAdmins }
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('companies').select('*', { count: 'exact', head: true }),
        supabase.from('master_codes').select('*', { count: 'exact', head: true }),
        supabase.from('master_codes').select('*', { count: 'exact', head: true }).eq('status', 'used'),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'manager'),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'client'),
        supabase.from('users').select('*', { count: 'exact', head: true }).in('role', ['admin', 'god'])
      ]);

      return {
        totalUsers: totalUsers || 0,
        totalCompanies: totalCompanies || 0,
        totalCodes: totalCodes || 0,
        usedCodes: usedCodes || 0,
        availableCodes: (totalCodes || 0) - (usedCodes || 0),
        totalManagers: totalManagers || 0,
        totalClients: totalClients || 0,
        totalAdmins: totalAdmins || 0
      };
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      return null;
    }
  };

  // Delete user (God only)
  const deleteUser = async (userId) => {
    if (!isGod()) throw new Error('Samo GOD može da briše korisnike');
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  };

  // Update user (Admin/God)
  const updateUser = async (userId, updates) => {
    if (!isAdmin()) throw new Error('Nemate dozvolu za ovu akciju');
    try {
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId);
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  };

  // Delete company (God only)
  const deleteCompany = async (companyCode) => {
    if (!isGod()) throw new Error('Samo GOD može da briše firme');
    try {
      // First get the company to find its ID
      const { data: companyData } = await supabase
        .from('companies')
        .select('id')
        .eq('code', companyCode)
        .single();

      // Clear master_codes reference to this company
      if (companyData) {
        await supabase
          .from('master_codes')
          .update({ used_by_company: null, status: 'available', pib: null })
          .eq('used_by_company', companyData.id);
      }

      // Delete all users in the company
      await supabase
        .from('users')
        .delete()
        .eq('company_code', companyCode);

      // Then delete the company
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('code', companyCode);
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error deleting company:', error);
      throw error;
    }
  };

  // Update company (Admin/God)
  const updateCompany = async (companyCode, updates) => {
    if (!isAdmin()) throw new Error('Nemate dozvolu za ovu akciju');
    try {
      const { error } = await supabase
        .from('companies')
        .update(updates)
        .eq('code', companyCode);
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error updating company:', error);
      throw error;
    }
  };

  // Fetch company with full details including equipment
  const fetchCompanyDetails = async (companyCode) => {
    if (!isAdmin()) return null;
    try {
      const { data: company, error } = await supabase
        .from('companies')
        .select('*')
        .eq('code', companyCode)
        .single();
      if (error) throw error;

      // Fetch all users in this company
      const { data: users } = await supabase
        .from('users')
        .select('*')
        .eq('company_code', companyCode);

      return {
        ...company,
        users: users || [],
        managers: (users || []).filter(u => u.role === 'manager'),
        clients: (users || []).filter(u => u.role === 'client')
      };
    } catch (error) {
      console.error('Error fetching company details:', error);
      return null;
    }
  };

  const value = {
    user,
    companyCode,
    companyName,
    isLoading,
    pickupRequests,
    login,
    logout,
    removePickupRequest,
    markRequestAsProcessed,
    fetchCompanyClients,
    fetchProcessedRequests,
    fetchCompanyEquipmentTypes,
    updateClientDetails,
    addPickupRequest,
    fetchPickupRequests,
    // Admin functions
    isAdmin,
    isGod,
    generateMasterCode,
    fetchAllMasterCodes,
    fetchAllUsers,
    fetchAllCompanies,
    promoteToAdmin,
    demoteFromAdmin,
    getAdminStats,
    // CRUD functions
    deleteUser,
    updateUser,
    deleteCompany,
    updateCompany,
    fetchCompanyDetails,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
