/**
 * ChatComponents - Komponente za chat funkcionalnost
 * Ekstraktovano iz DriverViewScreen.js radi održivosti
 */
import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
  PanResponder,
} from 'react-native';
import { styles } from '../styles';
import { COLORS } from '../constants';

// Message Bubble
export const MessageBubble = ({ item, isMe, formatTime }) => (
  <View style={[styles.messageBubbleContainer, isMe && styles.messageBubbleContainerMe]}>
    <View style={[styles.messageBubble, isMe ? styles.messageBubbleMe : styles.messageBubbleOther]}>
      <Text style={[styles.messageText, isMe && styles.messageTextMe]}>{item.content}</Text>
      <Text style={[styles.messageTime, isMe && styles.messageTimeMe]}>
        {formatTime(item.created_at)}
        {isMe && (item.is_read ? ' ✓✓' : ' ✓')}
      </Text>
    </View>
  </View>
);

// Swipeable Conversation Item
export const SwipeableConversationItem = ({ conv, onPress, onDelete, getRoleIcon, getRoleLabel, formatTime, userId }) => {
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
          onDelete(conv.partnerId);
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
          onPress={onPress}
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
                  {formatTime(conv.lastMessage.created_at)}
                </Text>
              )}
            </View>
            <View style={styles.conversationPreview}>
              <Text style={styles.conversationRole}>{getRoleLabel(conv.partnerRole)}</Text>
              {conv.lastMessage && (
                <Text style={styles.conversationLastMessage} numberOfLines={1}>
                  {conv.lastMessage.sender_id === userId ? 'Ti: ' : ''}
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

// Chat View
export const ChatView = ({
  selectedChat,
  chatMessages,
  loadingChat,
  newMessage,
  sendingMessage,
  flatListRef,
  userId,
  onBack,
  onSend,
  onMessageChange,
  getRoleLabel,
  formatTime,
}) => (
  <KeyboardAvoidingView
    style={styles.chatContainer}
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    keyboardVerticalOffset={Platform.OS === 'ios' ? 120 : 0}
  >
    {/* Chat Header */}
    <View style={styles.chatHeader}>
      <TouchableOpacity
        style={styles.chatBackButton}
        onPress={onBack}
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
        renderItem={({ item }) => (
          <MessageBubble
            item={item}
            isMe={item.sender_id === userId}
            formatTime={formatTime}
          />
        )}
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
        onChangeText={onMessageChange}
        multiline
        maxLength={1000}
      />
      <TouchableOpacity
        style={[styles.sendButton, (!newMessage.trim() || sendingMessage) && styles.sendButtonDisabled]}
        onPress={onSend}
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

// New Chat Modal
export const NewChatModal = ({
  visible,
  loadingMembers,
  companyMembers,
  onClose,
  onSelectMember,
  getRoleIcon,
  getRoleLabel,
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    onRequestClose={onClose}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.newChatModal}>
        <View style={styles.newChatModalHeader}>
          <Text style={styles.newChatModalTitle}>Nova poruka</Text>
          <TouchableOpacity onPress={onClose}>
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
                onPress={() => onSelectMember(member)}
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
);

export default {
  MessageBubble,
  SwipeableConversationItem,
  ChatView,
  NewChatModal,
};
