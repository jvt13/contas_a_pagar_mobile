import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Modal,
  Pressable
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function MenuHeader({ onOpenConfig }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigation = useNavigation();

  const toggleMenu = () => setMenuOpen(!menuOpen);

  const closeMenu = () => setMenuOpen(false);

  const handleNavigation = (screenName) => {
    closeMenu();
    navigation.navigate(screenName);
  };

  return (
    <View style={styles.headerContainer}>
      {/* Botão do menu hamburguer */}
      <TouchableOpacity onPress={toggleMenu} style={styles.menuButton}>
        <View style={[styles.menuBar, menuOpen && styles.bar1Open]} />
        <View style={[styles.menuBar, menuOpen && styles.bar2Open]} />
        <View style={[styles.menuBar, menuOpen && styles.bar3Open]} />
      </TouchableOpacity>

      {/* Modal para o menu */}
      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={closeMenu}
      >
        <Pressable style={styles.modalOverlay} onPress={closeMenu}>
          <View style={styles.menuContainer}>
            <MenuItem text="Home" onPress={() => handleNavigation('Home')} />
            <MenuItem text="Contas Pagas" onPress={() => handleNavigation('ContasPagas')} />
            <MenuItem text="Contas a Pagar" onPress={() => handleNavigation('ContasPagar')} />
          </View>
        </Pressable>
      </Modal>

      {/* Botão de configurações */}
      <TouchableOpacity onPress={onOpenConfig}>
        <Image
          source={require('../../assets/settings_48x48.png')}
          style={styles.settingsIcon}
        />
      </TouchableOpacity>
    </View>
  );
}

// Componente auxiliar
const MenuItem = ({ text, onPress }) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress}>
    <Text style={styles.menuText}>{text}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    zIndex: 10,
    backgroundColor: '#c0c0c0',
  },
  menuButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
  },
  menuBar: {
    width: 30,
    height: 3,
    backgroundColor: '#333',
    marginVertical: 2,
    borderRadius: 2,
  },
  bar1Open: {
    transform: [{ rotate: '45deg' }, { translateX: 6 }, { translateY: 6 }],
  },
  bar2Open: {
    opacity: 0,
  },
  bar3Open: {
    transform: [{ rotate: '-45deg' }, { translateX: 5 }, { translateY: -5 }],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  menuContainer: {
    backgroundColor: 'white',
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 90,
    marginLeft: 10,
    borderRadius: 5,
    elevation: 5,
    width: 250
  },
  menuItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuText: {
    fontSize: 16,
    color: '#333',
  },
  settingsIcon: {
    width: 24,
    height: 24,
  },
});
