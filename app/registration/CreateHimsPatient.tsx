import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, Animated } from 'react-native';
import { RadioButton } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { COLORS } from '@/constants/Colors';
import AsyncStorage from "@react-native-async-storage/async-storage";
import AppBottomNavigation from '@/components/AppBottomNavigation';
import { createHimsPatient } from '../../src/himsPatientApi';

const CreateHimsPatient = () => {
  const router = useRouter();
  const [form, setForm] = useState({
    patientName: '',
    guardiansName: '',
    gender: 'Male',
    dob: '',
    phonNumber: '',
    cnic: '',
    helthId: '',
    city: '',
    reference: '',
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();
  }, []);

  // Fetch phone number from AsyncStorage on mount
  useEffect(() => {
    const fetchPhoneNumber = async () => {
      try {
        const userDataString = await AsyncStorage.getItem("persist:auth");
        if (userDataString) {
          const parsedData = JSON.parse(userDataString);
          const userData = parsedData.user ? JSON.parse(parsedData.user) : null;
          if (userData?.mobileNo) {
            setForm((prev) => ({ ...prev, phonNumber: userData.mobileNo }));
          }
        }
      } catch (error) {
        // Ignore error
      }
    };
    fetchPhoneNumber();
  }, []);

  const handleChange = (key: string, value: string) => {
    setForm({ ...form, [key]: value });
  };

  const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      handleChange('dob', date.toISOString().split('T')[0]);
    }
  };

  const validate = () => {
    if (!form.patientName.trim() || !form.guardiansName.trim() || !form.gender || !form.dob || !form.phonNumber.trim()) {
      Alert.alert('Validation Error', 'Please fill all required fields.');
      return false;
    }
    if (form.cnic && !/^\d{13}$/.test(form.cnic)) {
      Alert.alert('Validation Error', 'CNIC must be exactly 13 digits');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const payload = {
        ...form,
        extra: {},
      };
      await createHimsPatient(payload);
      setIsSubmitting(false);
      router.push('/dashboard/HimsPatientScreen')
    } catch (error: any) {
      setIsSubmitting(false);
      Alert.alert('Error', error.message || 'Failed to register patient.');
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() =>       router.push('/dashboard/HimsPatientScreen')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.cardBackground} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Register Patient</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Patient Information</Text>
          <Text style={styles.label}>
            Patient Name<Text style={styles.requiredStar}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Enter patient name"
            value={form.patientName}
            onChangeText={(v) => handleChange('patientName', v)}
            placeholderTextColor={COLORS.placeholder}
          />
          <Text style={styles.label}>
            Guardian's Name<Text style={styles.requiredStar}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Enter guardian's name"
            value={form.guardiansName}
            onChangeText={(v) => handleChange('guardiansName', v)}
            placeholderTextColor={COLORS.placeholder}
          />
          <Text style={styles.label}>
            Gender<Text style={styles.requiredStar}>*</Text>
          </Text>
          <RadioButton.Group onValueChange={(value) => handleChange('gender', value)} value={form.gender}>
            <View style={styles.radioButtonRow}>
              <View style={styles.radioButton}>
                <RadioButton value="Male" color={COLORS.primary} />
                <Text style={styles.radioLabel}>Male</Text>
              </View>
              <View style={styles.radioButton}>
                <RadioButton value="Female" color={COLORS.primary} />
                <Text style={styles.radioLabel}>Female</Text>
              </View>
            </View>
          </RadioButton.Group>
          <Text style={styles.label}>
            Date of Birth<Text style={styles.requiredStar}>*</Text>
          </Text>
          <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
            <View style={styles.datePickerButton}>
              <Text style={[styles.dateText, !form.dob && { color: COLORS.placeholder }]}>
                {form.dob || 'Select date of birth'}
              </Text>
              <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
            </View>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              mode="date"
              value={form.dob ? new Date(form.dob) : new Date()}
              display="default"
              onChange={handleDateChange}
              maximumDate={new Date()}
            />
          )}
          <Text style={styles.label}>
            Phone Number<Text style={styles.requiredStar}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, styles.readOnlyInput]}
            placeholder="e.g. 03001234567"
            value={form.phonNumber}
            keyboardType="phone-pad"
            placeholderTextColor={COLORS.placeholder}
            maxLength={15}
            editable={false}
          />
          <Text style={styles.label}>CNIC (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter CNIC"
            value={form.cnic}
            onChangeText={(v) => handleChange('cnic', v)}
            keyboardType="numeric"
            placeholderTextColor={COLORS.placeholder}
            maxLength={13}
          />
          <Text style={styles.label}>Health ID (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter Health ID"
            value={form.helthId}
            onChangeText={(v) => handleChange('helthId', v)}
            placeholderTextColor={COLORS.placeholder}
          />
          <Text style={styles.label}>
            City (optional)
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Enter city"
            value={form.city}
            onChangeText={(v) => handleChange('city', v)}
            placeholderTextColor={COLORS.placeholder}
          />
          <Text style={styles.label}>Reference (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter reference"
            value={form.reference}
            onChangeText={(v) => handleChange('reference', v)}
            placeholderTextColor={COLORS.placeholder}
          />
          <TouchableOpacity
            style={[styles.primaryButton, isSubmitting && { backgroundColor: COLORS.lightGray }]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.buttonText}>
              {isSubmitting ? 'Registering...' : 'Register Patient'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <AppBottomNavigation />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingBottom: 35, // Adjusted to avoid overlap with bottom navigation
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: '#1F75FE',
    position: 'sticky',
    top: 0,
    zIndex: 10000,
    width: '100%',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    color: COLORS.cardBackground,
    fontSize: 18,
    fontWeight: '600',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  section: {
    padding: 16,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    marginHorizontal: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: COLORS.primary,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  requiredStar: {
    color: '#FF3B30',
    marginLeft: 2,
  },
  input: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    backgroundColor: COLORS.background,
    color: COLORS.textPrimary,
    fontSize: 15,
  },
  readOnlyInput: {
    backgroundColor: COLORS.lightGray + "80",
    color: "#00000063",
  },
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  dateText: {
    color: COLORS.textPrimary,
    fontSize: 15,
  },
  radioButtonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  radioLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    padding: 16,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  modalMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  modalButtonPrimary: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  modalButtonTextPrimary: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
});

export default CreateHimsPatient;