import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  Animated,
  Easing,
  StatusBar,
  Image,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Card } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import ViewShot from "react-native-view-shot";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import { useGenerateAppointmentTokenMutation } from "../../redux/api/appointmentApi";
import { useGetHospitalByProjectIdQuery } from "../../redux/api/authApi";
import { useSelector } from "react-redux";
import { RootState } from "../../redux/store";
import { LinearGradient } from "expo-linear-gradient";
import * as Animatable from 'react-native-animatable';
import { COLORS } from "@/constants/Colors";

interface ReceiptData {
  mrn?: string;
  tokenId?: string;
  patientName?: string;
  phonNumber?: string;
  appointmentDate?: string;
  appointmentTime?: { from?: string };
  doctorName?: string;
  appointmentId?: string;
  totalFee?: number;
  feeStatus?: string;
}

interface HospitalData {
  hospitalName?: string;
  phoneNo?: string;
}

interface MutationResponse {
  isSuccess?: boolean;
  data?: ReceiptData;
  message?: string;
}

const AppointmentTokenScreen = () => {
  const router = useRouter();
  const { appointmentId, projectId } = useLocalSearchParams();
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const viewShotRef = useRef<ViewShot>(null);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const tokenRotate = useRef(new Animated.Value(0)).current;

  const [generateToken, { isLoading }] = useGenerateAppointmentTokenMutation();
  // Ensure projectId is always a string
  const resolvedProjectId =
    typeof projectId === "string"
      ? projectId
      : Array.isArray(projectId)
      ? projectId[0]
      : useSelector((state: RootState) => state.auth.user?.projectId) || "";

  const { data: hospitalData, isLoading: hospitalLoading } = useGetHospitalByProjectIdQuery(
    resolvedProjectId
  );

  useEffect(() => {
    if (!appointmentId) {
      setErrorMessage("No appointment ID provided");
      return;
    }

    const fetchToken = async () => {
      try {
        const response: MutationResponse = await generateToken({ appointmentId }).unwrap();

        if (response?.isSuccess && response.data) {
          setReceiptData(response.data);
          setErrorMessage(null);
          
          Animated.parallel([
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
              toValue: 1,
              duration: 600,
              easing: Easing.out(Easing.back(1.5)),
              useNativeDriver: true,
            }),
            Animated.timing(tokenRotate, {
              toValue: 1,
              duration: 800,
              easing: Easing.bounce,
              useNativeDriver: true,
            })
          ]).start();
        } else {
          setErrorMessage(response?.message || "Failed to load receipt");
        }
      } catch (error) {
        console.error("Token fetch error:", error);
        setErrorMessage("Error retrieving receipt data");
      }
    };

    fetchToken();
  }, [appointmentId, generateToken, fadeAnim, scaleAnim, tokenRotate]);

  const downloadReceipt = async () => {
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
    
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      
      if (status !== "granted") {
        Alert.alert("Permission needed", "Please grant permission to save the receipt");
        return;
      }

      if (viewShotRef.current) {
        const uri = await viewShotRef?.current?.capture();
        
        const asset = await MediaLibrary.createAssetAsync(uri);
        await MediaLibrary.createAlbumAsync("Appointments", asset, false);
        
        Alert.alert(
          "Download Complete", 
          "Token has been saved to your gallery",
          [{ text: "OK" }]
        );
      } else {
        throw new Error("ViewShot reference is not available");
      }
    } catch (error) {
      console.error("Download error:", error);
      Alert.alert("Download Failed", "Could not download the token");
    }
  };

  const shareReceipt = async () => {
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
    
    try {
      if (viewShotRef.current) {
        const uri = await viewShotRef?.current?.capture();
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Share Appointment Token',
        });
      } else {
        throw new Error("ViewShot reference is not available");
      }
    } catch (error) {
      console.error("Share error:", error);
      Alert.alert("Sharing Failed", "Could not share the token");
    }
  };
  
  const goBack = () => {
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
    
    router.back();
  };
  
  const goToDashboard = () => {
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
    
    router.replace("/dashboard/DashboardScreen");
  };
  
  const spin = tokenRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  if (isLoading || hospitalLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Animatable.View 
          animation="pulse" 
          iterationCount="infinite" 
          duration={1500}
          style={styles.loadingAnimation}
        >
          <Ionicons name="medical" size={80} color={COLORS.primary} />
        </Animatable.View>
        <Animatable.Text 
          animation="fadeIn" 
          duration={1000}
          style={styles.loadingText}
        >
          Loading token...
        </Animatable.Text>
      </View>
    );
  }

  if (errorMessage || !receiptData) {
    return (
      <View style={styles.errorContainer}>
        <Animatable.View 
          animation="shake" 
          duration={1000}
          style={styles.errorAnimation}
        >
          <Ionicons name="alert-circle" size={80} color={COLORS.danger} />
        </Animatable.View>
        <Animatable.Text 
          animation="fadeIn" 
          duration={800}
          style={styles.errorText}
        >
          {errorMessage || "Token data not available"}
        </Animatable.Text>
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={goBack}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const hospital: HospitalData = hospitalData?.data || {};
  const services = [
    { name: 'Checkup', fee: receiptData.totalFee ? receiptData.totalFee - 100 : 1000 },
    { name: 'Online Appointment fee', fee: 100 }
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={goBack}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Appointment Token</Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.iconButton} 
            onPress={shareReceipt}
            activeOpacity={0.8}
          >
            <Ionicons name="share-social-outline" size={22} color="white" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.downloadButton} 
            onPress={downloadReceipt}
            activeOpacity={0.8}
          >
            <Ionicons name="download-outline" size={22} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <Animated.View 
          style={[
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
          ]}
        >
          <ViewShot ref={viewShotRef} options={{ format: "png", quality: 0.9 }}>
            <Card style={styles.tokenCard}>
              <View style={styles.hospitalHeader}>
                <Text style={styles.hospitalName}>
                  {hospital.hospitalName || "Demo Hospital"}
                </Text>
                <Text style={styles.hospitalPhone}>
                  Hospital Phone # {hospital.phoneNo}
                </Text>
              </View>
              
              <View style={styles.mrnRow}>
                <Text style={styles.mrnText}>MRN # : {receiptData.mrn || "23"}</Text>
                <View style={styles.tokenNumberContainer}>
                  <Text style={styles.tokenLabel}>Token</Text>
                  <Animated.View 
                    style={[
                      { transform: [{ rotate: spin }] }
                    ]}
                  >
                    <Text style={styles.tokenNumber}>#{receiptData.tokenId}</Text>
                  </Animated.View>
                </View>
              </View>
              
              <View style={styles.infoContainer}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Name</Text>
                  <Text style={styles.infoColon}>:</Text>
                  <Text style={styles.infoValue}>{receiptData.patientName}</Text>
                </View>
                
                <View style={styles.divider} />
                
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Phone #</Text>
                  <Text style={styles.infoColon}>:</Text>
                  <Text style={styles.infoValue}>{receiptData.phonNumber}</Text>
                </View>
                
                <View style={styles.divider} />
                
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Date & Time</Text>
                  <Text style={styles.infoColon}>:</Text>
                  <Text style={styles.infoValue}>
                    {receiptData.appointmentDate} {receiptData.appointmentTime?.from}
                  </Text>
                </View>
                
                <View style={styles.divider} />
                
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Dr. Name</Text>
                  <Text style={styles.infoColon}>:</Text>
                  <Text style={styles.infoValue}>{receiptData.doctorName}</Text>
                </View>
              </View>
              
              <View style={styles.servicesContainer}>
                <View style={styles.servicesHeader}>
                  <Text style={styles.servicesHeaderText}>Services</Text>
                  <Text style={styles.servicesHeaderText}>Charges</Text>
                </View>
                
                {services.map((service, index) => (
                  <View key={index} style={styles.serviceRow}>
                    <Text style={styles.serviceText}>{service.name}</Text>
                    <Text style={styles.serviceAmount}>{service.fee}/-</Text>
                  </View>
                ))}
              </View>
              
              <View style={styles.qrAndTotalContainer}>
                <View style={styles.qrContainer}>
                  <QRCode
                    value={`APPT:${receiptData.appointmentId}`}
                    size={80}
                    color="black"
                    backgroundColor="white"
                  />
                </View>
                
                <View style={styles.totalContainer}>
                  <View style={styles.feeRow}>
                    <Text style={styles.feeLabel}>Gross Charges :</Text>
                    <Text style={styles.feeValue}>{receiptData.totalFee || 1100}/-</Text>
                  </View>
                  
                  <View style={styles.feeRow}>
                    <Text style={styles.feeLabel}>Fee Status :</Text>
                    <Text style={styles.feeValue}>{receiptData.feeStatus || "unpaid"}</Text>
                  </View>
                  
                  <View style={styles.feeRow}>
                    <Text style={styles.feeLabel}>Payable Fee :</Text>
                    <Text style={styles.feeValue}>{receiptData.totalFee || 1100}/-</Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.footer}>
                <Text style={styles.footerText}>Software By : Cure Logics, RYK</Text>
              </View>
            </Card>
          </ViewShot>
        </Animated.View>
        <Animated.View 
          style={[
            styles.buttonContainer,
            { opacity: fadeAnim, transform: [{ scale: buttonScale }] }
          ]}
        >
          <TouchableOpacity 
            style={styles.doneButton} 
            onPress={goToDashboard}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: COLORS.cardBackground,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  actionButtons: {
    flexDirection: "row",
  },
  iconButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 8,
    marginRight: 8,
  },
  downloadButton: {
    backgroundColor: COLORS.success,
    borderRadius: 8,
    padding: 8,
    
  },
  scrollContainer: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  loadingAnimation: {
    width: 150,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
    padding: 20,
  },
  errorAnimation: {
    width: 150,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    
  },
  retryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
  tokenCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    overflow: "hidden",
    
  },
  hospitalHeader: {
    backgroundColor: "#333",
    padding: 12,
    alignItems: "center",
  },
  hospitalName: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  hospitalPhone: {
    color: "white",
    fontSize: 14,
    marginTop: 4,
  },
  mrnRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  mrnText: {
    fontSize: 14,
    fontWeight: "bold",
  },
  tokenNumberContainer: {
    alignItems: 'center'
  },
  tokenLabel: {
    fontSize: 20,
    fontWeight: "bold",
  },
  tokenNumber: {
    fontSize: 30,
    fontWeight: "bold",
  },
  infoContainer: {
    margin: 16,
    marginTop: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 4,
  },
  infoRow: {
    flexDirection: "row",
    paddingVertical: 4,
  },
  infoLabel: {
    width: 80,
    fontSize: 14,
    fontWeight: "bold",
  },
  infoColon: {
    width: 10,
    fontSize: 14,
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: "#ddd",
    marginVertical: 4,
  },
  servicesContainer: {
    marginHorizontal: 16,
  },
  servicesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  servicesHeaderText: {
    fontWeight: "bold",
    fontSize: 14,
  },
  serviceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  serviceText: {
    fontSize: 14,
  },
  serviceAmount: {
    fontSize: 14,
  },
  qrAndTotalContainer: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  qrContainer: {
    width: "30%",
    alignItems: "center",
    justifyContent: "center",
  },
  totalContainer: {
    width: "70%",
    paddingLeft: 16,
  },
  feeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  feeLabel: {
    fontWeight: "bold",
    fontSize: 14,
  },
  feeValue: {
    fontSize: 14,
  },
  footer: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
  },
  footerText: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },
  buttonContainer: {
    marginTop: 24,
    marginBottom: 16,
  },
  doneButton: {
    borderRadius: 10,
    marginBottom: 12,
    overflow: "hidden",
    
  },
  buttonGradient: {
    paddingVertical: 14,
    alignItems: "center",
  },
  doneButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default AppointmentTokenScreen;