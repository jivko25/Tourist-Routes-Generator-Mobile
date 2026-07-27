import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Linking,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import {
  ActivityIndicator,
  Button,
  IconButton,
  Text,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import {
  deletePhotoExport,
  listPhotoExports,
} from '../api/photoExportsApi';
import { useAuth } from '../context/AuthContext';
import { colors, radii, spacing } from '../theme/colors';

function formatBytes(bytes) {
  if (bytes == null || !Number.isFinite(Number(bytes))) return null;
  const n = Number(bytes);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso, language) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString(language === 'bg' ? 'bg-BG' : 'en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return String(iso);
  }
}

export function PhotoExportsScreen({ navigation }) {
  const { t, i18n } = useTranslation();
  const {
    isReady,
    isSignedIn,
  } = useAuth();

  const [exportsList, setExportsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);

  const loadExports = useCallback(
    async ({ soft = false } = {}) => {
      if (!isSignedIn) {
        setExportsList([]);
        return;
      }
      if (soft) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const rows = await listPhotoExports();
        setExportsList(rows);
      } catch (err) {
        setError(err?.message || t('exports.loadError'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isSignedIn, t]
  );

  useFocusEffect(
    useCallback(() => {
      if (!isReady) return undefined;
      loadExports();
      return undefined;
    }, [isReady, loadExports])
  );

  const handleSignIn = () => {
    navigation.navigate('Login');
  };

  const openDrive = async (item) => {
    const url = item?.web_view_link;
    if (!url) return;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(t('exports.openFailed'));
    }
  };

  const handleDelete = (item) => {
    Alert.alert(t('exports.removeTitle'), t('exports.removeBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('exports.remove'),
        style: 'destructive',
        onPress: async () => {
          setBusyId(item.id);
          try {
            await deletePhotoExport(item.id);
            setExportsList((prev) => prev.filter((row) => row.id !== item.id));
          } catch (err) {
            Alert.alert(
              t('exports.removeFailed'),
              err?.message || t('auth.tryAgain')
            );
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  if (!isReady) {
    return (
      <SafeAreaView
        style={styles.safe}
        edges={['left', 'right', 'bottom']}
        testID="screen-photo-exports"
      >
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!isSignedIn) {
    return (
      <SafeAreaView
        style={styles.safe}
        edges={['left', 'right', 'bottom']}
        testID="screen-photo-exports"
      >
        <View style={styles.centeredPad}>
          <Text style={styles.emptyTitle}>{t('exports.signInTitle')}</Text>
          <Text style={styles.emptyBody}>{t('exports.signInBody')}</Text>
          <Button
            mode="contained"
            icon="login"
            onPress={handleSignIn}
            buttonColor={colors.primary}
            textColor="#FFFFFF"
            style={styles.primaryBtn}
          >
            {t('auth.signIn')}
          </Button>
          <Button
            mode="outlined"
            onPress={() => navigation.navigate('Register')}
            textColor={colors.primary}
          >
            {t('auth.createAccount')}
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.safe}
      edges={['left', 'right', 'bottom']}
      testID="screen-photo-exports"
    >
      {loading && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={exportsList}
          keyExtractor={(item) => item.id}
          contentContainerStyle={
            exportsList.length === 0 ? styles.emptyList : styles.list
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadExports({ soft: true })}
              tintColor={colors.primary}
            />
          }
          ListHeaderComponent={
            error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : (
              <Text style={styles.hint}>{t('exports.hint')}</Text>
            )
          }
          ListEmptyComponent={
            <View style={styles.centeredPad}>
              <Text style={styles.emptyTitle}>{t('exports.emptyTitle')}</Text>
              <Text style={styles.emptyBody}>{t('exports.emptyBody')}</Text>
              <Button mode="outlined" onPress={() => navigation.goBack()}>
                {t('common.back')}
              </Button>
            </View>
          }
          renderItem={({ item }) => {
            const title =
              item.scope === 'country'
                ? item.country_name || item.country_code
                : item.city_name || item.file_name;
            const subtitleParts = [
              item.scope === 'city'
                ? item.country_name || item.country_code
                : t('exports.scopeCountry'),
              item.photo_count != null
                ? t('exports.photoCount', { count: item.photo_count })
                : null,
              formatBytes(item.size_bytes),
            ].filter(Boolean);

            return (
              <View style={styles.row} testID={`photo-export-${item.id}`}>
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {title}
                  </Text>
                  <Text style={styles.rowMeta} numberOfLines={2}>
                    {subtitleParts.join(' · ')}
                  </Text>
                  <Text style={styles.rowDate}>
                    {formatDate(item.created_at, i18n.language)}
                  </Text>
                </View>
                <IconButton
                  testID={`photo-export-open-${item.id}`}
                  icon="open-in-new"
                  iconColor={colors.primary}
                  onPress={() => openDrive(item)}
                  accessibilityLabel={t('exports.openDrive')}
                />
                <IconButton
                  testID={`photo-export-delete-${item.id}`}
                  icon="delete-outline"
                  iconColor={colors.error}
                  disabled={busyId === item.id}
                  onPress={() => handleDelete(item)}
                  accessibilityLabel={t('exports.remove')}
                />
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centeredPad: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  emptyList: {
    flexGrow: 1,
  },
  list: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  hint: {
    color: colors.textMuted,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  errorText: {
    color: colors.error,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 18,
    textAlign: 'center',
  },
  emptyBody: {
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  primaryBtn: {
    borderRadius: radii.pill,
    marginTop: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingLeft: spacing.md,
    marginBottom: spacing.sm,
  },
  rowBody: {
    flex: 1,
    paddingRight: spacing.xs,
  },
  rowTitle: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 16,
  },
  rowMeta: {
    marginTop: 2,
    color: colors.textMuted,
    fontSize: 13,
  },
  rowDate: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: 12,
  },
});
