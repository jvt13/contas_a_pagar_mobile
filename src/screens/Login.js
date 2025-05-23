import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { getDados, postDados, putDados, deleteDados } from '../utils/services';
import { msgToast } from '../utils/util';

WebBrowser.maybeCompleteAuthSession();

export default function Login({ navigation }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const API_URL = Constants.expoConfig.extra.EXPO_PUBLIC_API_URL;

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

    const handleEmailLogin = async () => {
        if (!email || !password) {
            return Alert.alert('Erro', 'Preencha e-mail e senha');
        }

        setLoading(true);
        try {
            // 1) aguarda a resposta do servidor
            const response = await postDados('/auth/login', { email, password });
            console.log('response', response);

            if (response.success) {
                const { userId } = response.data;
                // Salva no storage
                await AsyncStorage.setItem('@userId', String(userId));
                // navega para Home

                Alert.alert('Sucesso', 'Login realizado com sucesso!', [
                    { text: 'OK', onPress: () => navigation.replace('Home') }
                ]);
            } else {
                Alert.alert('Login falhou', response.message || 'Verifique suas credenciais');
            }
        } catch (err) {
            // 3) captura erros de rede ou status >= 400 que lançam exceção
            console.error('Erro no login:', err);
            //Alert.alert('Erro', err.message || 'Não foi possível conectar ao servidor');
            Alert.alert('Login falhou', err.message + ' - ' + API_URL);
        } finally {
            setLoading(false);
        }
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
