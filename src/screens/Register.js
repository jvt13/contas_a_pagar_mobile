import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import { postDados } from '../utils/services';

export default function Register({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      return Alert.alert('Erro', 'Preencha todos os campos.');
    }
    setLoading(true);
    try {
      const userName = email.split('@')[0]; 
      const response = await postDados('/auth/register', { name, userName, email, password });
      if (response.success) {
        Alert.alert('Sucesso', 'Usuário criada com sucesso!', [
          { text: 'OK', onPress: () => navigation.replace('Login') }
        ]);
      } else {
        Alert.alert('Cadastro falhou', response.message || 'Tente novamente.');
      }
    } catch (error) {
      console.error('Erro no cadastro:', error);
      Alert.alert('Erro', error.message || 'Ocorreu um erro ao cadastrar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={styles.inner}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Cadastrar Nova Conta</Text>

          <TextInput
            style={styles.input}
            placeholder="Nome"
            value={name}
            onChangeText={setName}
          />
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

          <TouchableOpacity
            style={[styles.button, loading && { opacity: 0.6 }]}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Cadastrando...' : 'Cadastrar'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.linkText}>Já tenho uma conta</Text>
          </TouchableOpacity>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flexGrow: 1,
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
  input: {
    height: 48,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 10,
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#0066cc',
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkText: {
    color: '#0066cc',
    textAlign: 'center',
    marginTop: 10,
  },
});
