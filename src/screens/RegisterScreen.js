import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Button, HelperText, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { colors, radii, spacing } from '../theme/colors';

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

export function RegisterScreen({ navigation }) {
  const { t } = useTranslation();
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const emailError = email.length > 0 && !isValidEmail(email);
  const passwordShort = password.length > 0 && password.length < 6;
  const passwordMismatch = confirm.length > 0 && password !== confirm;
  const canSubmit =
    isValidEmail(email) &&
    password.length >= 6 &&
    password === confirm &&
    !busy;

  const handleSubmit = async () => {
    setError(null);
    setBusy(true);
    try {
      await signUp(email, password, fullName);
      navigation.goBack();
    } catch (err) {
      setError(err?.message || t('auth.tryAgain'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']} testID="screen-register">
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text variant="headlineSmall" style={styles.title} testID="register-title">
            {t('auth.registerTitle')}
          </Text>
          <Text style={styles.subtitle}>{t('auth.registerSubtitle')}</Text>

          <TextInput
            testID="register-fullname"
            mode="outlined"
            label={t('auth.fullName')}
            value={fullName}
            onChangeText={setFullName}
            autoComplete="name"
            textContentType="name"
            outlineColor={colors.border}
            activeOutlineColor={colors.primary}
            style={styles.input}
          />

          <TextInput
            testID="register-email"
            mode="outlined"
            label={t('auth.email')}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            outlineColor={colors.border}
            activeOutlineColor={colors.primary}
            style={styles.input}
          />
          {emailError ? (
            <HelperText type="error">{t('auth.emailInvalid')}</HelperText>
          ) : null}

          <TextInput
            mode="outlined"
            label={t('auth.password')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoComplete="new-password"
            textContentType="newPassword"
            outlineColor={colors.border}
            activeOutlineColor={colors.primary}
            style={styles.input}
            right={
              <TextInput.Icon
                icon={showPassword ? 'eye-off' : 'eye'}
                onPress={() => setShowPassword((v) => !v)}
              />
            }
          />
          {passwordShort ? (
            <HelperText type="error">{t('auth.passwordShort')}</HelperText>
          ) : (
            <HelperText type="info">{t('auth.passwordHint')}</HelperText>
          )}

          <TextInput
            mode="outlined"
            label={t('auth.confirmPassword')}
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry={!showPassword}
            autoComplete="new-password"
            textContentType="newPassword"
            outlineColor={colors.border}
            activeOutlineColor={colors.primary}
            style={styles.input}
          />
          {passwordMismatch ? (
            <HelperText type="error">{t('auth.passwordMismatch')}</HelperText>
          ) : null}

          {error ? (
            <HelperText type="error" visible>
              {error}
            </HelperText>
          ) : null}

          <Button
            testID="register-submit"
            mode="contained"
            onPress={handleSubmit}
            loading={busy}
            disabled={!canSubmit}
            buttonColor={colors.primary}
            textColor="#FFFFFF"
            style={styles.primaryBtn}
            contentStyle={styles.btnContent}
          >
            {t('auth.createAccount')}
          </Button>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>{t('auth.hasAccount')}</Text>
            <Button
              mode="text"
              onPress={() => navigation.replace('Login')}
              textColor={colors.primary}
              compact
            >
              {t('auth.signIn')}
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: { flex: 1 },
  content: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    color: colors.text,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textMuted,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  input: {
    backgroundColor: colors.surface,
  },
  primaryBtn: {
    borderRadius: radii.pill,
    marginTop: spacing.md,
  },
  btnContent: {
    paddingVertical: 4,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    flexWrap: 'wrap',
  },
  footerText: {
    color: colors.textMuted,
  },
});
