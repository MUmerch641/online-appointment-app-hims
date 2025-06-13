import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import SignupScreen from '../SignupScreen'; // Adjust path based on your project structure
import { Text, Button } from 'react-native-paper';
import { useGetHospitalByProjectIdQuery } from '../../../redux/api/authApi';
import { COLORS } from "@/constants/Colors";

const DynamicSignupScreen = () => {
  const params = useLocalSearchParams<{ projectId: string }>();
  const projectId = params.projectId;
  const [isValidProjectId, setIsValidProjectId] = useState<boolean | null>(null);
  
  // Fetch hospital data for additional validation
  const { 
    data: hospitalData, 
    isError: isHospitalError, 
    error: hospitalError,
    isLoading: isHospitalLoading
  } = useGetHospitalByProjectIdQuery(projectId || '', {
    skip: !projectId,
  });

  useEffect(() => {
   
    const validateProjectId = () => {
      // Extremely strict validation
      if (!projectId) {
        setIsValidProjectId(false);
        Alert.alert(
          "Invalid Access",
          "No project ID found. Please scan QR code again.",
          [{
            text: "Scan QR Code",
            onPress: () => router.push("/auth/ScanQRScreen")
          }]
        );
        return false;
      }

      // Strict length check
      if (projectId.length !== 24) {
        setIsValidProjectId(false);
        Alert.alert(
          "Invalid Project ID",
          `Project ID must be exactly 24 characters long. Current length: ${projectId.length}`,
          [{
            text: "Scan Again",
            onPress: () => router.push("/auth/ScanQRScreen")
          }]
        );
        return false;
      }

      // Hex validation
      const hexPattern = /^[0-9a-f]{24}$/i;
      if (!hexPattern.test(projectId)) {
        setIsValidProjectId(false);
        Alert.alert(
          "Invalid Project ID Format",
          "Project ID must be a valid 24-character hexadecimal string.",
          [{
            text: "Scan Again",
            onPress: () => router.push("/auth/ScanQRScreen")
          }]
        );
        return false;
      }

      // Handle potential API errors
      if (isHospitalError && !isHospitalLoading) {
        const errorStatus = (hospitalError as any)?.status;
        const errorMessage = (hospitalError as any)?.data?.message;

    

        
      }

     
      setIsValidProjectId(true);
      return true;
    };

    // Only validate if projectId has been loaded
    if (projectId !== undefined) {
      validateProjectId();
    }
  }, [projectId, hospitalData, isHospitalError, hospitalError, isHospitalLoading]);

  // Show loading state if validation is in progress
  if (isValidProjectId === null) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Validating project...</Text>
      </View>
    );
  }

  // Error screen if project ID is invalid
  if (isValidProjectId === false) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Invalid Project</Text>
        <Text style={styles.errorMessage}>
          Cannot proceed with signup. Please scan a valid QR code.
        </Text>
        <Button 
          mode="contained" 
          onPress={() => router.push("/auth/ScanQRScreen")}
          style={styles.scanButton}
        >
          Scan QR Code
        </Button>
      </View>
    );
  }

  // Render signup screen
  return (
    <View style={styles.container}>
      <SignupScreen />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 20,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  scanButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
});

export default DynamicSignupScreen;