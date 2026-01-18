import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
  Modal,
  Linking,
  Platform,
  ActivityIndicator,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppContext } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../config/supabase';
import { getOptimizedRoute } from '../utils/routeOptimization';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

const COLORS = {
  primary: '#10B981',
  primaryDark: '#059669',
  primaryLight: '#D1FAE5',
  white: '#FFFFFF',
  darkGray: '#1F2937',
  lightGray: '#F3F4F6',
  mediumGray: '#6B7280',
  red: '#EF4444',
  redLight: '#FEE2E2',
  orange: '#F97316',
  orangeLight: '#FED7AA',
  yellow: '#FBBF24',
  yellowLight: '#FEF9C3',
  blue: '#3B82F6',
  blueLight: '#DBEAFE',
  purple: '#8B5CF6',
  purpleLight: '#EDE9FE',
  amber: '#F59E0B',
  amberLight: '#FEF3C7',
};

// Country codes for phone number
const COUNTRY_CODES = [
  { code: '+381', country: '🇷🇸 Srbija' },
  { code: '+387', country: '🇧🇦 BiH' },
  { code: '+385', country: '🇭🇷 Hrvatska' },
  { code: '+386', country: '🇸🇮 Slovenija' },
  { code: '+382', country: '🇲🇪 Crna Gora' },
  { code: '+389', country: '🇲🇰 S. Makedonija' },
  { code: '+43', country: '🇦🇹 Austrija' },
  { code: '+49', country: '🇩🇪 Nemacka' },
  { code: '+41', country: '🇨🇭 Svajcarska' },
];

const DriverViewScreen = ({ navigation }) => {
  const {
    user,
    logout,
    updateUserProfile,
    fetchDriverAssignments,
    fetchDriverHistory,
    updateDriverAssignmentStatus,
    companyName,
    maxPickupHours,
    // Chat functions
    fetchMessages,
    sendMessage,
    markMessagesAsRead,
    fetchConversations,
    fetchUnreadCount,
    fetchCompanyMembers,
    subscribeToMessages,
    unreadCount,
  } = useAppContext();
  const { language, changeLanguage, t } = useLanguage();

  // Tab state: 'tasks', 'map', 'messages', 'history'
  const [activeTab, setActiveTab] = useState('tasks');
  const [refreshing, setRefreshing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  // History state
  const [historyItems, setHistoryItems] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);

  // Hidden conversations (soft delete - only hides from UI)
  const [hiddenConversations, setHiddenConversations] = useState([]);

  // Edit profile state
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCountryCode, setEditCountryCode] = useState('+381');
  const [editPhoneNumber, setEditPhoneNumber] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);

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
  const messagesEndRef = useRef(null);
  const flatListRef = useRef(null);

  // Route optimization state
  const [selectedForRoute, setSelectedForRoute] = useState(new Set());

  // Proof upload modal state
  const [pickupProofModal, setPickupProofModal] = useState({ visible: false, request: null });
  const [deliveryProofModal, setDeliveryProofModal] = useState({ visible: false, request: null });
  const [proofImage, setProofImage] = useState(null);
  const [driverWeight, setDriverWeight] = useState('');
  const [driverWeightUnit, setDriverWeightUnit] = useState('kg');
  const [uploadingProof, setUploadingProof] = useState(false);

  // Toggle request selection for route
  const toggleRouteSelection = (requestId) => {
    setSelectedForRoute(prev => {
      const next = new Set(prev);
      if (next.has(requestId)) {
        next.delete(requestId);
      } else {
        next.add(requestId);
      }
      return next;
    });
  };

  // Select/deselect all visible requests with valid coordinates
  const toggleSelectAllForRoute = () => {
    const validIds = assignments
      .filter(r => r.latitude && r.longitude)
      .map(r => r.id);
    const allSelected = validIds.length > 0 && validIds.every(id => selectedForRoute.has(id));

    if (allSelected) {
      setSelectedForRoute(new Set());
    } else {
      setSelectedForRoute(new Set(validIds));
    }
  };

  // Open optimized route in Google Maps
  const handleOpenOptimizedRoute = () => {
    const selectedRequests = assignments
      .filter(r => selectedForRoute.has(r.id));

    const result = getOptimizedRoute(selectedRequests);

    if (result.error) {
      Alert.alert('Greška', result.error);
      return;
    }

    // Show route info and open
    Alert.alert(
      'Optimizovana ruta',
      `${result.waypointCount} lokacija, ~${result.distance.toFixed(1)} km`,
      [
        { text: 'Otkaži', style: 'cancel' },
        {
          text: 'Otvori u Google Maps',
          onPress: () => Linking.openURL(result.url)
        }
      ]
    );
  };

  // Update time every minute
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  // Load assignments on mount and subscribe to realtime updates
  useEffect(() => {
    loadAssignments();

    // Subscribe to driver_assignments changes for this driver
    if (!user?.id) return;

    const assignmentsChannel = supabase
      .channel(`driver_assignments_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'driver_assignments',
          filter: `driver_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Driver assignment change:', payload.eventType);
          // Reload assignments on any change (INSERT, UPDATE, DELETE)
          loadAssignments();
        }
      )
      .subscribe();

    // Fallback polling interval (30 seconds) in case realtime subscription misses updates
    const pollInterval = setInterval(() => {
      if (activeTab === 'tasks') {
        loadAssignments();
      }
    }, 30000);

    return () => {
      supabase.removeChannel(assignmentsChannel);
      clearInterval(pollInterval);
    };
  }, [user?.id, activeTab]);

  const loadAssignments = async () => {
    setLoading(true);
    try {
      const data = await fetchDriverAssignments();
      setAssignments(data);
    } catch (error) {
      console.error('Error loading assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    if (activeTab === 'history') {
      await loadHistory();
    } else {
      await loadAssignments();
    }
    setRefreshing(false);
  };

  // Load history when switching to history tab
  useEffect(() => {
    if (activeTab === 'history' && historyItems.length === 0) {
      loadHistory();
    }
  }, [activeTab]);

  // Load conversations when switching to messages tab
  useEffect(() => {
    if (activeTab === 'messages') {
      loadConversations();
    }
  }, [activeTab]);

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
  }, [selectedChat, hiddenConversations]);

  const loadConversations = async () => {
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
  };

  // Hide conversation from UI (soft delete)
  const hideConversation = (partnerId) => {
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
  };

  const openChat = async (conversation) => {
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
  };

  const handleSendMessage = async () => {
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
  };

  const startNewChat = async () => {
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
  };

  const selectMemberForChat = (member) => {
    setShowNewChatModal(false);
    const newConv = {
      partnerId: member.id,
      partnerName: member.name,
      partnerRole: member.role,
      lastMessage: null,
      unreadCount: 0,
    };
    openChat(newConv);
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'manager': return 'Menadzer';
      case 'driver': return 'Vozac';
      case 'client': return 'Klijent';
      case 'admin': return 'Admin';
      default: return role;
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'manager': return '👔';
      case 'driver': return '🚛';
      case 'client': return '🏢';
      case 'admin': return '⚙️';
      default: return '👤';
    }
  };

  const formatMessageTime = (dateStr) => {
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
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const history = await fetchDriverHistory();
      setHistoryItems(history);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Mark as picked up (step 1) - opens modal for optional proof
  const handleMarkAsPickedUp = (request) => {
    setProofImage(null);
    setPickupProofModal({ visible: true, request });
  };

  // Mark as delivered (step 2) - opens modal for optional proof + weight
  const handleMarkAsDelivered = (request) => {
    setProofImage(null);
    setDriverWeight('');
    setDriverWeightUnit('kg');
    setDeliveryProofModal({ visible: true, request });
  };

  // Pick image from camera or gallery
  const pickImage = async (useCamera = false) => {
    try {
      // Request permissions
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Greška', 'Potrebna je dozvola za kameru');
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Greška', 'Potrebna je dozvola za galeriju');
          return;
        }
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          quality: 0.7,
        })
        : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          quality: 0.7,
        });

      if (!result.canceled && result.assets[0]) {
        setProofImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Greška', 'Nije moguće izabrati sliku');
    }
  };

  // Upload proof image to Supabase storage
  const uploadProofImage = async (assignmentId, proofType) => {
    if (!proofImage) return null;

    try {
      const fileExt = proofImage.uri.split('.').pop() || 'jpg';
      const fileName = `${proofType}_${assignmentId}_${Date.now()}.${fileExt}`;
      const filePath = `driver-proofs/${fileName}`;

      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(proofImage.uri, {
        encoding: 'base64',
      });

      // Upload using base64 decode
      const { data, error } = await supabase.storage
        .from('proofs')
        .upload(filePath, decode(base64), {
          contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
          upsert: true,
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage.from('proofs').getPublicUrl(filePath);
      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading proof:', error);
      throw error;
    }
  };

  // Confirm pickup with optional proof
  const confirmPickup = async () => {
    const request = pickupProofModal.request;
    if (!request) return;

    setUploadingProof(true);
    try {
      let proofUrl = null;
      if (proofImage) {
        proofUrl = await uploadProofImage(request.assignment_id, 'pickup');
      }

      // Update assignment with proof URL if uploaded
      await updateDriverAssignmentStatus(request.assignment_id, 'picked_up', {
        pickup_proof_url: proofUrl,
      });

      // Update local state
      setAssignments(prev => prev.map(a =>
        a.id === request.id
          ? { ...a, assignment_status: 'picked_up', picked_up_at: new Date().toISOString() }
          : a
      ));

      setPickupProofModal({ visible: false, request: null });
      Alert.alert('Uspešno', 'Roba označena kao preuzeta.');
    } catch (error) {
      console.error('Error confirming pickup:', error);
      Alert.alert('Greška', 'Došlo je do greške pri obradi.');
    } finally {
      setUploadingProof(false);
    }
  };

  // Confirm delivery with optional proof + weight
  const confirmDelivery = async () => {
    const request = deliveryProofModal.request;
    if (!request) return;

    setUploadingProof(true);
    try {
      let proofUrl = null;
      if (proofImage) {
        proofUrl = await uploadProofImage(request.assignment_id, 'delivery');
      }

      // Parse weight
      const weight = driverWeight ? parseFloat(driverWeight.replace(',', '.')) : null;

      // Update assignment with proof URL and weight
      await updateDriverAssignmentStatus(request.assignment_id, 'delivered', {
        delivery_proof_url: proofUrl,
        driver_weight: weight,
        driver_weight_unit: driverWeightUnit,
      });

      // Remove from local state
      setAssignments(prev => prev.filter(a => a.id !== request.id));

      setDeliveryProofModal({ visible: false, request: null });
      Alert.alert('Uspešno', 'Dostava završena.');
    } catch (error) {
      console.error('Error confirming delivery:', error);
      Alert.alert('Greška', 'Došlo je do greške pri obradi.');
    } finally {
      setUploadingProof(false);
    }
  };

  const openNavigation = (request, app = 'google') => {
    if (!request.latitude || !request.longitude) {
      Alert.alert('Greska', 'Lokacija nije dostupna za ovog klijenta.');
      return;
    }

    const lat = request.latitude;
    const lng = request.longitude;

    if (app === 'waze') {
      Linking.openURL(`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`);
    } else {
      const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      Linking.openURL(googleMapsUrl);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Odjava',
      'Da li sigurno zelis da se odjavis?',
      [
        { text: 'Ne', style: 'cancel' },
        { text: 'Da', onPress: () => logout() },
      ]
    );
  };

  // Open edit profile modal
  const openEditProfile = () => {
    setEditName(user?.name || '');
    // Parse existing phone number
    const existingPhone = user?.phone || '';
    const foundCode = COUNTRY_CODES.find(c => existingPhone.startsWith(c.code));
    if (foundCode) {
      setEditCountryCode(foundCode.code);
      setEditPhoneNumber(existingPhone.replace(foundCode.code, '').trim());
    } else {
      setEditCountryCode('+381');
      setEditPhoneNumber(existingPhone);
    }
    setShowEditProfile(true);
  };

  // Save profile changes
  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Greska', 'Ime je obavezno');
      return;
    }

    setSavingProfile(true);
    try {
      const phone = editPhoneNumber.trim()
        ? `${editCountryCode}${editPhoneNumber.trim().replace(/^0+/, '')}`
        : null;

      await updateUserProfile({
        name: editName.trim(),
        phone: phone,
      });

      Alert.alert('Uspesno', 'Profil je azuriran');
      setShowEditProfile(false);
    } catch (error) {
      Alert.alert('Greska', 'Nije moguce sacuvati promene');
    } finally {
      setSavingProfile(false);
    }
  };

  // Call client
  const handleCallClient = (request) => {
    const phone = request.client_phone;
    if (!phone) {
      Alert.alert('Nema broja', 'Klijent nema unet broj telefona');
      return;
    }

    Alert.alert(
      'Pozovi klijenta?',
      `Da li zelis da pozoves ${request.client_name}?`,
      [
        { text: 'Ne', style: 'cancel' },
        {
          text: 'Pozovi',
          onPress: () => {
            const phoneUrl = Platform.OS === 'ios'
              ? `telprompt:${phone}`
              : `tel:${phone}`;
            Linking.openURL(phoneUrl);
          },
        },
      ]
    );
  };

  // Calculate remaining time or overdue
  const getRemainingTime = (request) => {
    if (!request.created_at) return { text: '-', ms: 0, isOverdue: false };

    const createdAt = new Date(request.created_at);
    const now = new Date();
    // Koristi maxPickupHours iz company settings
    const deadlineHours = maxPickupHours || 48;
    const deadline = new Date(createdAt.getTime() + deadlineHours * 60 * 60 * 1000);

    const diffMs = deadline - now;
    const isOverdue = diffMs < 0;
    const absDiffMs = Math.abs(diffMs);

    const hours = Math.floor(absDiffMs / (1000 * 60 * 60));
    const mins = Math.floor((absDiffMs % (1000 * 60 * 60)) / (1000 * 60));

    let text;
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      text = isOverdue ? `Kasni ${days}d ${hours % 24}h` : `${days}d ${hours % 24}h`;
    } else {
      text = isOverdue ? `Kasni ${hours}h ${mins}m` : `${hours}h ${mins}m`;
    }

    return { text, ms: diffMs, isOverdue };
  };

  // Get urgency level based on remaining time percentage
  const getUrgencyLevel = (request) => {
    const { ms, isOverdue } = getRemainingTime(request);
    if (isOverdue) return 'urgent';
    const hours = ms / (1000 * 60 * 60);
    const hoursToAdd = maxPickupHours || 48;
    const percentLeft = hours / hoursToAdd;
    if (percentLeft <= 0.25) return 'urgent'; // <25% vremena
    if (percentLeft <= 0.50) return 'warning'; // 25-50% vremena
    return 'normal'; // >50% vremena
  };

  const getUrgencyColors = (level) => {
    switch (level) {
      case 'urgent': return { bg: COLORS.redLight, text: COLORS.red };
      case 'warning': return { bg: COLORS.amberLight, text: COLORS.amber };
      default: return { bg: COLORS.primaryLight, text: COLORS.primary };
    }
  };

  const getWasteIcon = (wasteType) => {
    switch (wasteType) {
      case 'cardboard': return '📦';
      case 'glass': return '🍾';
      case 'plastic': return '♻️';
      default: return '📦';
    }
  };

  // Split assignments into pending and picked up
  const pendingRequests = assignments.filter(a => a.assignment_status === 'assigned' || a.assignment_status === 'in_progress');
  const pickedUpRequests = assignments.filter(a => a.assignment_status === 'picked_up');

  // Sort by remaining time (most urgent first)
  const sortByUrgency = (a, b) => {
    const aTime = getRemainingTime(a);
    const bTime = getRemainingTime(b);
    return aTime.ms - bTime.ms;
  };

  const sortedPending = [...pendingRequests].sort(sortByUrgency);
  const sortedPickedUp = [...pickedUpRequests].sort(sortByUrgency);

  // Stats
  const urgentCount = assignments.filter(a => getUrgencyLevel(a) === 'urgent').length;
  const mediumCount = assignments.filter(a => getUrgencyLevel(a) === 'warning').length;

  // Render request card
  const renderRequestCard = (request, isPickedUp = false) => {
    const timeInfo = getRemainingTime(request);
    const urgencyLevel = getUrgencyLevel(request);
    const urgencyColors = getUrgencyColors(urgencyLevel);
    const isProcessing = processingId === request.id;

    return (
      <View
        key={request.id}
        style={[
          styles.requestCard,
          isPickedUp && styles.requestCardPickedUp
        ]}
      >
        {/* Status badge for picked up */}
        {isPickedUp && (
          <View style={styles.pickedUpBadge}>
            <Text style={styles.pickedUpBadgeText}>📦 Na zadatku</Text>
          </View>
        )}

        {/* Header Row */}
        <View style={styles.requestHeader}>
          {/* Route Selection Checkbox */}
          {request.latitude && request.longitude && (
            <TouchableOpacity
              style={styles.routeSelectTouch}
              onPress={() => toggleRouteSelection(request.id)}
            >
              <View style={[styles.routeCheckbox, selectedForRoute.has(request.id) && styles.routeCheckboxChecked]}>
                {selectedForRoute.has(request.id) && <Text style={styles.checkmark}>✓</Text>}
              </View>
            </TouchableOpacity>
          )}
          <View style={styles.wasteInfo}>
            <Text style={styles.wasteIcon}>
              {getWasteIcon(request.waste_type)}
            </Text>
            <View style={styles.wasteDetails}>
              <Text style={styles.wasteLabel}>
                {request.waste_label || request.waste_type}
              </Text>
              <View style={styles.clientNameRow}>
                <Text style={styles.clientName}>{request.client_name}</Text>
                {request.client_phone && (
                  <TouchableOpacity
                    style={styles.callIconButton}
                    onPress={() => handleCallClient(request)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.callIconText}>📞</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          {/* Time remaining */}
          <View style={[styles.timeBadge, { backgroundColor: urgencyColors.bg }]}>
            <Text style={[styles.timeIcon, timeInfo.isOverdue && { color: COLORS.red }]}>
              {timeInfo.isOverdue ? '⚠️' : '⏱️'}
            </Text>
            <Text style={[styles.timeText, { color: urgencyColors.text }]}>
              {timeInfo.text}
            </Text>
          </View>
        </View>

        {/* Address */}
        <View style={styles.addressRow}>
          <Text style={styles.addressIcon}>📍</Text>
          <Text style={styles.addressText} numberOfLines={2}>
            {request.client_address || 'Adresa nije dostupna'}
          </Text>
        </View>

        {/* Fill Level */}
        {request.fill_level !== null && request.fill_level !== undefined && (
          <View style={styles.fillLevelRow}>
            <Text style={styles.fillLabel}>Popunjenost:</Text>
            <View style={styles.fillBar}>
              <View style={[styles.fillProgress, { width: `${request.fill_level}%` }]} />
            </View>
            <Text style={styles.fillPercent}>{request.fill_level}%</Text>
          </View>
        )}

        {/* Note */}
        {request.note && (
          <View style={styles.noteRow}>
            <Text style={styles.noteIcon}>📝</Text>
            <Text style={styles.noteText}>{request.note}</Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {/* Navigation buttons */}
          {request.latitude && request.longitude ? (
            <>
              <TouchableOpacity
                style={styles.navButton}
                onPress={() => openNavigation(request, 'google')}
              >
                <Text style={styles.navButtonText}>🗺️ Google</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.navButton, styles.navButtonWaze]}
                onPress={() => openNavigation(request, 'waze')}
              >
                <Text style={styles.navButtonText}>🚗 Waze</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.noLocationBadge}>
              <Text style={styles.noLocationText}>⚠️ Nema lokacije</Text>
            </View>
          )}

          {/* Action button */}
          {isPickedUp ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.deliveredButton, isProcessing && styles.buttonDisabled]}
              onPress={() => handleMarkAsDelivered(request)}
              disabled={isProcessing}
            >
              <Text style={styles.actionButtonText}>
                {isProcessing ? '...' : '✅ Dostavljeno'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionButton, styles.pickupButton, isProcessing && styles.buttonDisabled]}
              onPress={() => handleMarkAsPickedUp(request)}
              disabled={isProcessing}
            >
              <Text style={styles.actionButtonText}>
                {isProcessing ? '...' : '📦 Preuzeto'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // Tasks Tab
  const renderTasksTab = () => (
    <ScrollView
      style={styles.scrollView}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[COLORS.orange]}
          tintColor={COLORS.orange}
        />
      }
    >
      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statPill}>
          <Text style={styles.statNumber}>{assignments.length}</Text>
          <Text style={styles.statLabel}>ukupno</Text>
        </View>
        <View style={[styles.statPill, { backgroundColor: COLORS.redLight }]}>
          <Text style={[styles.statNumber, { color: COLORS.red }]}>{urgentCount}</Text>
          <Text style={[styles.statLabel, { color: COLORS.red }]}>hitno</Text>
        </View>
        <View style={[styles.statPill, { backgroundColor: COLORS.amberLight }]}>
          <Text style={[styles.statNumber, { color: COLORS.amber }]}>{mediumCount}</Text>
          <Text style={[styles.statLabel, { color: COLORS.amber }]}>srednje</Text>
        </View>
        <View style={[styles.statPill, { backgroundColor: COLORS.amberLight }]}>
          <Text style={[styles.statNumber, { color: COLORS.amber }]}>{pickedUpRequests.length}</Text>
          <Text style={[styles.statLabel, { color: COLORS.amber }]}>preuzeto</Text>
        </View>
      </View>

      {/* Route Planning Bar */}
      {assignments.length > 0 && (
        <View style={styles.routePlanningBar}>
          <TouchableOpacity
            style={styles.selectAllButton}
            onPress={toggleSelectAllForRoute}
          >
            <View style={[styles.routeCheckbox, assignments.filter(r => r.latitude && r.longitude).length > 0 && assignments.filter(r => r.latitude && r.longitude).every(r => selectedForRoute.has(r.id)) && styles.routeCheckboxChecked]}>
              {assignments.filter(r => r.latitude && r.longitude).length > 0 && assignments.filter(r => r.latitude && r.longitude).every(r => selectedForRoute.has(r.id)) && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </View>
            <Text style={styles.selectAllText}>
              {selectedForRoute.size > 0 ? `${selectedForRoute.size} odabrano` : 'Odaberi sve'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.openRouteButton, selectedForRoute.size < 2 && styles.openRouteButtonDisabled]}
            onPress={handleOpenOptimizedRoute}
            disabled={selectedForRoute.size < 2}
          >
            <Text style={styles.openRouteButtonText}>🗺️ Otvori Rutu</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={COLORS.orange} />
          <Text style={styles.emptySubtitle}>Ucitavanje...</Text>
        </View>
      ) : assignments.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>Nema dodeljenih zadataka</Text>
          <Text style={styles.emptySubtitle}>
            Menadzer ti jos nije dodelio zahteve
          </Text>
        </View>
      ) : (
        <>
          {/* Picked Up Section - show first */}
          {sortedPickedUp.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>📦 Na zadatku ({sortedPickedUp.length})</Text>
                <Text style={styles.sectionSubtitle}>Preuzeto, ceka dostavu</Text>
              </View>
              {sortedPickedUp.map(request => renderRequestCard(request, true))}
            </View>
          )}

          {/* Pending Section */}
          {sortedPending.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>⏳ Na cekanju ({sortedPending.length})</Text>
                <Text style={styles.sectionSubtitle}>Ceka preuzimanje</Text>
              </View>
              {sortedPending.map(request => renderRequestCard(request, false))}
            </View>
          )}
        </>
      )}

      <View style={styles.bottomPadding} />
    </ScrollView>
  );

  // Render single message bubble
  const renderMessageBubble = ({ item }) => {
    const isMe = item.sender_id === user?.id;
    return (
      <View style={[styles.messageBubbleContainer, isMe && styles.messageBubbleContainerMe]}>
        <View style={[styles.messageBubble, isMe ? styles.messageBubbleMe : styles.messageBubbleOther]}>
          <Text style={[styles.messageText, isMe && styles.messageTextMe]}>{item.content}</Text>
          <Text style={[styles.messageTime, isMe && styles.messageTimeMe]}>
            {formatMessageTime(item.created_at)}
            {isMe && (item.is_read ? ' ✓✓' : ' ✓')}
          </Text>
        </View>
      </View>
    );
  };

  // Swipeable conversation item component
  const SwipeableConversationItem = ({ conv }) => {
    const translateX = useRef(new Animated.Value(0)).current;
    const deleteThreshold = 80;

    const panResponder = useRef(
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => {
          return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
        },
        onPanResponderMove: (_, gestureState) => {
          // Only allow swipe left (negative)
          if (gestureState.dx < 0) {
            translateX.setValue(Math.max(gestureState.dx, -deleteThreshold - 20));
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx < -deleteThreshold) {
            // Delete action
            hideConversation(conv.partnerId);
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
            }).start();
          } else {
            // Snap back
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
            }).start();
          }
        },
      })
    ).current;

    return (
      <View style={styles.swipeableContainer}>
        {/* Delete background */}
        <View style={styles.deleteBackground}>
          <Text style={styles.deleteBackgroundIcon}>🗑️</Text>
          <Text style={styles.deleteBackgroundText}>Obrisi</Text>
        </View>

        {/* Swipeable content */}
        <Animated.View
          style={[styles.conversationItemAnimated, { transform: [{ translateX }] }]}
          {...panResponder.panHandlers}
        >
          <TouchableOpacity
            style={styles.conversationItemInner}
            onPress={() => openChat(conv)}
            activeOpacity={0.7}
          >
            <View style={styles.conversationAvatar}>
              <Text style={styles.conversationAvatarText}>{getRoleIcon(conv.partnerRole)}</Text>
            </View>
            <View style={styles.conversationContent}>
              <View style={styles.conversationHeader}>
                <Text style={styles.conversationName}>{conv.partnerName}</Text>
                {conv.lastMessage && (
                  <Text style={styles.conversationTime}>
                    {formatMessageTime(conv.lastMessage.created_at)}
                  </Text>
                )}
              </View>
              <View style={styles.conversationPreview}>
                <Text style={styles.conversationRole}>{getRoleLabel(conv.partnerRole)}</Text>
                {conv.lastMessage && (
                  <Text style={styles.conversationLastMessage} numberOfLines={1}>
                    {conv.lastMessage.sender_id === user?.id ? 'Ti: ' : ''}
                    {conv.lastMessage.content}
                  </Text>
                )}
              </View>
            </View>
            {conv.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{conv.unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  };

  // Render conversation item
  const renderConversationItem = (conv) => (
    <SwipeableConversationItem key={conv.partnerId} conv={conv} />
  );

  // Messages Tab - Chat View
  const renderChatView = () => (
    <KeyboardAvoidingView
      style={styles.chatContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 120 : 0}
    >
      {/* Chat Header */}
      <View style={styles.chatHeader}>
        <TouchableOpacity
          style={styles.chatBackButton}
          onPress={() => setSelectedChat(null)}
        >
          <Text style={styles.chatBackIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.chatHeaderInfo}>
          <Text style={styles.chatHeaderName}>{selectedChat?.partnerName}</Text>
          <Text style={styles.chatHeaderRole}>{getRoleLabel(selectedChat?.partnerRole)}</Text>
        </View>
      </View>

      {/* Messages List */}
      {loadingChat ? (
        <View style={styles.chatLoading}>
          <ActivityIndicator size="large" color={COLORS.orange} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={chatMessages}
          renderItem={renderMessageBubble}
          keyExtractor={(item) => item.id?.toString()}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesListContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Text style={styles.emptyChatIcon}>💬</Text>
              <Text style={styles.emptyChatText}>Nema poruka</Text>
              <Text style={styles.emptyChatSubtext}>Zapocni konverzaciju!</Text>
            </View>
          }
        />
      )}

      {/* Message Input */}
      <View style={styles.messageInputContainer}>
        <TextInput
          style={styles.messageInput}
          placeholder="Napisi poruku..."
          placeholderTextColor={COLORS.mediumGray}
          value={newMessage}
          onChangeText={setNewMessage}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!newMessage.trim() || sendingMessage) && styles.sendButtonDisabled]}
          onPress={handleSendMessage}
          disabled={!newMessage.trim() || sendingMessage}
        >
          {sendingMessage ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Text style={styles.sendButtonText}>➤</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  // Messages Tab - Conversations List
  const renderMessagesTab = () => {
    // If a chat is selected, show the chat view
    if (selectedChat) {
      return renderChatView();
    }

    // Otherwise show conversations list
    return (
      <View style={styles.messagesContainer}>
        {/* New Chat Button */}
        <TouchableOpacity style={styles.newChatButton} onPress={startNewChat}>
          <Text style={styles.newChatButtonIcon}>➕</Text>
          <Text style={styles.newChatButtonText}>Nova poruka</Text>
        </TouchableOpacity>

        {loadingChat ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={COLORS.orange} />
            <Text style={styles.emptySubtitle}>Ucitavanje poruka...</Text>
          </View>
        ) : chatConversations.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyTitle}>Nema poruka</Text>
            <Text style={styles.emptySubtitle}>
              Zapocni konverzaciju sa menadzerom ili kolegom
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.conversationsList}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={loadConversations}
                colors={[COLORS.orange]}
                tintColor={COLORS.orange}
              />
            }
          >
            {chatConversations.map(renderConversationItem)}
            <View style={styles.bottomPadding} />
          </ScrollView>
        )}

        {/* New Chat Modal */}
        <Modal
          visible={showNewChatModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowNewChatModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.newChatModal}>
              <View style={styles.newChatModalHeader}>
                <Text style={styles.newChatModalTitle}>Nova poruka</Text>
                <TouchableOpacity onPress={() => setShowNewChatModal(false)}>
                  <Text style={styles.newChatModalClose}>✕</Text>
                </TouchableOpacity>
              </View>

              {loadingMembers ? (
                <View style={styles.modalLoading}>
                  <ActivityIndicator size="large" color={COLORS.orange} />
                </View>
              ) : companyMembers.length === 0 ? (
                <View style={styles.modalEmpty}>
                  <Text style={styles.modalEmptyText}>Nema dostupnih korisnika</Text>
                </View>
              ) : (
                <ScrollView style={styles.membersList}>
                  {companyMembers.map((member) => (
                    <TouchableOpacity
                      key={member.id}
                      style={styles.memberItem}
                      onPress={() => selectMemberForChat(member)}
                    >
                      <View style={styles.memberAvatar}>
                        <Text style={styles.memberAvatarText}>{getRoleIcon(member.role)}</Text>
                      </View>
                      <View style={styles.memberInfo}>
                        <Text style={styles.memberName}>{member.name}</Text>
                        <Text style={styles.memberRole}>{getRoleLabel(member.role)}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>
      </View>
    );
  };

  // Format date for history
  const formatHistoryDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('sr-RS', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // History Tab
  const renderHistoryTab = () => (
    <ScrollView
      style={styles.scrollView}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[COLORS.orange]}
          tintColor={COLORS.orange}
        />
      }
    >
      {loadingHistory ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={COLORS.orange} />
          <Text style={styles.emptySubtitle}>Ucitavanje istorije...</Text>
        </View>
      ) : historyItems.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📜</Text>
          <Text style={styles.emptyTitle}>Nema istorije</Text>
          <Text style={styles.emptySubtitle}>
            Zavrsene dostave ce se pojaviti ovde
          </Text>
        </View>
      ) : (
        <View style={styles.section}>
          <Text style={styles.historyCount}>Ukupno: {historyItems.length} dostava</Text>
          {historyItems.map(item => {
            // Check if this is a retroactive assignment
            const isRetroactive = item.source === 'processed_request' ||
              (!item.assigned_at && !item.picked_up_at);

            return (
              <TouchableOpacity
                key={item.assignment_id || item.id}
                style={styles.historyCard}
                onPress={() => setSelectedHistoryItem(item)}
                activeOpacity={0.7}
              >
                <View style={styles.historyHeader}>
                  <View style={styles.historyWasteInfo}>
                    <Text style={styles.historyIcon}>{getWasteIcon(item.waste_type)}</Text>
                    <View>
                      <Text style={styles.historyWasteLabel}>{item.waste_label || item.waste_type}</Text>
                      <Text style={styles.historyClientName}>{item.client_name}</Text>
                    </View>
                  </View>
                  {isRetroactive ? (
                    <View style={styles.historyRetroactiveBadge}>
                      <Text style={styles.historyRetroactiveText}>📋 Naknadno</Text>
                    </View>
                  ) : (
                    <View style={styles.historyStatusBadge}>
                      <Text style={styles.historyStatusText}>✓ Dostavljeno</Text>
                    </View>
                  )}
                </View>
                <View style={styles.historyDetails}>
                  <View style={styles.historyDetailRow}>
                    <Text style={styles.historyDetailIcon}>📍</Text>
                    <Text style={styles.historyDetailText} numberOfLines={1}>
                      {item.client_address || 'Adresa nije dostupna'}
                    </Text>
                  </View>
                  <View style={styles.historyDetailRow}>
                    <Text style={styles.historyDetailIcon}>📅</Text>
                    <Text style={styles.historyDetailText}>
                      {isRetroactive ? 'Obrađeno' : 'Dostavljeno'}: {formatHistoryDate(item.delivered_at)}
                    </Text>
                  </View>
                </View>
                <View style={styles.historyTapHint}>
                  <Text style={styles.historyTapHintText}>Pritisni za detalje →</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
      <View style={styles.bottomPadding} />
    </ScrollView>
  );

  // History Detail Modal
  const renderHistoryDetailModal = () => (
    <Modal
      visible={!!selectedHistoryItem}
      transparent
      animationType="slide"
      onRequestClose={() => setSelectedHistoryItem(null)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.historyDetailModal}>
          <View style={styles.historyDetailHeader}>
            <Text style={styles.historyDetailTitle}>Detalji dostave</Text>
            <TouchableOpacity onPress={() => setSelectedHistoryItem(null)}>
              <Text style={styles.historyDetailClose}>✕</Text>
            </TouchableOpacity>
          </View>

          {selectedHistoryItem && (
            <ScrollView style={styles.historyDetailContent}>
              {/* Waste Type */}
              <View style={styles.historyDetailSection}>
                <View style={styles.historyDetailWasteHeader}>
                  <Text style={styles.historyDetailWasteIcon}>
                    {getWasteIcon(selectedHistoryItem.waste_type)}
                  </Text>
                  <View>
                    <Text style={styles.historyDetailWasteLabel}>
                      {selectedHistoryItem.waste_label || selectedHistoryItem.waste_type}
                    </Text>
                    <View style={styles.historyDetailStatusBadge}>
                      <Text style={styles.historyDetailStatusText}>✓ Zavrseno</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Client Info */}
              <View style={styles.historyDetailSection}>
                <Text style={styles.historyDetailSectionTitle}>Klijent</Text>
                <View style={styles.historyDetailRow}>
                  <Text style={styles.historyDetailRowIcon}>👤</Text>
                  <Text style={styles.historyDetailRowText}>{selectedHistoryItem.client_name}</Text>
                </View>
                <View style={styles.historyDetailRow}>
                  <Text style={styles.historyDetailRowIcon}>📍</Text>
                  <Text style={styles.historyDetailRowText}>
                    {selectedHistoryItem.client_address || 'Adresa nije dostupna'}
                  </Text>
                </View>
                {selectedHistoryItem.client_phone && (
                  <View style={styles.historyDetailRow}>
                    <Text style={styles.historyDetailRowIcon}>📞</Text>
                    <Text style={styles.historyDetailRowText}>{selectedHistoryItem.client_phone}</Text>
                  </View>
                )}
              </View>

              {/* Details */}
              <View style={styles.historyDetailSection}>
                <Text style={styles.historyDetailSectionTitle}>Podaci o dostavi</Text>
                {selectedHistoryItem.fill_level && (
                  <View style={styles.historyDetailRow}>
                    <Text style={styles.historyDetailRowIcon}>📊</Text>
                    <Text style={styles.historyDetailRowText}>
                      Popunjenost: {selectedHistoryItem.fill_level}%
                    </Text>
                  </View>
                )}
                {selectedHistoryItem.urgency && (
                  <View style={styles.historyDetailRow}>
                    <Text style={styles.historyDetailRowIcon}>⏰</Text>
                    <Text style={styles.historyDetailRowText}>
                      Hitnost: {selectedHistoryItem.urgency}
                    </Text>
                  </View>
                )}
                {selectedHistoryItem.note && (
                  <View style={styles.historyDetailRow}>
                    <Text style={styles.historyDetailRowIcon}>📝</Text>
                    <Text style={styles.historyDetailRowText}>
                      {selectedHistoryItem.note}
                    </Text>
                  </View>
                )}
              </View>

              {/* Timeline or Retroactive Assignment Notice */}
              {(() => {
                // Check if this is a retroactive assignment (no assigned_at and no picked_up_at)
                const isRetroactive = selectedHistoryItem.source === 'processed_request' ||
                  (!selectedHistoryItem.assigned_at && !selectedHistoryItem.picked_up_at);

                if (isRetroactive) {
                  return (
                    <View style={styles.historyDetailSection}>
                      <View style={styles.retroactiveNotice}>
                        <Text style={styles.retroactiveIcon}>📋</Text>
                        <View style={styles.retroactiveContent}>
                          <Text style={styles.retroactiveTitle}>Evidentirano naknadno</Text>
                          <Text style={styles.retroactiveText}>
                            Ovaj zahtev je obrađen od strane menadžera, a vi ste evidentirani kao vozač naknadno.
                          </Text>
                          <Text style={styles.retroactiveTime}>
                            Obrađeno: {formatHistoryDate(selectedHistoryItem.delivered_at || selectedHistoryItem.completed_at)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                }

                return (
                  <View style={styles.historyDetailSection}>
                    <Text style={styles.historyDetailSectionTitle}>Vremenska linija</Text>
                    <View style={styles.historyTimeline}>
                      <View style={styles.historyTimelineItem}>
                        <View style={[styles.historyTimelineDot, { backgroundColor: COLORS.blue }]} />
                        <View style={styles.historyTimelineContent}>
                          <Text style={styles.historyTimelineLabel}>Zahtev kreiran</Text>
                          <Text style={styles.historyTimelineTime}>
                            {formatHistoryDate(selectedHistoryItem.created_at)}
                          </Text>
                        </View>
                      </View>
                      {selectedHistoryItem.assigned_at && (
                        <View style={styles.historyTimelineItem}>
                          <View style={[styles.historyTimelineDot, { backgroundColor: COLORS.purple }]} />
                          <View style={styles.historyTimelineContent}>
                            <Text style={styles.historyTimelineLabel}>Dodeljeno</Text>
                            <Text style={styles.historyTimelineTime}>
                              {formatHistoryDate(selectedHistoryItem.assigned_at)}
                            </Text>
                          </View>
                        </View>
                      )}
                      {selectedHistoryItem.picked_up_at && (
                        <View style={styles.historyTimelineItem}>
                          <View style={[styles.historyTimelineDot, { backgroundColor: COLORS.amber }]} />
                          <View style={styles.historyTimelineContent}>
                            <Text style={styles.historyTimelineLabel}>Preuzeto</Text>
                            <Text style={styles.historyTimelineTime}>
                              {formatHistoryDate(selectedHistoryItem.picked_up_at)}
                            </Text>
                          </View>
                        </View>
                      )}
                      <View style={styles.historyTimelineItem}>
                        <View style={[styles.historyTimelineDot, { backgroundColor: COLORS.primary }]} />
                        <View style={styles.historyTimelineContent}>
                          <Text style={styles.historyTimelineLabel}>Dostavljeno</Text>
                          <Text style={styles.historyTimelineTime}>
                            {formatHistoryDate(selectedHistoryItem.delivered_at)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })()}
            </ScrollView>
          )}

          <TouchableOpacity
            style={styles.historyDetailCloseButton}
            onPress={() => setSelectedHistoryItem(null)}
          >
            <Text style={styles.historyDetailCloseButtonText}>Zatvori</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Map Tab (placeholder)
  const renderMapTab = () => (
    <View style={styles.comingSoonContainer}>
      <Text style={styles.comingSoonIcon}>🗺️</Text>
      <Text style={styles.comingSoonTitle}>Mapa</Text>
      <Text style={styles.comingSoonText}>
        Mapa sa svim lokacijama dolazi uskoro!
      </Text>
      <Text style={styles.comingSoonSubtext}>
        Za sada koristi dugmice "Google" i "Waze" na svakom zahtevu za navigaciju.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>Zdravo,</Text>
          <Text style={styles.userName}>{user?.name || 'Vozac'}</Text>
          <Text style={styles.companyLabel}>{companyName}</Text>
        </View>
        <TouchableOpacity style={styles.settingsButton} onPress={() => setShowSettings(true)}>
          <Text style={styles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'tasks' && styles.tabActive]}
          onPress={() => setActiveTab('tasks')}
        >
          <Text style={[styles.tabIcon, activeTab === 'tasks' && styles.tabIconActive]}>📋</Text>
          <Text style={[styles.tabText, activeTab === 'tasks' && styles.tabTextActive]}>Zadaci</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'map' && styles.tabActive]}
          onPress={() => setActiveTab('map')}
        >
          <Text style={[styles.tabIcon, activeTab === 'map' && styles.tabIconActive]}>🗺️</Text>
          <Text style={[styles.tabText, activeTab === 'map' && styles.tabTextActive]}>Mapa</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'messages' && styles.tabActive]}
          onPress={() => setActiveTab('messages')}
        >
          <View style={styles.tabIconContainer}>
            <Text style={[styles.tabIcon, activeTab === 'messages' && styles.tabIconActive]}>💬</Text>
            {unreadCount > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.tabText, activeTab === 'messages' && styles.tabTextActive]}>Poruke</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabIcon, activeTab === 'history' && styles.tabIconActive]}>📜</Text>
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>Istorija</Text>
        </TouchableOpacity>
      </View>

      {/* Content based on active tab */}
      {activeTab === 'tasks' && renderTasksTab()}
      {activeTab === 'map' && renderMapTab()}
      {activeTab === 'messages' && renderMessagesTab()}
      {activeTab === 'history' && renderHistoryTab()}

      {/* Pickup Proof Modal */}
      <Modal
        visible={pickupProofModal.visible}
        transparent
        animationType="slide"
        onRequestClose={() => setPickupProofModal({ visible: false, request: null })}
      >
        <View style={styles.proofModalOverlay}>
          <View style={styles.proofModalContent}>
            <Text style={styles.proofModalTitle}>📦 Potvrdi preuzimanje</Text>
            <Text style={styles.proofModalSubtitle}>
              {pickupProofModal.request?.client_name} - {pickupProofModal.request?.waste_label}
            </Text>

            {/* Image Preview or Buttons */}
            {proofImage ? (
              <View style={styles.proofImageContainer}>
                <View style={styles.proofImagePreview}>
                  <Text style={styles.proofImagePlaceholder}>📷 Slika izabrana</Text>
                </View>
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => setProofImage(null)}
                >
                  <Text style={styles.removeImageText}>✕ Ukloni</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.proofButtonsRow}>
                <TouchableOpacity
                  style={styles.proofImageButton}
                  onPress={() => pickImage(true)}
                >
                  <Text style={styles.proofImageButtonIcon}>📷</Text>
                  <Text style={styles.proofImageButtonText}>Kamera</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.proofImageButton}
                  onPress={() => pickImage(false)}
                >
                  <Text style={styles.proofImageButtonIcon}>🖼️</Text>
                  <Text style={styles.proofImageButtonText}>Galerija</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={styles.proofOptionalText}>
              Prilaganje slike je opciono
            </Text>

            {/* Action Buttons */}
            <View style={styles.proofActionButtons}>
              <TouchableOpacity
                style={styles.proofCancelButton}
                onPress={() => setPickupProofModal({ visible: false, request: null })}
                disabled={uploadingProof}
              >
                <Text style={styles.proofCancelButtonText}>Otkaži</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.proofConfirmButton, uploadingProof && styles.buttonDisabled]}
                onPress={confirmPickup}
                disabled={uploadingProof}
              >
                {uploadingProof ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.proofConfirmButtonText}>✅ Potvrdi</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delivery Proof Modal */}
      <Modal
        visible={deliveryProofModal.visible}
        transparent
        animationType="slide"
        onRequestClose={() => setDeliveryProofModal({ visible: false, request: null })}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.proofModalOverlay}
        >
          <View style={styles.proofModalContent}>
            <Text style={styles.proofModalTitle}>✅ Potvrdi dostavu</Text>
            <Text style={styles.proofModalSubtitle}>
              {deliveryProofModal.request?.client_name} - {deliveryProofModal.request?.waste_label}
            </Text>

            {/* Weight Input */}
            <View style={styles.weightInputContainer}>
              <Text style={styles.weightLabel}>Kilaža (opciono):</Text>
              <View style={styles.weightInputRow}>
                <TextInput
                  style={styles.weightInput}
                  value={driverWeight}
                  onChangeText={setDriverWeight}
                  placeholder="0"
                  keyboardType="decimal-pad"
                  placeholderTextColor={COLORS.mediumGray}
                />
                <View style={styles.weightUnitPicker}>
                  <TouchableOpacity
                    style={[styles.weightUnitButton, driverWeightUnit === 'kg' && styles.weightUnitButtonActive]}
                    onPress={() => setDriverWeightUnit('kg')}
                  >
                    <Text style={[styles.weightUnitText, driverWeightUnit === 'kg' && styles.weightUnitTextActive]}>kg</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.weightUnitButton, driverWeightUnit === 't' && styles.weightUnitButtonActive]}
                    onPress={() => setDriverWeightUnit('t')}
                  >
                    <Text style={[styles.weightUnitText, driverWeightUnit === 't' && styles.weightUnitTextActive]}>t</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Image Preview or Buttons */}
            {proofImage ? (
              <View style={styles.proofImageContainer}>
                <View style={styles.proofImagePreview}>
                  <Text style={styles.proofImagePlaceholder}>📷 Slika izabrana</Text>
                </View>
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => setProofImage(null)}
                >
                  <Text style={styles.removeImageText}>✕ Ukloni</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.proofButtonsRow}>
                <TouchableOpacity
                  style={styles.proofImageButton}
                  onPress={() => pickImage(true)}
                >
                  <Text style={styles.proofImageButtonIcon}>📷</Text>
                  <Text style={styles.proofImageButtonText}>Kamera</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.proofImageButton}
                  onPress={() => pickImage(false)}
                >
                  <Text style={styles.proofImageButtonIcon}>🖼️</Text>
                  <Text style={styles.proofImageButtonText}>Galerija</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={styles.proofOptionalText}>
              Prilaganje slike je opciono
            </Text>

            {/* Action Buttons */}
            <View style={styles.proofActionButtons}>
              <TouchableOpacity
                style={styles.proofCancelButton}
                onPress={() => setDeliveryProofModal({ visible: false, request: null })}
                disabled={uploadingProof}
              >
                <Text style={styles.proofCancelButtonText}>Otkaži</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.proofConfirmButton, uploadingProof && styles.buttonDisabled]}
                onPress={confirmDelivery}
                disabled={uploadingProof}
              >
                {uploadingProof ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.proofConfirmButtonText}>✅ Potvrdi</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Settings Modal */}
      <Modal
        visible={showSettings}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSettings(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSettings(false)}
        >
          <View style={styles.settingsCard}>
            <View style={styles.settingsHeader}>
              <Text style={styles.settingsTitle}>⚙️ Podesavanja</Text>
              <TouchableOpacity onPress={() => setShowSettings(false)}>
                <Text style={styles.settingsClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.settingsSection}>
              <Text style={styles.settingsSectionTitle}>Profil</Text>
              <TouchableOpacity
                style={styles.profileInfo}
                onPress={() => { setShowSettings(false); openEditProfile(); }}
                activeOpacity={0.7}
              >
                <Text style={styles.profileIcon}>🚛</Text>
                <View style={styles.profileDetails}>
                  <Text style={styles.profileName}>{user?.name}</Text>
                  <Text style={styles.profileRole}>Vozac</Text>
                  <Text style={styles.profileCompany}>{companyName}</Text>
                  {user?.phone && (
                    <Text style={styles.profilePhone}>📞 {user.phone}</Text>
                  )}
                </View>
                <Text style={styles.profileEditIcon}>✏️</Text>
              </TouchableOpacity>
            </View>

            {/* Language Switcher */}
            <View style={styles.languageSection}>
              <Text style={styles.settingsSectionTitle}>{t('language')}</Text>
              <View style={styles.languageButtons}>
                <TouchableOpacity
                  style={[styles.languageBtn, language === 'sr' && styles.languageBtnActive]}
                  onPress={() => changeLanguage('sr')}
                >
                  <Text style={styles.languageFlag}>🇷🇸</Text>
                  <Text style={[styles.languageBtnText, language === 'sr' && styles.languageBtnTextActive]}>
                    {t('serbian')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.languageBtn, language === 'en' && styles.languageBtnActive]}
                  onPress={() => changeLanguage('en')}
                >
                  <Text style={styles.languageFlag}>🇬🇧</Text>
                  <Text style={[styles.languageBtnText, language === 'en' && styles.languageBtnTextActive]}>
                    {t('english')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.modalLogoutBtn} onPress={handleLogout}>
              <Text style={styles.modalLogoutBtnText}>Odjavi se</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* History Detail Modal */}
      {renderHistoryDetailModal()}

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditProfile}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditProfile(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.editProfileModal}>
            <View style={styles.editProfileHeader}>
              <Text style={styles.editProfileTitle}>Uredi profil</Text>
              <TouchableOpacity onPress={() => setShowEditProfile(false)}>
                <Text style={styles.editProfileClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.editProfileContent}>
              {/* Name Input */}
              <View style={styles.editProfileField}>
                <Text style={styles.editProfileLabel}>Ime i prezime</Text>
                <TextInput
                  style={styles.editProfileInput}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Unesite ime"
                  placeholderTextColor={COLORS.mediumGray}
                />
              </View>

              {/* Phone Input */}
              <View style={styles.editProfileField}>
                <Text style={styles.editProfileLabel}>Broj telefona (opciono)</Text>
                <View style={styles.phoneInputRow}>
                  {/* Country Code Selector */}
                  <TouchableOpacity
                    style={styles.countryCodeBtn}
                    onPress={() => setShowCountryPicker(!showCountryPicker)}
                  >
                    <Text style={styles.countryCodeText}>{editCountryCode}</Text>
                    <Text style={styles.countryCodeArrow}>▼</Text>
                  </TouchableOpacity>

                  {/* Phone Number */}
                  <TextInput
                    style={styles.phoneNumberInput}
                    value={editPhoneNumber}
                    onChangeText={setEditPhoneNumber}
                    placeholder="61234567"
                    placeholderTextColor={COLORS.mediumGray}
                    keyboardType="phone-pad"
                  />
                </View>

                {/* Country Picker Dropdown */}
                {showCountryPicker && (
                  <View style={styles.countryPickerDropdown}>
                    {COUNTRY_CODES.map((item) => (
                      <TouchableOpacity
                        key={item.code}
                        style={[
                          styles.countryPickerItem,
                          editCountryCode === item.code && styles.countryPickerItemActive,
                        ]}
                        onPress={() => {
                          setEditCountryCode(item.code);
                          setShowCountryPicker(false);
                        }}
                      >
                        <Text style={styles.countryPickerText}>{item.country}</Text>
                        <Text style={styles.countryPickerCode}>{item.code}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </ScrollView>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveProfileBtn, savingProfile && styles.saveProfileBtnDisabled]}
              onPress={handleSaveProfile}
              disabled={savingProfile}
            >
              {savingProfile ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Text style={styles.saveProfileBtnText}>Sacuvaj promene</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
  },
  scrollView: {
    flex: 1,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
    backgroundColor: COLORS.white,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 14,
    color: COLORS.mediumGray,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.darkGray,
  },
  companyLabel: {
    fontSize: 12,
    color: COLORS.orange,
    fontWeight: '500',
    marginTop: 2,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsIcon: {
    fontSize: 20,
  },
  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: COLORS.orange,
  },
  tabIcon: {
    fontSize: 18,
    marginBottom: 2,
    opacity: 0.5,
  },
  tabIconActive: {
    opacity: 1,
  },
  tabText: {
    fontSize: 11,
    color: COLORS.mediumGray,
    fontWeight: '500',
  },
  tabTextActive: {
    color: COLORS.orange,
    fontWeight: '600',
  },
  tabIconContainer: {
    position: 'relative',
  },
  tabBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: COLORS.red,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  // Stats Bar
  statsBar: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    backgroundColor: COLORS.white,
    marginBottom: 8,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.lightGray,
    borderRadius: 20,
    gap: 4,
  },
  statNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.darkGray,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.mediumGray,
  },
  // Section
  section: {
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.darkGray,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: COLORS.mediumGray,
    marginTop: 2,
  },
  // Request Card
  requestCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.lightGray,
  },
  requestCardPickedUp: {
    borderLeftColor: COLORS.amber,
    backgroundColor: '#FFFBEB',
  },
  pickedUpBadge: {
    backgroundColor: COLORS.amberLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  pickedUpBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.amber,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  wasteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  wasteIcon: {
    fontSize: 28,
    marginRight: 10,
  },
  wasteDetails: {
    flex: 1,
  },
  wasteLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.darkGray,
  },
  clientNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  clientName: {
    fontSize: 13,
    color: COLORS.mediumGray,
  },
  callIconButton: {
    marginLeft: 8,
    padding: 2,
  },
  callIconText: {
    fontSize: 14,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  timeIcon: {
    fontSize: 12,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  // Address
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.lightGray,
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  addressIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  addressText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.darkGray,
    lineHeight: 18,
  },
  // Fill Level
  fillLevelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  fillLabel: {
    fontSize: 11,
    color: COLORS.mediumGray,
    marginRight: 8,
  },
  fillBar: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.lightGray,
    borderRadius: 3,
    marginRight: 8,
  },
  fillProgress: {
    height: '100%',
    backgroundColor: COLORS.orange,
    borderRadius: 3,
  },
  fillPercent: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.darkGray,
    width: 30,
  },
  // Note
  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  noteIcon: {
    fontSize: 12,
    marginRight: 6,
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.mediumGray,
    fontStyle: 'italic',
  },
  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  navButton: {
    flex: 1,
    paddingVertical: 12,
    minHeight: 48,
    backgroundColor: COLORS.blueLight,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  navButtonWaze: {
    backgroundColor: '#E0F7FA',
  },
  navButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.blue,
  },
  noLocationBadge: {
    flex: 2,
    paddingVertical: 12,
    minHeight: 48,
    backgroundColor: COLORS.amberLight,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noLocationText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.amber,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    minHeight: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  pickupButton: {
    backgroundColor: COLORS.amberLight,
  },
  deliveredButton: {
    backgroundColor: COLORS.primaryLight,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.darkGray,
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.darkGray,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.mediumGray,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  // Coming Soon
  comingSoonContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  comingSoonIcon: {
    fontSize: 64,
    marginBottom: 16,
    opacity: 0.8,
  },
  comingSoonTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.darkGray,
    marginBottom: 8,
  },
  comingSoonText: {
    fontSize: 15,
    color: COLORS.mediumGray,
    textAlign: 'center',
    marginBottom: 8,
  },
  comingSoonSubtext: {
    fontSize: 13,
    color: COLORS.mediumGray,
    textAlign: 'center',
    opacity: 0.7,
  },
  bottomPadding: {
    height: 40,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  settingsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  settingsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.darkGray,
  },
  settingsClose: {
    fontSize: 20,
    color: COLORS.mediumGray,
    padding: 5,
  },
  settingsSection: {
    marginBottom: 20,
  },
  settingsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.darkGray,
    marginBottom: 10,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.orangeLight,
    padding: 16,
    borderRadius: 12,
  },
  profileIcon: {
    fontSize: 40,
    marginRight: 16,
  },
  profileName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.darkGray,
  },
  profileRole: {
    fontSize: 14,
    color: COLORS.orange,
    fontWeight: '500',
  },
  profileCompany: {
    fontSize: 12,
    color: COLORS.mediumGray,
    marginTop: 2,
  },
  modalLogoutBtn: {
    backgroundColor: COLORS.lightGray,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalLogoutBtnText: {
    color: COLORS.red,
    fontWeight: 'bold',
    fontSize: 16,
  },
  // Language Switcher
  languageSection: {
    marginBottom: 20,
  },
  languageButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  languageBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: COLORS.lightGray,
    borderWidth: 2,
    borderColor: COLORS.lightGray,
  },
  languageBtnActive: {
    backgroundColor: COLORS.orangeLight,
    borderColor: COLORS.orange,
  },
  languageFlag: {
    fontSize: 20,
    marginRight: 8,
  },
  languageBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.mediumGray,
  },
  languageBtnTextActive: {
    color: COLORS.orange,
    fontWeight: '600',
  },
  // History Styles
  historyCount: {
    fontSize: 13,
    color: COLORS.mediumGray,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  historyCard: {
    backgroundColor: COLORS.white,
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  historyWasteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  historyIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  historyWasteLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.darkGray,
  },
  historyClientName: {
    fontSize: 12,
    color: COLORS.mediumGray,
    marginTop: 2,
  },
  historyStatusBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  historyStatusText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
  },
  historyRetroactiveBadge: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  historyRetroactiveText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7C3AED',
  },
  historyDetails: {
    backgroundColor: COLORS.lightGray,
    padding: 10,
    borderRadius: 8,
  },
  historyDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  historyDetailIcon: {
    fontSize: 12,
    marginRight: 8,
  },
  historyDetailText: {
    fontSize: 12,
    color: COLORS.darkGray,
    flex: 1,
  },
  // Chat Styles
  messagesContainer: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
  },
  newChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.orange,
    margin: 12,
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  newChatButtonIcon: {
    fontSize: 16,
    color: COLORS.white,
  },
  newChatButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.white,
  },
  conversationsList: {
    flex: 1,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 14,
    borderRadius: 12,
  },
  conversationAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.orangeLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  conversationAvatarText: {
    fontSize: 22,
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversationName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.darkGray,
  },
  conversationTime: {
    fontSize: 11,
    color: COLORS.mediumGray,
  },
  conversationPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  conversationRole: {
    fontSize: 11,
    color: COLORS.orange,
    fontWeight: '500',
  },
  conversationLastMessage: {
    fontSize: 13,
    color: COLORS.mediumGray,
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: COLORS.orange,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  unreadBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  // Chat View Styles
  chatContainer: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  chatBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  chatBackIcon: {
    fontSize: 20,
    color: COLORS.darkGray,
  },
  chatHeaderInfo: {
    flex: 1,
  },
  chatHeaderName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.darkGray,
  },
  chatHeaderRole: {
    fontSize: 12,
    color: COLORS.orange,
  },
  chatLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesList: {
    flex: 1,
  },
  messagesListContent: {
    padding: 12,
    flexGrow: 1,
  },
  messageBubbleContainer: {
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  messageBubbleContainerMe: {
    justifyContent: 'flex-end',
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
  },
  messageBubbleMe: {
    backgroundColor: COLORS.orange,
    borderBottomRightRadius: 4,
  },
  messageBubbleOther: {
    backgroundColor: COLORS.white,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    color: COLORS.darkGray,
    lineHeight: 20,
  },
  messageTextMe: {
    color: COLORS.white,
  },
  messageTime: {
    fontSize: 10,
    color: COLORS.mediumGray,
    marginTop: 4,
    textAlign: 'right',
  },
  messageTimeMe: {
    color: 'rgba(255,255,255,0.7)',
  },
  emptyChat: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyChatIcon: {
    fontSize: 48,
    marginBottom: 12,
    opacity: 0.5,
  },
  emptyChatText: {
    fontSize: 16,
    color: COLORS.mediumGray,
    fontWeight: '500',
  },
  emptyChatSubtext: {
    fontSize: 13,
    color: COLORS.mediumGray,
    marginTop: 4,
  },
  messageInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: COLORS.white,
    padding: 12,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  messageInput: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 100,
    color: COLORS.darkGray,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.mediumGray,
    opacity: 0.5,
  },
  sendButtonText: {
    fontSize: 18,
    color: COLORS.white,
  },
  // New Chat Modal
  newChatModal: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    maxHeight: '70%',
    overflow: 'hidden',
  },
  newChatModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  newChatModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.darkGray,
  },
  newChatModalClose: {
    fontSize: 20,
    color: COLORS.mediumGray,
    padding: 4,
  },
  modalLoading: {
    padding: 40,
    alignItems: 'center',
  },
  modalEmpty: {
    padding: 40,
    alignItems: 'center',
  },
  modalEmptyText: {
    fontSize: 14,
    color: COLORS.mediumGray,
  },
  membersList: {
    maxHeight: 400,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.orangeLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  memberAvatarText: {
    fontSize: 20,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.darkGray,
  },
  memberRole: {
    fontSize: 12,
    color: COLORS.orange,
    marginTop: 2,
  },
  // Delete conversation button
  deleteConvButton: {
    padding: 8,
    marginLeft: 4,
  },
  deleteConvButtonText: {
    fontSize: 16,
    opacity: 0.5,
  },
  // History tap hint
  historyTapHint: {
    marginTop: 8,
    alignItems: 'flex-end',
  },
  historyTapHintText: {
    fontSize: 11,
    color: COLORS.mediumGray,
    fontStyle: 'italic',
  },
  // History Detail Modal
  historyDetailModal: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  historyDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  historyDetailTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.darkGray,
  },
  historyDetailClose: {
    fontSize: 20,
    color: COLORS.mediumGray,
    padding: 4,
  },
  historyDetailContent: {
    padding: 16,
  },
  historyDetailSection: {
    marginBottom: 20,
  },
  historyDetailWasteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyDetailWasteIcon: {
    fontSize: 40,
    marginRight: 12,
  },
  historyDetailWasteLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.darkGray,
    marginBottom: 4,
  },
  historyDetailStatusBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  historyDetailStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  historyDetailSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.darkGray,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
    paddingBottom: 6,
  },
  historyDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  historyDetailRowIcon: {
    fontSize: 14,
    marginRight: 10,
    width: 20,
  },
  historyDetailRowText: {
    fontSize: 14,
    color: COLORS.darkGray,
    flex: 1,
    lineHeight: 20,
  },
  // Timeline
  historyTimeline: {
    paddingLeft: 8,
  },
  historyTimelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  historyTimelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
    marginTop: 4,
  },
  historyTimelineContent: {
    flex: 1,
  },
  historyTimelineLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.darkGray,
  },
  historyTimelineTime: {
    fontSize: 12,
    color: COLORS.mediumGray,
    marginTop: 2,
  },
  // Retroactive assignment notice
  retroactiveNotice: {
    flexDirection: 'row',
    backgroundColor: '#F3E8FF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  retroactiveIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  retroactiveContent: {
    flex: 1,
  },
  retroactiveTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7C3AED',
    marginBottom: 4,
  },
  retroactiveText: {
    fontSize: 13,
    color: '#6D28D9',
    lineHeight: 18,
  },
  retroactiveTime: {
    fontSize: 12,
    color: '#8B5CF6',
    marginTop: 8,
  },
  historyDetailCloseButton: {
    backgroundColor: COLORS.orange,
    margin: 16,
    marginTop: 0,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  historyDetailCloseButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  // Call button
  callButton: {
    width: 44,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callButtonDisabled: {
    backgroundColor: COLORS.lightGray,
    opacity: 0.5,
  },
  callButtonText: {
    fontSize: 18,
  },
  // Swipeable conversation
  swipeableContainer: {
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  deleteBackground: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 100,
    backgroundColor: COLORS.red,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  deleteBackgroundIcon: {
    fontSize: 20,
  },
  deleteBackgroundText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  conversationItemAnimated: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
  },
  conversationItemInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  // Profile styles
  profileDetails: {
    flex: 1,
  },
  profilePhone: {
    fontSize: 12,
    color: COLORS.primary,
    marginTop: 4,
  },
  profileEditIcon: {
    fontSize: 18,
    opacity: 0.5,
    marginLeft: 8,
  },
  // Edit Profile Modal
  editProfileModal: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  editProfileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  editProfileTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.darkGray,
  },
  editProfileClose: {
    fontSize: 20,
    color: COLORS.mediumGray,
    padding: 4,
  },
  editProfileContent: {
    padding: 16,
  },
  editProfileField: {
    marginBottom: 20,
  },
  editProfileLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.darkGray,
    marginBottom: 8,
  },
  editProfileInput: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.darkGray,
  },
  phoneInputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  countryCodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 6,
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.darkGray,
  },
  countryCodeArrow: {
    fontSize: 10,
    color: COLORS.mediumGray,
  },
  phoneNumberInput: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.darkGray,
  },
  countryPickerDropdown: {
    marginTop: 8,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    overflow: 'hidden',
  },
  countryPickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  countryPickerItemActive: {
    backgroundColor: COLORS.orangeLight,
  },
  countryPickerText: {
    fontSize: 14,
    color: COLORS.darkGray,
  },
  countryPickerCode: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.mediumGray,
  },
  saveProfileBtn: {
    backgroundColor: COLORS.orange,
    margin: 16,
    marginTop: 0,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveProfileBtnDisabled: {
    opacity: 0.6,
  },
  saveProfileBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  // Route Planning Styles
  routePlanningBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.purple,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectAllText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  routeCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.white,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeCheckboxChecked: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.white,
  },
  checkmark: {
    color: COLORS.purple,
    fontSize: 16,
    fontWeight: 'bold',
  },
  openRouteButton: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  openRouteButtonDisabled: {
    opacity: 0.5,
  },
  openRouteButtonText: {
    color: COLORS.purple,
    fontSize: 14,
    fontWeight: 'bold',
  },
  routeSelectTouch: {
    padding: 4,
    marginRight: 8,
  },
  // Proof Modal Styles
  proofModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  proofModalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  proofModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.darkGray,
    textAlign: 'center',
    marginBottom: 4,
  },
  proofModalSubtitle: {
    fontSize: 14,
    color: COLORS.mediumGray,
    textAlign: 'center',
    marginBottom: 20,
  },
  proofButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  proofImageButton: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  proofImageButtonIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  proofImageButtonText: {
    fontSize: 14,
    color: COLORS.darkGray,
    fontWeight: '500',
  },
  proofImageContainer: {
    marginBottom: 12,
  },
  proofImagePreview: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 8,
  },
  proofImagePlaceholder: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '500',
  },
  removeImageButton: {
    alignSelf: 'center',
  },
  removeImageText: {
    fontSize: 14,
    color: COLORS.red,
  },
  proofOptionalText: {
    fontSize: 12,
    color: COLORS.mediumGray,
    textAlign: 'center',
    marginBottom: 20,
  },
  proofActionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  proofCancelButton: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  proofCancelButtonText: {
    fontSize: 16,
    color: COLORS.darkGray,
    fontWeight: '600',
  },
  proofConfirmButton: {
    flex: 2,
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  proofConfirmButtonText: {
    fontSize: 16,
    color: COLORS.white,
    fontWeight: 'bold',
  },
  // Weight Input Styles
  weightInputContainer: {
    marginBottom: 16,
  },
  weightLabel: {
    fontSize: 14,
    color: COLORS.darkGray,
    fontWeight: '500',
    marginBottom: 8,
  },
  weightInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  weightInput: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.darkGray,
    textAlign: 'center',
  },
  weightUnitPicker: {
    flexDirection: 'row',
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    padding: 4,
  },
  weightUnitButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  weightUnitButtonActive: {
    backgroundColor: COLORS.primary,
  },
  weightUnitText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.mediumGray,
  },
  weightUnitTextActive: {
    color: COLORS.white,
  },
});

export default DriverViewScreen;
