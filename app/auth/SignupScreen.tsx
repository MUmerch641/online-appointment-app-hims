import { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  TextInput,
  Animated,
  Easing,
  Image,
  Alert,
  LogBox,
} from "react-native";
import { Text, ActivityIndicator } from "react-native-paper";
import { useRegisterUserMutation, useLoginUserMutation } from "../../redux/api/authApi";
import { useDispatch } from "react-redux";
import { setUser } from "../../redux/slices/authSlice";
import { router, useLocalSearchParams } from "expo-router";
import * as Animatable from "react-native-animatable";
import { COLORS } from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { verifyToken, resendToken } from "../../Authapi/signupApi";

// Interfaces
interface User {
  _id: string;
  fullName: string;
  mobileNo: string;
  token: string;
  refreshToken?: string;
}

interface ApiResponse {
  isSuccess?: boolean;
  data?: User | null;
  message?: string;
  token?: string;
  _id?: string;
  mobileNo?: string;
  fullName?: string;
  refreshToken?: string;
}

interface HospitalInfo {
  _id: string;
  hospitalName: string;
  hospitalLogoUrl: string;
  phoneNo: string;
}

interface FormData {
  fullName: string;
  mobileNo: string;
  password: string;
  confirmPassword: string;
  verificationCode: string;
}

// VerificationScreen Component
const VerificationScreen = ({
  hospitalInfo,
  errorMessage,
  formData,
  setFormData,
  onInputFocus,
  onInputBlur,
  getInputContainerStyle,
  isLoading,
  formOpacity,
  formTranslateY,
  buttonScale,
  onGoBack,
  handleLoginAfterVerification,
}: {
  hospitalInfo: HospitalInfo | null;
  errorMessage: string | null;
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  onInputFocus: (inputName: string) => void;
  onInputBlur: () => void;
  getInputContainerStyle: (inputName: string) => any[];
  isLoading: boolean;
  formOpacity: Animated.Value;
  formTranslateY: Animated.Value;
  buttonScale: Animated.Value;
  onGoBack: () => void;
  handleLoginAfterVerification: (mobileNo: string, password: string) => Promise<void>;
}) => {
  const [timeRemaining, setTimeRemaining] = useState<number>(300); // Changed from 3 to 300 seconds (5 minutes)
  const [canResend, setCanResend] = useState<boolean>(false);
  const [isResending, setIsResending] = useState<boolean>(false);
  const dispatch = useDispatch();

  // Create a ref to track timer interval
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Setup timer effect
  useEffect(() => {
    // Clear any existing timer
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    // Start a new timer
    timerIntervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
          }
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Cleanup on unmount
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isResending]); // Add isResending as dependency to restart timer when resend happens

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`;
  };

  const handleResendCode = async () => {
    // setErrorMessage(null); // Hide errors on resend click
    if (!canResend || isResending) return;

    setIsResending(true);
    // Reset timer state immediately on click
    setTimeRemaining(300);
    setCanResend(false);

    try {
      await resendToken(formData.mobileNo);
      Alert.alert("Success", "Verification code resent successfully.");
    } catch (error: any) {
      Alert.alert("Error", error?.response?.data?.message || "Failed to resend verification code.");
      // If API call fails, allow user to try again after a short delay
      setTimeout(() => {
        setCanResend(true);
      }, 5000);
    } finally {
      setIsResending(false);
    }
  };

  const handleVerify = async () => {
    // setErrorMessage(null); // Hide errors on verify click
    if (!formData.verificationCode.trim()) {
      Alert.alert("Error", "Please enter verification code");
      return;
    }

    try {
      const response = await verifyToken(formData.mobileNo, parseInt(formData.verificationCode, 10));

      if (response?.isSuccess) {

        // If we have user data, use it. Otherwise fetch via login
        if (response.data && response.data.token) {
          if (response.data) {
            dispatch(setUser(response.data));
          }
          setTimeout(() => {
            router.replace("/dashboard/PatientScreen");
          }, 300);
        } else {
          // Use the provided login handler
          await handleLoginAfterVerification(formData.mobileNo, formData.password);
        }
      } else {
        throw new Error(response?.message || "Invalid verification response");
      }
    } catch (error: any) {
      console.error("Verification error:", error);
      Alert.alert("Error", error?.response?.data?.message || "Verification failed. Please try again.");
    }
  };

  return (
    <Animated.View
      style={[styles.formContainer, { opacity: formOpacity, transform: [{ translateY: formTranslateY }] }]}
    >
      {hospitalInfo ? (
        <Animatable.View animation="fadeIn" duration={1000} style={styles.hospitalInfoContainer}>
          {hospitalInfo.hospitalLogoUrl ? (
            <Image source={{ uri: hospitalInfo.hospitalLogoUrl }} style={styles.hospitalLogo} resizeMode="contain" />
          ) : (
            <View style={styles.logoPlaceholder}>
              <Text style={styles.logoPlaceholderText}>{hospitalInfo.hospitalName?.charAt(0) || "H"}</Text>
            </View>
          )}
          <Text style={styles.hospitalName}>{hospitalInfo.hospitalName}</Text>
          {hospitalInfo.phoneNo && <Text style={styles.hospitalPhone}>Contact: {hospitalInfo.phoneNo}</Text>}
        </Animatable.View>
      ) : (
        <Animatable.View animation="bounceIn" duration={1200} style={styles.logoContainer}>
          <Text style={styles.logoText}>HIMS</Text>
        </Animatable.View>
      )}

      <Animatable.Text animation="fadeIn" duration={800} delay={300} style={styles.title}>
        Verify Your Account
      </Animatable.Text>

      <Animatable.Text animation="fadeIn" duration={800} delay={400} style={styles.subtitle}>
        Enter the verification code sent to your phone number.
      </Animatable.Text>

      <Animatable.View animation="fadeIn" duration={800} delay={450} style={styles.timerContainer}>
        <Text style={styles.timerText}>
          {canResend ? "Time expired" : `Time remaining: ${formatTime(timeRemaining)}`}
        </Text>
      </Animatable.View>

      {errorMessage && (
        <Animatable.View animation="fadeIn" duration={300} style={styles.errorContainer}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </Animatable.View>
      )}

      <View style={styles.form}>
        <Animatable.View
          animation="fadeInUp"
          duration={800}
          delay={500}
          style={getInputContainerStyle("verificationCode")}
        >
          <Text style={styles.inputLabel}>Verification Code</Text>
          <TextInput
            placeholder="Enter Verification Code"
            value={formData.verificationCode}
            onChangeText={(text) => setFormData((prev) => ({ ...prev, verificationCode: text }))}
            style={styles.textInput}
            onFocus={() => onInputFocus("verificationCode")}
            onBlur={onInputBlur}
            keyboardType="number-pad"
            maxLength={6}
          />
        </Animatable.View>
      </View>

      <View style={styles.bottomContainer}>
        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
          <TouchableOpacity
            style={styles.signupButton}
            onPress={handleVerify}
            activeOpacity={0.8}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator animating={true} color="white" />
            ) : (
              <Text style={styles.buttonText}>Verify</Text>
            )}
          </TouchableOpacity>
        </Animated.View>

        <Animatable.View animation="fadeIn" duration={800} delay={1000} style={styles.actionContainer}>
          <TouchableOpacity onPress={onGoBack} style={styles.linkButton}>
            <Text style={styles.linkText}>Go Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleResendCode}
            disabled={!canResend || isResending}
            style={[styles.linkButton, !canResend && styles.disabledLink]}
          >
            {isResending ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Text style={[styles.linkText, !canResend && styles.disabledText]}>Resend Code</Text>
            )}
          </TouchableOpacity>
        </Animatable.View>
      </View>
    </Animated.View>
  );
};

// Main SignupScreen Component
const SignupScreen = () => {
  const dispatch = useDispatch();
  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    mobileNo: "03",
    password: "",
    confirmPassword: "",
    verificationCode: "",
  });
  const [passwordVisible, setPasswordVisible] = useState<boolean>(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState<boolean>(false);
  const [registerUser, { isLoading, error }] = useRegisterUserMutation();
  const [loginUser] = useLoginUserMutation();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeInput, setActiveInput] = useState<string | null>(null);
  const [showVerification, setShowVerification] = useState<boolean>(false);

  const formOpacity = useRef(new Animated.Value(0)).current;
  const formTranslateY = useRef(new Animated.Value(50)).current;
  const buttonScale = useRef(new Animated.Value(0)).current;

  // Input validation
  const validateInputs = useCallback(() => {
    if (!formData.fullName.trim()) return "Please enter your full name";
    if (!formData.mobileNo.match(/^03[0-4][0-9]{8}$/)) return "Please enter a valid phone number (03xxxxxxxxx)";
    if (formData.password.length < 6) return "Password must be at least 6 characters long";
    if (formData.password !== formData.confirmPassword) return "Passwords do not match";
    return null;
  }, [formData]);

  // Clear errors for specific fields
  const clearErrorsFor = useCallback(
    (field: string) => {
      if (!errorMessage) return;
      if (
        (field === "verificationCode" && errorMessage.toLowerCase().includes("verification")) ||
        (field === "mobileNo" && errorMessage.toLowerCase().includes("phone")) ||
        (field === "password" && errorMessage.toLowerCase().includes("password")) ||
        (field === "fullName" && errorMessage.toLowerCase().includes("name"))
      ) {
        setErrorMessage(null);
      }
    },
    [errorMessage]
  );

  // Input change handlers
  const handleInputChange = useCallback(
    (field: keyof FormData, value: string) => {
      clearErrorsFor(field);
      if (field === "mobileNo") {
        if (value.length <= 11) {
          setFormData((prev) => ({
            ...prev,
            mobileNo: value.startsWith("03") ? value : "03" + value.slice(2),
          }));
        }
      } else {
        setFormData((prev) => ({ ...prev, [field]: value }));
      }
    },
    [clearErrorsFor]
  );

  // Initialize animations
  useEffect(() => {
    Animated.parallel([
      Animated.timing(formOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(formTranslateY, {
        toValue: 0,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(buttonScale, { toValue: 1, friction: 7, tension: 40, delay: 900, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleInputFocus = useCallback((inputName: string) => setActiveInput(inputName), []);
  const handleInputBlur = useCallback(() => setActiveInput(null), []);

  const getInputContainerStyle = useCallback(
    (inputName: string) => [
      styles.inputContainer,
      activeInput === inputName && { transform: [{ scale: 1.02 }] },
      errorMessage &&
      ((inputName === "mobileNo" && errorMessage.includes("phone")) ||
        (inputName === "password" && errorMessage.includes("password")) ||
        (inputName === "fullName" && errorMessage.includes("name"))) &&
      styles.errorInput,
    ],
    [activeInput, errorMessage]
  );

  // Helper function to perform login after verification or for existing users
  const handleLoginAfterAction = async (mobileNo: any, password: any) => {
    try {
      const loginData = { mobileNo, password };
      const loginResponse = await loginUser(loginData).unwrap();
      if (loginResponse?.isSuccess && loginResponse?.data) {
        dispatch(setUser(loginResponse.data));
        setTimeout(() => {
          router.replace("/dashboard/PatientScreen");
        }, 300);
      } else {
        if (loginResponse?.message === 'Your Mobile Number is not varified. OTP has been sent to ****290. Please verify your Mobile Number. This OTP will be expired in 30 minuts') {
          setShowVerification(true);
          return;
        }
        throw new Error(loginResponse?.message || "Login failed after verification");
      }
    } catch (error) {
      console.error("Login after verification failed:", error);
      const errorMsg = error?.toString().replace(/^\[?Error:?\s*|\]$/gi, "");
      Alert.alert(
        "Info",
        (typeof error === "string" ? String('Due to ' + errorMsg + ' could not log you in automatically. Please go to login screen.') : "Your account was created but we couldn't log you in automatically. Please go to login screen."),
        [{ text: "Go to Login", onPress: () => router.push("/auth/LoginScreen") }]
      );
    }
  };

  const handleSignup = useCallback(async () => {
    setErrorMessage(null);
    const validationError = validateInputs();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    try {
      const registerData = {
        fullName: formData.fullName,
        mobileNo: formData.mobileNo,
        password: formData.password,
      };

      console.log("Sending registration data:", registerData);
      const response = await registerUser(registerData).unwrap();
      console.log("Registration response:", response);

      if (response.isSuccess) {
        setShowVerification(true);
      } else if (response.message === "Mobile no is already registerd. Please login to your account") {
        await handleLoginAfterAction(formData.mobileNo, formData.password);
      } else {
        throw new Error(response.message || "Signup failed");
      }
    } catch (err: any) {
      console.error("Full signup error object:", JSON.stringify(err, null, 2));
      
      let errorMsg = "Signup failed. Please try again.";
      
      if (err?.data?.message && typeof err.data.message === 'string') {
        errorMsg = err.data.message;
      } else if (err?.error && typeof err.error === 'string') {
        errorMsg = err.error;
      } else if (err?.message && typeof err.message === 'string') {
        errorMsg = err.message;
      } else if (err?.data?.error && typeof err.data.error === 'string') {
        errorMsg = err.data.error;
      } else if (typeof err === 'string') {
        errorMsg = err;
      }
      
      console.log("Extracted error message:", errorMsg);
      setErrorMessage(errorMsg);

      const lowerErrorMsg = typeof errorMsg === 'string' ? errorMsg.toLowerCase() : '';
      
      if (errorMsg === "Mobile no is already registerd. Please login to your account" ||
        lowerErrorMsg.includes("already registerd")) {
        await handleLoginAfterAction(formData.mobileNo, formData.password);
      } else if (lowerErrorMsg.includes("phone number already registered") ||
        lowerErrorMsg.includes("already registered") ||
        lowerErrorMsg.includes("already exists")) {
        Alert.alert("Registration Error", "Phone number already registered. Please login instead.", [
          { text: "OK", onPress: () => router.push("/auth/LoginScreen") },
        ]);
      } else {
        Alert.alert("Error", errorMsg);
      }
    }
  }, [formData, registerUser, validateInputs, handleLoginAfterAction]);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
            {showVerification ? (
              <VerificationScreen
                hospitalInfo={null}
                errorMessage={errorMessage}
                formData={formData}
                setFormData={setFormData}
                onInputFocus={handleInputFocus}
                onInputBlur={handleInputBlur}
                getInputContainerStyle={getInputContainerStyle}
                isLoading={isLoading}
                formOpacity={formOpacity}
                formTranslateY={formTranslateY}
                buttonScale={buttonScale}
                onGoBack={() => { setErrorMessage(null); setShowVerification(false); }}
                handleLoginAfterVerification={handleLoginAfterAction}
              />
            ) : (
              <Animated.View
                style={[styles.formContainer, { opacity: formOpacity, transform: [{ translateY: formTranslateY }] }]}
              >
                <Animatable.View animation="bounceIn" duration={1200} style={styles.logoContainer}>
                  <Text style={styles.logoText}>HIMS</Text>
                </Animatable.View>

                <Animatable.Text animation="fadeIn" duration={800} delay={300} style={styles.title}>
                  Signup Account
                </Animatable.Text>

                <Animatable.Text animation="fadeIn" duration={800} delay={400} style={styles.subtitle}>
                  Enter your details to register.
                </Animatable.Text>

                {errorMessage && (
                  <Animatable.View animation="fadeIn" duration={300} style={styles.errorContainer}>
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </Animatable.View>
                )}

                <View style={styles.form}>
                  {[
                    { label: "Full Name", field: "fullName", type: "text" },
                    { label: "Phone Number", field: "mobileNo", type: "phone-pad", maxLength: 11 },
                    { label: "Password", field: "password", secure: true },
                    { label: "Confirm Password", field: "confirmPassword", secure: true },
                  ].map(({ label, field, type, secure, maxLength }, index) => (
                    <Animatable.View
                      key={field}
                      animation="fadeInUp"
                      duration={800}
                      delay={500 + index * 100}
                      style={getInputContainerStyle(field)}
                    >
                      <Text style={styles.inputLabel}>{label}</Text>
                      <View style={secure ? styles.passwordContainer : {}}>
                        <TextInput
                          placeholder={`Enter ${label}`}
                          value={formData[field as keyof FormData]}
                          onChangeText={(text) => handleInputChange(field as keyof FormData, text)}
                          style={[styles.textInput, secure && styles.passwordInput]}
                          onFocus={() => handleInputFocus(field)}
                          onBlur={handleInputBlur}
                          keyboardType={type as any}
                          secureTextEntry={secure && (field === "password" ? !passwordVisible : !confirmPasswordVisible)}
                          maxLength={maxLength}
                        />
                        {secure && (
                          <TouchableOpacity
                            style={styles.eyeIcon}
                            onPress={() =>
                              field === "password"
                                ? setPasswordVisible(!passwordVisible)
                                : setConfirmPasswordVisible(!confirmPasswordVisible)
                            }
                          >
                            <Ionicons name={field === "password" ? (passwordVisible ? "eye" : "eye-off") : (confirmPasswordVisible ? "eye" : "eye-off")} size={24} color="#666" />
                          </TouchableOpacity>
                        )}
                      </View>
                    </Animatable.View>
                  ))}
                </View>

                <View style={styles.bottomContainer}>
                  <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                    <TouchableOpacity
                      style={styles.signupButton}
                      onPress={handleSignup}
                      activeOpacity={0.8}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <ActivityIndicator animating={true} color="white" />
                      ) : (
                        <Text style={styles.buttonText}>Sign Up</Text>
                      )}
                    </TouchableOpacity>
                  </Animated.View>

                  <Animatable.View animation="fadeIn" duration={800} delay={1000} style={styles.loginContainer}>
                    <Text style={styles.loginPrompt}>Already have an account?</Text>
                    <TouchableOpacity onPress={() => router.push("/auth/LoginScreen")}>
                      <Text style={styles.loginText}> Login</Text>
                    </TouchableOpacity>
                  </Animatable.View>
                </View>
              </Animated.View>
            )}
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

// Styles remain the same
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
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
    marginVertical: 20,
  },
  hospitalInfoContainer: {
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  hospitalLogo: {
    width: 120,
    height: 120,
    marginBottom: 10,
    borderRadius: 10,
  },
  hospitalName: {
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.primary,
    textAlign: "center",
    marginBottom: 5,
  },
  hospitalPhone: {
    fontSize: 14,
    color: "#666",
    marginTop: 5,
  },
  logoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  logoPlaceholderText: {
    fontSize: 40,
    fontWeight: "bold",
    color: "white",
  },
  hospitalLoadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    height: 120,
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
    fontSize: 14,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  logoText: {
    fontSize: 32,
    fontWeight: "bold",
    color: COLORS.primary,
    letterSpacing: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: COLORS.primary,
    textAlign: "center",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 25,
  },
  errorContainer: {
    backgroundColor: "#FFEBEE",
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#FFCDD2",
  },
  errorText: {
    color: "#D32F2F",
    fontSize: 14,
    textAlign: "center",
  },
  form: {
    width: "100%",
    marginBottom: 10,
  },
  inputContainer: {
    marginBottom: 20,
    borderRadius: 10,
    padding: 2,
  },
  errorInput: {
    borderWidth: 1,
    borderColor: "#FFCDD2",
    backgroundColor: "#FFEBEE",
    borderRadius: 10,
    padding: 8,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#444",
    marginBottom: 8,
    marginLeft: 2,
  },
  textInput: {
    height: 55,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: "#fdfdfd",
    color: "black",
  },
  signupButton: {
    width: "100%",
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  loginPrompt: {
    fontSize: 15,
    color: "#555",
  },
  loginText: {
    fontSize: 15,
    color: COLORS.primary,
    fontWeight: "bold",
  },
  bottomContainer: {
    width: "100%",
  },
  disabledLink: {
    opacity: 0.5,
  },
  disabledText: {
    color: "#999",
  },













  errorTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 20,
    textAlign: "center",
  },
  errorMessage: {
    fontSize: 16,
    color: "#555",
    textAlign: "center",
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  scanButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  passwordContainer: {
    position: "relative",
    width: "100%",
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeIcon: {
    position: "absolute",
    right: 15,
    top: "50%",
    transform: [{ translateY: -12 }],
    zIndex: 1,
  },
  timerContainer: {
    alignItems: "center",
    marginBottom: 15,
    backgroundColor: "#f0f4ff",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 10,
  },
  timerText: {
    fontSize: 15,
    color: COLORS.primary,
    fontWeight: "600",
  },
  actionContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  linkButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  linkText: {
    color: COLORS.primary,
    fontWeight: "bold",
    fontSize: 15,
  },

});

export default SignupScreen;