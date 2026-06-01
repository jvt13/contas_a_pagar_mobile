import React, { useMemo, useState } from 'react';
import {
  View,
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
  ActivityIndicator,
} from 'react-native';
import AppIcon from '../components/AppIcon';
import { postDados } from '../utils/services';
import { saveSession } from '../utils/authSession';
import * as util from '../utils/util';

export default function Login({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const emailNormalizado = useMemo(() => util.sanitizeEmail(email), [email]);

  const handleEmailLogin = async () => {
    if (!emailNormalizado || !password.trim()) {
      Alert.alert('Erro', 'Preencha e-mail e senha.');
      return;
    }

    setLoading(true);

    try {
      const resp = await postDados(
        '/auth/login',
        { email: emailNormalizado, password },
        { auth: false }
      );

      if (!resp?.success) {
        Alert.alert('Login falhou', resp?.message || 'Verifique suas credenciais.');
        return;
      }

      const { userId, key_share, key_share_id, username, token } = resp.data || {};

      await saveSession({
        token: token || (userId ? `session-${userId}` : null),
        userId,
        username,
        key_share,
        key_share_id,
      });

      util.msgToast('Login realizado com sucesso!');
      navigation.replace('Home');
    } catch (error) {
      console.error('Erro no login:', error);
      Alert.alert('Login falhou', util.obterMensagemErro(error, 'Não foi possível entrar agora.'));
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
          <View style={styles.heroCard}>
            <Text style={styles.badge}>OrganizeContas</Text>
            <Text style={styles.title}>Controle suas contas com mais clareza</Text>
            <Text style={styles.subtitle}>
              Acompanhe pagamentos, vencimentos e cartões em um único lugar.
            </Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Entrar</Text>

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

            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Senha"
                placeholderTextColor="#7A869A"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((prev) => !prev)}
                style={styles.eyeButton}
                disabled={loading}
              >
                <AppIcon
                  name={showPassword ? 'eyeOff' : 'eye'}
                  size={22}
                  color="#7A869A"
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.loginButton, loading && styles.buttonDisabled]}
              onPress={handleEmailLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginButtonText}>Entrar</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => navigation.navigate('Register')}
              disabled={loading}
            >
              <Text style={styles.secondaryButtonText}>Criar nova conta</Text>
            </TouchableOpacity>

            <Text style={styles.tipText}>
              Dica: o app usa a URL da API configurada em `app.config.js` via `expo-constants`.
            </Text>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EAF2FF',
  },
  inner: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  heroCard: {
    backgroundColor: '#1E4DB7',
    borderRadius: 24,
    padding: 24,
    marginBottom: 18,
    shadowColor: '#17305C',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  badge: {
    color: '#CFE0FF',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
    marginBottom: 8,
  },
  subtitle: {
    color: '#DDE8FF',
    fontSize: 15,
    lineHeight: 22,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#17305C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 6,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#16324F',
    marginBottom: 16,
  },
  input: {
    height: 50,
    borderColor: '#D7E0EF',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: '#F9FBFF',
    color: '#0D1B2A',
    marginBottom: 14,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  passwordInput: {
    flex: 1,
    marginBottom: 0,
  },
  eyeButton: {
    marginLeft: 8,
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#F3F7FF',
  },
  eyeIcon: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
  },
  loginButton: {
    backgroundColor: '#1E8E5A',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  buttonDisabled: {
    opacity: 0.75,
  },
  secondaryButton: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#C9D8F3',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: '#F8FBFF',
  },
  secondaryButtonText: {
    color: '#1E4DB7',
    fontSize: 15,
    fontWeight: '700',
  },
  tipText: {
    marginTop: 16,
    color: '#5D6F86',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
});
