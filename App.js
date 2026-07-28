import 'react-native-gesture-handler';
import './src/i18n';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { I18nextProvider } from 'react-i18next';
import { Provider as PaperProvider, MD3LightTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import i18n from './src/i18n';
import { setAppLanguage } from './src/i18n/language';
import { AuthProvider } from './src/context/AuthContext';
import { TravelProvider, useTravel } from './src/context/TravelContext';
import { LiveTripProvider } from './src/context/LiveTripContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { colors } from './src/theme/colors';

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary,
    secondary: colors.secondary,
    background: colors.background,
    surface: colors.surface,
    error: colors.error,
  },
};

function LanguageSync({ children }) {
  const { settings, isHydrated } = useTravel();

  useEffect(() => {
    if (!isHydrated || !settings?.language) return;
    setAppLanguage(settings.language);
  }, [isHydrated, settings?.language]);

  return children;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <I18nextProvider i18n={i18n}>
        <PaperProvider theme={theme}>
          <AuthProvider>
            <TravelProvider>
              <LiveTripProvider>
                <LanguageSync>
                  <StatusBar style="dark" />
                  <AppNavigator />
                </LanguageSync>
              </LiveTripProvider>
            </TravelProvider>
          </AuthProvider>
        </PaperProvider>
      </I18nextProvider>
    </SafeAreaProvider>
  );
}
