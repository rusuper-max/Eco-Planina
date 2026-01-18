import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Updates from 'expo-updates';
import { AppProvider, useAppContext } from './src/context/AppContext';
import { LanguageProvider } from './src/context/LanguageContext';

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ClientViewScreen from './src/screens/ClientViewScreen';
import DriverViewScreen from './src/screens/DriverViewScreen';
import ManagerViewScreen from './src/screens/ManagerViewScreen';
import ClientsScreen from './src/screens/ClientsScreen';
import EquipmentScreen from './src/screens/EquipmentScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import AdminScreen from './src/screens/AdminScreen';
import AdminUsersScreen from './src/screens/AdminUsersScreen';
import AdminCompaniesScreen from './src/screens/AdminCompaniesScreen';
import AdminCodesScreen from './src/screens/AdminCodesScreen';

const Stack = createStackNavigator();

const RootNavigator = () => {
  const { user, isRegistered, isLoading, isAdmin } = useAppContext();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animationEnabled: true,
        }}
      >
        {isRegistered && user ? (
          // Authenticated Stack - based on role
          user.role === 'god' || user.role === 'admin' ? (
            // Admin Stack
            <>
              <Stack.Screen name="Admin" component={AdminScreen} />
              <Stack.Screen name="AdminUsers" component={AdminUsersScreen} />
              <Stack.Screen name="AdminCompanies" component={AdminCompaniesScreen} />
              <Stack.Screen name="AdminCodes" component={AdminCodesScreen} />
            </>
          ) : user.role === 'manager' ? (
            // Manager Stack
            <>
              <Stack.Screen name="ManagerView" component={ManagerViewScreen} />
              <Stack.Screen name="Clients" component={ClientsScreen} />
              <Stack.Screen name="Equipment" component={EquipmentScreen} />
              <Stack.Screen name="History" component={HistoryScreen} />
            </>
          ) : user.role === 'driver' ? (
            // Driver Stack
            <Stack.Screen name="DriverView" component={DriverViewScreen} />
          ) : (
            // Client Stack
            <Stack.Screen name="ClientView" component={ClientViewScreen} />
          )
        ) : (
          // Auth Stack
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default function App() {
  // Check for OTA updates on app start
  useEffect(() => {
    async function checkForUpdates() {
      try {
        // Skip in development mode
        if (__DEV__) return;

        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          Alert.alert(
            'Nova verzija dostupna',
            'Aplikacija ce se ponovo pokrenuti sa novom verzijom.',
            [
              {
                text: 'OK',
                onPress: async () => {
                  await Updates.reloadAsync();
                },
              },
            ]
          );
        }
      } catch (error) {
        // Silently fail - updates are not critical
        console.log('Update check failed:', error);
      }
    }
    checkForUpdates();
  }, []);

  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <AppProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </AppProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
});
