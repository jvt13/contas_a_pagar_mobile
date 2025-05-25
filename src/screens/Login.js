import React, { useState } from 'react';
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
    Keyboard
} from 'react-native';
import Constants from 'expo-constants';
import { setStorageItem, getStorageItem } from '../utils/util';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { postDados } from '../utils/services';

WebBrowser.maybeCompleteAuthSession();

export default function Login({ navigation }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [hidePassword, setHidePassword] = useState(true);


    const [request, response, promptAsync] = Google.useAuthRequest({
        expoClientId: '<YOUR_EXPO_CLIENT_ID>',
        iosClientId: '<YOUR_IOS_CLIENT_ID>',
        androidClientId: '<YOUR_ANDROID_CLIENT_ID>',
        webClientId: '<YOUR_WEB_CLIENT_ID>',
    });

    React.useEffect(() => {
        if (response?.type === 'success') {
            const { authentication } = response;
            Alert.alert('Google Sign-In Success', `Token: ${authentication.accessToken}`);
        }
    }, [response]);

    const handleEmailLogin = async () => {
        if (!email || !password) {
            return Alert.alert('Erro', 'Preencha e-mail e senha');
        }
        setLoading(true);
        try {
            const resp = await postDados('/auth/login', { email, password });
            if (resp.success) {
                //Alert.alert('chave: '+ resp.data.userId)
                await setStorageItem('@userId', String(resp.data.userId));
                await setStorageItem('@userKeyShare', String(resp.data.key_share));
                await setStorageItem('@userKeyShareId', String(resp.data.key_share_id));

                Alert.alert('Sucesso', 'Login realizado com sucesso!', [
                    { text: 'OK', onPress: () => navigation.replace('Home') }
                ]);
            } else {
                Alert.alert('Login falhou', resp.message || 'Verifique suas credenciais');
            }
        } catch (err) {
            console.error(err);
            Alert.alert('Login falhou', err.message);
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
                    <View style={styles.passwordRow}>
                        <TextInput
                            style={[styles.input, { flex: 1 }]}
                            placeholder="Senha"
                            secureTextEntry={hidePassword}
                            value={password}
                            onChangeText={setPassword}
                        />
                        <TouchableOpacity
                            onPress={() => setHidePassword(!hidePassword)}
                            style={styles.showButton}
                        >
                            <Text style={styles.showButtonText}>
                                {hidePassword ? 'Mostrar' : 'Ocultar'}
                            </Text>
                        </TouchableOpacity>
                    </View>


                    <TouchableOpacity style={styles.loginButton} onPress={handleEmailLogin}>
                        <Text style={styles.loginButtonText}>
                            {loading ? 'Entrando...' : 'Entrar'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                        <Text style={styles.registerText}>Cadastrar nova conta</Text>
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
        flexGrow: 1,              // permite centralizar ou rolar
        justifyContent: 'center', // centralizado quando não há teclado
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
    passwordRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    input: {
        height: 48,
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 4,
        paddingHorizontal: 10,
        backgroundColor: '#fff',
    },
    showButton: {
        marginLeft: 8,
        paddingHorizontal: 10,
        paddingVertical: 12,
    },
    showButtonText: {
        color: '#0066cc',
        fontWeight: 'bold',
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
