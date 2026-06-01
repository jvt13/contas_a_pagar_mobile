import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons'; // Modern icons
import { Animated } from 'react-native';

import { msgToast } from '../utils/util';
import { clearSession, STORAGE_KEYS } from '../utils/authSession';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function MenuHeader({ onOpenConfig }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userName, setUserName] = useState('');
  const navigation = useNavigation();

  const [fadeAnim] = useState(new Animated.Value(0));

  const toggleMenu = () => setMenuOpen(!menuOpen);
  const closeMenu = () => setMenuOpen(false);

  const handleNavigation = (screenName) => {
    closeMenu();
    navigation.navigate(screenName);
  };

  async function logout() {
    try {
      await clearSession();
      closeMenu();
      msgToast('Logout realizado com sucesso!');
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      console.error('Erro ao realizar logout:', error);
      msgToast('Erro ao realizar logout. Tente novamente.');
    }
  }

  const handleOpenModal = () => {
    closeMenu();
    onOpenConfig();
  };

  function getAvatarColor(firstLetter) {
    const char = firstLetter?.toUpperCase();
    if (!char) return '#333';
    const code = char.charCodeAt(0);
    if (code >= 65 && code <= 72) return '#3b5998';  // A-H azul
    if (code >= 73 && code <= 80) return '#4caf50';  // I-P verde
    if (code >= 81 && code <= 90) return '#9c27b0';  // Q-Z roxo
    return '#333';  // fallback
  }


  useEffect(() => {
    async function fetchUserName() {
      try {
        const storedUserName = await AsyncStorage.getItem(STORAGE_KEYS.username);
        setUserName(storedUserName || 'Usuário');
      } catch (error) {
        console.error('Erro ao obter nome de usuário:', error);
      }
    }
    fetchUserName();

    if (menuOpen) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [menuOpen]);


  return (
    <View style={styles.headerContainer}>
      {/* Botão do menu hamburguer */}
      <TouchableOpacity onPress={toggleMenu} style={styles.menuButton}>
        <Ionicons
          name={menuOpen ? 'close' : 'menu'}
          size={28}
          color="#fff"
        />
      </TouchableOpacity>

      {/* Avatar e nome do usuário */}
      <View style={styles.userContainer}>
        {/*<View style={[styles.avatar, { backgroundColor: getAvatarColor(userName.charAt(0)) }]}> */}
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {userName ? userName.charAt(0).toUpperCase() : 'U'}
          </Text>
        </View>
        <Text style={styles.userName}>Olá, {userName} 👋</Text>
      </View>

      {/* Menu drop-down */}
      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={closeMenu}
      >
        <Pressable style={styles.dropdownContainer} onPress={closeMenu}>
          <Animated.View style={[styles.dropdownMenu, { opacity: fadeAnim }]}>
            <MenuItem text="Home" onPress={() => handleNavigation('Home')} icon="home-outline" />
            <MenuItem text="Dashboard Cartões" onPress={() => handleNavigation('DashboardCartoes')} icon="card-outline" />
            {/*<MenuItem text="Relatório" onPress={() => handleNavigation('Home')} icon="bar-chart-outline" /> */}
            <MenuItem text="Contas Pagas" onPress={() => handleNavigation('ContasPagas')} icon="checkmark-done-outline" />
            <MenuItem text="Contas a Pagar" onPress={() => handleNavigation('ContasAPagar')} icon="time-outline" />
            <MenuItem text="Central de Controle" onPress={handleOpenModal} icon="settings-outline" />
            <MenuItem text="Sair" onPress={logout} icon="log-out-outline" />
          </Animated.View>
        </Pressable>
      </Modal>
    </View>
  );
}

// Componente auxiliar
const MenuItem = ({ text, onPress, icon }) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress}>
    <Ionicons name={icon} size={22} color="#555" style={{ marginRight: 10 }} />
    <Text style={styles.menuText}>{text}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#3b5998', // tom de azul suave
    zIndex: 10,
  },
  menuButton: {
    padding: 5,
  },
  userContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    marginRight: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff', // cor de fundo do avatar
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  avatarText: {
    color: '#3b5998',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  dropdownContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  dropdownMenu: {
    backgroundColor: '#f0f8ff', // Azul clarinho harmonizado com o header
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 128,
    marginLeft: 10,
    borderBottomEndRadius: 10,
    borderBottomStartRadius: 10,
    //borderRadius: 10,
    elevation: 5,
    width: 250,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  menuText: {
    fontSize: 16,
    color: '#333',
  },
});
