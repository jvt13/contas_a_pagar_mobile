import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import AppIcon, { ModalCloseButton } from '../AppIcon';

const OPCOES = [
  {
    key: 'limite',
    titulo: 'Gerenciar limite',
    descricao: 'Defina e acompanhe o limite de gastos do mês.',
    icon: 'stats-chart-outline',
    iconBg: '#E9F5FF',
    iconColor: '#1E4DB7',
    onPressKey: 'abrirModalLimite',
  },
  {
    key: 'cartao',
    titulo: 'Criar novo cartão',
    descricao: 'Adicione um novo cartão para organizar seus pagamentos.',
    icon: 'card-outline',
    iconBg: '#EAF9EF',
    iconColor: '#0F7B6C',
    onPressKey: 'abrirModalGerenciar',
  },
  {
    key: 'organizacao',
    titulo: 'Controle de Organização',
    descricao: 'Gerencie categorias, fornecedores e preferências do app.',
    icon: 'people-outline',
    iconBg: '#F3EEFF',
    iconColor: '#6B4FA3',
    onPressKey: 'abrirModalContrlOrga',
  },
];

function OpcaoCard({ titulo, descricao, icon, iconBg, iconColor, onPress }) {
  return (
    <TouchableOpacity style={styles.opcaoCard} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.opcaoIconWrap, { backgroundColor: iconBg }]}>
        <AppIcon name={icon} size={22} color={iconColor} />
      </View>
      <View style={styles.opcaoTexto}>
        <Text style={styles.opcaoTitulo}>{titulo}</Text>
        <Text style={styles.opcaoDescricao}>{descricao}</Text>
      </View>
      <AppIcon name="chevron-forward-outline" size={20} color="#8CA0B3" />
    </TouchableOpacity>
  );
}

export default function ModalConfig({
  visible,
  onClose,
  loadContas: _loadContas,
  abrirModalLimite,
  abrirModalGerenciar,
  abrirModalContrlOrga,
}) {
  const handlers = {
    abrirModalLimite,
    abrirModalGerenciar,
    abrirModalContrlOrga,
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modalContent}>
          <ModalCloseButton onPress={onClose} style={styles.closeButton} color="#607086" />

          <View style={styles.header}>
            <View style={styles.headerIconWrap}>
              <AppIcon name="settings-outline" size={26} color="#1E4DB7" />
            </View>
            <View style={styles.headerTexto}>
              <Text style={styles.titulo}>Central de Controle</Text>
              <Text style={styles.subtitulo}>Gerencie configurações e atalhos do app</Text>
            </View>
          </View>

          <View style={styles.divisor} />

          <View style={styles.opcoesLista}>
            {OPCOES.map((opcao) => (
              <OpcaoCard
                key={opcao.key}
                titulo={opcao.titulo}
                descricao={opcao.descricao}
                icon={opcao.icon}
                iconBg={opcao.iconBg}
                iconColor={opcao.iconColor}
                onPress={() => handlers[opcao.onPressKey]?.()}
              />
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(22, 50, 79, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#F8FAFD',
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 20,
    borderRadius: 18,
    elevation: 12,
    shadowColor: '#16324F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
  },
  closeButton: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingRight: 32,
    marginBottom: 16,
  },
  headerIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#E9F5FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  headerTexto: {
    flex: 1,
    paddingTop: 2,
  },
  titulo: {
    fontSize: 20,
    fontWeight: '800',
    color: '#16324F',
    marginBottom: 4,
  },
  subtitulo: {
    fontSize: 13,
    lineHeight: 18,
    color: '#6B7A90',
  },
  divisor: {
    height: 1,
    backgroundColor: '#D9E4F2',
    marginBottom: 16,
  },
  opcoesLista: {
    gap: 10,
  },
  opcaoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E3EBF5',
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  opcaoIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  opcaoTexto: {
    flex: 1,
    paddingRight: 8,
  },
  opcaoTitulo: {
    fontSize: 15,
    fontWeight: '700',
    color: '#16324F',
    marginBottom: 3,
  },
  opcaoDescricao: {
    fontSize: 12,
    lineHeight: 17,
    color: '#6B7A90',
  },
});
