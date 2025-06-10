import React, { useState } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    FlatList,
    StyleSheet,
} from 'react-native';

const CustomPicker = ({
    selectedValue,
    onValueChange,
    options,
    placeholder,
    style
}) => {
    const [modalVisible, setModalVisible] = useState(false);

    // Busca o label correspondente ao selectedValue
    const selectedLabel = () => {
        const selectedOption = options.find(
            (item) => item.value === selectedValue
        );
        return selectedOption ? selectedOption.label : placeholder || "Selecione";
    };

    const handleSelect = (item) => {
        onValueChange(item.value);
        setModalVisible(false);
    };

    return (
        <View style={[styles.pickerContainer, style]}>
            <TouchableOpacity
                style={styles.touchable}
                onPress={() => setModalVisible(true)}
            >
                <Text style={styles.pickerText}>
                    {selectedLabel()}
                </Text>
            </TouchableOpacity>

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    onPress={() => setModalVisible(false)}
                    activeOpacity={1}
                >
                    <View style={styles.modalContent}>
                        <FlatList
                            data={options}
                            keyExtractor={(item, index) => index.toString()}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.optionItem}
                                    onPress={() => handleSelect(item)}
                                >
                                    <Text style={styles.optionText}>{item.label}</Text>
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};


const styles = StyleSheet.create({
    pickerContainer: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        backgroundColor: '#fff',
        justifyContent: 'center',
        height: 50, // altura padrão
    },
    touchable: {
        paddingHorizontal: 10,
        justifyContent: 'center',
        height: '100%',
    },
    pickerText: {
        color: '#000',
        textAlign: 'center',
        fontSize: 15
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    modalContent: {
        marginHorizontal: 20,
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 16,
        maxHeight: '70%',
    },
    optionItem: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    optionText: {
        fontSize: 16,
        color: '#333',
    },
});

export default CustomPicker;
