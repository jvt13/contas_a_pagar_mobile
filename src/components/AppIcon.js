import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * Ícones semânticos → Ionicons (@expo/vector-icons).
 * Mesmo padrão técnico do MenuHeader (Expo Go).
 */
export const APP_ICONS = {
  close: 'close',
  menu: 'menu',
  calendar: 'calendar-outline',
  plus: 'add',
  check: 'checkmark',
  checkCircle: 'checkmark-circle-outline',
  calendarCheck: 'calendar-outline',
  inbox: 'file-tray-outline',
  edit: 'create-outline',
  delete: 'trash-outline',
  eye: 'eye-outline',
  eyeOff: 'eye-off-outline',
};

export default function AppIcon({
  name,
  size = 22,
  color = '#555',
  style,
  accessibilityLabel,
}) {
  const iconName = APP_ICONS[name] || name;

  return (
    <Ionicons
      name={iconName}
      size={size}
      color={color}
      style={style}
      accessibilityLabel={accessibilityLabel}
    />
  );
}

export function ModalCloseButton({
  onPress,
  style,
  color = '#666',
  size = 26,
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.closeButton, style]}
      accessibilityLabel="Fechar"
      hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
    >
      <AppIcon name="close" size={size} color={color} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  closeButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
