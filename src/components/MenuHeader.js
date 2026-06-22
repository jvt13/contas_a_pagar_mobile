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
    if (typeof onOpenConfig !== 'function') {
      return;
    }
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


  const inicial = userName ? userName.charAt(0).toUpperCase() : 'U';

  return (
    <View style={styles.headerContainer}>
      <TouchableOpacity onPress={toggleMenu} style={styles.menuButton} activeOpacity={0.75}>
        <Ionicons
          name={menuOpen ? 'close' : 'menu'}
          size={22}
          color="#1E4DB7"
        />
      </TouchableOpacity>

      <View style={styles.userContainer}>
        <View style={[styles.avatar, { backgroundColor: getAvatarColor(inicial) }]}>
          <Text style={styles.avatarText}>{inicial}</Text>
        </View>
        <View style={styles.userTextWrap}>
          <Text style={styles.userGreeting}>Olá,</Text>
          <Text style={styles.userName} numberOfLines={1}>{userName}</Text>
        </View>
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
            <MenuItem text="Dashboard Financeiro" onPress={() => handleNavigation('DashboardFinanceiro')} icon="stats-chart-outline" />
            <MenuItem text="Dashboard Cartões" onPress={() => handleNavigation('DashboardCartoes')} icon="card-outline" />
            {/*<MenuItem text="Relatório" onPress={() => handleNavigation('Home')} icon="bar-chart-outline" /> */}
            <MenuItem text="Relatório por Categoria" onPress={() => handleNavigation('RelatorioCategorias')} icon="pie-chart-outline" />
            <MenuItem text="Metas Financeiras" onPress={() => handleNavigation('MetasFinanceiras')} icon="flag-outline" />
            <MenuItem text="Fechamento Mensal" onPress={() => handleNavigation('FechamentoMensal')} icon="calendar-outline" />
            <MenuItem text="Contas Pagas" onPress={() => handleNavigation('ContasPagas')} icon="checkmark-done-outline" />
            <MenuItem text="Contas a Pagar" onPress={() => handleNavigation('ContasAPagar')} icon="time-outline" />
            {typeof onOpenConfig === 'function' ? (
              <MenuItem text="Central de Controle" onPress={handleOpenModal} icon="settings-outline" />
            ) : null}
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
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E3EBF5',
    marginBottom: 10,
    elevation: 3,
    shadowColor: '#16324F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 10,
  },
  menuButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#E9F5FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },
  userTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  userGreeting: {
    fontSize: 12,
    color: '#6B7A90',
    marginBottom: 1,
  },
  userName: {
    fontSize: 15,
    color: '#16324F',
    fontWeight: '700',
  },
  dropdownContainer: {
    flex: 1,
    backgroundColor: 'rgba(22, 50, 79, 0.35)',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  dropdownMenu: {
    backgroundColor: '#F8FAFD',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 118,
    marginLeft: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E3EBF5',
    elevation: 8,
    shadowColor: '#16324F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    width: 260,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E3EBF5',
  },
  menuText: {
    fontSize: 15,
    color: '#16324F',
    fontWeight: '500',
  },
});
