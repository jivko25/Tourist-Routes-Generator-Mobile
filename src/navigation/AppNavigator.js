import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { HomeScreen } from '../screens/HomeScreen';
import { AttractionsScreen } from '../screens/AttractionsScreen';
import { AttractionDetailScreen } from '../screens/AttractionDetailScreen';
import { RouteScreen } from '../screens/RouteScreen';
import { SavedRoutesScreen } from '../screens/SavedRoutesScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { VisitedMapScreen } from '../screens/VisitedMapScreen';
import { CurvedTabBar } from '../components/navigation/CurvedTabBar';
import { useTravel } from '../context/TravelContext';
import { colors } from '../theme/colors';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs() {
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
          title: 'Explore',
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="SavedTab"
        component={SavedRoutesScreen}
        options={{
          title: 'Saved',
          headerShown: false,
          tabBarBadge: savedRoutes.length > 0 ? savedRoutes.length : undefined,
        }}
      />
      <Tab.Screen
        name="ChatTab"
        component={ChatScreen}
        options={{
          title: 'AI',
        }}
      />
      <Tab.Screen
        name="MapTab"
        component={VisitedMapScreen}
        options={{
          title: 'Map',
          headerShown: false,
        }}
      />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  return (
    <NavigationContainer>
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
          options={{ title: 'Attractions' }}
        />
        <Stack.Screen
          name="AttractionDetail"
          component={AttractionDetailScreen}
          options={({ route }) => ({
            title: route.params?.title || 'Attraction',
          })}
        />
        <Stack.Screen
          name="Route"
          component={RouteScreen}
          options={{ title: 'Your route' }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: 'Settings' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
