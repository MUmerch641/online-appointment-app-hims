import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Animated,
  Easing,
  Keyboard,
  Modal,
} from "react-native";
import { skipToken } from "@reduxjs/toolkit/query";
import {  RadioButton, ActivityIndicator } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  useRegisterPatientMutation,
  useGetAllPatientsQuery,
  useSearchPatientByMRNQuery,
  useRegisterNewPatientMutation,
} from "../../redux/api/patientApi";
import { selectUser } from "../../redux/slices/authSlice";
import { addPatients, setPatients } from "../../redux/slices/patientSlice";
import { COLORS } from "@/constants/Colors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AppBottomNavigation from "@/components/AppBottomNavigation";

// Define types for the patient data based on the API response
interface Patient {
  _id: string;
  patientName: string;
  guardiansName: string;
  gender: "Male" | "Female";
  dob: string;
  phonNumber?: string;
  phoneNumber?: string; // Handle both variations
  cnic: string;
  healthId?: string;
  helthId?: string; // Handle both variations
  city: string;
  userId: string;
  projectId: string;
  isOnlinePt: boolean;
  mrn: number;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  isActive: boolean;
  reference?: string;
}

interface Age {
  years: number;
  months: number;
  days: number;
}

interface ApiResponse {
  isSuccess: boolean;
  data: Patient[] | Patient;
  message?: string;
}

const PatientRegistration: React.FC = () => {
  const [dob, setDob] = useState<string>("");
  const [age, setAge] = useState<Age>({ years: 0, months: 0, days: 0 });
  const [gender, setGender] = useState<"Male" | "Female">("Male");
  const [patientName, setPatientName] = useState<string>("");
  const [guardiansName, setGuardiansName] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [cnic, setCnic] = useState<string>("");
  const [healthId, setHealthId] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [reference, setReference] = useState<string>("");
  const [mrn, setMrn] = useState<string>("");
  const [searchedPatientData, setSearchedPatientData] = useState<Patient | null>(null);
  const [searchedMRN, setSearchedMRN] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [similarPatients, setSimilarPatients] = useState<Patient[]>([]);
  const [HospitalName, setHospitalName] = useState(null)

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  const searchButtonScale = useRef(new Animated.Value(1)).current;
  const submitButtonAnim = useRef(new Animated.Value(1)).current;

  const router = useRouter();
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const [registerPatient] = useRegisterPatientMutation();
  const [registerNewPatient, { isLoading: isRegisterLoading, isError: isRegisterError, error: registerError, isSuccess: isRegisterSuccess }] = useRegisterNewPatientMutation();
  const { data: allPatients, refetch } = useGetAllPatientsQuery();
  const { data: searchedPatient, error, isFetching } = useSearchPatientByMRNQuery(searchedMRN ?? skipToken);

  useEffect(() => {
    const fetchPhoneNumber = async () => {
      try {
        const userDataString = await AsyncStorage.getItem("persist:auth");
        if (userDataString) {
          const parsedData = JSON.parse(userDataString);
          const userData = parsedData.user ? JSON.parse(parsedData.user) : null;
          if (userData?.mobileNo) {
            setPhoneNumber(userData.mobileNo);
          }   
          if (userData?.hospital) {
            setHospitalName(userData.hospital.hospitalName);
          }
        }
      } catch (error) {
        console.error("Error fetching phone number from AsyncStorage:", error);
      }
    };
    fetchPhoneNumber();
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 2000, easing: Easing.linear, useNativeDriver: true })
    ).start();
  }, []);

  useEffect(() => {
    refetch();
  }, []);

  const validateField = (field: string, value: string): boolean => {
    let errorMessage = "";
    const requiredFields = ["patientName", "guardiansName", "phoneNumber", "city"];

    if (requiredFields.includes(field)) {
      if (!value || value.trim() === "") {
        errorMessage = "This field is required";
      } else if (field === "phoneNumber" && !/^(03\d{9}|\+92\d{10})$/.test(value)) {
        errorMessage = "Invalid Pakistani phone number. Format: 03XXXXXXXXX or +92XXXXXXXXXX";
      }
    }

    return errorMessage === "";
  };

  const handleDateChange = (text: string) => {
    setDob(text);
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      setAge(calculateAge(text));
    }
  };

  const calculateAge = (dobString: string): Age => {
    const dobDate = new Date(dobString);
    const today = new Date();

    let years = today.getFullYear() - dobDate.getFullYear();
    let months = today.getMonth() - dobDate.getMonth();
    let days = today.getDate() - dobDate.getDate();

    if (days < 0) {
      months -= 1;
      days += new Date(today.getFullYear(), today.getMonth(), 0).getDate();
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }

    return { years, months, days };
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const formattedDate = selectedDate.toISOString().split('T')[0];
      setDob(formattedDate);
      setAge(calculateAge(formattedDate));
    }
  };

  const showDatePickerModal = () => {
    setShowDatePicker(true);
  };

  const handleMRNSearch = () => {
    if (!mrn.trim()) {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 100, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
      ]).start();

      Alert.alert("Error", "Please enter a valid MRN.");
      return;
    }

    Animated.sequence([
      Animated.timing(searchButtonScale, { toValue: 0.9, duration: 100, useNativeDriver: true }),
      Animated.timing(searchButtonScale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();

    setSearchedMRN(mrn);
  };

  useEffect(() => {
 

    const apiData = (searchedPatient as ApiResponse)?.data;
    if (
      searchedPatient?.isSuccess &&
      Array.isArray(apiData) &&
      apiData.length > 0
    ) {
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0.7, duration: 200, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();

      setSearchedPatientData(apiData[0] as Patient);
    } else if (searchedMRN && !isFetching) {
      Alert.alert("No Patient Found", "No patient found with this MRN.");
    }
  }, [searchedPatient, isFetching]);

  useEffect(() => {
    if (searchedPatientData) {
      setPatientName(searchedPatientData.patientName || "");
      setGuardiansName(searchedPatientData.guardiansName || "");
      setGender(searchedPatientData.gender || "Male");

      const patientDob = searchedPatientData.dob || "";
      setDob(patientDob);

      if (patientDob && /^\d{4}-\d{2}-\d{2}$/.test(patientDob)) {
        const calculatedAge = calculateAge(patientDob);
        setAge(calculatedAge);
      } else if (patientDob) {
        console.log("Warning: DOB format is invalid, age not calculated", patientDob);
      }

      setPhoneNumber(searchedPatientData.phonNumber || searchedPatientData.phoneNumber || "");
      setCnic(searchedPatientData.cnic || "");
      setHealthId(searchedPatientData.helthId || searchedPatientData.healthId || "");
      setCity(searchedPatientData.city || "");
      setReference(searchedPatientData.reference || "");
      setMrn(searchedPatientData.mrn ? String(searchedPatientData.mrn) : "");
    }
  }, [searchedPatientData]);

  useEffect(() => {
    if (error) {
      Alert.alert("API Error", "Something went wrong. Please try again.");
    }
  }, [error]);

  useEffect(() => {
    if (allPatients?.data) {
      dispatch(setPatients(allPatients.data));
    }
  }, [allPatients]);

  const handleSelectPatient = (patient: Patient) => {
    setSearchedPatientData(patient);
    setShowModal(false);
    setPatientName(patient.patientName || "");
    setGuardiansName(patient.guardiansName || "");
    setGender(patient.gender || "Male");
    const patientDob = patient.dob || "";
    setDob(patientDob);
    if (patientDob && /^\d{4}-\d{2}-\d{2}$/.test(patientDob)) {
      setAge(calculateAge(patientDob));
    } else {
      setAge({ years: 0, months: 0, days: 0 });
    }
    setPhoneNumber(patient.phonNumber || patient.phoneNumber || "");
    setCnic(patient.cnic || "");
    setHealthId(patient.helthId || patient.healthId || "");
    setCity(patient.city || "");
    setReference(patient.reference || "");
    setMrn(patient.mrn ? String(patient.mrn) : "");
  };

  const handleRegisterNewPatient = async () => {
    const patientData = {
      patientName,
      guardiansName,
      gender,
      dob,
      phonNumber: phoneNumber,
      helthId: healthId,
      cnic,
      city,
      reference,
    };

    try {
      const response = await registerNewPatient(patientData).unwrap();
      if (response?.isSuccess && response?.data) {
        dispatch(addPatients(response.data));
        Alert.alert("Success", "New patient registered successfully!");
        router.push({
          pathname: "/appointments/CreateAppointmentScreen",
          params: {
            patientId: response.data._id,
            patientName: response.data.patientName,
            mrn: response.data.mrn,
          },
        });
      }
    } catch (err) {
      console.error("❌ New Patient Registration Failed:", err);
      Alert.alert("Error", "Failed to register new patient. Please try again.");
    }
  };

  const handleSubmit = async () => {
    Keyboard.dismiss();

    Animated.sequence([
      Animated.timing(submitButtonAnim, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(submitButtonAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();

    if (searchedPatientData) {
      Alert.alert("Success", "Existing patient selected. Proceeding to appointment.");
      router.push({
        pathname: "/appointments/CreateAppointmentScreen",
        params: {
          patientId: searchedPatientData._id,
          patientName: searchedPatientData.patientName,
          mrn: searchedPatientData.mrn,
        },
      });
      return;
    }

    const fieldsToValidate = [
      { name: "patientName", displayName: "Patient Name", value: patientName },
      { name: "guardiansName", displayName: "Guardian Name", value: guardiansName },
      { name: "phoneNumber", displayName: "Phone Number", value: phoneNumber },
      { name: "city", displayName: "City", value: city },
    ];

    const missingFields = fieldsToValidate
      .filter((field) => !validateField(field.name, field.value))
      .map((field) => field.displayName);

    if (missingFields.length > 0) {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 100, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
      ]).start();

      setTimeout(() => {
        Alert.alert(
          "⚠️ Required Fields Missing",
          `Please complete the following required fields:\n\n${missingFields.map((field) => `• ${field}`).join("\n")}`,
          [{ text: "OK", style: "destructive" }]
        );
      }, 100);
      return;
    }

    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (dob && !datePattern.test(dob)) {
      Alert.alert("Error", "Date of birth must be in the format YYYY-MM-DD");
      return;
    }

    const patientData = {
      patientName,
      guardiansName,
      gender,
      dob,
      phonNumber: phoneNumber,
      helthId: healthId,
      cnic,
      city,
      reference,
    };

    try {
      const response = await registerPatient(patientData).unwrap();

      if (response?.isSuccess && Array.isArray(response?.data) && response?.data?.length > 0) {
        setSimilarPatients(response.data);
        setShowModal(true);
      } else if (response?.isSuccess && response?.data) {
        dispatch(addPatients(response.data));
        Alert.alert("Success", "Patient registered successfully!");
        router.push({
          pathname: "/appointments/CreateAppointmentScreen",
          params: {
            patientId: response.data._id,
            patientName: response.data.patientName,
            mrn: response.data.mrn,
          },
        });
      } else {
        Alert.alert("Error", response?.message || "Failed to register patient.");
      }
    } catch (error: any) {
      console.error("❌ Registration Failed:", error);
      if (error?.data?.message) {
        Alert.alert("Error", error.data.message[0] || "Failed to register patient.");
      } else {
        Alert.alert("Error", "An unexpected error occurred. Please try again.");
      }
    }
  };

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

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
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.cardBackground} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Patient Registration</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Animated.View
          style={[
            styles.searchInputContainer,
            { transform: [{ translateX: shakeAnim }] },
          ]}
        >
          <Ionicons name="search" size={20} color={COLORS.primary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by MRN"
            placeholderTextColor={COLORS.placeholder}
            value={mrn}
            onChangeText={(text) => {
              if (/^\d*$/.test(text)) {
                setMrn(text);
              }
            }}
          />
          {mrn.length > 0 && (
            <TouchableOpacity onPress={() => setMrn("")} style={styles.clearButton}>
              <Ionicons name="close-circle" size={18} color={COLORS.primary} />
            </TouchableOpacity>
          )}
        </Animated.View>
        <Animated.View style={{ transform: [{ scale: searchButtonScale }] }}>
          <TouchableOpacity onPress={handleMRNSearch} style={styles.searchButton}>
            {isFetching ? (
              <Animated.View style={{ transform: [{ rotate: spin }] }}>
                <ActivityIndicator size="small" color="#fff" />
              </Animated.View>
            ) : (
              <Text style={styles.searchButtonText}>Search</Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Patient Information</Text>

          <Text style={styles.label}>
            Patient Name<Text style={styles.requiredStar}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Enter Patient Name"
            placeholderTextColor={COLORS.placeholder}
            value={patientName}
            onChangeText={setPatientName}
          />

          <Text style={styles.label}>
            Guardian Name<Text style={styles.requiredStar}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Enter Guardian Name"
            placeholderTextColor={COLORS.placeholder}
            value={guardiansName}
            onChangeText={setGuardiansName}
          />

          <Text style={styles.label}>
            Gender<Text style={styles.requiredStar}>*</Text>
          </Text>
          <View style={styles.radioGroup}>
            <RadioButton.Group onValueChange={(value: string) => setGender(value as "Male" | "Female")} value={gender}>
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
          </View>

          <Text style={styles.label}>Date of Birth</Text>
          <TouchableOpacity style={styles.input} onPress={showDatePickerModal}>
            <View style={styles.datePickerButton}>
              <Text style={[styles.dateText, !dob && { color: COLORS.placeholder }]}>
                {dob || "Select Date of Birth"}
              </Text>
              <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
            </View>
          </TouchableOpacity>

          <Text style={styles.label}>Age</Text>
          <TextInput
            style={[styles.input, styles.readOnlyInput]}
            value={`${age.years} Years, ${age.months} Months, ${age.days} Days`}
            editable={false}
          />

          <Text style={styles.label}>
            Phone Number<Text style={styles.requiredStar}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, styles.readOnlyInput]}
            placeholder="Enter Number (+923011234567)"
            placeholderTextColor={COLORS.placeholder}
            keyboardType="phone-pad"
            value={phoneNumber}
            editable={false}
          />

          <Text style={styles.label}>CNIC (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter CNIC (xxxxx-xxxxxxx-x)"
            placeholderTextColor={COLORS.placeholder}
            keyboardType="numeric"
            value={cnic}
            onChangeText={setCnic}
          />

          <Text style={styles.label}>Health ID (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter Health ID"
            placeholderTextColor={COLORS.placeholder}
            value={healthId}
            onChangeText={setHealthId}
          />

          <Text style={styles.label}>
            City<Text style={styles.requiredStar}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Enter City Name"
            placeholderTextColor={COLORS.placeholder}
            value={city}
            onChangeText={setCity}
          />

          <Text style={styles.label}>Reference (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter Reference"
            placeholderTextColor={COLORS.placeholder}
            value={reference}
            onChangeText={setReference}
          />

          <Animated.View style={{ transform: [{ scale: submitButtonAnim }] }}>
            <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit} activeOpacity={0.8}>
              <Text style={styles.buttonText}>
                {searchedPatientData ? "Continue" : "Register & Continue"}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </ScrollView>

      {showDatePicker && (
        <DateTimePicker
          value={dob ? new Date(dob) : new Date()}
          mode="date"
          display="default"
          onChange={onDateChange}
          maximumDate={new Date()}
        />
      )}

      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Patient</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalMessage}>
              The following patients with similar names are already registered at{" "}
              <Text style={styles.boldText}>{HospitalName}</Text>. If your patient is listed below, please select the correct one. If not, click the{" "}
              <Text style={styles.boldText}>‘Register New Patient’</Text> button to proceed. Thank you.
            </Text>
            <ScrollView style={styles.patientList}>
              {similarPatients.map((patient, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.patientItem}
                  onPress={() => handleSelectPatient(patient)}
                >
                  <Ionicons name="person-circle-outline" size={24} color={COLORS.primary} />
                  <View style={styles.patientInfo}>
                    <Text style={styles.patientName}>{patient.patientName}</Text>
                    <Text style={styles.patientDetails}>MRN: {patient.mrn}</Text>
                    <Text style={styles.patientDetails}>Guardian: {patient.guardiansName}</Text>
                    <Text style={styles.patientDetails}>CNIC: {patient.cnic}</Text>
                  </View>
                  <TouchableOpacity style={styles.selectButton} onPress={() => handleSelectPatient(patient)}>
                    <Text style={styles.selectButtonText}>Select</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.registerButton} onPress={handleRegisterNewPatient}>
              <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
              <Text style={styles.registerButtonText}>Register New Patient</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <AppBottomNavigation/>

    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: "#1F75FE",
    position: "sticky",
    top: 0,
    zIndex: 10000,
    width: "100%",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerTitle: {
    color: COLORS.cardBackground,
    fontSize: 18,
    fontWeight: "600",
  },
  backButton: {
    padding: 5,
  },
  searchContainer: {
    flexDirection: "row",
    paddingHorizontal: 15,
    paddingVertical: 12,
    gap: 10,
    backgroundColor: COLORS.cardBackground,
    marginBottom: 10,
    alignItems: "center",
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    marginLeft: 8,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  clearButton: {
    padding: 4,
  },
  searchButton: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  searchButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 80,
  },
  section: {
    padding: 16,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    marginHorizontal: 12,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
    color: COLORS.primary,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    color: COLORS.textSecondary,
    fontWeight: "500",
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  dateText: {
    color: COLORS.textPrimary,
    fontSize: 15,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 24,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  radioGroup: {
    marginBottom: 16,
  },
  radioButtonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  radioButton: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  radioLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  
  requiredStar: {
    color: "#FF3B30",
    marginLeft: 2,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    width: "90%",
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    padding: 16,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  modalMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  boldText: {
    fontWeight: "600",
    color: COLORS.primary,
  },
  patientList: {
    maxHeight: 300,
  },
  patientItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  patientInfo: {
    flex: 1,
    marginLeft: 12,
  },
  patientName: {
    fontSize: 16,
    fontWeight: "500",
    color: COLORS.textPrimary,
  },
  patientDetails: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  selectButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  selectButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  registerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 8,
  },
  registerButtonText: {
    fontSize: 16,
    color: COLORS.primary,
    marginLeft: 8,
    fontWeight: "500",
  },
});

export default PatientRegistration;