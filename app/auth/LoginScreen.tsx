import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
  Modal
} from "react-native";
import { Text, ActivityIndicator } from "react-native-paper";
import { useLoginUserMutation } from "../../redux/api/authApi";
import { useDispatch, useSelector } from "react-redux";
import { selectUser, setUser, updateHospitalData } from "../../redux/slices/authSlice";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as Animatable from "react-native-animatable";
import { COLORS } from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { forgetPassword, resetPassword } from "@/src/Authapi/signupApi";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AppointmentFlowService from "../../services/appointmentFlowService";

const LoginScreen = () => {
  const dispatch = useDispatch();
  const router = useRouter();
  const params = useLocalSearchParams();
  const projectId = params?.projectId?.toString();

  const [mobileNo, setMobileNo] = useState<string>("03");
  const [password, setPassword] = useState<string>("");
  const [passwordVisible, setPasswordVisible] = useState<boolean>(false);
  const [loginUser, { isLoading, error }] = useLoginUserMutation();
  const user = useSelector(selectUser);
  const [rememberMe, setRememberMe] = useState<boolean>(false);
  // Forgot password modal state
  const [forgotModalVisible, setForgotModalVisible] = useState(false);
  const [fpStep, setFpStep] = useState<'input' | 'reset' | 'done'>('input');
  const [fpMobile, setFpMobile] = useState('03');
  const [fpLoading, setFpLoading] = useState(false);
  const [fpError, setFpError] = useState<string | null>(null);
  const [fpToken, setFpToken] = useState('');
  const [fpNewPassword, setFpNewPassword] = useState('');
  const [fpSuccessMsg, setFpSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
      const mobileToUse = mobileNo ? String(mobileNo).trim() : fpMobile;

    // Update state (will be available in next render)
    setFpMobile(mobileToUse);
  }
  , [forgotModalVisible, mobileNo]);


  const handleForgotPassword = async () => {
  
    setFpError(null);
    if (!/^03\d{9}$/.test(fpMobile)) {
      setFpError('Enter a valid 11-digit mobile number starting with 03');
      return;
    }
    setFpLoading(true);
    try {
      const res = await forgetPassword(fpMobile);
      if (res?.isSuccess) {
        setFpStep('reset');
      } else {
        setFpError(res?.message || 'Mobile number not found');
      }
    } catch (e: any) {
      setFpError(e.message || 'Error sending reset request');
    }
    setFpLoading(false);
  };

  const handleResetPassword = async () => {
    setFpError(null);
    if (!fpToken || !/^[0-9]{4,6}$/.test(fpToken)) {
      setFpError('Enter the valid reset token sent to your number');
      return;
    }
    if (!fpNewPassword || fpNewPassword.length < 6) {
      setFpError('Password must be at least 6 characters');
      return;
    }
    setFpLoading(true);
    try {
      const res = await resetPassword(fpMobile, Number(fpToken), fpNewPassword);
      if (res?.isSuccess) {
        setFpStep('done');
        setFpSuccessMsg('Password reset successful! You can now log in.');
      } else {
        setFpError(res?.message || 'Failed to reset password');
      }
    } catch (e: any) {
      setFpError(e.message || 'Error resetting password');
    }
    setFpLoading(false);
  };
  // UI for forgot password modal
  const renderForgotPasswordModal = () => (
    <Modal
      visible={forgotModalVisible}
      animationType="slide"
      transparent
      onRequestClose={() => setForgotModalVisible(false)}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.modalOverlay}>
          <Animatable.View
            animation="fadeInUp"
            duration={300}
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {fpStep === 'input' ? 'Forgot Password' :
                  fpStep === 'reset' ? 'Reset Password' : 'Success'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setForgotModalVisible(false);
                  setFpStep('input');
                  setFpMobile('03');
                  setFpToken('');
                  setFpNewPassword('');
                  setFpError(null);
                  setFpSuccessMsg(null);
                }}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {fpStep === 'input' && (
              <Animatable.View animation="fadeIn" duration={300}>
                <Text style={styles.modalDescription}>
                  Enter your mobile number to receive a password reset code
                </Text>
                <View style={styles.modalInputContainer}>
                  <Text style={styles.inputLabel}>Mobile Number</Text>
                  <TextInput
                    style={styles.modalTextInput}
                    keyboardType="phone-pad"
                    value={fpMobile}
                    onChangeText={setFpMobile}
                    maxLength={11}
                    placeholder="03XXXXXXXXX"
                  />
                </View>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={handleForgotPassword}
                  disabled={fpLoading}
                  activeOpacity={0.8}
                >
                  {fpLoading ?
                    <ActivityIndicator color="#fff" /> :
                    <Text style={styles.buttonText}>Send Reset Code</Text>
                  }
                </TouchableOpacity>
              </Animatable.View>
            )}

            {fpStep === 'reset' && (
              <Animatable.View animation="fadeIn" duration={300}>
                <Text style={styles.modalDescription}>
                  Enter the reset token sent to your mobile number and create a new password
                </Text>
                <View style={styles.modalInputContainer}>
                  <Text style={styles.inputLabel}>Reset Token</Text>
                  <TextInput
                    style={styles.modalTextInput}
                    keyboardType="number-pad"
                    value={fpToken}
                    onChangeText={setFpToken}
                    maxLength={6}
                    placeholder="Enter 4-6 digit code"
                  />
                </View>

                <View style={styles.modalInputContainer}>
                  <Text style={styles.inputLabel}>New Password</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={[styles.modalTextInput, { flex: 1 }]}
                      value={fpNewPassword}
                      onChangeText={setFpNewPassword}
                      placeholder="Minimum 6 characters"
                      secureTextEntry={!passwordVisible}
                    />
                    <TouchableOpacity
                      style={styles.modalEyeIcon}
                      onPress={() => setPasswordVisible(!passwordVisible)}
                    >
                      <Ionicons
                        name={passwordVisible ? "eye" : "eye-off"}
                        size={24}
                        color="#666"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={handleResetPassword}
                  disabled={fpLoading}
                  activeOpacity={0.8}
                >
                  {fpLoading ?
                    <ActivityIndicator color="#fff" /> :
                    <Text style={styles.buttonText}>Reset Password</Text>
                  }
                </TouchableOpacity>
              </Animatable.View>
            )}

            {fpStep === 'done' && (
              <Animatable.View animation="fadeIn" duration={300} style={styles.successContainer}>
                <Animatable.View animation="zoomIn" duration={500}>
                  <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
                </Animatable.View>
                <Text style={styles.successText}>{fpSuccessMsg}</Text>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => {
                    setForgotModalVisible(false);
                    setFpStep('input');
                    setFpMobile('03');
                    setFpToken('');
                    setFpNewPassword('');
                    setFpSuccessMsg(null);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.buttonText}>Back to Login</Text>
                </TouchableOpacity>
              </Animatable.View>
            )}

            {fpError && (
              <Animatable.Text
                animation="shake"
                duration={500}
                style={styles.modalErrorText}
              >
                {fpError}
              </Animatable.Text>
            )}
          </Animatable.View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const inputsOpacity = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(logoScale, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(inputsOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(buttonAnim, {
        toValue: 1,
        friction: 7,
        tension: 40,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  useEffect(() => {
    const handleLoginSuccess = async () => {
      if (user?.token) {
        // Check if there's a pending appointment flow
        const appointmentFlow = await AppointmentFlowService.getAppointmentFlow();
        
        if (appointmentFlow && appointmentFlow.redirectAfterLogin) {
          // Store hospital data in Redux if available
          if (appointmentFlow.hospitalData) {
            try {
              const hospitalData = JSON.parse(appointmentFlow.hospitalData);
              dispatch(updateHospitalData({
                _id: hospitalData._id || appointmentFlow.hospitalId,
                hospitalName: hospitalData.hospitalName || appointmentFlow.hospitalName,
                hospitalLogoUrl: hospitalData.hospitalLogoUrl,
                address: hospitalData.address,
                city: hospitalData.city,
              }));
            } catch (error) {
              console.error('Error parsing hospital data:', error);
              // Fallback with basic hospital info
              dispatch(updateHospitalData({
                _id: appointmentFlow.hospitalId,
                hospitalName: appointmentFlow.hospitalName,
              }));
            }
          }
          
          // Get patient info from user data
          const patientId = user._id || null;
          const patientName = user.fullName || null;
          
          // Navigate directly to appointment creation screen
          router.replace({
            pathname: "/dashboard/HimsPatientScreen",
            params: {
              doctorId: appointmentFlow.doctorId,
              doctorData: appointmentFlow.doctorData,
              hospitalData: appointmentFlow.hospitalData || null,
              patientId,
              patientName,
              mrn: appointmentFlow.mrn || null,
            },
          });
          
          // Clear the stored appointment flow data
          await AppointmentFlowService.clearAppointmentFlow();
        } else {
          // Normal redirect to home
          router.replace("/");
        }
      }
    };
    
    handleLoginSuccess();
  }, [user, dispatch]);

  const handleLogin = async () => {
    Animated.sequence([
      Animated.timing(buttonAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    if (!mobileNo || !password) {
      Alert.alert("Missing Fields", "Please enter both Mobile Number and Password.");
      return;
    }


    try {
      // Import AsyncStorage at the top of the file
      // Get projectId from URL params
      // Alternatively, we could get it from AsyncStorage
      // const projectId = await AsyncStorage.getItem('projectId');
      // Create the login data, including projectId if available
      const loginData = { 
        mobileNo, 
        password,
        ...(projectId ? { projectId } : {})  // Only add if projectId exists
      };
      const response = await loginUser(loginData).unwrap();

      if (response?.isSuccess && response?.data?.token) {
        
        dispatch(setUser(response.data));
      } else {
        Alert.alert("Login Failed", response?.message || "Invalid credentials. Please try again.");
      }
    } catch (err) {

      Alert.alert("Login Error", "Failed to log in. Please check your details.");
    }
  };

  const toggleRememberMe = () => {
    setRememberMe(!rememberMe);
  };

  const handleMobileNoChange = (text: string) => {
    if (text.length <= 11) {
      if (text.startsWith("03")) {
        setMobileNo(text);
      } else if (text.length >= 2) {
        setMobileNo("03" + text.substring(2));
      } else {
        setMobileNo("03");
      }
    }
  };

  const errorMessage = (() => {
    if (!error) return null;
    if ("data" in error && error.data && typeof error.data === "object") {
      return (
        (error.data as { message?: string }).message ||
        "Login failed. Please try again."
      );
    }
    return "An unexpected error occurred. Please try again.";
  })();

  const shakeAnimation = {
    0: { translateX: 0 },
    0.2: { translateX: -10 },
    0.4: { translateX: 10 },
    0.6: { translateX: -10 },
    0.8: { translateX: 10 },
    1: { translateX: 0 },
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <LinearGradient
          colors={['#f8f9fa', '#e9ecef']}
          style={styles.container}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View
              style={[
                styles.formContainer,
                {
                  opacity: fadeAnim,
                  transform: [
                    { translateY: slideAnim },
                  ],
                }
              ]}
            >
              <Animated.View
                style={[
                  styles.logoContainer,
                  {
                    transform: [
                      { scale: logoScale }
                    ],
                  }
                ]}
              >
                <Animatable.Text
                  animation="pulse"
                  iterationCount="infinite"
                  duration={2000}
                  style={styles.logoText}
                >
                  HIMS
                </Animatable.Text>
              </Animated.View>

              <View style={styles.form}>
                <Animatable.Text
                  animation="fadeIn"
                  duration={1000}
                  delay={300}
                  style={styles.title}
                >
                  Login Account
                </Animatable.Text>

                <Animatable.Text
                  animation="fadeIn"
                  duration={1000}
                  delay={500}
                  style={styles.subtitle}
                >
                  Enter phone & password to login HIMS.
                </Animatable.Text>

                <Animated.View style={{ opacity: inputsOpacity }}>
                  <Animatable.View
                    animation="fadeInUp"
                    duration={800}
                    delay={600}
                    style={styles.inputContainer}
                  >
                    <Text style={styles.inputLabel}>Mobile Number</Text>
                    <TextInput
                      placeholder="Enter your mobile number"
                      value={mobileNo}
                      onChangeText={handleMobileNoChange}
                      keyboardType="phone-pad"
                      style={styles.textInput}
                      maxLength={11}
                    />
                  </Animatable.View>

                  <Animatable.View
                    animation="fadeInUp"
                    duration={800}
                    delay={700}
                    style={styles.inputContainer}
                  >
                    <Text style={styles.inputLabel}>Password</Text>
                    <View style={styles.passwordContainer}>
                      <TextInput
                        placeholder="Enter your password"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!passwordVisible}
                        style={[styles.textInput, { flex: 1 }]}
                      />
                      <TouchableOpacity
                        style={styles.eyeIcon}
                        onPress={() => setPasswordVisible(!passwordVisible)}
                      >
                        <Ionicons
                          name={passwordVisible ? "eye" : "eye-off"}
                          size={24}
                          color="#666"
                        />
                      </TouchableOpacity>
                    </View>
                  </Animatable.View>
                  {/* Forgot Password Link */}
                  <TouchableOpacity
                    style={{ alignSelf: 'flex-end', marginTop: 2, marginBottom: 10 }}
                    onPress={() => setForgotModalVisible(true)}
                  >
                    <Text style={styles.forgotPassword}>Forgot Password?</Text>
                  </TouchableOpacity>
                </Animated.View>
              </View>

              <View style={styles.bottomContainer}>
                <Animated.View style={{ transform: [{ scale: buttonAnim }] }}>
                  <TouchableOpacity
                    style={styles.loginButton}
                    onPress={handleLogin}
                    disabled={isLoading}
                    activeOpacity={0.8}
                  >
                    {isLoading ? (
                      <ActivityIndicator animating={true} color="white" />
                    ) : (
                      <Text style={styles.buttonText}>Login</Text>
                    )}
                  </TouchableOpacity>
                </Animated.View>

                <Animatable.View
                  animation="fadeIn"
                  duration={1000}
                  delay={900}
                  style={styles.signupContainer}
                >
                  <Text style={styles.signupPrompt}>Don't have an account?</Text>
                  <TouchableOpacity
                    onPress={() => router.push("/auth/SignupScreen")}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.signupText}> Click for Sign Up</Text>
                  </TouchableOpacity>
                </Animatable.View>

                {error && (
                  <Animatable.Text
                    animation={shakeAnimation}
                    duration={1000}
                    style={styles.errorText}
                  >
                    {errorMessage}
                  </Animatable.Text>
                )}
              </View>
            </Animated.View>
          </ScrollView>
        </LinearGradient>
      </TouchableWithoutFeedback>
      {renderForgotPasswordModal()}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F75FE',
  },
  modalDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    lineHeight: 22,
  },
  modalInputContainer: {
    marginBottom: 20,
  },
  modalTextInput: {
    height: 55,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: '#fdfdfd',
    color: 'black',
  },
  modalButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1F75FE',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
    marginTop: 10,
  },
  modalErrorText: {
    fontSize: 14,
    color: '#D32F2F',
    textAlign: 'center',
    marginTop: 15,
    padding: 10,
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
  },
  successContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  successText: {
    fontSize: 18,
    color: '#4CAF50',
    textAlign: 'center',
    marginVertical: 20,
    fontWeight: '600',
  },
  modalEyeIcon: {
    position: 'absolute',
    right: 15,
    height: '100%',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 25,
  },
  formContainer: {
    width: "100%",
    maxWidth: 450,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 30,
    paddingBottom: 35,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,

  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 25,
  },
  logoText: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#1F75FE",
    letterSpacing: 2,
  },
  title: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#1F75FE",
    textAlign: "left",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "left",
    marginBottom: 25,
  },
  form: {
    width: "100%",
  },
  inputContainer: {
    marginBottom: 22,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#444",
    marginBottom: 8,
  },
  textInput: {
    height: 60,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: "#fdfdfd",
    color: "black",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 30,
    alignItems: "center",
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  rememberText: {
    fontSize: 15,
    color: "#555",
  },
  forgotPassword: {
    fontSize: 15,
    color: "#1F75FE",
    fontWeight: "600",
  },
  loginButton: {
    width: "100%",
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",

    shadowColor: "#1F75FE",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  signupContainer: {
    marginTop: 25,
    flexDirection: "row",
    justifyContent: "center",
  },
  signupPrompt: {
    fontSize: 15,
    color: "#555",
  },
  signupText: {
    fontSize: 15,
    color: "#1F75FE",
    fontWeight: "bold",
  },
  errorText: {
    fontSize: 14,
    color: "#D32F2F",
    textAlign: "center",
    marginTop: 20,
    padding: 10,
    backgroundColor: "#FFEBEE",
    borderRadius: 8,
  },
  bottomContainer: {
    width: "100%",
    marginTop: 10,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  eyeIcon: {
    position: 'absolute',
    right: 15,
    height: '100%',
    justifyContent: 'center',
  },
});

export default LoginScreen;