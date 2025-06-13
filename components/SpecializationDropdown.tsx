import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
} from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants/Colors";

interface SpecializationDropdownProps {
  specializations: string[];
  selectedValue: string | null;
  onValueChange: (value: string | null) => void;
}

const SpecializationDropdown = ({ 
  specializations, 
  selectedValue, 
  onValueChange 
}: SpecializationDropdownProps) => {
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <View style={styles.dropdownContainer}>
      <TouchableOpacity 
        style={styles.dropdownButton} 
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.selectedText}>
          {selectedValue || "All Specializations"}
        </Text>
        <Ionicons name="chevron-down" size={20} color={COLORS.primary} />
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Specialization</Text>
            
            <FlatList
              data={specializations}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.optionItem,
                    selectedValue === item && styles.selectedOption
                  ]}
                  onPress={() => {
                    onValueChange(item === "All" ? null : item);
                    setModalVisible(false);
                  }}
                >
                  <Text 
                    style={[
                      styles.optionText,
                      selectedValue === item && styles.selectedOptionText
                    ]}
                  >
                    {item}
                  </Text>
                  {selectedValue === item && (
                    <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              )}
            />

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  dropdownContainer: {
    width: '100%',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    height: 40,
    borderColor: COLORS.lightGray,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: COLORS.background,
  },
  selectedText: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    maxHeight: '70%',
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 16,
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
    paddingBottom: 8,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  selectedOption: {
    backgroundColor: `${COLORS.primaryLight}20`,
  },
  optionText: {
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  selectedOptionText: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  closeButton: {
    marginTop: 16,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default SpecializationDropdown;
