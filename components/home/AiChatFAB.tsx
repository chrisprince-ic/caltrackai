import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppLinearGradient } from '@/components/ui/AppLinearGradient';
import { Fonts } from '@/constants/theme';
import { useAppTheme } from '@/contexts/AppThemeContext';
import { useNutritionTargets } from '@/contexts/NutritionTargetsContext';
import { sendTrainerMessage, type ChatMessage, type TrainerContext } from '@/lib/ai-chat';

const GREETING =
  "Hi! I'm your AI coach. Ask me anything about meals, macros, or your weight goal — I'm here to help.";

const SUGGESTIONS = [
  'What should I eat for breakfast?',
  'How do I hit my protein target?',
  'Best snacks under 200 kcal?',
];

export function AiChatFAB() {
  const { dailyCalories, proteinG, carbsG, fatG, weightGoal, dietarySummary } = useNutritionTargets();
  const context: TrainerContext = {
    dailyCalories,
    proteinG,
    carbsG,
    fatG,
    weightGoal: weightGoal ?? 'maintain',
    dietarySummary,
  };
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  useEffect(() => {
    if (open) scrollToBottom();
  }, [messages, loading, open, scrollToBottom]);

  const send = useCallback(
    async (overrideText?: string) => {
      const text = (overrideText ?? input).trim();
      if (!text || loading) return;
      const priorMessages = messages;
      setInput('');
      setMessages((prev) => [...prev, { role: 'user', text }]);
      setLoading(true);
      if (Platform.OS !== 'web') {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      try {
        const reply = await sendTrainerMessage(priorMessages, text, context);
        setMessages((prev) => [...prev, { role: 'model', text: reply }]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: 'model',
            text: "Sorry, I couldn't connect right now. Please check your connection and try again.",
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [input, loading, messages, context]
  );

  const openChat = useCallback(() => {
    setOpen(true);
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, []);

  const closeChat = useCallback(() => {
    setOpen(false);
  }, []);

  // Colours
  const chatBg = isDark ? colors.surface : '#FFFFFF';
  const shellBg = isDark ? colors.bg : '#F2F5F2';
  const userBg = colors.accentDeep;
  const aiBg = isDark ? colors.surfaceMuted : '#EEF3EE';
  const inputBg = isDark ? colors.surfaceMuted : '#EFF2EF';
  const borderColor = colors.glassStroke;

  // Tab bar card is ~92px tall + bottom safe area + 16px breathing room
  const fabBottom = insets.bottom + 120;

  return (
    <>
      {/* ── Floating button ── */}
      <Animated.View
        entering={ZoomIn.delay(600).duration(320).springify()}
        style={[styles.fabWrap, { bottom: fabBottom, right: 18 }]}>
        <Pressable
          onPress={openChat}
          style={({ pressed }) => [styles.fabPress, pressed && styles.fabPressed]}
          accessibilityRole="button"
          accessibilityLabel="Open AI coach">
          <AppLinearGradient
            colors={isDark ? ['#374151', '#1F2937'] : ['#111827', '#0F172A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fab}>
            <Ionicons name="sparkles" size={26} color="#fff" />
          </AppLinearGradient>
        </Pressable>
      </Animated.View>

      {/* ── Chat modal ── */}
      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeChat}>
        <View style={[styles.root, { backgroundColor: shellBg }]}>

          {/* Header */}
          <View
            style={[
              styles.header,
              { backgroundColor: chatBg, borderBottomColor: borderColor },
            ]}>
            <View style={styles.headerLeft}>
              <AppLinearGradient
                colors={isDark ? ['#374151', '#1F2937'] : ['#111827', '#0F172A']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.headerAvatar}>
                <Ionicons name="sparkles" size={15} color="#fff" />
              </AppLinearGradient>
              <View style={styles.headerTitles}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>AI Coach</Text>
                <Text style={[styles.headerSub, { color: colors.textMuted }]}>
                  Nutrition &amp; fitness assistant
                </Text>
              </View>
            </View>
            <Pressable
              onPress={closeChat}
              style={[styles.closeBtn, { backgroundColor: colors.surfaceMuted }]}
              accessibilityRole="button"
              accessibilityLabel="Close chat">
              <Ionicons name="close" size={17} color={colors.textMuted} />
            </Pressable>
          </View>

          {/* Message list */}
          <ScrollView
            ref={scrollRef}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}>

            {/* Greeting */}
            <Animated.View entering={FadeIn.duration(300)} style={styles.rowAi}>
              <View style={styles.avatarSmall}>
                <Ionicons name="sparkles" size={11} color={colors.accentDeep} />
              </View>
              <View style={[styles.bubble, styles.bubbleAi, { backgroundColor: aiBg }]}>
                <Text style={[styles.bubbleTxt, { color: colors.text }]}>{GREETING}</Text>
              </View>
            </Animated.View>

            {/* Suggestion chips (shown when no messages yet) */}
            {messages.length === 0 && (
              <Animated.View entering={FadeInDown.delay(200).duration(300)} style={styles.suggestions}>
                {SUGGESTIONS.map((s, i) => (
                  <Pressable
                    key={i}
                    onPress={() => send(s)}
                    style={({ pressed }) => [
                      styles.suggestionChip,
                      { borderColor: colors.accent, backgroundColor: isDark ? colors.surfaceMuted : '#EDFAF3' },
                      pressed && { opacity: 0.82 },
                    ]}>
                    <Text style={[styles.suggestionTxt, { color: colors.accentDeep }]}>{s}</Text>
                  </Pressable>
                ))}
              </Animated.View>
            )}

            {/* Conversation */}
            {messages.map((m, i) =>
              m.role === 'user' ? (
                <Animated.View key={i} entering={FadeIn.duration(200)} style={styles.rowUser}>
                  <View style={[styles.bubble, styles.bubbleUser, { backgroundColor: userBg }]}>
                    <Text style={[styles.bubbleTxt, styles.bubbleTxtUser]}>{m.text}</Text>
                  </View>
                </Animated.View>
              ) : (
                <Animated.View key={i} entering={FadeIn.duration(240)} style={styles.rowAi}>
                  <View style={styles.avatarSmall}>
                    <Ionicons name="sparkles" size={11} color={colors.accentDeep} />
                  </View>
                  <View style={[styles.bubble, styles.bubbleAi, { backgroundColor: aiBg }]}>
                    <Text style={[styles.bubbleTxt, { color: colors.text }]}>{m.text}</Text>
                  </View>
                </Animated.View>
              )
            )}

            {/* Typing indicator */}
            {loading && (
              <Animated.View entering={FadeIn.duration(180)} style={styles.rowAi}>
                <View style={styles.avatarSmall}>
                  <Ionicons name="sparkles" size={11} color={colors.accentDeep} />
                </View>
                <View style={[styles.bubble, styles.bubbleAi, styles.typingBubble, { backgroundColor: aiBg }]}>
                  <ActivityIndicator size="small" color={colors.accent} />
                </View>
              </Animated.View>
            )}
          </ScrollView>

          {/* Input bar */}
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View
              style={[
                styles.inputBar,
                {
                  backgroundColor: chatBg,
                  borderTopColor: borderColor,
                  paddingBottom: Math.max(insets.bottom, 12),
                },
              ]}>
              <TextInput
                style={[styles.input, { color: colors.text, backgroundColor: inputBg }]}
                placeholder="Ask about meals, macros, your goal…"
                placeholderTextColor={colors.textMuted}
                value={input}
                onChangeText={setInput}
                onSubmitEditing={() => send()}
                returnKeyType="send"
                multiline
                maxLength={500}
              />
              <Pressable
                onPress={() => send()}
                disabled={!input.trim() || loading}
                style={({ pressed }) => [
                  styles.sendBtn,
                  {
                    backgroundColor:
                      input.trim() && !loading ? colors.accentDeep : colors.hairline,
                  },
                  pressed && { opacity: 0.82 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Send message">
                <Ionicons
                  name="arrow-up"
                  size={17}
                  color={input.trim() && !loading ? '#fff' : colors.textMuted}
                />
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // FAB
  fabWrap: {
    position: 'absolute',
    zIndex: 999,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.28,
        shadowRadius: 20,
      },
      default: { elevation: 30 },
    }),
  },
  fabPress: { borderRadius: 32 },
  fabPressed: { transform: [{ scale: 0.93 }] },
  fab: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },

  // Modal root
  root: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitles: { gap: 1 },
  headerTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    letterSpacing: -0.2,
  },
  headerSub: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    letterSpacing: 0.1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Message list
  list: { flex: 1 },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 10,
  },

  // Message rows
  rowAi: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    alignSelf: 'flex-start',
    maxWidth: '85%',
  },
  rowUser: {
    alignSelf: 'flex-end',
    maxWidth: '82%',
  },

  // Avatar
  avatarSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E8F5EE',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginBottom: 2,
  },

  // Bubbles
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleAi: {
    borderBottomLeftRadius: 6,
    flex: 1,
  },
  bubbleUser: {
    borderBottomRightRadius: 6,
  },
  typingBubble: {
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  bubbleTxt: {
    fontFamily: Fonts.regular,
    fontSize: 15,
    lineHeight: 21,
    letterSpacing: 0.1,
  },
  bubbleTxtUser: {
    color: '#fff',
  },

  // Suggestions
  suggestions: {
    gap: 8,
    marginTop: 4,
    marginBottom: 6,
  },
  suggestionChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  suggestionTxt: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    letterSpacing: 0.1,
  },

  // Input
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontFamily: Fonts.regular,
    fontSize: 15,
    maxHeight: 120,
    lineHeight: 20,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
});
