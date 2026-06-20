import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { clearSession, hasValidSession } from './src/utils/authSession';
import { setUnauthorizedHandler } from './src/utils/services';

import AppContent from './src/screens/AppContent';
import ContasPagas from './src/screens/ContasPagas';
import ContasAPagar from './src/screens/ContasAPagar';
import DashboardCartoes from './src/screens/DashboardCartoes';
import RelatorioCategorias from './src/screens/RelatorioCategorias';
import Login from './src/screens/Login';
import Register from './src/screens/Register';

const Stack = createNativeStackNavigator();

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState('Login');
  const navigationRef = React.useRef(null);

  useEffect(() => {
    setUnauthorizedHandler(async () => {
      await clearSession();
      if (navigationRef.current?.reset) {
        navigationRef.current.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      }
    });
  }, []);

  useEffect(() => {
    async function checkUserLoggedIn() {
      try {
        const loggedIn = await hasValidSession();
        setInitialRoute(loggedIn ? 'Home' : 'Login');
      } catch (error) {
        console.error('Erro ao verificar usuário logado:', error);
        setInitialRoute('Login');
      } finally {
        setIsLoading(false);
      }
    }

    checkUserLoggedIn();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E4DB7" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator initialRouteName={initialRoute}>
          <Stack.Screen
            name="Login"
            component={Login}
            options={{ title: 'Login' }}
          />
          <Stack.Screen
            name="Register"
            component={Register}
            options={{ title: 'Registrar' }}
          />
          <Stack.Screen
            name="Home"
            component={AppContent}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ContasPagas"
            component={ContasPagas}
            options={{ title: 'Contas Pagas' }}
          />
          <Stack.Screen
            name="ContasAPagar"
            component={ContasAPagar}
            options={{ title: 'Contas a Pagar' }}
          />
          <Stack.Screen
            name="DashboardCartoes"
            component={DashboardCartoes}
            options={{ title: 'Dashboard Cartões' }}
          />
          <Stack.Screen
            name="RelatorioCategorias"
            component={RelatorioCategorias}
            options={{ title: 'Relatório por Categoria' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EEF4FF',
  },
});
