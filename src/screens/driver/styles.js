import { StyleSheet } from 'react-native';
import { COLORS } from './constants';

export const styles = StyleSheet.create({
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

export default styles;
