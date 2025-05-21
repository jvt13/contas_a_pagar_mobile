import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

export default function Login({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Configure Google Sign-In
  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: '<YOUR_EXPO_CLIENT_ID>',
    iosClientId: '<YOUR_IOS_CLIENT_ID>',
    androidClientId: '<YOUR_ANDROID_CLIENT_ID>',
    webClientId: '<YOUR_WEB_CLIENT_ID>',
  });

  React.useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      // TODO: exchange authentication.accessToken for app credentials
      Alert.alert('Google Sign-In Success', `Token: ${authentication.accessToken}`);
    }
  }, [response]);

  const handleEmailLogin = () => {
    // TODO: call your backend API to authenticate
    if (!email || !password) {
      Alert.alert('Erro', 'Preencha e-mail e senha');
      return;
    }
    // example placeholder
    fetch('https://api.yourapp.com/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.token) {
          // TODO: store token and navigate
          navigation.replace('Home');
        } else {
          Alert.alert('Login falhou', data.message || 'Verifique suas credenciais');
        }
      })
      .catch(err => Alert.alert('Erro', err.message));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bem-vindo ao Contas a Pagar</Text>

      <TouchableOpacity
        style={styles.googleButton}
        onPress={() => promptAsync()}
        disabled={!request}
      >
        <Text style={styles.googleButtonText}>Entrar com Google</Text>
      </TouchableOpacity>

      <Text style={styles.orText}>ou</Text>

      <TextInput
        style={styles.input}
        placeholder="E-mail"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Senha"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity style={styles.loginButton} onPress={handleEmailLogin}>
        <Text style={styles.loginButtonText}>Entrar</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={styles.registerText}>Cadastrar nova conta</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  googleButton: {
    backgroundColor: '#4285F4',
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
  },
  googleButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  orText: {
    textAlign: 'center',
    marginVertical: 15,
    color: '#555',
  },
  input: {
    height: 48,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 10,
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  loginButton: {
    backgroundColor: '#0066cc',
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
    marginBottom: 20,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  registerText: {
    color: '#0066cc',
    textAlign: 'center',
    marginTop: 10,
  },
});
