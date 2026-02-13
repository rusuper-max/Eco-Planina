/**
 * DriverViewScreen - Glavni ekran za vozače
 * Refaktorisano: 2373 → ~450 linija
 *
 * Struktura:
 * - Hooks: useDriverTasks, useDriverChat, useProofUpload, useBulkActions,
 *          useRouteOptimization, useDriverHistory, useDriverProfile
 * - Components: TaskCard, ProofModal, SettingsModal, HistoryDetailModal, ChatComponents
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppContext } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { useLocation } from '../context/LocationContext';
import DriverMap from '../components/DriverMap';

// Import constants and styles
import { COLORS } from './driver/constants';
import { styles } from './driver/styles';

// Import hooks
import {
  useDriverTasks,
  useDriverChat,
  useProofUpload,
  useBulkActions,
  useRouteOptimization,
  useDriverHistory,
  useDriverProfile,
} from './driver/hooks';

// Import components
import {
  TaskCard,
  PickupProofModal,
  DeliveryProofModal,
  BulkActionModal,
  SettingsModal,
  EditProfileModal,
  HistoryDetailModal,
  SwipeableConversationItem,
  ChatView,
  NewChatModal,
} from './driver/components';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DriverViewScreen = ({ navigation }) => {
  // Context
  const {
    user,
    logout,
    updateUserProfile,
    fetchDriverAssignments,
    fetchDriverHistory,
    updateDriverAssignmentStatus,
    companyName,
    maxPickupHours,
    fetchMessages,
    sendMessage,
    markMessagesAsRead,
    fetchConversations,
    fetchCompanyMembers,
    subscribeToMessages,
    unreadCount,
  } = useAppContext();
  const { language, changeLanguage, t } = useLanguage();
  const { location: driverLocation } = useLocation();

  // Tab state
  const [activeTab, setActiveTab] = useState('tasks');
  const [processingId, setProcessingId] = useState(null);
  const [navIntentHandled, setNavIntentHandled] = useState(false);

  // Update time every minute (for time remaining display)
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  // Initialize hooks
  const tasks = useDriverTasks({
    user,
    fetchDriverAssignments,
    maxPickupHours,
  });

  const proof = useProofUpload({
    user,
    updateDriverAssignmentStatus,
  });

  const bulk = useBulkActions({
    assignments: tasks.assignments,
    setAssignments: tasks.setAssignments,
    updateDriverAssignmentStatus,
    uploadProofImage: proof.uploadProofImage,
    proofImage: proof.proofImage,
    setProofImage: proof.setProofImage,
    driverWeight: proof.driverWeight,
    setDriverWeight: proof.setDriverWeight,
    driverWeightUnit: proof.driverWeightUnit,
    setDriverWeightUnit: proof.setDriverWeightUnit,
    uploadingProof: proof.uploadingProof,
    setUploadingProof: (val) => {}, // Handled in proof hook
  });

  const route = useRouteOptimization({
    assignments: tasks.assignments,
  });

  const history = useDriverHistory({
    fetchDriverHistory,
  });

  const chat = useDriverChat({
    user,
    fetchMessages,
    sendMessage,
    markMessagesAsRead,
    fetchConversations,
    fetchCompanyMembers,
    subscribeToMessages,
  });

  const profile = useDriverProfile({
    user,
    logout,
    updateUserProfile,
  });

  // Load history when switching to history tab
  useEffect(() => {
    if (activeTab === 'history' && history.historyItems.length === 0) {
      history.loadHistory();
    }
  }, [activeTab]);

  // Load conversations when switching to messages tab
  useEffect(() => {
    if (activeTab === 'messages') {
      chat.loadConversations();
    }
  }, [activeTab]);

  // Refresh assignments when switching to tasks tab
  useEffect(() => {
    if (activeTab === 'tasks') {
      tasks.loadAssignments();
    }
  }, [activeTab]);

  // Consume nav intent set by notification click (from NotificationContext)
  useEffect(() => {
    const applyNavIntent = async () => {
      const intentStr = await AsyncStorage.getItem('nav_intent');
      if (!intentStr) return;
      const intent = JSON.parse(intentStr);
      await AsyncStorage.removeItem('nav_intent');

      if (intent.screen === 'DriverView') {
        setActiveTab('tasks');
        // Optionally scroll to / highlight request_id if present
        if (intent.request_id) {
          // trigger refresh to ensure it's in list
          tasks.loadAssignments();
          // could set a highlight flag here if needed
        }
      } else if (intent.screen === 'Chat' && intent.conversation_id) {
        setActiveTab('messages');
        chat.loadConversations();
        // optionally open specific conversation if component supports it
      }
      setNavIntentHandled(true);
    };

    if (!navIntentHandled) {
      applyNavIntent();
    }
  }, [navIntentHandled]);

  // Handle refresh based on active tab
  const handleRefresh = async () => {
    if (activeTab === 'history') {
      await history.loadHistory();
    } else {
      await tasks.handleRefresh();
    }
  };

  // Pickup confirmation handler
  const handleConfirmPickup = async () => {
    await proof.confirmPickup(() => {
      // Update local state after successful pickup
      tasks.setAssignments(prev => prev.map(a =>
        a.id === proof.pickupProofModal.request?.id
          ? { ...a, assignment_status: 'picked_up', picked_up_at: new Date().toISOString() }
          : a
      ));
    });
  };

  // Delivery confirmation handler
  const handleConfirmDelivery = async () => {
    await proof.confirmDelivery(() => {
      // Remove from local state after successful delivery
      tasks.setAssignments(prev => prev.filter(a => a.id !== proof.deliveryProofModal.request?.id));
    });
  };

  // Get waste icon
  const getWasteIcon = (wasteType) => {
    switch (wasteType) {
      case 'cardboard': return '📦';
      case 'glass': return '🍾';
      case 'plastic': return '♻️';
      default: return '📦';
    }
  };

  // Render Tasks Tab
  const renderTasksTab = () => (
    <ScrollView
      style={styles.scrollView}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={tasks.refreshing}
          onRefresh={handleRefresh}
          colors={[COLORS.orange]}
          tintColor={COLORS.orange}
        />
      }
    >
      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statPill}>
          <Text style={styles.statNumber}>{tasks.assignments.length}</Text>
          <Text style={styles.statLabel}>ukupno</Text>
        </View>
        <View style={[styles.statPill, { backgroundColor: COLORS.redLight }]}>
          <Text style={[styles.statNumber, { color: COLORS.red }]}>{tasks.urgentCount}</Text>
          <Text style={[styles.statLabel, { color: COLORS.red }]}>hitno</Text>
        </View>
        <View style={[styles.statPill, { backgroundColor: COLORS.amberLight }]}>
          <Text style={[styles.statNumber, { color: COLORS.amber }]}>{tasks.mediumCount}</Text>
          <Text style={[styles.statLabel, { color: COLORS.amber }]}>srednje</Text>
        </View>
        <View style={[styles.statPill, { backgroundColor: COLORS.amberLight }]}>
          <Text style={[styles.statNumber, { color: COLORS.amber }]}>{tasks.pickedUpRequests.length}</Text>
          <Text style={[styles.statLabel, { color: COLORS.amber }]}>preuzeto</Text>
        </View>
      </View>

      {/* Bulk Action Bar */}
      {bulk.bulkMode && (
        <View style={styles.bulkActionBar}>
          <View style={styles.bulkActionLeft}>
            <TouchableOpacity style={styles.bulkCancelButton} onPress={bulk.exitBulkMode}>
              <Text style={styles.bulkCancelText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.bulkSelectedCount}>{bulk.selectedForBulk.size} izabrano</Text>
          </View>
          <View style={styles.bulkActionButtons}>
            {bulk.hasPendingSelected && (
              <TouchableOpacity
                style={styles.bulkPickupButton}
                onPress={() => bulk.openBulkActionModal('pickup')}
              >
                <Text style={styles.bulkButtonText}>📦 Preuzmi</Text>
              </TouchableOpacity>
            )}
            {bulk.hasPickedUpSelected && (
              <TouchableOpacity
                style={styles.bulkDeliveryButton}
                onPress={() => bulk.openBulkActionModal('delivery')}
              >
                <Text style={styles.bulkButtonText}>✅ Dostavi</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Route Planning Bar */}
      {!bulk.bulkMode && tasks.assignments.length > 0 && (
        <View style={styles.routePlanningBar}>
          <TouchableOpacity
            style={styles.selectAllButton}
            onPress={route.toggleSelectAllForRoute}
          >
            <View style={[styles.routeCheckbox, route.allValidSelected && styles.routeCheckboxChecked]}>
              {route.allValidSelected && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.selectAllText}>
              {route.selectedForRoute.size > 0 ? `${route.selectedForRoute.size} odabrano` : 'Odaberi sve'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.openRouteButton, route.selectedForRoute.size < 2 && styles.openRouteButtonDisabled]}
            onPress={route.handleOpenOptimizedRoute}
            disabled={route.selectedForRoute.size < 2}
          >
            <Text style={styles.openRouteButtonText}>🗺️ Otvori Rutu</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Content */}
      {tasks.loading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={COLORS.orange} />
          <Text style={styles.emptySubtitle}>Ucitavanje...</Text>
        </View>
      ) : tasks.assignments.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>Nema dodeljenih zadataka</Text>
          <Text style={styles.emptySubtitle}>Menadzer ti jos nije dodelio zahteve</Text>
        </View>
      ) : (
        <>
          {/* Bulk mode hint */}
          {!bulk.bulkMode && tasks.assignments.length > 1 && (
            <View style={styles.bulkHintContainer}>
              <Text style={styles.bulkHintText}>💡 Drži karticu za grupnu akciju</Text>
            </View>
          )}

          {/* Picked Up Section */}
          {tasks.sortedPickedUp.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionTitle}>📦 Na zadatku ({tasks.sortedPickedUp.length})</Text>
                  {bulk.bulkMode && (
                    <TouchableOpacity
                      style={styles.selectAllSectionButton}
                      onPress={() => bulk.toggleSelectAllForBulk('pickedUp')}
                    >
                      <Text style={styles.selectAllSectionText}>
                        {tasks.sortedPickedUp.every(r => bulk.selectedForBulk.has(r.id)) ? 'Poništi' : 'Sve'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={styles.sectionSubtitle}>Preuzeto, ceka dostavu</Text>
              </View>
              {tasks.sortedPickedUp.map(request => (
                <TaskCard
                  key={request.id}
                  request={request}
                  isPickedUp={true}
                  bulkMode={bulk.bulkMode}
                  isBulkSelected={bulk.selectedForBulk.has(request.id)}
                  isRouteSelected={route.selectedForRoute.has(request.id)}
                  isProcessing={processingId === request.id}
                  urgencyColors={tasks.getUrgencyColors(tasks.getUrgencyLevel(request))}
                  timeInfo={tasks.getRemainingTime(request) || { text: '-', isOverdue: false }}
                  onBulkSelect={() => bulk.toggleBulkSelection(request.id)}
                  onRouteSelect={() => route.toggleRouteSelection(request.id)}
                  onLongPress={() => bulk.enterBulkMode(request.id)}
                  onPickup={() => proof.handleMarkAsPickedUp(request)}
                  onDelivery={() => proof.handleMarkAsDelivered(request)}
                  onCallClient={() => profile.handleCallClient(request)}
                  onNavigate={(app) => profile.openNavigation(request, app)}
                />
              ))}
            </View>
          )}

          {/* Pending Section */}
          {tasks.sortedPending.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionTitle}>⏳ Na cekanju ({tasks.sortedPending.length})</Text>
                  {bulk.bulkMode && (
                    <TouchableOpacity
                      style={styles.selectAllSectionButton}
                      onPress={() => bulk.toggleSelectAllForBulk('pending')}
                    >
                      <Text style={styles.selectAllSectionText}>
                        {tasks.sortedPending.every(r => bulk.selectedForBulk.has(r.id)) ? 'Poništi' : 'Sve'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={styles.sectionSubtitle}>Ceka preuzimanje</Text>
              </View>
              {tasks.sortedPending.map(request => (
                <TaskCard
                  key={request.id}
                  request={request}
                  isPickedUp={false}
                  bulkMode={bulk.bulkMode}
                  isBulkSelected={bulk.selectedForBulk.has(request.id)}
                  isRouteSelected={route.selectedForRoute.has(request.id)}
                  isProcessing={processingId === request.id}
                  urgencyColors={tasks.getUrgencyColors(tasks.getUrgencyLevel(request))}
                  timeInfo={tasks.getRemainingTime(request) || { text: '-', isOverdue: false }}
                  onBulkSelect={() => bulk.toggleBulkSelection(request.id)}
                  onRouteSelect={() => route.toggleRouteSelection(request.id)}
                  onLongPress={() => bulk.enterBulkMode(request.id)}
                  onPickup={() => proof.handleMarkAsPickedUp(request)}
                  onDelivery={() => proof.handleMarkAsDelivered(request)}
                  onCallClient={() => profile.handleCallClient(request)}
                  onNavigate={(app) => profile.openNavigation(request, app)}
                />
              ))}
            </View>
          )}
        </>
      )}

      <View style={styles.bottomPadding} />
    </ScrollView>
  );

  // Render Messages Tab
  const renderMessagesTab = () => {
    if (chat.selectedChat) {
      return (
        <ChatView
          selectedChat={chat.selectedChat}
          chatMessages={chat.chatMessages}
          loadingChat={chat.loadingChat}
          newMessage={chat.newMessage}
          sendingMessage={chat.sendingMessage}
          flatListRef={chat.flatListRef}
          userId={user?.id}
          onBack={chat.closeChat}
          onSend={chat.handleSendMessage}
          onMessageChange={chat.setNewMessage}
          getRoleLabel={chat.getRoleLabel}
          formatTime={chat.formatMessageTime}
        />
      );
    }

    return (
      <View style={styles.messagesContainer}>
        <TouchableOpacity style={styles.newChatButton} onPress={chat.startNewChat}>
          <Text style={styles.newChatButtonIcon}>➕</Text>
          <Text style={styles.newChatButtonText}>Nova poruka</Text>
        </TouchableOpacity>

        {chat.loadingChat ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={COLORS.orange} />
            <Text style={styles.emptySubtitle}>Ucitavanje poruka...</Text>
          </View>
        ) : chat.chatConversations.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyTitle}>Nema poruka</Text>
            <Text style={styles.emptySubtitle}>Zapocni konverzaciju sa menadzerom ili kolegom</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.conversationsList}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={tasks.refreshing}
                onRefresh={chat.loadConversations}
                colors={[COLORS.orange]}
                tintColor={COLORS.orange}
              />
            }
          >
            {chat.chatConversations.map(conv => (
              <SwipeableConversationItem
                key={conv.partnerId}
                conv={conv}
                onPress={() => chat.openChat(conv)}
                onDelete={chat.hideConversation}
                getRoleIcon={chat.getRoleIcon}
                getRoleLabel={chat.getRoleLabel}
                formatTime={chat.formatMessageTime}
                userId={user?.id}
              />
            ))}
            <View style={styles.bottomPadding} />
          </ScrollView>
        )}

        <NewChatModal
          visible={chat.showNewChatModal}
          loadingMembers={chat.loadingMembers}
          companyMembers={chat.companyMembers}
          onClose={chat.closeNewChatModal}
          onSelectMember={chat.selectMemberForChat}
          getRoleIcon={chat.getRoleIcon}
          getRoleLabel={chat.getRoleLabel}
        />
      </View>
    );
  };

  // Render History Tab
  const renderHistoryTab = () => (
    <ScrollView
      style={styles.scrollView}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={tasks.refreshing}
          onRefresh={handleRefresh}
          colors={[COLORS.orange]}
          tintColor={COLORS.orange}
        />
      }
    >
      {history.loadingHistory ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={COLORS.orange} />
          <Text style={styles.emptySubtitle}>Ucitavanje istorije...</Text>
        </View>
      ) : history.historyItems.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📜</Text>
          <Text style={styles.emptyTitle}>Nema istorije</Text>
          <Text style={styles.emptySubtitle}>Zavrsene dostave ce se pojaviti ovde</Text>
        </View>
      ) : (
        <View style={styles.section}>
          <Text style={styles.historyCount}>Ukupno: {history.historyItems.length} dostava</Text>
          {history.historyItems.map(item => {
            const isRetroactive = history.isRetroactiveItem(item);
            return (
              <TouchableOpacity
                key={item.assignment_id || item.id}
                style={styles.historyCard}
                onPress={() => history.openHistoryDetail(item)}
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
                      {isRetroactive ? 'Obrađeno' : 'Dostavljeno'}: {history.formatHistoryDate(item.delivered_at)}
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

  // Render Map Tab
  const renderMapTab = () => {
    const assignmentsWithLocation = tasks.assignments
      .filter(a => a.latitude && a.longitude)
      .map(a => ({
        ...a,
        latitude: parseFloat(a.latitude),
        longitude: parseFloat(a.longitude),
      }));

    return (
      <View style={{ flex: 1 }}>
        <DriverMap
          driverLocation={driverLocation}
          assignments={assignmentsWithLocation}
          maxPickupHours={maxPickupHours}
          onMarkerPress={(assignment) => {
            const fullAssignment = tasks.assignments.find(a => a.id === assignment.id);
            if (fullAssignment) {
              Alert.alert(
                fullAssignment.client_name || 'Zahtev',
                `${fullAssignment.client_address || 'Bez adrese'}\n\nTip: ${fullAssignment.waste_label || fullAssignment.waste_type}`,
                [
                  { text: 'Zatvori', style: 'cancel' },
                  {
                    text: 'Navigacija',
                    onPress: () => {
                      const url = Platform.select({
                        ios: `maps://app?daddr=${fullAssignment.latitude},${fullAssignment.longitude}`,
                        android: `google.navigation:q=${fullAssignment.latitude},${fullAssignment.longitude}`,
                      });
                      Linking.openURL(url);
                    },
                  },
                ]
              );
            }
          }}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>Zdravo,</Text>
          <Text style={styles.userName}>{user?.name || 'Vozac'}</Text>
          <Text style={styles.companyLabel}>{companyName}</Text>
        </View>
        <TouchableOpacity style={styles.settingsButton} onPress={profile.openSettings}>
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

      {/* Content */}
      {activeTab === 'tasks' && renderTasksTab()}
      {activeTab === 'map' && renderMapTab()}
      {activeTab === 'messages' && renderMessagesTab()}
      {activeTab === 'history' && renderHistoryTab()}

      {/* Modals */}
      <PickupProofModal
        visible={proof.pickupProofModal.visible}
        request={proof.pickupProofModal.request}
        proofImage={proof.proofImage}
        uploadingProof={proof.uploadingProof}
        onClose={proof.closePickupModal}
        onConfirm={handleConfirmPickup}
        onPickCamera={() => proof.pickImage(true)}
        onPickGallery={() => proof.pickImage(false)}
        onRemoveImage={() => proof.setProofImage(null)}
      />

      <DeliveryProofModal
        visible={proof.deliveryProofModal.visible}
        request={proof.deliveryProofModal.request}
        proofImage={proof.proofImage}
        driverWeight={proof.driverWeight}
        driverWeightUnit={proof.driverWeightUnit}
        uploadingProof={proof.uploadingProof}
        onClose={proof.closeDeliveryModal}
        onConfirm={handleConfirmDelivery}
        onPickCamera={() => proof.pickImage(true)}
        onPickGallery={() => proof.pickImage(false)}
        onRemoveImage={() => proof.setProofImage(null)}
        onWeightChange={proof.setDriverWeight}
        onWeightUnitChange={proof.setDriverWeightUnit}
      />

      <BulkActionModal
        visible={bulk.bulkActionModal.visible}
        type={bulk.bulkActionModal.type}
        selectedCount={bulk.selectedForBulk.size}
        proofImage={proof.proofImage}
        driverWeight={proof.driverWeight}
        driverWeightUnit={proof.driverWeightUnit}
        uploadingProof={proof.uploadingProof}
        onClose={bulk.closeBulkActionModal}
        onConfirm={bulk.bulkActionModal.type === 'pickup' ? bulk.confirmBulkPickup : bulk.confirmBulkDelivery}
        onPickCamera={() => proof.pickImage(true)}
        onPickGallery={() => proof.pickImage(false)}
        onRemoveImage={() => proof.setProofImage(null)}
        onWeightChange={proof.setDriverWeight}
        onWeightUnitChange={proof.setDriverWeightUnit}
      />

      <SettingsModal
        visible={profile.showSettings}
        user={user}
        companyName={companyName}
        language={language}
        t={t}
        onClose={profile.closeSettings}
        onEditProfile={profile.openEditProfile}
        onLogout={profile.handleLogout}
        onChangeLanguage={changeLanguage}
      />

      <EditProfileModal
        visible={profile.showEditProfile}
        editName={profile.editName}
        editCountryCode={profile.editCountryCode}
        editPhoneNumber={profile.editPhoneNumber}
        showCountryPicker={profile.showCountryPicker}
        savingProfile={profile.savingProfile}
        onClose={profile.closeEditProfile}
        onSave={profile.handleSaveProfile}
        onNameChange={profile.setEditName}
        onPhoneChange={profile.setEditPhoneNumber}
        onCountryCodeChange={profile.selectCountryCode}
        onToggleCountryPicker={profile.toggleCountryPicker}
      />

      <HistoryDetailModal
        visible={!!history.selectedHistoryItem}
        item={history.selectedHistoryItem}
        onClose={history.closeHistoryDetail}
        formatDate={history.formatHistoryDate}
        isRetroactive={history.selectedHistoryItem ? history.isRetroactiveItem(history.selectedHistoryItem) : false}
      />
    </SafeAreaView>
  );
};

export default DriverViewScreen;
