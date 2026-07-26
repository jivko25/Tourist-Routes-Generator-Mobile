import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { HomeScreen } from '../screens/HomeScreen';
import { AttractionsScreen } from '../screens/AttractionsScreen';
import { AttractionDetailScreen } from '../screens/AttractionDetailScreen';
import { RouteScreen } from '../screens/RouteScreen';
import { SavedRoutesScreen } from '../screens/SavedRoutesScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { VisitedMapScreen } from '../screens/VisitedMapScreen';
import { CityPhotosScreen } from '../screens/CityPhotosScreen';
import { PhotoExportsScreen } from '../screens/PhotoExportsScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { CurvedTabBar } from '../components/navigation/CurvedTabBar';
import { useTravel } from '../context/TravelContext';
import { colors } from '../theme/colors';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs() {
  const { t } = useTranslation();
  const { savedRoutes } = useTravel();

  return (
    <Tab.Navigator
      tabBar={(props) => <CurvedTabBar {...props} />}
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: '700',
        },
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          overflow: 'visible',
        },
        safeAreaInsets: {
          bottom: 0,
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          title: t('tabs.explore'),
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="SavedTab"
        component={SavedRoutesScreen}
        options={{
          title: t('tabs.saved'),
          headerShown: false,
          tabBarBadge: savedRoutes.length > 0 ? savedRoutes.length : undefined,
        }}
      />
      <Tab.Screen
        name="ChatTab"
        component={ChatScreen}
        options={{
          title: t('tabs.ai'),
        }}
      />
      <Tab.Screen
        name="MapTab"
        component={VisitedMapScreen}
        options={{
          title: t('tabs.map'),
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          title: t('tabs.settings'),
        }}
      />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const { t, i18n } = useTranslation();

  return (
    <NavigationContainer key={i18n.language}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.surface,
          },
          headerShadowVisible: false,
          headerTintColor: colors.text,
          headerTitleStyle: {
            fontWeight: '700',
          },
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      >
        <Stack.Screen
          name="MainTabs"
          component={MainTabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Attractions"
          component={AttractionsScreen}
          options={{ title: t('stack.attractions') }}
        />
        <Stack.Screen
          name="AttractionDetail"
          component={AttractionDetailScreen}
          options={({ route }) => ({
            title: route.params?.title || t('stack.attraction'),
          })}
        />
        <Stack.Screen
          name="CityPhotos"
          component={CityPhotosScreen}
          options={({ route }) => ({
            title: route.params?.cityName
              ? t('stack.cityPhotos', { city: route.params.cityName })
              : t('stack.photos'),
          })}
        />
        <Stack.Screen
          name="PhotoExports"
          component={PhotoExportsScreen}
          options={{ title: t('stack.photoExports') }}
        />
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ title: t('stack.login') }}
        />
        <Stack.Screen
          name="Register"
          component={RegisterScreen}
          options={{ title: t('stack.register') }}
        />
        <Stack.Screen
          name="Route"
          component={RouteScreen}
          options={{ title: t('stack.route') }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
