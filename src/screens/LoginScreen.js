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

export function LoginScreen({ navigation }) {
  const { t } = useTranslation();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const emailError = email.length > 0 && !isValidEmail(email);
  const canSubmit =
    isValidEmail(email) && password.length >= 6 && !busy;

  const handleSubmit = async () => {
    setError(null);
    setBusy(true);
    try {
      await signIn(email, password);
      navigation.goBack();
    } catch (err) {
      setError(err?.message || t('auth.tryAgain'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']} testID="screen-login">
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text variant="headlineSmall" style={styles.title} testID="login-title">
            {t('auth.loginTitle')}
          </Text>
          <Text style={styles.subtitle}>{t('auth.loginSubtitle')}</Text>

          <TextInput
            testID="login-email"
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
            testID="login-password"
            mode="outlined"
            label={t('auth.password')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoComplete="password"
            textContentType="password"
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

          {error ? (
            <HelperText type="error" visible testID="login-error">
              {error}
            </HelperText>
          ) : null}

          <Button
            testID="login-submit"
            mode="contained"
            onPress={handleSubmit}
            loading={busy}
            disabled={!canSubmit}
            buttonColor={colors.primary}
            textColor="#FFFFFF"
            style={styles.primaryBtn}
            contentStyle={styles.btnContent}
          >
            {t('auth.signIn')}
          </Button>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>{t('auth.noAccount')}</Text>
            <Button
              testID="login-go-register"
              mode="text"
              onPress={() => navigation.replace('Register')}
              textColor={colors.primary}
              compact
            >
              {t('auth.createAccount')}
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
