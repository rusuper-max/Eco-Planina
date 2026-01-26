/**
 * useDriverMessages - Hook za poruke vozača
 * Ekstraktovano iz DriverDashboard.jsx
 */
import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';

export const useDriverMessages = ({
    user,
    isActive,
    fetchMessages,
    sendMessage,
    markMessagesAsRead,
    getConversations,
    subscribeToMessages,
    fetchCompanyMembers
}) => {
    const [conversations, setConversations] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [chatMessages, setChatMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [sendingMessage, setSendingMessage] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [showNewChatModal, setShowNewChatModal] = useState(false);
    const [companyMembers, setCompanyMembers] = useState([]);
    const messagesEndRef = useRef(null);

    // Subscribe to messages
    useEffect(() => {
        if (!user) return;
        const unsubscribe = subscribeToMessages(async (msg, type) => {
            if (selectedChat && (msg.sender_id === selectedChat.id || msg.receiver_id === selectedChat.id)) {
                setChatMessages(prev => [...prev, msg]);
                if (type === 'received') {
                    await markMessagesAsRead(selectedChat.id);
                    setConversations(prev => prev.map(c =>
                        c.partnerId === selectedChat.id ? { ...c, unread: 0 } : c
                    ));
                }
            }
            await loadConversations();
        });
        return () => unsubscribe();
    }, [user, selectedChat]);

    // Load conversations when active
    useEffect(() => {
        if (isActive) {
            loadConversations();
            loadCompanyMembers();
        }
    }, [isActive]);

    const loadConversations = async () => {
        const convos = await getConversations();
        setConversations(convos);
    };

    const loadCompanyMembers = async () => {
        const members = await fetchCompanyMembers();
        setCompanyMembers(members.filter(m =>
            m.id !== user?.id && ['manager', 'client', 'admin', 'developer'].includes(m.role)
        ));
    };

    const openChat = async (partner) => {
        setSelectedChat(partner);
        setShowNewChatModal(false);
        setLoadingMessages(true);
        const msgs = await fetchMessages(partner.id);
        setChatMessages(msgs);
        await markMessagesAsRead(partner.id);
        setConversations(prev => prev.map(c =>
            c.partnerId === partner.id ? { ...c, unread: 0 } : c
        ));
        await loadConversations();
        setLoadingMessages(false);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedChat || sendingMessage) return;

        setSendingMessage(true);
        try {
            await sendMessage(selectedChat.id, newMessage.trim());
            setNewMessage('');
            const msgs = await fetchMessages(selectedChat.id);
            setChatMessages(msgs);
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        } catch (err) {
            toast.error('Greška pri slanju poruke');
        } finally {
            setSendingMessage(false);
        }
    };

    return {
        conversations,
        selectedChat,
        setSelectedChat,
        chatMessages,
        newMessage,
        setNewMessage,
        sendingMessage,
        loadingMessages,
        showNewChatModal,
        setShowNewChatModal,
        companyMembers,
        messagesEndRef,
        openChat,
        handleSendMessage
    };
};
