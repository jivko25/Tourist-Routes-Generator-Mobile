import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { colors, radii, spacing } from '../theme/colors';

/**
 * Wikipedia story teaser + full-text bottom sheet (ready for future TTS).
 */
export function PlaceWikipediaSection({
  story = null,
  loading = false,
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  const readMinutesLabel = useMemo(() => {
    if (!story?.estimatedReadMinutes) return null;
    return t('detail.wikiReadMinutes', {
      minutes: Math.max(1, Math.round(story.estimatedReadMinutes)),
    });
  }, [story?.estimatedReadMinutes, t]);

  if (loading && !story) {
    return (
      <View style={styles.section}>
        <View style={styles.headerRow}>
          <Text variant="titleMedium" style={styles.sectionTitleInline}>
            {t('detail.wikiTitle')}
          </Text>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
        <Text style={styles.muted}>{t('detail.wikiLoading')}</Text>
      </View>
    );
  }

  // No reliable article for this attraction — show nothing (never city Wikipedia).
  if (!story?.extract) {
    return null;
  }

  const showReadMore = story.extract.length > (story.preview?.length || 0) + 40;

  return (
    <>
      <View style={styles.section}>
        <View style={styles.headerRow}>
          <Text variant="titleMedium" style={styles.sectionTitleInline}>
            {t('detail.wikiTitle')}
          </Text>
          {readMinutesLabel ? (
            <Text style={styles.minutes}>{readMinutesLabel}</Text>
          ) : null}
        </View>

        <Text style={styles.preview}>{story.preview || story.extract}</Text>

        {showReadMore ? (
          <Pressable
            onPress={() => setOpen(true)}
            style={({ pressed }) => [
              styles.readMoreBtn,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.readMoreText}>{t('detail.wikiReadMore')}</Text>
          </Pressable>
        ) : null}

        <Text style={styles.attribution}>{t('detail.wikiAttribution')}</Text>
      </View>

      <Modal
        visible={open}
        animationType="slide"
        transparent
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
          <View
            style={[
              styles.sheet,
              { paddingBottom: Math.max(insets.bottom, spacing.md) },
            ]}
          >
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderText}>
                <Text style={styles.sheetTitle} numberOfLines={2}>
                  {story.title}
                </Text>
                {readMinutesLabel ? (
                  <Text style={styles.minutes}>{readMinutesLabel}</Text>
                ) : null}
              </View>
              <Pressable
                onPress={() => setOpen(false)}
                hitSlop={12}
                style={styles.closeBtn}
              >
                <Text style={styles.closeLabel}>✕</Text>
              </Pressable>
            </View>

            <ScrollView
              style={styles.sheetScroll}
              contentContainerStyle={styles.sheetContent}
              showsVerticalScrollIndicator
            >
              <Text style={styles.fullText}>{story.extract}</Text>
              <Text style={styles.attribution}>
                {t('detail.wikiAttribution')}
              </Text>
            </ScrollView>

            <View style={styles.sheetActions}>
              {story.url ? (
                <Button
                  mode="outlined"
                  onPress={() => Linking.openURL(story.url)}
                  textColor={colors.primaryDark}
                  style={styles.sheetAction}
                >
                  {t('detail.wikiOpen')}
                </Button>
              ) : null}
              <Button
                mode="contained"
                onPress={() => setOpen(false)}
                buttonColor={colors.primary}
                textColor="#FFFFFF"
                style={styles.sheetAction}
              >
                {t('detail.wikiClose')}
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  sectionTitleInline: {
    color: colors.text,
    fontWeight: '700',
    flex: 1,
  },
  minutes: {
    color: colors.primaryDark,
    fontWeight: '700',
    fontSize: 12,
  },
  preview: {
    color: colors.text,
    lineHeight: 24,
    fontSize: 16,
  },
  muted: {
    color: colors.textMuted,
    lineHeight: 22,
    fontSize: 15,
  },
  readMoreBtn: {
    marginTop: spacing.md,
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  readMoreText: {
    color: colors.primaryDark,
    fontWeight: '800',
    fontSize: 14,
  },
  attribution: {
    marginTop: spacing.md,
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
  },
  pressed: {
    opacity: 0.88,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },
  sheet: {
    maxHeight: '88%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  sheetHeaderText: {
    flex: 1,
  },
  sheetTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  closeLabel: {
    color: colors.textMuted,
    fontWeight: '700',
    fontSize: 16,
  },
  sheetScroll: {
    flexShrink: 1,
  },
  sheetContent: {
    paddingBottom: spacing.md,
  },
  fullText: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 26,
  },
  sheetActions: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  sheetAction: {
    borderRadius: radii.pill,
  },
});
