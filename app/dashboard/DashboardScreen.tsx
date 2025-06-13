import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Easing,
  ListRenderItemInfo,
  Platform,
  Modal,

} from "react-native";
import { WebView } from "react-native-webview";
import { useRouter } from "expo-router";
import { useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import {
  useGetAllAppointmentsQuery,
  useCancelAppointmentMutation,
} from "../../redux/api/appointmentApi";
import { selectUser } from "../../redux/slices/authSlice";
import { COLORS } from "@/constants/Colors";
import InstructionModal from "../../components/InstructionModal";
import AppointmentCard from "../../components/appointment-card";
import * as Print from "expo-print";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import axios from "axios";
import { API_BASE_URL } from "@/config/apiConfig";

// Interfaces
interface Patient {
  _id: string;
  patientName: string;
  mrn: string;
  phonNumber?: string;
  dob?: string;
  guardiansName?: string;
  gender?: string;
  healthId?: string;
}

interface Doctor {
  fullName: string;
}

interface TimeSlot {
  from: string;
  to: string;
}

interface Appointment {
  _id: string;
  patientId?: Patient;
  doctorId: string;
  doctor?: Doctor;
  appointmentDate: string;
  appointmentTime?: TimeSlot;
  timeSlotId: string;
  fee: number;
  isApmtCanceled: boolean;
  isPrescriptionCreated: boolean;
  cancel_reason?: string;
  slot: string;
  feeStatus: string;
  bookedServices?: { serviceName: string; fee: number }[];
  discount?: number;
}

interface ItemAnimation {
  fadeAnim: Animated.Value;
  translateY: Animated.Value;
}

interface User {
  fullName: string;
  token?: string;
  hospital?: {
    hospitalName: string;
    phoneNo: string;
    address?: string;
    logoUrl?: string;
  };
}

interface PrescriptionData {
  patientData?: Patient[];
  headerUrl?: string;
  footerUrl?: string;
  symptoms?: string[];
  signs?: string[];
  diagnosis?: string[];
  tests?: { testName: string; procedureName: string }[];
  medicines?: {
    name: string;
    dosage: string;
    duration: string;
    frequency?: {
      desiredNotation?: string;
      eng_notation?: string;
      urdu_notation?: string;
    };
    desiredRoute?: string;
    RA_Urdu_Term?: string;
    RA_Medical_Term?: string;
    instructions?: string;
    note?: string;
    durationDirection?: string;
  }[];
  procedure?: string;
  procedureDetails?: string;
  setOfInstruction?: { instructions: string }[];
  signature?: string;
  stamp?: string;
  appointmentDate?: string;
  visit_no?: number;
  comment?: string;
  vitals?: {
    bloodPressure?: string;
    pulse?: string;
  };
  guidance?: string;
  durationDirection?: string;
}

// Helper function to format date
const formatDate = (dateString?: string): string => {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    return date
      .toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
      .replace(/\//g, "/");
  } catch {
    return dateString;
  }
};

// Helper function to calculate age from date of birth
const calculateAge = (dob?: string): string => {
  if (!dob) return "N/A";
  try {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age.toString();
  } catch {
    return "N/A";
  }
};

// Helper function to fetch prescription data
const fetchPrescriptionData = async (
  appointmentId: string,
  userData: User | null
): Promise<PrescriptionData | null> => {
  try {
    const token = userData?.token;
    if (!token) {
      Alert.alert("Error", "Authentication token not found");
      return null;
    }

    const response = await axios.get(
      `${API_BASE_URL}/online-appointment/getPrescripByAppointmentId/${appointmentId}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );


    if (response.data.isSuccess) {
      return response.data.data;
    }
    return null;
  } catch (error) {
    console.error("Error fetching prescription:", error);
    return null;
  }
};

// Helper function to fetch QR/token data
const fetchQrData = async (id: string, userData: User | null) => {
  try {
    const token = userData?.token;
    if (!token) {
      Alert.alert("Error", "Authentication token not found");
      return null;
    }

    const response = await axios.post(
      `${API_BASE_URL}/online-appointment/generateToken/${id}`,
      {},
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.data.isSuccess) {
      return response.data.data;
    }
    throw new Error(response.data.message || "Failed to generate token");
  } catch (error) {
    console.error("Error generating token:", error);
    Alert.alert("Error", "Failed to generate token");
    return null;
  }
};

// Helper function to generate token PDF
const generateTokenPDF = async (tokenData: any): Promise<string> => {
  const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .container { max-width: 800px; margin: 0 auto; }
            h1 { color: #007bff; }
            .info { margin: 10px 0; }
            .info label { font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Appointment Token</h1>
            <div class="info"><label>Patient Name:</label> ${tokenData.patientName ?? 'N/A'}</div>
            <div class="info"><label>MRN:</label> ${tokenData.mrn ?? 'N/A'}</div>
            <div class="info"><label>Token ID:</label> ${tokenData.tokenId ?? 'N/A'}</div>
            <div class="info"><label>Date:</label> ${tokenData.appointmentDate ?? 'N/A'}</div>
            <div class="info"><label>Time:</label> ${tokenData.appointmentTime?.from ?? 'N/A'}</div>
            <div class="info"><label>Doctor:</label> ${tokenData.doctorName ?? 'N/A'}</div>
            <div class="info"><label>Hospital:</label> ${tokenData.hospitalName ?? 'N/A'}</div>
          </div>
        </body>
      </html>
    `;
  return htmlContent;
};

// Helper function to generate prescription PDF
const generatePrescriptionPDF = async (
  prescriptionData: PrescriptionData,
  user: User | null
): Promise<string> => {
  const patient: Patient = prescriptionData.patientData?.[0] ?? {
    _id: "",
    patientName: "N/A",
    mrn: "N/A",
  };

  // Function to detect if text is primarily Urdu
  const detectLanguage = (text?: string): { direction: string, textAlign: string, fontFamily: string } => {
    if (!text) return { direction: 'ltr', textAlign: 'left', fontFamily: 'Arial, sans-serif' };

    const urduRangeStart = 0x0600;
    const urduRangeEnd = 0x06FF;
    let urduCount = 0;
    let totalChars = 0;

    // Strip HTML tags for more accurate detection
    const plainText = text.replace(/<[^>]+>/g, '').trim();

    for (let char of plainText) {
      const code = char.charCodeAt(0);
      if (code >= urduRangeStart && code <= urduRangeEnd) {
        urduCount++;
      }
      totalChars++;
    }

    const urduPercentage = totalChars > 0 ? (urduCount / totalChars) * 100 : 0;
    return urduPercentage > 50
      ? { direction: 'rtl', textAlign: 'right', fontFamily: "'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', Arial, sans-serif" }
      : { direction: 'ltr', textAlign: 'left', fontFamily: 'Arial, sans-serif' };
  };

  // Detect language for instructions if they exist
  const instructionsStyle = prescriptionData.setOfInstruction?.length && prescriptionData.setOfInstruction[0]?.instructions
    ? detectLanguage(prescriptionData.setOfInstruction[0].instructions)
    : { direction: 'ltr', textAlign: 'left', fontFamily: 'Arial, sans-serif' };

  const htmlContent = ` <!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Prescription</title>
  <style>
    @page {
      size: A4;
      margin: 0;
    }
    @font-face {
      font-family: 'Jameel Noori Nastaleeq';
      src: url('https://example.com/fonts/JameelNooriNastaleeq.ttf') format('truetype'); /* Replace with actual font URL or local path */
      fallback: 'Noto Nastaliq Urdu', Arial, sans-serif;
    }
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 0;
      font-size: 12px;
      width: 210mm;
      background-color: #ffffff;
    }
    
    .page {
      width: 210mm;
      height: 297mm;
      border: 1px solid #000;
      position: relative;
      box-sizing: border-box;
      page-break-after: always;
    }
    
    .header-container {
      width: 100%;
      position: fixed;
      top: 0;
      height: 80px;
      background: #fff;
      z-index: 1000;
      border-bottom: 1px solid #000;
    }
    
    .header-image {
      width: 100%;
      height: auto;
      max-height: 80px;
      object-fit: contain;
    }
    
    .main-content {
      margin-top: 90px;
      margin-bottom: 60px;
      min-height: calc(297mm - 150px);
      display: flex;
    }
    
    .left-column {
      width: 30%;
      border-right: 1px solid #000;
      padding: 5px;
      display: flex;
      flex-direction: column;
    }
    
    .right-column {
      width: 70%;
      padding: 5px;
      display: flex;
      flex-direction: column;
    }
    
    .info-grid {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    
    .info-item {
      display: flex;
      align-items: flex-start;
      margin-bottom: 3px;
    }
    
    .info-label {
      font-weight: bold;
      width: 80px;
      color: #0000ff;
    }
    
    .info-value {
      flex: 1;
    }
    
    .section {
      margin-bottom: 8px;
    }
    
    .section-title {
      color: #0000ff;
      font-weight: bold;
      margin: 8px 0 4px 0;
      text-decoration: underline;
    }
    
    .section-content {
      margin-bottom: 0;
    }
    
    .medication-container {
      flex: 1;
    }
    
    .medication-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 5px;
    }
    
    .medication-table th, .medication-table td {
      border: 1px solid #ccc;
      padding: 5px;
      text-align: left;
      vertical-align: top;
      font-size: 12px;
      word-wrap: break-word;
    }
    
    .medication-table th {
      background-color: #f0f0f0;
      font-weight: bold;
      color: #0000ff;
    }
    
    .medication-table td {
      background-color: #fff;
    }
    
    .medication-name {
      font-weight: bold;
    }
    
    .footer-container {
      position: fixed;
      bottom: 0;
      width: 100%;
      text-align: center;
      padding: 5px;
      font-size: 10px;
      border-top: 1px solid #000;
      height: 50px;
      background: #fff;
      z-index: 1000;
    }
    
    .footer-image {
      width: 100%;
      height: auto;
      max-height: 50px;
      object-fit: contain;
    }
    
    .diagnosis-item,
    .history-item,
    .examination-item,
    .test-item {
      margin-bottom: 3px;
      page-break-inside: avoid;
    }
    
    .note {
      font-style: italic;
      font-size: 10px;
      color: #555;
      margin-top: 2px;
    }
    
    .empty-section {
      color: #999;
      font-style: italic;
    }
    
    .indications-section {
      margin-top: 10px;
      page-break-inside: avoid;
    }
    
    .guidelines-section {
      margin-bottom: 10px;
      page-break-inside: avoid;
      background-color: #f9f9f9;
      padding: 5px;
      border-radius: 3px;
    }
  </style>
</head>
<body>
  <div class="page">
    <!-- Header Section -->
    ${prescriptionData.headerUrl ? `<div class="header-container"><img src="${prescriptionData.headerUrl}" class="header-image" alt="Header"></div>` : ''}
    
    <!-- Main Content -->
    <div class="main-content">
      <!-- Left Column - Patient and Clinical Data -->
      <div class="left-column">
        <div class="info-grid">
          <div class="info-item"><span class="info-label">MRN:</span><span class="info-value">${patient.mrn || ''}</span></div>
          <div class="info-item"><span class="info-label">Visit No:</span><span class="info-value">${prescriptionData.visit_no || ''}</span></div>
          <div class="info-item"><span class="info-label">Name:</span><span class="info-value">${patient.patientName || ''}</span></div>
          <div class="info-item"><span class="info-label">Age/Gender:</span><span class="info-value">${calculateAge(patient.dob) || ''} / ${patient.gender || ''}</span></div>
          <div class="info-item"><span class="info-label">Date:</span><span class="info-value">${formatDate(prescriptionData.appointmentDate) || formatDate(new Date().toISOString())}</span></div>
          <div class="info-item"><span class="info-label">Contact:</span><span class="info-value">${patient.phonNumber || ''}</span></div>
          ${patient.healthId ? `<div class="info-item"><span class="info-label">Health ID:</span><span class="info-value">${patient.healthId}</span></div>` : ''}
          ${patient.guardiansName ? `<div class="info-item"><span class="info-label">Guardian:</span><span class="info-value">${patient.guardiansName}</span></div>` : ''}
          ${prescriptionData.vitals?.bloodPressure ? `<div class="info-item"><span class="info-label">BP:</span><span class="info-value">${prescriptionData.vitals.bloodPressure}</span></div>` : ''}
          ${prescriptionData.vitals?.pulse ? `<div class="info-item"><span class="info-label">Pulse:</span><span class="info-value">${prescriptionData.vitals.pulse}</span></div>` : ''}
        </div>
        
        ${prescriptionData.diagnosis?.length ? `<div class="section"><div class="section-title">Diagnosis:</div><div class="section-content">${prescriptionData.diagnosis.map(diag => `<div class="diagnosis-item">${diag}</div>`).join('')}</div></div>` : ''}
        
        ${prescriptionData.symptoms?.length ? `<div class="section"><div class="section-title">History:</div><div class="section-content">${prescriptionData.symptoms.map(symptom => `<div class="history-item">${symptom}</div>`).join('')}</div></div>` : ''}
        
        ${prescriptionData.signs?.length ? `<div class="section"><div class="section-title">Examination:</div><div class="section-content">${prescriptionData.signs.map(sign => `<div class="examination-item">${sign}</div>`).join('')}</div></div>` : ''}
        
        ${prescriptionData.procedure ? `<div class="section"><div class="section-title">Procedure:</div><div class="section-content"><div>${prescriptionData.procedure}${prescriptionData.procedureDetails ? `: ${prescriptionData.procedureDetails}` : ''}</div></div></div>` : ''}
        
        ${prescriptionData.tests?.length ? `<div class="section"><div class="section-title">Investigation:</div><div class="section-content">${prescriptionData.tests.map(test => `<div class="test-item">${test.testName || ''}</div>`).join('')}</div></div>` : ''}
      </div>
      
      <!-- Right Column - Guidelines, Medicine, and Indications -->
      <div class="right-column">
        ${prescriptionData.guidance ? `<div class="guidelines-section"><div class="section-title">Guidelines:</div><div class="section-content" style="direction: ${prescriptionData.durationDirection || 'ltr'}; text-align: ${prescriptionData.durationDirection === 'rtl' ? 'right' : 'left'}; ${prescriptionData.durationDirection === 'rtl' ? "font-family: 'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', Arial, sans-serif;" : ''}"><div>${prescriptionData.guidance}</div></div></div>` : ''}
        
        <div class="medication-container">
          <div class="section-title">Medicine:</div>
          <div class="section-content">
            ${prescriptionData.medicines?.length ? `<table class="medication-table"><thead><tr><th style="width: 35%;">Medicine</th><th style="width: 25%;">Dosage</th><th style="width: 20%;">Route</th><th style="width: 20%;">Duration</th></tr></thead><tbody>${prescriptionData.medicines.map((med, index) => `<tr><td><span class="medication-number" style="color: #ff0000;">${index + 1}.</span><span class="medication-name">${med.name || ''}</span>${med.note ? `<div class="note" style="direction: ${med.durationDirection || 'ltr'}; text-align: ${med.durationDirection === 'rtl' ? 'right' : 'left'}; ${med.durationDirection === 'rtl' ? "font-family: 'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', Arial, sans-serif;" : ''}">${med.durationDirection === 'rtl' ? 'نوٹ:' : 'Note:'} ${med.note}</div>` : ''}</td><td style="direction: ${med.durationDirection || 'ltr'}; text-align: ${med.durationDirection === 'rtl' ? 'right' : 'left'}; ${med.durationDirection === 'rtl' ? "font-family: 'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', Arial, sans-serif;" : ''}"><div>${med.frequency?.urdu_notation || med.frequency?.eng_notation || ''}</div></td><td style="direction: ${med.durationDirection || 'ltr'}; text-align: ${med.durationDirection === 'rtl' ? 'right' : 'left'}; ${med.durationDirection === 'rtl' ? "font-family: 'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', Arial, sans-serif;" : ''}"><div>${med.RA_Urdu_Term || 'N/A'}</div></td><td><div>${med.duration || 'N/A'}</div></td></tr>`).join('')}</tbody></table>` : '<div class="empty-section">No medications prescribed</div>'}
          </div>
        </div>
        <div class="section">
          <div class="section-title">Comments:</div>
          <div class="section-content">${prescriptionData.comment ? prescriptionData.comment.trim() : ''}</div>
        </div>
        
        ${prescriptionData.setOfInstruction?.length && prescriptionData.setOfInstruction[0]?.instructions ? `<div class="indications-section"><div class="section-title">Instructions:</div><div class="section-content" style="direction: ${instructionsStyle.direction}; text-align: ${instructionsStyle.textAlign}; font-family: ${instructionsStyle.fontFamily};"><div>${prescriptionData.setOfInstruction[0].instructions}</div></div></div>` : ''}
      </div>
    </div>
    
    <!-- Footer Section -->
    ${prescriptionData.footerUrl ? `<div class="footer-container"><img src="${prescriptionData.footerUrl}" class="footer-image" alt="Footer"></div>` : ''}
  </div>
</body>
</html>`;

  return htmlContent;
};

// Helper function to show PDF options
const showPDFOptions = async (uri: string, fileName: string, onSuccessfulSave?: () => void) => {
  Alert.alert(
    "PDF Generated",
    "What would you like to do with the PDF?",
    [
      {
        text: "Cancel",
        style: "cancel",
        onPress: async () => {
          try {
            await FileSystem.deleteAsync(uri, { idempotent: true });
          } catch (error) {
            console.warn("Failed to delete temporary file:", error);
          }
        },
      },
      {
        text: "Share",
        onPress: async () => {
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(uri, {
              mimeType: "application/pdf",
              dialogTitle: "Share PDF",
            });
          } else {
            Alert.alert("Error", "Sharing not available on this device.");
          }
          try {
            await FileSystem.deleteAsync(uri, { idempotent: true });
          } catch (error) {
            console.warn("Failed to delete temporary file:", error);
          }
        },
      },
      {
        text: "Save",
        onPress: async () => {
          let fileUri = "";
          if (Platform.OS === "android") {
            try {
              const permissions =
                await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
              if (permissions.granted) {
                const base64 = await FileSystem.readAsStringAsync(uri, {
                  encoding: FileSystem.EncodingType.Base64,
                });
                fileUri =
                  await FileSystem.StorageAccessFramework.createFileAsync(
                    permissions.directoryUri,
                    fileName,
                    "application/pdf"
                  );
                await FileSystem.writeAsStringAsync(fileUri, base64, {
                  encoding: FileSystem.EncodingType.Base64,
                });
                Alert.alert(
                  "Success",
                  `PDF saved to selected location: ${fileName}`,
                  [
                    {
                      text: "OK",
                      onPress: () => {
                        if (onSuccessfulSave) onSuccessfulSave();
                      }
                    }
                  ]
                );
              } else {
                Alert.alert("Error", "Storage access permission denied.");
                fileUri = `${FileSystem.documentDirectory}${fileName}`;
                await FileSystem.moveAsync({ from: uri, to: fileUri });
                Alert.alert(
                  "Fallback",
                  `Saved to app's document directory: ${fileUri}`
                );
              }
            } catch (error) {
              console.error("Save error:", error);
              fileUri = `${FileSystem.documentDirectory}${fileName}`;
              await FileSystem.moveAsync({ from: uri, to: fileUri });
              Alert.alert(
                "Fallback",
                `Failed to save to selected location. Saved to: ${fileUri}`
              );
            }
          } else {
            fileUri = `${FileSystem.documentDirectory}${fileName}`;
            await FileSystem.moveAsync({ from: uri, to: fileUri });
            Alert.alert(
              "Success",
              `PDF saved to: ${fileUri}\nYou can share it to save to another location.`,
              [
                { text: "OK", style: "cancel" },
                {
                  text: "Share",
                  onPress: async () => {
                    if (await Sharing.isAvailableAsync()) {
                      await Sharing.shareAsync(fileUri, {
                        mimeType: "application/pdf",
                        dialogTitle: "Share PDF",
                      });
                    } else {
                      Alert.alert(
                        "Error",
                        "Sharing not available on this device."
                      );
                    }
                  },
                },
              ]
            );
          }
        },
      },
    ],
    { cancelable: true }
  );
};

// PDF Preview Modal Component
const PreviewPDFModal: React.FC<{
  visible: boolean;
  htmlContent: string;
  fileName: string;
  onClose: () => void;
}> = ({ visible, htmlContent, fileName, onClose }) => {
  const handleSaveShare = async () => {
    try {
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        width: 210 * 2.83465,
        height: 297 * 2.83465,
      });
      await showPDFOptions(uri, fileName, onClose);
    } catch (error) {
      console.error("PDF generation error:", error);
      Alert.alert("Error", "Failed to generate PDF");
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>PDF Preview</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>
        <WebView
          originWhitelist={['*']}
          source={{ html: htmlContent }}
          style={styles.webView}
          scalesPageToFit={true}
        />
        <View style={styles.modalButtons}>
          <TouchableOpacity
            style={[styles.modalButton, styles.saveButton]}
            onPress={handleSaveShare}
          >
            <Text style={styles.buttonText}>Save/Share</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modalButton, styles.cancelButton]}
            onPress={onClose}
          >
            <Text style={styles.buttonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// Dashboard Screen Component
const DashboardScreen = () => {
  const router = useRouter();
  const user = useSelector(selectUser) as User | null;
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [instructionsVisible, setInstructionsVisible] = useState<boolean>(false);
  const [previewVisible, setPreviewVisible] = useState<boolean>(false);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [previewFileName, setPreviewFileName] = useState<string>("");

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const spinValue = useRef(new Animated.Value(0)).current;

  const itemAnimations = useRef(new Map<string, ItemAnimation>()).current;

  const { data: appointmentsData, refetch, isLoading } =
    useGetAllAppointmentsQuery({ search: searchQuery || "" });
  const [cancelAppointment] = useCancelAppointmentMutation();

  useFocusEffect(
    useCallback(() => {
      fadeAnim.setValue(0);
      translateY.setValue(20);
      itemAnimations.clear();
      refetch();
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 600,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
      ]).start();
    }, [fadeAnim, translateY, itemAnimations, refetch])
  );

  const handleNavigateToAppointment = () => {
    router.push("/registration/PatientRegistration");
  };

  const handleNavigateToPatients = () => {
    router.push("/dashboard/PatientScreen");
  };

  const startItemAnimations = useCallback(() => {
    if (appointmentsData?.data) {
      const maxDelay = Math.min(appointmentsData.data.length * 50, 1000);
      appointmentsData.data.forEach((item: Appointment, index: number) => {
        const animations = itemAnimations.get(item._id);
        if (animations) {
          const delayFactor = appointmentsData.data.length > 10 ? 0.5 : 1;
          const delay = Math.min(index * 50 * delayFactor, maxDelay);
          Animated.parallel([
            Animated.timing(animations.fadeAnim, {
              toValue: 1,
              duration: 300,
              delay,
              useNativeDriver: true,
            }),
            Animated.timing(animations.translateY, {
              toValue: 0,
              duration: 300,
              delay,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
          ]).start();
        }
      });
    }
  }, [appointmentsData?.data, itemAnimations]);

  useEffect(() => {
    if (appointmentsData?.data && !isLoading) {
      appointmentsData.data.forEach((item: Appointment) => {
        if (!itemAnimations.has(item._id)) {
          itemAnimations.set(item._id, {
            fadeAnim: new Animated.Value(0),
            translateY: new Animated.Value(20),
          });
        }
      });
      setTimeout(() => startItemAnimations(), 100);
    }
  }, [appointmentsData?.data, isLoading, startItemAnimations]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const animateRefresh = () => {
    spinValue.setValue(0);
    Animated.timing(spinValue, {
      toValue: 1,
      duration: 800,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
  };

  const refetchAppointments = async () => {
    setIsRefreshing(true);
    animateRefresh();
    try {
      await refetch();
    } catch (error) {
      Alert.alert("Error", "Failed to refresh appointments");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSearch = () => {
    refetch();
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    Alert.alert(
      "Reason for Cancellation",
      "Please provide a reason",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Submit",
          onPress: async () => {
            try {
              await cancelAppointment({
                id: appointmentId,
                cancel_reason: "Appointment no longer needed",
              }).unwrap();
              Alert.alert("Success", "Appointment cancelled successfully");
              refetchAppointments();
            } catch {
              Alert.alert("Error", "Failed to cancel appointment");
            }
          },
        },
      ],
      { cancelable: false }
    );
  };

  const handleRetakeAppointment = (appointment: Appointment) => {
    router.push({
      pathname: "/appointments/CreateAppointmentScreen",
      params: {
        patientId: appointment.patientId?._id,
        patientName: appointment.patientId?.patientName,
        mrn: appointment.patientId?.mrn,
        doctorId: appointment.doctorId,
        doctorName: appointment.doctor?.fullName,
        date: appointment.appointmentDate,
        timeSlotId: appointment.timeSlotId,
      },
    });
  };

  const handleViewToken = (appointmentId: string) => {
    if (!appointmentId) {
      Alert.alert("Error", "Invalid appointment ID");
      return;
    }
    router.push({
      pathname: "/appointments/AppointmentReciept",
      params: { appointmentId },
    });
  };

  const handleViewPrescription = async (appointmentId: string) => {
    try {
      const prescriptionData = await fetchPrescriptionData(appointmentId, user);
      if (!prescriptionData) {
        Alert.alert("Info", "No prescription found for this appointment");
        return;
      }
      const htmlContent = await generatePrescriptionPDF(prescriptionData, user);
      setPreviewHtml(htmlContent);
      setPreviewFileName(`Prescription_${prescriptionData.patientData?.[0]?.mrn ?? "unknown"}`);
      setPreviewVisible(true);
    } catch (error) {
      console.error("Error viewing prescription:", error);
      Alert.alert("Error", "Failed to load prescription");
    }
  };

  const isAppointmentExpired = (appointment: Appointment): boolean => {
    if (!appointment.appointmentDate || !appointment.appointmentTime?.from) {
      return false;
    }
    const today = new Date();
    const appointmentDate = new Date(appointment.appointmentDate);
    if (appointmentDate.getTime() < today.setHours(0, 0, 0, 0)) {
      return true;
    }
    today.setHours(0, 0, 0, 0);
    if (appointmentDate.getTime() === today.getTime()) {
      const timeStr = appointment.appointmentTime.from;
      const timeRegex = /(\d+):(\d+)(?:\s*(AM|PM))?/i;
      const match = timeStr.match(timeRegex);
      if (match) {
        let hours = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        const period = match[3]?.toUpperCase();
        if (period === "PM" && hours < 12) hours += 12;
        if (period === "AM" && hours === 12) hours = 0;
        const appointmentTime = new Date();
        appointmentTime.setHours(hours, minutes, 0, 0);
        return new Date() > appointmentTime;
      }
    }
    return false;
  };

  const onRefresh = () => {
    refetchAppointments();
  };

  const onGeneratePDF = async (appointment: Appointment) => {
    try {
      const appointmentId = appointment._id;
      if (!appointmentId) {
        Alert.alert("Error", "Invalid appointment ID");
        return;
      }
      const prescriptionData = await fetchPrescriptionData(appointmentId, user);
      if (prescriptionData) {
        const htmlContent = await generatePrescriptionPDF(prescriptionData, user);
        setPreviewHtml(htmlContent);
        setPreviewFileName(`Prescription_${prescriptionData.patientData?.[0]?.mrn ?? "unknown"}`);
        setPreviewVisible(true);
      } else {
        const tokenData = await fetchQrData(appointmentId, user);
        if (tokenData) {
          const htmlContent = await generateTokenPDF(tokenData);
          setPreviewHtml(htmlContent);
          setPreviewFileName(`Token_${tokenData.mrn ?? "unknown"}`);
          setPreviewVisible(true);
        }
      }
    } catch (error) {
      console.error("PDF Generation Error:", error);
      Alert.alert("Error", "Failed to generate PDF");
    }
  };

  const renderAppointmentItem = ({
    item,
    index,
  }: ListRenderItemInfo<Appointment>) => {
    const animations =
      itemAnimations.get(item._id) || {
        fadeAnim: new Animated.Value(1),
        translateY: new Animated.Value(0),
      };
    return (
      <Animated.View
        style={{
          opacity: animations.fadeAnim,
          transform: [{ translateY: animations.translateY }],
        }}
      >
        <AppointmentCard
          appointment={{
            _id: item._id,
            patientId: {
              patientName: item.patientId?.patientName ?? "Unknown",
              mrn: item.patientId?.mrn ?? "N/A",
            },
            doctor: {
              fullName: item.doctor?.fullName ?? "Not assigned",
            },
            appointmentDate: item.appointmentDate,
            slot: item.slot ?? "N/A",
            isCanceled: item.isApmtCanceled,
            isPrescriptionCreated: item.isPrescriptionCreated,
            isChecked: item.isPrescriptionCreated,
          }}
          onRetake={() => handleRetakeAppointment(item)}
          onToken={() => handleViewToken(item._id)}
          onCancel={() => handleCancelAppointment(item._id)}
          onGeneratePDF={() => onGeneratePDF(item)}
          onViewPrescription={() => handleViewPrescription(item._id)}
          showPrescription={item.isPrescriptionCreated}
        />
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={[styles.header, { opacity: fadeAnim, transform: [{ translateY }] }]}
      >
        <View style={styles.greetingContainer}>
          <Text style={styles.greeting}>Hello,</Text>
          <Text style={styles.userName} numberOfLines={1} ellipsizeMode="tail">
            {user?.fullName ?? "User"}
          </Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.helpButton}
            onPress={() => setInstructionsVisible(true)}
          >
            <Ionicons name="help-circle" size={20} color="#fff" />
            <Text style={styles.helpButtonText}>Help</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.appointmentButton}
            onPress={handleNavigateToAppointment}
          >
            <Text style={styles.appointmentText}>+ Appointment</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      <Animated.View
        style={[styles.searchContainer, { opacity: fadeAnim, transform: [{ translateY }] }]}
      >
        <Ionicons name="search" size={18} color={COLORS.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search appointments"
          placeholderTextColor={COLORS.placeholder}
          value={searchQuery}
          onChangeText={setSearchQuery}
          keyboardType="default"
          returnKeyType="search"
          onSubmitEditing={(e) => setSearchQuery(e.nativeEvent.text)}
        />
        {searchQuery ? (
          <TouchableOpacity
            onPress={() => {
              setSearchQuery("");
              setTimeout(() => refetch(), 100);
            }}
            style={styles.clearButton}
          >
            <Ionicons name="close-circle" size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity onPress={handleSearch} style={styles.searchButton}>
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
      </Animated.View>

      <View style={styles.appointmentsHeader}>
        <Text style={styles.sectionTitle}>Appointments</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Ionicons name="refresh" size={20} color={COLORS.primary} />
          </Animated.View>
        </TouchableOpacity>
      </View>

      {isLoading || isRefreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading appointments...</Text>
        </View>
      ) : (
        <FlatList
          data={appointmentsData?.data ?? []}
          keyExtractor={(item: Appointment) => item._id}
          renderItem={renderAppointmentItem}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <Animated.View
              style={[styles.emptyContainer, { opacity: fadeAnim, transform: [{ translateY }] }]}
            >
              <Ionicons name="calendar-outline" size={48} color={COLORS.lightGray} />
              <Text style={styles.emptyText}>No appointments found</Text>
              {searchQuery ? (
                <TouchableOpacity
                  onPress={() => {
                    setSearchQuery("");
                    setTimeout(() => refetch(), 100);
                  }}
                  style={styles.clearSearchButton}
                >
                  <Text style={styles.clearSearchText}>Clear search</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.createAppointmentButton}
                  onPress={handleNavigateToAppointment}
                >
                  <Text style={styles.createAppointmentText}>Create Appointment</Text>
                </TouchableOpacity>
              )}
            </Animated.View>
          }
        />
      )}
      <InstructionModal
        visible={instructionsVisible}
        onClose={() => setInstructionsVisible(false)}
        navigateToAppointment={handleNavigateToAppointment}
        navigateToPatients={handleNavigateToPatients}
      />
      <PreviewPDFModal
        visible={previewVisible}
        htmlContent={previewHtml}
        fileName={previewFileName}
        onClose={() => setPreviewVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingTop: 10,
  },
  greetingContainer: {
    flexDirection: "column",
  },
  greeting: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  userName: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  appointmentButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  appointmentText: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "bold",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.cardBackground,
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    height: 40,
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  clearButton: {
    padding: 4,
  },
  searchButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  searchButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  appointmentsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  refreshButton: {
    padding: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  listContainer: {
    paddingBottom: 20,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    marginTop: 20,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderStyle: "dashed",
  },
  emptyText: {
    color: COLORS.textSecondary,
    marginTop: 10,
    fontSize: 16,
    marginBottom: 6,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    padding: 20,
  },
  loadingText: {
    color: COLORS.textSecondary,
    marginTop: 16,
    fontSize: 14,
  },
  clearSearchButton: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: COLORS.lightGray,
    borderRadius: 6,
  },
  clearSearchText: {
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  createAppointmentButton: {
    marginTop: 16,
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  createAppointmentText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
  },
  helpButton: {
    backgroundColor: COLORS.tokenPurple,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginRight: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  helpButtonText: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "bold",
    marginLeft: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  webView: {
    flex: 1,
  },
  modalButtons: {
    flexDirection: "row",
    padding: 16,
    gap: 10,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  saveButton: {
    backgroundColor: COLORS.primary,
  },
  cancelButton: {
    backgroundColor: COLORS.lightGray,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,

  },
});

export default DashboardScreen;