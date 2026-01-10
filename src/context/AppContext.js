import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';

const AppContext = createContext(null);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};

// Generate unique company code
const generateCompanyCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'ECO-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Generate master code for admin
const generateMasterCodeString = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'MC-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const AppProvider = ({ children }) => {
  // User state
  const [user, setUser] = useState(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Company info
  const [companyCode, setCompanyCode] = useState(null);
  const [companyName, setCompanyName] = useState(null);

  // Pickup requests from Supabase
  const [pickupRequests, setPickupRequests] = useState([]);

  // Selected suppliers for printing
  const [selectedForPrint, setSelectedForPrint] = useState([]);

  // Fetch pickup requests filtered by company code
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

  // Persistence Helper
  const saveSession = async (userObj, code, name) => {
    try {
      await AsyncStorage.setItem('user_session', JSON.stringify({
        user: userObj,
        companyCode: code,
        companyName: name
      }));
    } catch (e) {
      console.error('Failed to save session', e);
    }
  };

  const clearSession = async () => {
    try {
      await AsyncStorage.removeItem('user_session');
    } catch (e) {
      console.error('Failed to clear session', e);
    }
  };

  // Check for saved session on mount
  useEffect(() => {
    const checkSession = async () => {
      setIsLoading(true);
      try {
        const sessionStr = await AsyncStorage.getItem('user_session');
        if (sessionStr) {
          const session = JSON.parse(sessionStr);
          if (session.user) {
            setUser(session.user);
            setCompanyCode(session.companyCode);
            setCompanyName(session.companyName);
            setIsRegistered(true);
            // Re-verify code silently to ensure company still exists or get fresh data
            // (Optional, but good practice)
          }
        }
      } catch (e) {
        console.error('Failed to restore session', e);
      } finally {
        setIsLoading(false);
      }
    };
    checkSession();
  }, []);

  // Subscribe to real-time updates for company
  useEffect(() => {
    if (!companyCode) return;

    // Initial fetch
    fetchPickupRequests(companyCode);

    // Real-time subscription filtered by company
    // Use unique channel name per company to avoid conflicts
    const channelName = `pickup_requests_${companyCode}`;

    const subscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'pickup_requests',
          filter: `company_code=eq.${companyCode}`,
        },
        (payload) => {
          console.log('INSERT event received:', payload);
          fetchPickupRequests(companyCode);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pickup_requests',
          filter: `company_code=eq.${companyCode}`,
        },
        (payload) => {
          console.log('UPDATE event received:', payload);
          fetchPickupRequests(companyCode);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'pickup_requests',
        },
        (payload) => {
          // DELETE events don't include the filter data, so we just refetch
          console.log('DELETE event received:', payload);
          fetchPickupRequests(companyCode);
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [companyCode]);

  // Verify company code exists
  const verifyCompanyCode = async (code) => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('code', code.toUpperCase())
        .single();

      if (error || !data) {
        return { valid: false, company: null };
      }
      return { valid: true, company: data };
    } catch (error) {
      return { valid: false, company: null };
    }
  };

  // Login existing user by phone
  const loginUser = async (phone, password, companyCodeInput = null) => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('users')
        .select('*')
        .eq('phone', phone)
        .eq('password', password); // Plain text check

      if (companyCodeInput) {
        query = query.eq('company_code', companyCodeInput.toUpperCase());
      }

      const { data, error } = await query;

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error('Pogrešan broj telefona ili lozinka');
      }

      // If multiple users found, take the first one (or the one matching company code)
      const userData = data[0];

      // Get company info
      const { data: companyData } = await supabase
        .from('companies')
        .select('*')
        .eq('code', userData.company_code)
        .single();

      setUser({
        id: userData.id,
        name: userData.name,
        role: userData.role,
        address: userData.address,
        phone: userData.phone,
        latitude: userData.latitude,
        longitude: userData.longitude,
      });
      setCompanyCode(userData.company_code);
      setCompanyName(companyData?.name || 'Nepoznato');
      setIsRegistered(true);

      saveSession({
        id: userData.id,
        name: userData.name,
        role: userData.role,
        address: userData.address,
        phone: userData.phone,
        latitude: userData.latitude,
        longitude: userData.longitude,
      }, userData.company_code, companyData?.name || 'Nepoznato');

      return { success: true, role: userData.role };
    } catch (error) {
      console.error('Error logging in:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Register manager (creates new company)
  const registerManager = async (name, firmName, phone, password) => {
    setIsLoading(true);
    try {
      // Check if phone already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('phone', phone)
        .single();

      if (existingUser) {
        throw new Error('Korisnik sa ovim brojem telefona već postoji');
      }

      const code = generateCompanyCode();

      // Create company first
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .insert([{ code, name: firmName }])
        .select()
        .single();

      if (companyError) throw companyError;

      // Create manager user with phone
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert([{ name, role: 'manager', company_code: code, phone, password }])
        .select()
        .single();

      if (userError) throw userError;

      // Update company with manager_id
      await supabase
        .from('companies')
        .update({ manager_id: userData.id })
        .eq('id', companyData.id);

      setUser({ id: userData.id, name, role: 'manager' });
      setCompanyCode(code);
      setCompanyName(firmName);
      setIsRegistered(true);

      saveSession({ id: userData.id, name, role: 'manager' }, code, firmName);

      return { success: true, companyCode: code };
    } catch (error) {
      console.error('Error registering manager:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Register manager to existing company
  const registerManagerToExistingCompany = async (name, phone, password, code) => {
    setIsLoading(true);
    try {
      // Verify company code exists
      const { valid, company } = await verifyCompanyCode(code);
      if (!valid) {
        throw new Error('Nevažeći kod firme');
      }

      // Check if phone already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('phone', phone)
        .single();

      if (existingUser) {
        throw new Error('Korisnik sa ovim brojem telefona već postoji');
      }

      // Create manager user linked to existing company
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert([{
          name,
          role: 'manager',
          company_code: code.toUpperCase(),
          phone,
          password
        }])
        .select()
        .single();

      if (userError) throw userError;

      setUser({ id: userData.id, name, role: 'manager' });
      setCompanyCode(code.toUpperCase());
      setCompanyName(company.name);
      setIsRegistered(true);

      saveSession({ id: userData.id, name, role: 'manager' }, code.toUpperCase(), company.name);

      return { success: true, companyName: company.name };
    } catch (error) {
      console.error('Error registering manager to existing company:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Register client (joins existing company)
  const registerClient = async (name, address, phone, code, password, lat = null, lng = null) => {
    setIsLoading(true);
    try {
      // Verify company code
      const { valid, company } = await verifyCompanyCode(code);
      if (!valid) {
        throw new Error('Nevažeći kod firme');
      }

      // Check if phone already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('phone', phone)
        .single();

      if (existingUser) {
        throw new Error('Korisnik sa ovim brojem telefona već postoji');
      }

      // Create client user with coordinates
      const { data, error } = await supabase
        .from('users')
        .insert([{
          name,
          role: 'client',
          address,
          phone,
          company_code: code.toUpperCase(),
          password,
          latitude: lat,
          longitude: lng
        }])
        .select()
        .single();

      if (error) throw error;

      setUser({ id: data.id, name, role: 'client', address, phone, latitude: lat, longitude: lng });
      setCompanyCode(code.toUpperCase());
      setCompanyName(company.name);
      setIsRegistered(true);

      saveSession({
        id: data.id,
        name,
        role: 'client',
        address,
        phone,
        latitude: lat,
        longitude: lng
      }, code.toUpperCase(), company.name);

      return { success: true };
    } catch (error) {
      console.error('Error registering client:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateClientLocation = async (address, lat, lng) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          address,
          latitude: lat,
          longitude: lng
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      // Update local user state
      const updatedUser = {
        ...user,
        address,
        latitude: lat,
        longitude: lng
      };
      setUser(updatedUser);

      // Persist updated location to AsyncStorage so it survives logout/login
      saveSession(updatedUser, companyCode, companyName);

      return { success: true };
    } catch (error) {
      console.error('Error updating location:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateCompanyEquipmentTypes = async (types) => {
    if (!companyCode || !user?.id) return;
    try {
      const { data: companyData } = await supabase
        .from('companies')
        .select('id')
        .eq('code', companyCode)
        .single();

      if (!companyData) throw new Error('Company not found');

      const { error } = await supabase
        .from('companies')
        .update({ equipment_types: types })
        .eq('id', companyData.id);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error updating equipment types:', error);
      throw error;
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
        .update({
          equipment_types: equipmentTypes, // Now an array
          manager_note: note
        })
        .eq('id', clientId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error updating client details:', error);
      throw error;
    }
  };

  const fetchCompanyClients = async () => {
    if (!companyCode) return [];
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*') // Select all fields to show details
        .eq('role', 'client')
        .eq('company_code', companyCode);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching company clients:', error);
      return [];
    }
  };

  const addPickupRequest = async (request) => {
    if (!companyCode) {
      throw new Error('Niste povezani sa firmom');
    }

    setIsLoading(true);
    try {
      // Fetch fresh user data from database to ensure we have the latest location
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
    } finally {
      setIsLoading(false);
    }
  };

  const removePickupRequest = async (id) => {
    try {
      const { error } = await supabase
        .from('pickup_requests')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setPickupRequests((prev) => prev.filter((req) => req.id !== id));
    } catch (error) {
      console.error('Error removing request:', error);
      throw error;
    }
  };

  // Save processed request to history and delete from active requests
  const markRequestAsProcessed = async (request) => {
    try {
      // Save to processed_requests table
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
        created_at: request.created_at, // Original request creation time
        processed_at: new Date().toISOString(),
      };

      const { error: insertError } = await supabase
        .from('processed_requests')
        .insert([processedRecord]);

      if (insertError) throw insertError;

      // Delete from active requests
      await removePickupRequest(request.id);

      return { success: true };
    } catch (error) {
      console.error('Error marking request as processed:', error);
      throw error;
    }
  };

  // Fetch processed requests history with optional filters
  const fetchProcessedRequests = async (filters = {}) => {
    if (!companyCode) return [];

    try {
      let query = supabase
        .from('processed_requests')
        .select('*')
        .eq('company_code', companyCode)
        .order('processed_at', { ascending: false });

      // Apply date filters
      if (filters.startDate) {
        query = query.gte('processed_at', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('processed_at', filters.endDate);
      }
      // Filter by client
      if (filters.clientId) {
        query = query.eq('client_id', filters.clientId);
      }
      // Filter by waste type
      if (filters.wasteType) {
        query = query.eq('waste_type', filters.wasteType);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching processed requests:', error);
      return [];
    }
  };

  const updatePickupStatus = async (id, status) => {
    try {
      const { error } = await supabase
        .from('pickup_requests')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      setPickupRequests((prev) =>
        prev.map((req) => (req.id === id ? { ...req, status } : req))
      );
    } catch (error) {
      console.error('Error updating status:', error);
      throw error;
    }
  };

  // Print selection functions
  const toggleSelectForPrint = (id) => {
    setSelectedForPrint((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= 10) {
        return prev;
      }
      return [...prev, id];
    });
  };

  const clearPrintSelection = () => {
    setSelectedForPrint([]);
  };

  const getSelectedRequests = () => {
    return pickupRequests.filter((req) => selectedForPrint.includes(req.id));
  };

  const logout = () => {
    setUser(null);
    setIsRegistered(false);
    setCompanyCode(null);
    setCompanyName(null);
    setSelectedForPrint([]);
    setPickupRequests([]);
    clearSession();
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

    const code = generateMasterCodeString();

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
      const { data, error } = await supabase
        .from('master_codes')
        .select(`
          *,
          creator:created_by(name),
          company:used_by_company(name, code)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
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

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
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

  // Delete a user (admin/god only)
  const deleteUser = async (userId) => {
    if (!isAdmin()) throw new Error('Nemate dozvolu za ovu akciju');
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

  // Delete a company and all its users (god only)
  const deleteCompany = async (companyCode) => {
    if (!isGod()) throw new Error('Samo GOD moze da brise firme');
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

      // Delete all users in this company
      const { error: usersError } = await supabase
        .from('users')
        .delete()
        .eq('company_code', companyCode);

      if (usersError) throw usersError;

      // Then delete the company
      const { error: companyError } = await supabase
        .from('companies')
        .delete()
        .eq('code', companyCode);

      if (companyError) throw companyError;

      return { success: true };
    } catch (error) {
      console.error('Error deleting company:', error);
      throw error;
    }
  };

  // Verify master code for manager registration
  const verifyMasterCode = async (code) => {
    try {
      const { data, error } = await supabase
        .from('master_codes')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('status', 'available')
        .single();

      if (error || !data) {
        return { valid: false, masterCode: null };
      }
      return { valid: true, masterCode: data };
    } catch (error) {
      return { valid: false, masterCode: null };
    }
  };

  // Register manager with Master Code + PIB (NEW flow)
  // Master Code becomes the Company Code directly
  const registerManagerWithMasterCode = async (name, firmName, phone, password, masterCode, pib) => {
    setIsLoading(true);
    try {
      // Verify master code
      const { valid, masterCode: mcData } = await verifyMasterCode(masterCode);
      if (!valid) {
        throw new Error('Nevažeći ili već iskorišćeni Master Code');
      }

      // Check if phone already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('phone', phone)
        .single();

      if (existingUser) {
        throw new Error('Korisnik sa ovim brojem telefona već postoji');
      }

      // Check if PIB already exists
      const { data: existingPib } = await supabase
        .from('companies')
        .select('id')
        .eq('pib', pib)
        .single();

      if (existingPib) {
        throw new Error('Firma sa ovim PIB-om već postoji');
      }

      // USE MASTER CODE AS COMPANY CODE (no generation!)
      const companyCode = masterCode.toUpperCase();

      // Create company with PIB and master_code reference
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .insert([{
          code: companyCode,
          name: firmName,
          pib: pib,
          master_code_id: mcData.id
        }])
        .select()
        .single();

      if (companyError) throw companyError;

      // Create manager user
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert([{ name, role: 'manager', company_code: companyCode, phone, password }])
        .select()
        .single();

      if (userError) throw userError;

      // Update company with manager_id
      await supabase
        .from('companies')
        .update({ manager_id: userData.id })
        .eq('id', companyData.id);

      // Mark master code as used
      await supabase
        .from('master_codes')
        .update({
          status: 'used',
          used_by_company: companyData.id,
          pib: pib
        })
        .eq('id', mcData.id);

      setUser({ id: userData.id, name, role: 'manager' });
      setCompanyCode(companyCode);
      setCompanyName(firmName);
      setIsRegistered(true);

      saveSession({ id: userData.id, name, role: 'manager' }, companyCode, firmName);

      return { success: true, companyCode: companyCode };
    } catch (error) {
      console.error('Error registering manager with master code:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    user,
    isRegistered,
    isLoading,
    companyCode,
    companyName,
    registerManager,
    registerManagerToExistingCompany,
    registerManagerWithMasterCode,
    registerClient,
    verifyCompanyCode,
    verifyMasterCode,
    loginUser,
    logout,
    updateClientLocation,
    updateCompanyEquipmentTypes,
    fetchCompanyEquipmentTypes,
    updateClientDetails,
    pickupRequests,
    addPickupRequest,
    removePickupRequest,
    markRequestAsProcessed,
    updatePickupStatus,
    fetchPickupRequests,
    fetchProcessedRequests,
    fetchCompanyClients,
    selectedForPrint,
    toggleSelectForPrint,
    clearPrintSelection,
    getSelectedRequests,
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
    deleteUser,
    deleteCompany,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export default AppContext;
