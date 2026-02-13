/**
 * useDriverChat - Hook za chat funkcionalnost vozača
 * Ekstraktovano iz DriverViewScreen.js radi održivosti
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../../../config/supabase';

export const useDriverChat = ({
  user,
  fetchMessages,
  sendMessage,
  markMessagesAsRead,
  fetchConversations,
  fetchCompanyMembers,
  subscribeToMessages,
}) => {
  // Chat state
  const [chatConversations, setChatConversations] = useState([]);
  const [loadingChat, setLoadingChat] = useState(false);
  const [selectedChat, setSelectedChat] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [companyMembers, setCompanyMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Hidden conversations (soft delete - only hides from UI)
  const [hiddenConversations, setHiddenConversations] = useState([]);

  // Refs
  const flatListRef = useRef(null);

  // Load conversations
  const loadConversations = useCallback(async () => {
    setLoadingChat(true);
    try {
      const convs = await fetchConversations();
      // Filter out hidden conversations
      const visibleConvs = convs.filter(c => !hiddenConversations.includes(c.partnerId));
      setChatConversations(visibleConvs);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoadingChat(false);
    }
  }, [fetchConversations, hiddenConversations]);

  // Subscribe to new messages
  useEffect(() => {
    const subscription = subscribeToMessages((newMsg) => {
      // If we're in a chat with this sender, add the message
      if (selectedChat && newMsg.sender_id === selectedChat.partnerId) {
        setChatMessages(prev => [...prev, newMsg]);
        markMessagesAsRead(newMsg.sender_id);
      }
      // Unhide conversation if we receive a new message from hidden partner
      if (hiddenConversations.includes(newMsg.sender_id)) {
        setHiddenConversations(prev => prev.filter(id => id !== newMsg.sender_id));
      }
      // Refresh conversations list
      loadConversations();
    });

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [selectedChat, hiddenConversations, subscribeToMessages, markMessagesAsRead, loadConversations]);

  // Hide conversation from UI (soft delete)
  const hideConversation = useCallback((partnerId) => {
    Alert.alert(
      'Obrisi razgovor',
      'Da li zelis da obrises ovaj razgovor? Poruke ce ostati sacuvane i razgovor ce se ponovo pojaviti ako dobijes novu poruku.',
      [
        { text: 'Ne', style: 'cancel' },
        {
          text: 'Da, obrisi',
          style: 'destructive',
          onPress: () => {
            setHiddenConversations(prev => [...prev, partnerId]);
            setChatConversations(prev => prev.filter(c => c.partnerId !== partnerId));
          },
        },
      ]
    );
  }, []);

  // Open chat with a conversation partner
  const openChat = useCallback(async (conversation) => {
    setSelectedChat(conversation);
    setLoadingChat(true);
    try {
      const msgs = await fetchMessages(conversation.partnerId);
      setChatMessages(msgs);
      // Mark messages as read
      await markMessagesAsRead(conversation.partnerId);
      await loadConversations(); // Refresh to update unread counts
    } catch (error) {
      console.error('Error opening chat:', error);
    } finally {
      setLoadingChat(false);
    }
  }, [fetchMessages, markMessagesAsRead, loadConversations]);

  // Close chat
  const closeChat = useCallback(() => {
    setSelectedChat(null);
    setChatMessages([]);
  }, []);

  // Send a message
  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim() || !selectedChat || sendingMessage) return;

    setSendingMessage(true);
    try {
      const msg = await sendMessage(selectedChat.partnerId, newMessage);
      setChatMessages(prev => [...prev, msg]);
      setNewMessage('');
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      Alert.alert('Greska', 'Nije moguce poslati poruku');
    } finally {
      setSendingMessage(false);
    }
  }, [newMessage, selectedChat, sendingMessage, sendMessage]);

  // Start new chat - load company members
  const startNewChat = useCallback(async () => {
    setShowNewChatModal(true);
    setLoadingMembers(true);
    try {
      const members = await fetchCompanyMembers();
      setCompanyMembers(members);
    } catch (error) {
      console.error('Error loading members:', error);
    } finally {
      setLoadingMembers(false);
    }
  }, [fetchCompanyMembers]);

  // Close new chat modal
  const closeNewChatModal = useCallback(() => {
    setShowNewChatModal(false);
  }, []);

  // Select a member to start chat with
  const selectMemberForChat = useCallback((member) => {
    setShowNewChatModal(false);
    const newConv = {
      partnerId: member.id,
      partnerName: member.name,
      partnerRole: member.role,
      lastMessage: null,
      unreadCount: 0,
    };
    openChat(newConv);
  }, [openChat]);

  // Get role label in Serbian
  const getRoleLabel = useCallback((role) => {
    switch (role) {
      case 'manager': return 'Menadzer';
      case 'driver': return 'Vozac';
      case 'client': return 'Klijent';
      case 'admin': return 'Admin';
      default: return role;
    }
  }, []);

  // Get role icon
  const getRoleIcon = useCallback((role) => {
    switch (role) {
      case 'manager': return '👔';
      case 'driver': return '🚛';
      case 'client': return '🏢';
      case 'admin': return '⚙️';
      default: return '👤';
    }
  }, []);

  // Format message time
  const formatMessageTime = useCallback((dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Juce';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('sr-RS', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit' });
    }
  }, []);

  return {
    // State
    chatConversations,
    loadingChat,
    selectedChat,
    chatMessages,
    newMessage,
    sendingMessage,
    showNewChatModal,
    companyMembers,
    loadingMembers,
    hiddenConversations,

    // Refs
    flatListRef,

    // Setters
    setNewMessage,

    // Actions
    loadConversations,
    hideConversation,
    openChat,
    closeChat,
    handleSendMessage,
    startNewChat,
    closeNewChatModal,
    selectMemberForChat,

    // Helpers
    getRoleLabel,
    getRoleIcon,
    formatMessageTime,
  };
};

export default useDriverChat;
