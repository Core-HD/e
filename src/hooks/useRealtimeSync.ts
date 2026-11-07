import { useEffect } from 'react';
import {
  acknowledgeActiveChat,
  chatOpponentUserId,
  chatIdByActorId,
  chatIdByContent,
  handleChatDeleted,
  leaveChat,
  loadBlockedUsers,
  loadLatest,
  refreshChats,
} from '../services/chatSync';
import { connectNotifications, disconnectAll, sendPresence, subscribeRealtime } from '../services/websocket/realtime';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import type { ChatSocketEvent, NotificationEvent } from '../types/api';

const TYPING_VISIBLE_MS = 3500;

export function useRealtimeSync(userId: number | null, token: string | null): void {
  useEffect(() => {
    if (userId === null || !token) return;
    const typingTimers = new Map<string, number>();
    let hasConnectedBefore = false;

    const handleNotification = (event: NotificationEvent) => {
      const chatStore = useChatStore.getState();
      switch (event.type) {
        case 'new_message': {
          const knownChat = chatStore.chats.some((chat) => chat.id === event.chat_id);
          chatStore.receiveMessage(event.message, userId);
          if (!knownChat) void refreshChats();
          return;
        }
        case 'message_read':
          chatStore.recordRead(event.chat_id, event.message_id, event.user_id, event.read_at);
          return;
        case 'user_status':
          chatStore.setPresence(event.user_id, event.status);
          return;
        case 'new_chat':
          void refreshChats();
          return;
        case 'added_to_chat':
          void refreshChats();
          return;
        case 'member_added':
          if (event.user_id !== userId) {
            chatStore.addNotice(event.chat_id, `Пользователь ${event.username} добавлен в группу`);
          }
          void refreshChats();
          return;
        case 'notification': {
          const { notification } = event;
          const resolvedChatId = notification.chat_id
            ?? (notification.actor_id !== null && notification.actor_id !== userId
              ? chatIdByActorId(notification.actor_id)
              : notification.user_id !== null && notification.user_id !== userId
                ? chatIdByActorId(notification.user_id)
                : chatIdByContent(notification.content));
          if (resolvedChatId) {
            chatStore.addNotice(resolvedChatId, notification.content, {
              id: notification.id,
              unread: !notification.is_read,
              type: notification.type,
              createdAt: notification.created_at,
            });
          }
          if (notification.type === 'user_blocked') {
            const myId = useAuthStore.getState().user?.id ?? null;
            const actorId = notification.actor_id;
            if (actorId !== null && myId !== null && actorId !== myId) {
              chatStore.addBlockedByUser(actorId);
            } else if (notification.chat_id) {
              const opponentId = chatOpponentUserId(notification.chat_id);
              if (opponentId !== null) chatStore.addBlockedByUser(opponentId);
            }
          }
          if (notification.type === 'user_unblocked') {
            const actorId = notification.actor_id;
            if (actorId !== null) {
              chatStore.removeBlockedByUser(actorId);
            } else if (notification.chat_id) {
              const opponentId = chatOpponentUserId(notification.chat_id);
              if (opponentId !== null) chatStore.removeBlockedByUser(opponentId);
            }
          }
          if (
            notification.type === 'added_to_chat' ||
            notification.type === 'member_added' ||
            notification.type === 'member_left'
          ) {
            void refreshChats();
          }
          return;
        }
        case 'member_removed': {
          const name = chatStore.chats.find((chat) => chat.id === event.chat_id)?.members.find((m) => m.id === event.user_id)?.name;
          chatStore.addNotice(event.chat_id, `${name ?? 'Участник'} удалён из группы`);
          void refreshChats();
          return;
        }
        case 'removed_from_chat':
          if (chatStore.activeChatId === event.chat_id) {
            leaveChat();
            chatStore.setNotice('Вас удалили из группы');
          }
          void refreshChats();
          return;
        case 'chat_updated':
          chatStore.updateChatTitle(event.chat_id, event.title);
          return;
        case 'message_edited':
          chatStore.updateMessage(event.chat_id, event.message_id, event.content, event.edited_at);
          return;
        case 'user_blocked':
          return;
        case 'user_unblocked':
          chatStore.removeBlockedByUser(event.user_id);
          return;
        case 'message_reactions_updated':
          chatStore.setMessageReactions(event.chat_id, event.message_id, event.reactions);
          return;
        case 'message_deleted':
          chatStore.removeMessage(event.chat_id, event.message_id);
          return;
        case 'chat_deleted':
          handleChatDeleted(event.chat_id);
          return;
        case 'chat_cleared':
          chatStore.clearChatMessages(event.chat_id);
          return;
        case 'error':
          chatStore.setNotice(event.detail);
      }
    };

    const handleChatEvent = (event: ChatSocketEvent) => {
      const chatStore = useChatStore.getState();
      const activeChatId = chatStore.activeChatId;
      if (event.type === 'new_message' || event.type === 'message_read' || event.type === 'message_reactions_updated' || event.type === 'chat_cleared') {
        handleNotification(event);
        return;
      }
      if (event.type === 'member_role_changed') {
        chatStore.bumpMemberRoles(event.chat_id);
        return;
      }
      if (event.type === 'chat_description_updated') {
        chatStore.setChatDescription(event.chat_id, event.description);
        return;
      }
      if (event.type === 'error') {
        if (activeChatId) {
          const pending = chatStore.pendingByChat[activeChatId]?.find((item) => item.status === 'sending');
          if (pending) chatStore.failPending(activeChatId, pending.localId, event.detail);
        }
        chatStore.setNotice(event.detail);
        return;
      }
      const key = `${event.chat_id}:${event.user_id}`;
      chatStore.setTyping(event.chat_id, event.user_id, true);
      window.clearTimeout(typingTimers.get(key));
      typingTimers.set(
        key,
        window.setTimeout(() => {
          useChatStore.getState().setTyping(event.chat_id, event.user_id, false);
          typingTimers.delete(key);
        }, TYPING_VISIBLE_MS),
      );
    };

    const unsubscribe = subscribeRealtime({
      onNotification: handleNotification,
      onChatEvent: handleChatEvent,
      onStatus: (socket, status) => useChatStore.getState().setSocketStatus(socket, status),
      onOpen: (socket) => {
        if (socket === 'chat') {
          acknowledgeActiveChat();
          return;
        }
        if (socket !== 'notifications') return;
        sendPresence(userId, 'online');
        const activeChatId = useChatStore.getState().activeChatId;
        if (hasConnectedBefore) {
          void refreshChats();
          if (activeChatId) void loadLatest(activeChatId);
        }
        hasConnectedBefore = true;
      },
      onAuthFailed: () => {
        disconnectAll();
        useChatStore.getState().resetSession();
        useAuthStore.getState().expireSession();
      },
      onError: (detail) => useChatStore.getState().setNotice(detail),
    });

    connectNotifications(token);
    void refreshChats();
    void loadBlockedUsers();

    return () => {
      unsubscribe();
      typingTimers.forEach((timer) => window.clearTimeout(timer));
      typingTimers.clear();
      sendPresence(userId, 'offline');
      disconnectAll();
      useChatStore.getState().resetSession();
    };
  }, [userId, token]);
}
