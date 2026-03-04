import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../../src/theme/constants';
import { useAuth } from '../../src/context/AuthContext';
import { getConversations, getMessagesForConv, sendMessage, createConversation, getUsers } from '../../src/services/api';

export default function MessagingScreen() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const scrollRef = useRef<ScrollView>(null);

  const loadConvs = useCallback(async () => {
    try { const r = await getConversations(); setConversations(r.data); }
    catch(e) { console.log(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadConvs(); }, [loadConvs]);

  const loadMessages = async (convId: string) => {
    setActiveConv(convId);
    try {
      const r = await getMessagesForConv(convId);
      setMessages(r.data);
      setTimeout(() => scrollRef.current?.scrollToEnd?.({ animated: true }), 100);
    } catch(e) { console.log(e); }
  };

  const handleSend = async () => {
    if (!newMsg.trim() || !activeConv) return;
    setSending(true);
    try {
      await sendMessage(activeConv, newMsg.trim());
      setNewMsg('');
      await loadMessages(activeConv);
      await loadConvs();
    } catch(e: any) { alert(e.response?.data?.detail || 'Erreur'); }
    finally { setSending(false); }
  };

  const handleNewConv = async () => {
    if (selectedUsers.length === 0) return;
    try {
      await createConversation(selectedUsers);
      setShowNew(false);
      setSelectedUsers([]);
      await loadConvs();
    } catch(e: any) { alert(e.response?.data?.detail || 'Erreur'); }
  };

  const openNewConv = async () => {
    setShowNew(true);
    try { const r = await getUsers(); setUsers(r.data); } catch(e) {}
  };

  const activeConvData = conversations.find(c => c.id === activeConv);
  const convName = (c: any) => c.name || c.participants.filter((p: any) => p.id !== user?.id).map((p: any) => p.name).join(', ') || 'Conversation';

  // Auto-refresh messages
  useEffect(() => {
    if (!activeConv) return;
    const interval = setInterval(() => loadMessages(activeConv), 5000);
    return () => clearInterval(interval);
  }, [activeConv]);

  return (
    <View style={styles.container}>
      {/* Conversation List */}
      <View style={styles.sidebar}>
        <View style={styles.sidebarHeader}>
          <Text style={styles.sidebarTitle}>Messages</Text>
          <Pressable onPress={openNewConv} style={styles.newBtn}><MaterialIcons name="add" size={20} color="#FFF" /></Pressable>
        </View>
        {showNew && (
          <View style={styles.newConvBox}>
            <Text style={styles.newLabel}>Nouvelle conversation</Text>
            <ScrollView style={{ maxHeight: 120 }}>
              {users.filter(u => u.id !== user?.id).map(u => (
                <Pressable key={u.id} style={[styles.userItem, selectedUsers.includes(u.id) && styles.userItemActive]} onPress={() => setSelectedUsers(prev => prev.includes(u.id) ? prev.filter(x => x !== u.id) : [...prev, u.id])}>
                  <MaterialIcons name={selectedUsers.includes(u.id) ? 'check-box' : 'check-box-outline-blank'} size={18} color={selectedUsers.includes(u.id) ? colors.primary : colors.textLight} />
                  <Text style={styles.userName}>{u.first_name} {u.last_name}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable style={styles.createConvBtn} onPress={handleNewConv}><Text style={styles.createConvText}>Creer</Text></Pressable>
          </View>
        )}
        <ScrollView>
          {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} /> :
            conversations.length === 0 ? <Text style={styles.emptyText}>Aucune conversation</Text> :
            conversations.map(c => (
              <Pressable key={c.id} style={[styles.convItem, activeConv === c.id && styles.convItemActive]} onPress={() => loadMessages(c.id)}>
                <View style={styles.convInfo}>
                  <Text style={styles.convName} numberOfLines={1}>{convName(c)}</Text>
                  <Text style={styles.convLast} numberOfLines={1}>{c.last_message || 'Pas de message'}</Text>
                </View>
                {c.unread > 0 && <View style={styles.unreadBadge}><Text style={styles.unreadText}>{c.unread}</Text></View>}
              </Pressable>
            ))}
        </ScrollView>
      </View>

      {/* Messages Area */}
      <View style={styles.chatArea}>
        {activeConv ? (
          <>
            <View style={styles.chatHeader}>
              <Text style={styles.chatTitle}>{activeConvData ? convName(activeConvData) : ''}</Text>
              <Text style={styles.chatSub}>{activeConvData?.participants.length || 0} participants</Text>
            </View>
            <ScrollView ref={scrollRef} style={styles.msgList} contentContainerStyle={styles.msgContent}>
              {messages.map(m => (
                <View key={m.id} style={[styles.msgBubble, m.is_mine ? styles.msgMine : styles.msgOther]}>
                  {!m.is_mine && <Text style={styles.msgSender}>{m.sender_name}</Text>}
                  <Text style={[styles.msgText, m.is_mine && styles.msgTextMine]}>{m.content}</Text>
                  <Text style={[styles.msgTime, m.is_mine && styles.msgTimeMine]}>{new Date(m.created_at).toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' })}</Text>
                </View>
              ))}
            </ScrollView>
            <View style={styles.inputRow}>
              <TextInput style={styles.msgInput} value={newMsg} onChangeText={setNewMsg} placeholder="Ecrire un message..." placeholderTextColor={colors.textLight} onSubmitEditing={handleSend} />
              <Pressable style={[styles.sendBtn, (!newMsg.trim() || sending) && styles.sendBtnDisabled]} onPress={handleSend} disabled={!newMsg.trim() || sending}>
                {sending ? <ActivityIndicator size="small" color="#FFF" /> : <MaterialIcons name="send" size={20} color="#FFF" />}
              </Pressable>
            </View>
          </>
        ) : (
          <View style={styles.emptyChat}><MaterialIcons name="chat" size={64} color={colors.borderLight} /><Text style={styles.emptyChatText}>Selectionnez une conversation</Text></View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', backgroundColor: colors.background },
  sidebar: { width: 320, backgroundColor: colors.surface, borderRightWidth: 1, borderRightColor: colors.border },
  sidebarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  sidebarTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  newBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  newConvBox: { padding: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: '#F0F4FF' },
  newLabel: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  userItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  userItemActive: {},
  userName: { fontSize: fontSize.sm, color: colors.text },
  createConvBtn: { backgroundColor: colors.primary, paddingVertical: 6, borderRadius: borderRadius.sm, alignItems: 'center', marginTop: spacing.xs },
  createConvText: { color: '#FFF', fontSize: fontSize.sm, fontWeight: '600' },
  emptyText: { padding: spacing.lg, textAlign: 'center', color: colors.textLight },
  convItem: { padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.borderLight, flexDirection: 'row', alignItems: 'center', ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}) },
  convItemActive: { backgroundColor: colors.primaryLight },
  convInfo: { flex: 1 },
  convName: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  convLast: { fontSize: fontSize.xs, color: colors.textLight, marginTop: 2 },
  unreadBadge: { backgroundColor: colors.primary, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  unreadText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
  chatArea: { flex: 1, backgroundColor: colors.background },
  chatHeader: { padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
  chatTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  chatSub: { fontSize: fontSize.xs, color: colors.textLight },
  msgList: { flex: 1 },
  msgContent: { padding: spacing.md, gap: spacing.sm },
  msgBubble: { maxWidth: '70%', padding: spacing.sm, borderRadius: borderRadius.md },
  msgMine: { alignSelf: 'flex-end', backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  msgOther: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 4 },
  msgSender: { fontSize: 10, fontWeight: '700', color: colors.primary, marginBottom: 2 },
  msgText: { fontSize: fontSize.sm, color: colors.text },
  msgTextMine: { color: '#FFF' },
  msgTime: { fontSize: 9, color: colors.textLight, marginTop: 4, textAlign: 'right' },
  msgTimeMine: { color: 'rgba(255,255,255,0.7)' },
  inputRow: { flexDirection: 'row', padding: spacing.sm, gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  msgInput: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: fontSize.sm, color: colors.text, backgroundColor: colors.background },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: '#94A3B8' },
  emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  emptyChatText: { fontSize: fontSize.md, color: colors.textLight },
});
