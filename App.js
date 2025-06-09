import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import AppContent from './src/screens/AppContent';
import ContasPagas from './src/screens/ContasPagas';
import ContasAPagar from './src/screens/ContasAPagar';
import Login from './src/screens/Login';
import Register from './src/screens/Register';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Stack = createNativeStackNavigator();

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState('Login');

  useEffect(() => {
    async function checkUserLoggedIn() {
      try {
        // Lê o userId salvo no AsyncStorage
        const userId = await AsyncStorage.getItem('@userId');
        if (userId) {
          setInitialRoute('Home');
        } else {
          setInitialRoute('Login');
        }
      } catch (err) {
        console.error('Erro ao verificar usuário logado:', err);
        setInitialRoute('Login');
      } finally {
        setIsLoading(false);
      }
    }

    checkUserLoggedIn();
  }, []);

  // Enquanto estiver carregando, mostra um indicador de loading
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
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
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
