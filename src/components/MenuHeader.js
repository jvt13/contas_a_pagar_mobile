import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function MenuHeader({ onOpenConfig }) {

  const [menuOpen, setMenuOpen] = useState(false);
  const navigation = useNavigation();

  return (
    <View style={styles.container}>

      <TouchableOpacity onPress={() => setMenuOpen(!menuOpen)} style={styles.menuToggle}>
        <View style={[styles.bar, menuOpen && styles.bar1Open]} />
        <View style={[styles.bar, menuOpen && styles.bar2Open]} />
        <View style={[styles.bar, menuOpen && styles.bar3Open]} />
      </TouchableOpacity>

      {menuOpen && (
        <View style={styles.sideMenu}>
          <TouchableOpacity onPress={() => navigation.navigate('Home')}>
            <Text style={styles.menuItem}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('ContasPagas')}>
            <Text style={styles.menuItem}>Contas Pagas</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('ContasPagas')}>
            <Text style={styles.menuItem}>Contas a Pagar</Text>
          </TouchableOpacity>
        </View>
      )}


      <TouchableOpacity onPress={onOpenConfig}>
        <Image
          source={require('../../assets/settings_48x48.png')} // ícone engrenagem
          style={{ width: 24, height: 24 }}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    paddingHorizontal: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  menuToggle: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },

  bar: {
    width: 30,
    height: 3,
    backgroundColor: '#343a40',
    marginVertical: 2,
    transition: '0.4s', // (RN não aplica CSS transition, mas mantemos para clareza)
  },

  bar1Open: {
    transform: [{ rotate: '45deg' }, { translateX: 5 }, { translateY: 5 }],
  },

  bar2Open: {
    opacity: 0,
  },

  bar3Open: {
    transform: [{ rotate: '-45deg' }, { translateX: 6 }, { translateY: -6 }],
  },

  sideMenu: {
  position: 'absolute',
  top: 60,
  left: 0,
  backgroundColor: '#fff',
  width: 200,
  padding: 16,
  elevation: 5, // sombra Android
  zIndex: 999,
  borderRightWidth: 1,
  borderColor: '#ccc',
},

menuItem: {
  paddingVertical: 10,
  fontSize: 16,
  borderBottomWidth: 1,
  borderColor: '#eee',
},


});
