import React from 'react';
import 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler'; // Importe isso

import AppContent from './src/screens/AppContent';
import ContasPagasScreen from './src/screens/ContasPagasScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}> {/* Descomente esta linha */}
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Home">
          <Stack.Screen
            name="Home"
            component={AppContent}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ContasPagas"
            component={ContasPagasScreen}
            options={{ title: 'Contas Pagas' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView> 
  );
}