import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ScrollView,
  Animated,
  Keyboard,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Card, RadioButton } from "react-native-paper";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useDispatch } from "react-redux";
import { useUpdatePatientMutation } from "../../redux/api/patientApi";
import { updatePatientInList } from "../../redux/slices/patientSlice";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS } from "@/constants/Colors";



const PatientUpdateScreen = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const { patientData } = useLocalSearchParams();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  let parsedPatientData;
  try {
    parsedPatientData = patientData ? JSON.parse(patientData as string) : null;
  } catch (error) {
    Alert.alert("Error", "Invalid patient data format.");
    router.replace("/dashboard/PatientScreen");
    return null;
  }

  if (!parsedPatientData || !parsedPatientData._id) {
    Alert.alert("Error", "Invalid patient data.");
    router.replace("/dashboard/PatientScreen");
    return null;
  }

  const [updatePatient] = useUpdatePatientMutation();
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeInput, setActiveInput] = useState("");

  const [patientName, setPatientName] = useState(parsedPatientData.patientName || "");
  const [guardiansName, setGuardiansName] = useState(parsedPatientData.guardiansName || "");
  const [phoneNumber, setPhoneNumber] = useState(parsedPatientData.phonNumber || "");
  const [cnic, setCnic] = useState(parsedPatientData.cnic || "");
  const [gender, setGender] = useState(parsedPatientData.gender || "Male");
  const [dob, setDob] = useState(parsedPatientData.dob || "");
  const [city, setCity] = useState(parsedPatientData.city || "");
  const [reference, setReference] = useState(parsedPatientData.reference || "");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // Run entrance animations when component mounts
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      })
    ]).start();

    // Keyboard listeners for adjusting UI when keyboard appears/disappears
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setKeyboardVisible(false)
    );


    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const animateButton = () => {
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleDateChange = (_: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDob(selectedDate.toISOString().split("T")[0]);
    }
  };

  const handleUpdate = async () => {
    animateButton();
    
    if (!patientName || !guardiansName || !phoneNumber || !city) {
      Alert.alert("Error", "Please fill in all required fields.");
      return;
    }

    if (!/^03\d{9}$/.test(phoneNumber) && !/^\+92\d{10}$/.test(phoneNumber)) {
      Alert.alert("Error", "Invalid phone number. Format: 03XXXXXXXXX or +92XXXXXXXXXX");
      return;
    }

    const updatedData = {
      patientName,
      guardiansName,
      phonNumber: phoneNumber,
      cnic,
      gender,
      dob,
      city,
      reference,
    };

    try {
      setIsUpdating(true);
      const response = await updatePatient({ id: parsedPatientData._id, updateData: updatedData }).unwrap();

      dispatch(updatePatientInList(response.data));

      // Success animation before alert
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0.5,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        Alert.alert("Success", "Patient details updated successfully!");
        router.replace("/dashboard/PatientScreen");
      });
    } catch (error) {
      Alert.alert("Error", "Failed to update patient.");
    } finally {
      setIsUpdating(false);
    }
  };

  const getInputStyle = (inputName) => {
    return [
      styles.input,
      activeInput === inputName && styles.activeInput
    ];
  };

  return (
    <ScrollView 
      contentContainerStyle={[styles.container, keyboardVisible && styles.keyboardActive]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()}
          style={styles.backButton}
        >
        <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Update Patient</Text>
      </View>

      <Animated.View
        style={[
          styles.animatedContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <Card style={styles.card} elevation={5}>
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>
              <MaterialIcons name="person" size={16} color={COLORS.primary} /> Patient Name
              <Text style={styles.required}>*</Text>
            </Text>
            <TextInput 
              style={getInputStyle('patientName')}
              value={patientName} 
              onChangeText={setPatientName}
              onFocus={() => setActiveInput('patientName')}
              onBlur={() => setActiveInput('')}
              placeholder="Enter patient's full name"
              placeholderTextColor={COLORS.placeholder}
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>
              <MaterialIcons name="people" size={16} color={COLORS.primary} /> Guardian's Name
              <Text style={styles.required}>*</Text>
            </Text>
            <TextInput 
              style={getInputStyle('guardiansName')}
              value={guardiansName} 
              onChangeText={setGuardiansName}
              onFocus={() => setActiveInput('guardiansName')}
              onBlur={() => setActiveInput('')}
              placeholder="Enter guardian's name"
              placeholderTextColor={COLORS.placeholder}
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>
              <MaterialIcons name="phone" size={16} color={COLORS.primary} /> Phone Number
              <Text style={styles.required}>*</Text>
            </Text>
            <TextInput 
              style={getInputStyle('phoneNumber')}
              value={phoneNumber} 
              onChangeText={setPhoneNumber} 
              keyboardType="phone-pad"
              onFocus={() => setActiveInput('phoneNumber')}
              onBlur={() => setActiveInput('')}
              placeholder="03XXXXXXXXX or +92XXXXXXXXXX"
              placeholderTextColor={COLORS.placeholder}
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>
              <MaterialIcons name="credit-card" size={16} color={COLORS.primary} /> CNIC
            </Text>
            <TextInput 
              style={getInputStyle('cnic')}
              value={cnic} 
              onChangeText={setCnic} 
              keyboardType="numeric"
              onFocus={() => setActiveInput('cnic')}
              onBlur={() => setActiveInput('')}
              placeholder="Enter CNIC number"
              placeholderTextColor={COLORS.placeholder}
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>
              <MaterialIcons name="wc" size={16} color={COLORS.primary} /> Gender
            </Text>
            <View style={styles.genderContainer}>
              {["Male", "Female"].map((option) => (
                <TouchableOpacity 
                  key={option} 
                  onPress={() => setGender(option)} 
                  style={[
                    styles.genderButton,
                    gender === option && styles.selectedGender
                  ]}
                >
                  <RadioButton 
                    value={option} 
                    status={gender === option ? "checked" : "unchecked"} 
                    color={COLORS.primary} 
                  />
                  <Text style={[
                    styles.genderText,
                    gender === option && styles.selectedGenderText
                  ]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>
              <MaterialIcons name="cake" size={16} color={COLORS.primary} /> Date of Birth
            </Text>
            <TouchableOpacity 
              onPress={() => setShowDatePicker(true)}
              style={styles.datePickerButton}
            >
              <TextInput 
                style={[styles.input, styles.dateInput]} 
                value={dob} 
                editable={false}
                placeholder="Select date of birth" 
                placeholderTextColor={COLORS.placeholder}
              />
              <MaterialIcons name="calendar-today" size={20} color={COLORS.primary} style={styles.calendarIcon} />
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker 
                value={dob ? new Date(dob) : new Date()} 
                mode="date" 
                display="default" 
                onChange={handleDateChange} 
              />
            )}
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>
              <MaterialIcons name="location-city" size={16} color={COLORS.primary} /> City
              <Text style={styles.required}>*</Text>
            </Text>
            <TextInput 
              style={getInputStyle('city')}
              value={city} 
              onChangeText={setCity}
              onFocus={() => setActiveInput('city')}
              onBlur={() => setActiveInput('')}
              placeholder="Enter city name"
              placeholderTextColor={COLORS.placeholder}
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>
              <MaterialIcons name="link" size={16} color={COLORS.primary} /> Reference
            </Text>
            <TextInput 
              style={getInputStyle('reference')}
              value={reference} 
              onChangeText={setReference}
              onFocus={() => setActiveInput('reference')}
              onBlur={() => setActiveInput('')}
              placeholder="Enter reference (if any)"
              placeholderTextColor={COLORS.placeholder}
            />
          </View>

          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <TouchableOpacity 
              style={[
                styles.updateButton,
                isUpdating && styles.updatingButton
              ]} 
              onPress={handleUpdate} 
              disabled={isUpdating}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={isUpdating ? [COLORS.primaryLight, COLORS.primary] : [COLORS.primary, COLORS.secondary]}
                style={styles.gradientButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {isUpdating ? (
                  <Text style={styles.updateText}>Updating...</Text>
                ) : (
                  <View style={styles.buttonContent}>
                    <MaterialIcons name="save" size={20} color={COLORS.cardBackground} />
                    <Text style={styles.updateText}>Save Changes</Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </Card>
      </Animated.View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: COLORS.background,
  },
  keyboardActive: {
    paddingBottom: 120,
  },
  animatedContainer: {
    width: "100%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: COLORS.cardBackground,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginLeft: 15,
    color: COLORS.textPrimary,
  },
  card: {
    padding: 24,
    borderRadius: 16,
    backgroundColor: COLORS.cardBackground,
    shadowColor: COLORS.textPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginBottom: 8,
    fontWeight: "600",
    flexDirection: "row",
    alignItems: "center",
  },
  required: {
    color: COLORS.danger,
    marginLeft: 4,
  },
  input: {
    width: "100%",
    height: 50,
    borderColor: COLORS.lightGray,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: COLORS.background,
    color: COLORS.textPrimary,
  },
  activeInput: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.background,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  datePickerButton: {
    position: "relative",
  },
  dateInput: {
    paddingRight: 45,
  },
  calendarIcon: {
    position: "absolute",
    right: 15,
    top: 15,
  },
  genderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  genderButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.lightGray,
    backgroundColor: COLORS.background,
    flex: 1,
    marginHorizontal: 4,
  },
  selectedGender: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primaryLight}20`, // 20% opacity
  },
  genderText: {
    fontSize: 15,
    marginLeft: 5,
    color: COLORS.textSecondary,
  },
  selectedGenderText: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  updateButton: {
    marginTop: 10,
    borderRadius: 12,
    overflow: "hidden",
    elevation: 3,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  updatingButton: {
    opacity: 0.8,
  },
  gradientButton: {
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  updateText: {
    fontSize: 16,
    color: COLORS.cardBackground,
    fontWeight: "bold",
    marginLeft: 8,
  },
});

export default PatientUpdateScreen;