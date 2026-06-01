import React, { useMemo, useState } from 'react';
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
  Keyboard,
  View,
  ActivityIndicator,
} from 'react-native';
import { postDados } from '../utils/services';
import * as util from '../utils/util';

export default function Register({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const emailNormalizado = useMemo(() => util.sanitizeEmail(email), [email]);

  const handleRegister = async () => {
    if (!name.trim() || !emailNormalizado || !password.trim()) {
      Alert.alert('Erro', 'Preencha todos os campos.');
      return;
    }

    if (password.trim().length < 4) {
      Alert.alert('Erro', 'A senha precisa ter pelo menos 4 caracteres.');
      return;
    }

    setLoading(true);

    try {
      const userName = name.trim() || emailNormalizado.split('@')[0];
      const response = await postDados(
        '/auth/register',
        {
          name: name.trim(),
          userName,
          email: emailNormalizado,
          password,
        },
        { auth: false }
      );

      if (!response?.success) {
        Alert.alert('Cadastro falhou', response?.message || 'Tente novamente.');
        return;
      }

      util.msgToast('Conta criada com sucesso!');
      navigation.replace('Login');
    } catch (error) {
      console.error('Erro no cadastro:', error);
      Alert.alert('Erro', util.obterMensagemErro(error, 'Ocorreu um erro ao cadastrar.'));
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
          <View style={styles.card}>
            <Text style={styles.title}>Criar conta</Text>
            <Text style={styles.subtitle}>
              Cadastre seu acesso para começar a organizar vencimentos, limites e cartões.
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Nome"
              placeholderTextColor="#7A869A"
              value={name}
              onChangeText={setName}
              editable={!loading}
            />

            <TextInput
              style={styles.input}
              placeholder="E-mail"
              placeholderTextColor="#7A869A"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
              editable={!loading}
            />

            <TextInput
              style={styles.input}
              placeholder="Senha"
              placeholderTextColor="#7A869A"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              editable={!loading}
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Cadastrar</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.goBack()} disabled={loading}>
              <Text style={styles.linkText}>Já tenho uma conta</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEF4FF',
  },
  inner: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 22,
    shadowColor: '#17305C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 6,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#16324F',
    marginBottom: 8,
  },
  subtitle: {
    color: '#5D6F86',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  input: {
    height: 50,
    borderColor: '#D7E0EF',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 14,
    backgroundColor: '#F9FBFF',
    color: '#0D1B2A',
  },
  button: {
    backgroundColor: '#1E4DB7',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 18,
    marginTop: 6,
  },
  buttonDisabled: {
    opacity: 0.75,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  linkText: {
    color: '#1E4DB7',
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '700',
  },
});
