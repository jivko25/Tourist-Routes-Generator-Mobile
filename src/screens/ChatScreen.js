import React, { useEffect, useRef } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTravelChat } from '../hooks/useTravelChat';
import { colors, radii, spacing } from '../theme/colors';

function openUrl(url) {
  if (!url) return;
  Linking.openURL(url).catch(() => {});
}

function ServiceBlock({ block }) {
  if (!block) return null;

  return (
    <View style={styles.serviceBlock}>
      <Text style={styles.serviceTitle}>{block.title}</Text>
      {block.message ? (
        <Text style={styles.serviceMessage}>{block.message}</Text>
      ) : null}
      {(block.cards || []).map((card) => {
        if (card.kind === 'link' && card.url) {
          return (
            <Pressable
              key={card.id}
              style={({ pressed }) => [
                styles.cardRow,
                pressed && styles.cardPressed,
              ]}
              onPress={() => openUrl(card.url)}
            >
              <View style={styles.cardCopy}>
                <View style={styles.badgeRow}>
                  <Text style={styles.badge}>GetYourGuide</Text>
                </View>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {card.title}
                </Text>
                {card.subtitle ? (
                  <Text style={styles.cardSubtitle} numberOfLines={2}>
                    {card.subtitle}
                  </Text>
                ) : null}
                <Text style={styles.cta}>View on GetYourGuide ›</Text>
              </View>
            </Pressable>
          );
        }

        return (
          <View key={card.id} style={[styles.cardRow, styles.cardMuted]}>
            <Text style={styles.cardTitle}>{card.title}</Text>
            {card.subtitle ? (
              <Text style={styles.cardSubtitle}>{card.subtitle}</Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function MessageBubble({ item }) {
  const isUser = item.role === 'user';

  if (item.kind === 'service') {
    return (
      <View style={[styles.row, styles.rowAssistant]}>
        <View style={[styles.bubble, styles.bubbleAssistant, styles.bubbleWide]}>
          <ServiceBlock block={item.block} />
        </View>
      </View>
    );
  }

  if (item.kind === 'error') {
    return (
      <View style={[styles.row, styles.rowAssistant]}>
        <View style={[styles.bubble, styles.bubbleError]}>
          <Text style={styles.errorText}>{item.text}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
      <View
        style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleAssistant,
          item.kind === 'summary' && styles.bubbleWide,
        ]}
      >
        <Text style={isUser ? styles.userText : styles.assistantText}>
          {item.text}
        </Text>
      </View>
    </View>
  );
}

/**
 * AI travel chat — parse intent via backend, orchestrate services (GYG activities live).
 */
export function ChatScreen() {
  const { messages, input, setInput, loading, sendMessage } = useTravelChat();
  const listRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      listRef.current?.scrollToEnd?.({ animated: true });
    }, 80);
    return () => clearTimeout(timer);
  }, [messages, loading]);

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']} testID="screen-chat">
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => <MessageBubble item={item} />}
          ListFooterComponent={
            loading ? (
              <View style={[styles.row, styles.rowAssistant]}>
                <View style={[styles.bubble, styles.bubbleAssistant, styles.typing]}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.typingText}>Thinking…</Text>
                </View>
              </View>
            ) : null
          }
        />

        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Describe your trip…"
            placeholderTextColor={colors.textMuted}
            editable={!loading}
            multiline
            maxLength={1200}
            onSubmitEditing={() => sendMessage()}
            blurOnSubmit={false}
          />
          <Pressable
            style={[
              styles.sendBtn,
              (!input.trim() || loading) && styles.sendBtnDisabled,
            ]}
            disabled={!input.trim() || loading}
            onPress={() => sendMessage()}
          >
            <Text style={styles.sendLabel}>Send</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  row: {
    marginBottom: spacing.sm,
    maxWidth: '100%',
  },
  rowUser: {
    alignItems: 'flex-end',
  },
  rowAssistant: {
    alignItems: 'flex-start',
  },
  bubble: {
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    maxWidth: '88%',
  },
  bubbleWide: {
    maxWidth: '100%',
    width: '100%',
  },
  bubbleUser: {
    backgroundColor: colors.primary,
  },
  bubbleAssistant: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleError: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  userText: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 21,
  },
  assistantText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  typing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  typingText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  serviceBlock: {
    gap: spacing.sm,
  },
  serviceTitle: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 16,
  },
  serviceMessage: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  cardRow: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  cardMuted: {
    opacity: 0.92,
  },
  cardPressed: {
    opacity: 0.85,
  },
  cardCopy: {
    gap: 4,
  },
  badgeRow: {
    flexDirection: 'row',
  },
  badge: {
    color: colors.accent,
    backgroundColor: colors.accentSoft,
    overflow: 'hidden',
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    fontSize: 11,
    fontWeight: '700',
  },
  cardTitle: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 15,
  },
  cardSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
  },
  cta: {
    marginTop: 4,
    color: colors.primaryDark,
    fontWeight: '700',
    fontSize: 13,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    color: colors.text,
    backgroundColor: colors.background,
    fontSize: 15,
  },
  sendBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.45,
  },
  sendLabel: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
});
