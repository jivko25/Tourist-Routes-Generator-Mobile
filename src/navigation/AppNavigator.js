import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/HomeScreen';
import { AttractionsScreen } from '../screens/AttractionsScreen';
import { AttractionDetailScreen } from '../screens/AttractionDetailScreen';
import { RouteScreen } from '../screens/RouteScreen';
import { colors } from '../theme/colors';

const Stack = createNativeStackNavigator();

export function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.primary,
          },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: '700',
          },
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
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
          options={{ title: 'Your Route' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
