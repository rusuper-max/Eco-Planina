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

export const AppProvider = ({ children }) => {
  // User state
  const [user, setUser] = useState(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Company info
  const [companyCode, setCompanyCode] = useState(null);
  const [companyName, setCompanyName] = useState(null);
  const [maxPickupHours, setMaxPickupHours] = useState(48); // Default 48h

  // Pickup requests from Supabase
  const [pickupRequests, setPickupRequests] = useState([]);

  // Chat state
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Client's own requests (for client view)
  const [clientRequests, setClientRequests] = useState([]);
  const [processedNotification, setProcessedNotification] = useState(null);

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

  // Fetch client's own requests with driver assignment info
  const fetchClientRequests = async () => {
    if (!user?.id) return [];

    try {
      const { data: requests, error } = await supabase
        .from('pickup_requests')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch driver assignments for these requests
      if (requests && requests.length > 0) {
        const requestIds = requests.map(r => r.id);
        const { data: assignments } = await supabase
          .from('driver_assignments')
          .select('request_id, driver_id, assigned_by, status, driver:driver_id(id, name), assigner:assigned_by(id, name)')
          .in('request_id', requestIds)
          .is('deleted_at', null);

        // Merge assignment info into requests
        const enrichedRequests = requests.map(req => {
          const assignment = assignments?.find(a => a.request_id === req.id);
          return {
            ...req,
            assignment: assignment ? {
              driver_id: assignment.driver_id,
              driver_name: assignment.driver?.name,
              assigned_by_id: assignment.assigned_by,
              assigned_by_name: assignment.assigner?.name,
              status: assignment.status
            } : null
          };
        });

        setClientRequests(enrichedRequests);
        return enrichedRequests;
      }

      setClientRequests(requests || []);
      return requests || [];
    } catch (error) {
      console.error('Error fetching client requests:', error);
      return [];
    }
  };

  // Clear processed notification
  const clearProcessedNotification = () => {
    setProcessedNotification(null);
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

  // Check for saved session on mount and listen to auth state changes
  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      try {
        // First check Supabase Auth session
        const { data: { session: authSession } } = await supabase.auth.getSession();

        if (authSession?.user) {
          // User is authenticated via Supabase Auth - fetch their profile
          const { data: userData } = await supabase
            .from('users')
            .select('*')
            .eq('auth_id', authSession.user.id)
            .is('deleted_at', null)
            .single();

          if (userData) {
            // Fetch company
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

            setUser({
              id: userData.id,
              auth_id: authSession.user.id,
              name: userData.name,
              role: userData.role,
              address: userData.address,
              phone: userData.phone,
              latitude: userData.latitude,
              longitude: userData.longitude,
              region_id: userData.region_id,
              allowed_waste_types: userData.allowed_waste_types,
            });
            setCompanyCode(companyData?.code || userData.company_code);
            setCompanyName(companyData?.name || 'Nepoznato');
            setMaxPickupHours(companyData?.max_pickup_hours || 48);
            setIsRegistered(true);
          }
        } else {
          // No Supabase Auth session - try legacy AsyncStorage session (for migration)
          const sessionStr = await AsyncStorage.getItem('user_session');
          if (sessionStr) {
            const session = JSON.parse(sessionStr);
            if (session.user) {
              // Legacy session exists but no auth - clear it and require re-login
              await AsyncStorage.removeItem('user_session');
            }
          }
        }
      } catch (e) {
        console.error('Failed to restore session', e);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsRegistered(false);
        setCompanyCode(null);
        setCompanyName(null);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
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

  // Subscribe to real-time updates for client's own requests
  useEffect(() => {
    if (!user || user.role !== 'client') return;

    // Initial fetch
    fetchClientRequests();

    // Real-time subscription for client's own requests
    const channelName = `client_requests_${user.id}`;

    const subscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pickup_requests',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Client request event:', payload);

          // Check if request was just processed
          if (payload.eventType === 'UPDATE' &&
            payload.new.status === 'processed' &&
            payload.old?.status === 'pending') {
            setProcessedNotification({
              wasteLabel: payload.new.waste_label || payload.new.waste_type,
              processedAt: payload.new.processed_at
            });
          }

          // Also check for DELETE (when request is marked as processed and removed)
          if (payload.eventType === 'DELETE') {
            // Request was deleted (processed), show notification
            setProcessedNotification({
              wasteLabel: payload.old?.waste_label || payload.old?.waste_type || 'Zahtev',
              processedAt: new Date().toISOString()
            });
          }

          fetchClientRequests();
        }
      )
      .subscribe((status) => {
        console.log('Client subscription status:', status);
      });

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user]);

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

  // Login existing user by phone - uses Supabase Auth
  const loginUser = async (phone, password) => {
    setIsLoading(true);
    try {
      // Create fake email from phone number (same format as web app)
      const fakeEmail = `${phone.replace(/[^0-9]/g, '')}@eco.local`;

      // Sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: fakeEmail,
        password: password,
      });

      if (authError) {
        // If auth fails, provide friendly error message
        if (authError.message.includes('Invalid login credentials')) {
          throw new Error('Pogrešan broj telefona ili lozinka');
        }
        throw authError;
      }

      // Fetch user profile from users table using auth_id
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', authData.user.id)
        .is('deleted_at', null)
        .single();

      if (userError || !userData) {
        // User exists in auth but not in users table - shouldn't happen but handle gracefully
        throw new Error('Korisnički profil nije pronađen');
      }

      // Fetch company data
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

      const actualCompanyCode = companyData?.code || userData.company_code;

      setUser({
        id: userData.id,
        auth_id: authData.user.id,
        name: userData.name,
        role: userData.role,
        address: userData.address,
        phone: userData.phone,
        latitude: userData.latitude,
        longitude: userData.longitude,
        region_id: userData.region_id,
        allowed_waste_types: userData.allowed_waste_types,
      });
      setCompanyCode(actualCompanyCode);
      setCompanyName(companyData?.name || 'Nepoznato');
      setMaxPickupHours(companyData?.max_pickup_hours || 48);
      setIsRegistered(true);

      // Save session for faster restore (Supabase Auth also persists, but we keep user profile)
      saveSession({
        id: userData.id,
        auth_id: authData.user.id,
        name: userData.name,
        role: userData.role,
        address: userData.address,
        phone: userData.phone,
        latitude: userData.latitude,
        longitude: userData.longitude,
        region_id: userData.region_id,
        allowed_waste_types: userData.allowed_waste_types,
      }, actualCompanyCode, companyData?.name || 'Nepoznato');

      return { success: true, role: userData.role };
    } catch (error) {
      console.error('Error logging in:', error);
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

  // Fetch waste types for the company
  const fetchWasteTypes = async () => {
    if (!companyCode) return [];
    try {
      const { data, error } = await supabase
        .from('waste_types')
        .select('*')
        .eq('company_code', companyCode)
        .is('deleted_at', null)
        .order('name');

      if (error) throw error;

      // If user has allowed_waste_types restriction, filter
      if (user?.allowed_waste_types && user.allowed_waste_types.length > 0) {
        return (data || []).filter(wt => user.allowed_waste_types.includes(wt.id));
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching waste types:', error);
      return [];
    }
  };

  // Generate short request code (e.g., "A3X7KP") - same format as web
  const generateRequestCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid confusing chars like 0/O, 1/I
    return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  };

  const addPickupRequest = async (request) => {
    if (!companyCode) {
      throw new Error('Niste povezani sa firmom');
    }

    setIsLoading(true);
    try {
      // Fetch fresh user data from database to ensure we have the latest location and region_id
      const { data: freshUser } = await supabase
        .from('users')
        .select('latitude, longitude, address, region_id')
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
        region_id: freshUser?.region_id || user?.region_id || null,
        request_code: generateRequestCode(),
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

  // Update user profile (name, phone)
  const updateUserProfile = async (updates) => {
    if (!user?.id) throw new Error('Niste prijavljeni');

    try {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      // Update local user state
      setUser(prev => ({ ...prev, ...data }));
      return data;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Sign out from Supabase Auth
      await supabase.auth.signOut();
    } catch (e) {
      console.error('Error signing out:', e);
    }
    setUser(null);
    setIsRegistered(false);
    setCompanyCode(null);
    setCompanyName(null);
    setSelectedForPrint([]);
    setPickupRequests([]);
    clearSession();
  };

  // =====================================================
  // CHAT FUNCTIONS
  // =====================================================

  // Fetch messages between current user and a partner
  const fetchMessages = async (partnerId) => {
    if (!user?.id || !partnerId) return [];

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
      return data || [];
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  };

  // Send a message
  const sendMessage = async (receiverId, content) => {
    if (!user?.id || !receiverId || !content.trim()) {
      throw new Error('Nedostaju podaci za slanje poruke');
    }

    try {
      const newMessage = {
        sender_id: user.id,
        receiver_id: receiverId,
        content: content.trim(),
        is_read: false,
        company_code: companyCode,
      };

      const { data, error } = await supabase
        .from('messages')
        .insert([newMessage])
        .select()
        .single();

      if (error) throw error;

      // Add to local messages
      setMessages(prev => [...prev, data]);
      return data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  };

  // Mark messages as read
  const markMessagesAsRead = async (senderId) => {
    if (!user?.id || !senderId) return;

    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('sender_id', senderId)
        .eq('receiver_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      // Update local messages
      setMessages(prev => prev.map(m =>
        m.sender_id === senderId && m.receiver_id === user.id
          ? { ...m, is_read: true }
          : m
      ));

      // Update unread count
      await fetchUnreadCount();
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  // Get conversations list with last message
  const fetchConversations = async () => {
    if (!user?.id || !companyCode) return [];

    try {
      // Fetch all messages involving this user
      const { data: allMessages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('company_code', companyCode)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by conversation partner
      const conversationMap = new Map();

      for (const msg of (allMessages || [])) {
        const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;

        if (!conversationMap.has(partnerId)) {
          conversationMap.set(partnerId, {
            partnerId,
            lastMessage: msg,
            unreadCount: 0,
          });
        }

        // Count unread messages from this partner
        if (msg.receiver_id === user.id && !msg.is_read) {
          const conv = conversationMap.get(partnerId);
          conv.unreadCount++;
        }
      }

      // Fetch partner details
      const partnerIds = Array.from(conversationMap.keys());
      if (partnerIds.length === 0) {
        setConversations([]);
        return [];
      }

      const { data: partners } = await supabase
        .from('users')
        .select('id, name, role')
        .in('id', partnerIds);

      // Merge partner info
      const conversationList = Array.from(conversationMap.values()).map(conv => {
        const partner = partners?.find(p => p.id === conv.partnerId);
        return {
          ...conv,
          partnerName: partner?.name || 'Nepoznat',
          partnerRole: partner?.role || 'unknown',
        };
      });

      // Sort by last message time
      conversationList.sort((a, b) =>
        new Date(b.lastMessage.created_at) - new Date(a.lastMessage.created_at)
      );

      setConversations(conversationList);
      return conversationList;
    } catch (error) {
      console.error('Error fetching conversations:', error);
      return [];
    }
  };

  // Get unread message count
  const fetchUnreadCount = async () => {
    if (!user?.id) return 0;

    try {
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
      setUnreadCount(count || 0);
      return count || 0;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }
  };

  // Fetch company members for starting new chats
  const fetchCompanyMembers = async () => {
    if (!companyCode || !user?.id) return [];

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, role, phone')
        .eq('company_code', companyCode)
        .neq('id', user.id)
        .is('deleted_at', null)
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching company members:', error);
      return [];
    }
  };

  // Subscribe to new messages
  const subscribeToMessages = (callback) => {
    if (!user?.id) return null;

    const channelName = `messages_${user.id}_${Date.now()}`;

    const subscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('New message received:', payload);
          if (callback) callback(payload.new);
          fetchUnreadCount();
        }
      )
      .subscribe();

    return subscription;
  };

  // =====================================================
  // DRIVER FUNCTIONS
  // =====================================================

  // Fetch driver's assigned requests
  const fetchDriverAssignments = async () => {
    if (!user?.id || user?.role !== 'driver') return [];

    try {
      // Get assignments for this driver with request details
      // Include 'picked_up' status too so driver can see what they've picked up
      const { data: assignments, error } = await supabase
        .from('driver_assignments')
        .select(`
          *,
          request:pickup_requests(*)
        `)
        .eq('driver_id', user.id)
        .in('status', ['assigned', 'in_progress', 'picked_up'])
        .is('deleted_at', null)
        .order('assigned_at', { ascending: false });

      if (error) throw error;

      console.log('[Driver] Fetched assignments:', assignments?.length || 0, 'for driver:', user.id);

      // Extract and return the pickup requests with assignment info
      // Also filter out requests that are already processed
      return (assignments || []).map(a => ({
        ...a.request,
        assignment_id: a.id,
        assignment_status: a.status,
        assigned_at: a.assigned_at,
        picked_up_at: a.picked_up_at
      })).filter(r => r && r.id && r.status !== 'processed');
    } catch (error) {
      console.error('Error fetching driver assignments:', error);
      return [];
    }
  };

  // Fetch driver's completed/delivered assignments (history)
  // After migration 025: driver_assignments.request_id becomes NULL after processing
  // So we use processed_requests.driver_assignment_id to link them
  const fetchDriverHistory = async () => {
    if (!user?.id || user?.role !== 'driver') return [];

    console.log('[fetchDriverHistory] Fetching for driver:', user.id);

    try {
      // 1. Fetch from processed_requests where this driver worked
      const { data: processedRequests, error: processedError } = await supabase
        .from('processed_requests')
        .select('*')
        .eq('driver_id', user.id)
        .is('deleted_at', null)
        .order('processed_at', { ascending: false })
        .limit(50);

      if (processedError) {
        console.error('[fetchDriverHistory] processed_requests error:', processedError);
      }
      console.log('[fetchDriverHistory] processed_requests count:', processedRequests?.length || 0);

      // 2. Get linked driver_assignments for timeline data
      const assignmentIds = (processedRequests || [])
        .map(p => p.driver_assignment_id)
        .filter(Boolean);

      let assignmentsMap = {};
      if (assignmentIds.length > 0) {
        const { data: assignments, error: assignmentsError } = await supabase
          .from('driver_assignments')
          .select('*')
          .in('id', assignmentIds);

        if (!assignmentsError && assignments) {
          assignments.forEach(a => {
            assignmentsMap[a.id] = a;
          });
        }
      }

      // 3. Get pending/delivered assignments (not yet processed by manager)
      const { data: pendingAssignments, error: pendingError } = await supabase
        .from('driver_assignments')
        .select('*')
        .eq('driver_id', user.id)
        .eq('status', 'delivered')
        .is('deleted_at', null)
        .order('delivered_at', { ascending: false })
        .limit(20);

      if (pendingError) {
        console.error('[fetchDriverHistory] pending assignments error:', pendingError);
      }

      console.log('[fetchDriverHistory] linked_assignments:', Object.keys(assignmentsMap).length,
        'pending_assignments:', pendingAssignments?.length || 0);

      // Build history from processed_requests with linked assignment data
      const historyFromProcessed = (processedRequests || []).map(p => {
        const assignment = assignmentsMap[p.driver_assignment_id];
        const isRetroactive = !assignment || (!assignment.assigned_at && !assignment.picked_up_at);

        return {
          id: p.id,
          assignment_id: p.driver_assignment_id,
          processed_request_id: p.id,
          assignment_status: 'completed',
          source: isRetroactive ? 'processed_request' : 'driver_assignment',
          // Client/request data
          client_name: p.client_name,
          client_address: p.client_address,
          waste_type: p.waste_type,
          waste_label: p.waste_label,
          latitude: p.latitude,
          longitude: p.longitude,
          // Use assignment timestamps if available, else processed_at
          assigned_at: assignment?.assigned_at || null,
          picked_up_at: assignment?.picked_up_at || null,
          delivered_at: assignment?.delivered_at || p.processed_at,
          completed_at: assignment?.completed_at || p.processed_at,
          processed_at: p.processed_at,
          created_at: p.created_at,
          // Include processed data
          weight: p.weight,
          weight_unit: p.weight_unit,
          proof_url: p.proof_image_url,
          notes: p.processing_note
        };
      });

      // Add pending assignments (delivered but not yet processed)
      const pendingHistory = (pendingAssignments || []).map(a => ({
        id: a.id,
        assignment_id: a.id,
        processed_request_id: null,
        assignment_status: 'delivered',
        source: 'driver_assignment',
        client_name: a.client_name,
        client_address: a.client_address,
        waste_type: a.waste_type,
        waste_label: a.waste_label,
        latitude: a.latitude,
        longitude: a.longitude,
        assigned_at: a.assigned_at,
        picked_up_at: a.picked_up_at,
        delivered_at: a.delivered_at,
        completed_at: null,
        processed_at: null,
        created_at: a.created_at
      }));

      // Combine and deduplicate
      const processedAssignmentIds = new Set(historyFromProcessed.map(h => h.assignment_id).filter(Boolean));
      const uniquePending = pendingHistory.filter(p => !processedAssignmentIds.has(p.assignment_id));

      const combined = [...historyFromProcessed, ...uniquePending];

      // Sort by most recent timestamp
      return combined.sort((a, b) => {
        const dateA = new Date(a.delivered_at || a.completed_at || a.processed_at || a.created_at);
        const dateB = new Date(b.delivered_at || b.completed_at || b.processed_at || b.created_at);
        return dateB - dateA;
      });
    } catch (error) {
      console.error('Error fetching driver history:', error);
      return [];
    }
  };

  // Update driver assignment status
  const updateDriverAssignmentStatus = async (assignmentId, status, additionalData = {}) => {
    if (!user?.id || user?.role !== 'driver') {
      throw new Error('Samo vozaci mogu azurirati status');
    }

    try {
      const updateData = { status, ...additionalData };

      // Set timestamps based on status
      if (status === 'picked_up') {
        updateData.picked_up_at = new Date().toISOString();
      } else if (status === 'delivered') {
        updateData.delivered_at = new Date().toISOString();
      } else if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('driver_assignments')
        .update(updateData)
        .eq('id', assignmentId)
        .eq('driver_id', user.id);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error updating assignment status:', error);
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

    // Generate master code string
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
  // Login as another user (admin impersonation)
  const loginAsUser = async (targetUser) => {
    if (!isAdmin()) throw new Error('Nemate dozvolu za ovu akciju');

    // Don't allow impersonating god users
    if (targetUser.role === 'god') {
      throw new Error('Ne možete se ulogovati kao GOD korisnik');
    }

    setIsLoading(true);
    try {
      // Fetch company info for the target user
      let companyData = null;
      if (targetUser.company_code) {
        const { data } = await supabase
          .from('companies')
          .select('*')
          .eq('code', targetUser.company_code)
          .single();
        companyData = data;
      }

      // Set user state to target user
      setUser({
        id: targetUser.id,
        name: targetUser.name,
        role: targetUser.role,
        address: targetUser.address,
        phone: targetUser.phone,
        latitude: targetUser.latitude,
        longitude: targetUser.longitude,
      });
      setCompanyCode(targetUser.company_code);
      setCompanyName(companyData?.name || 'Nepoznato');
      setIsRegistered(true);

      // Save session
      saveSession({
        id: targetUser.id,
        name: targetUser.name,
        role: targetUser.role,
        address: targetUser.address,
        phone: targetUser.phone,
        latitude: targetUser.latitude,
        longitude: targetUser.longitude,
      }, targetUser.company_code, companyData?.name || 'Nepoznato');

      return { success: true, role: targetUser.role };
    } catch (error) {
      console.error('Error logging in as user:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

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

  const value = {
    user,
    isRegistered,
    isLoading,
    companyCode,
    companyName,
    maxPickupHours,
    verifyCompanyCode,
    loginUser,
    logout,
    updateUserProfile,
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
    fetchWasteTypes,
    // Driver functions
    fetchDriverAssignments,
    fetchDriverHistory,
    updateDriverAssignmentStatus,
    // Chat functions
    messages,
    conversations,
    unreadCount,
    fetchMessages,
    sendMessage,
    markMessagesAsRead,
    fetchConversations,
    fetchUnreadCount,
    fetchCompanyMembers,
    subscribeToMessages,
    // Client request tracking
    clientRequests,
    fetchClientRequests,
    processedNotification,
    clearProcessedNotification,
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
    loginAsUser,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export default AppContext;
