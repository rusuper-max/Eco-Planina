import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../config/supabase';
import { useAuth } from './AuthContext';

const ChatContext = createContext(null);

export const useChat = () => {
    const context = useContext(ChatContext);
    if (!context) {
        throw new Error('useChat must be used within ChatProvider');
    }
    return context;
};

export const ChatProvider = ({ children }) => {
    const { user, companyCode } = useAuth();
    const [unreadCount, setUnreadCount] = useState(0);
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
        const timestamp = new Date().getTime();
        const channelName = `messages_${user.id}_${timestamp}`;
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

    // Fetch company admin for current company (for manager to contact)
    const fetchCompanyAdmin = async () => {
        if (!companyCode) return null;
        try {
            const { data, error } = await supabase.from('users').select('id, name, role, phone')
                .eq('company_code', companyCode)
                .eq('role', 'company_admin')
                .is('deleted_at', null)
                .limit(1)
                .single();
            if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
            return data || null;
        } catch (error) {
            console.error('Error fetching company admin:', error);
            return null;
        }
    };

    // Send message to company admin
    const sendMessageToCompanyAdmin = async (content) => {
        if (!user) throw new Error('Niste prijavljeni');
        try {
            const companyAdmin = await fetchCompanyAdmin();
            if (!companyAdmin) throw new Error('Nema dostupnog admina firme');
            const msgCompanyCode = companyCode || 'SUPPORT';
            const { data, error } = await supabase.from('messages').insert([{
                sender_id: user.id,
                receiver_id: companyAdmin.id,
                company_code: msgCompanyCode,
                content: content.trim()
            }]).select().single();
            if (error) throw error;
            return data;
        } catch (error) {
            throw error;
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

    const value = {
        unreadCount,
        messagesSubscriptionRef,
        fetchMessages,
        sendMessage,
        markMessagesAsRead,
        fetchUnreadCount,
        getConversations,
        deleteConversation,
        subscribeToMessages,
        fetchAdmins,
        sendMessageToAdmins,
        fetchCompanyAdmin,
        sendMessageToCompanyAdmin,
    };

    return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export default ChatContext;
