import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../../src/utils/theme';
import { apiCall } from '../../src/utils/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export default function BotScreen() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: "I'm Singularity AI, your elite crypto trading advisor powered by Claude Opus 4.5. I analyze real-time market data, apply technical indicators (RSI, MACD, Bollinger Bands), and help you make informed trading decisions.\n\nAsk me anything about:\n- Market analysis & trading signals\n- Portfolio optimization\n- Trading strategies (DCA, momentum, grid)\n- Risk management",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const data = await apiCall('/bot/chat', {
        method: 'POST',
        body: { message: userMsg.content, session_id: sessionId },
      });
      if (data.session_id) setSessionId(data.session_id);
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || 'No response',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (e: any) {
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${e.message}`,
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => (
    <Animated.View entering={FadeInUp.delay(50).springify()} style={[styles.msgRow, item.role === 'user' && styles.msgRowUser]}>
      {item.role === 'assistant' && (
        <View style={styles.botAvatar}>
          <MaterialCommunityIcons name="robot" size={18} color={COLORS.primary} />
        </View>
      )}
      <View style={[styles.msgBubble, item.role === 'user' ? styles.userBubble : styles.botBubble]}>
        <Text style={[styles.msgText, item.role === 'user' && styles.userMsgText]}>{item.content}</Text>
      </View>
    </Animated.View>
  );

  const quickPrompts = [
    "Analyze BTC now",
    "Trading signals",
    "Portfolio advice",
    "Best strategy?",
  ];

  return (
    <SafeAreaView style={styles.container} testID="bot-screen">
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <LinearGradient colors={[COLORS.primary, COLORS.cyan]} style={styles.headerAvatar}>
            <MaterialCommunityIcons name="robot" size={22} color={COLORS.primaryFg} />
          </LinearGradient>
          <View>
            <Text style={styles.headerTitle}>Singularity AI</Text>
            <Text style={styles.headerSub}>Claude Opus 4.5 Trading Bot</Text>
          </View>
        </View>
        <View style={styles.statusDot}>
          <View style={styles.statusDotInner} />
          <Text style={styles.statusText}>Live</Text>
        </View>
      </View>

      {/* Quick Prompts */}
      {messages.length <= 1 && (
        <View style={styles.quickPromptsRow}>
          {quickPrompts.map((p) => (
            <TouchableOpacity key={p} style={styles.quickPrompt} onPress={() => { setInput(p); }}>
              <Text style={styles.quickPromptText}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        showsVerticalScrollIndicator={false}
      />

      {/* Typing indicator */}
      {loading && (
        <View style={styles.typingRow}>
          <View style={styles.botAvatar}>
            <MaterialCommunityIcons name="robot" size={18} color={COLORS.primary} />
          </View>
          <View style={styles.typingBubble}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.typingText}>Analyzing markets...</Text>
          </View>
        </View>
      )}

      {/* Input */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.inputBar}>
          <TextInput
            testID="bot-input"
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask about crypto markets..."
            placeholderTextColor={COLORS.textMuted}
            multiline
            maxLength={2000}
            onSubmitEditing={sendMessage}
          />
          <TouchableOpacity testID="bot-send-btn" onPress={sendMessage} disabled={loading || !input.trim()}>
            <LinearGradient
              colors={input.trim() ? [COLORS.primary, COLORS.cyan] : [COLORS.border, COLORS.border]}
              style={styles.sendBtn}
            >
              <Ionicons name="send" size={18} color={input.trim() ? COLORS.primaryFg : COLORS.textMuted} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  headerSub: { fontSize: 12, color: COLORS.textMuted },
  statusDot: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDotInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
  statusText: { fontSize: 12, color: COLORS.primary, fontWeight: '500' },
  quickPromptsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 16 },
  quickPrompt: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.bgSubtle, borderWidth: 1, borderColor: COLORS.border },
  quickPromptText: { fontSize: 13, color: COLORS.textSecondary },
  messagesList: { padding: 16, paddingBottom: 8 },
  msgRow: { flexDirection: 'row', marginBottom: 12, gap: 8, alignItems: 'flex-start' },
  msgRowUser: { justifyContent: 'flex-end' },
  botAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,255,157,0.1)', alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  msgBubble: { maxWidth: '78%', borderRadius: 16, padding: 12 },
  botBubble: { backgroundColor: COLORS.bgSubtle, borderWidth: 1, borderColor: COLORS.border, borderTopLeftRadius: 4 },
  userBubble: { backgroundColor: 'rgba(0,255,157,0.15)', borderTopRightRadius: 4 },
  msgText: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
  userMsgText: { color: COLORS.text },
  typingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  typingBubble: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.bgSubtle, borderRadius: 16, padding: 10, borderWidth: 1, borderColor: COLORS.border },
  typingText: { fontSize: 13, color: COLORS.textMuted },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.bg },
  input: { flex: 1, backgroundColor: COLORS.bgSubtle, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 12, color: COLORS.text, fontSize: 15, maxHeight: 100, borderWidth: 1, borderColor: COLORS.border },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
