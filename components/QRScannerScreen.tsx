import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, Alert, StatusBar, BackHandler, AppState } from 'react-native';
import { Camera, CameraType, useCameraPermissions, CameraView } from 'expo-camera';
import { Button, ActivityIndicator } from 'react-native-paper';
import { router } from 'expo-router';
import { COLORS } from "@/constants/Colors";
import Constants from "expo-constants";

const API_BASE_URL = `${Constants.expoConfig?.extra?.API_BASE_URL}/stg_online-apmt`;

const QRScannerScreen = () => {
  const [scanned, setScanned] = useState<boolean>(false);
  const [scanning, setScanning] = useState<boolean>(true);
  const [validating, setValidating] = useState<boolean>(false);
  const appState = useRef(AppState.currentState);
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    const requestCameraAccess = async () => {
      const granted = await requestPermission();
    };
    requestCameraAccess();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active' && permission?.granted) {
        setScanning(true);
      }
      appState.current = nextAppState;
    });
    return () => subscription.remove();
  }, [permission]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      router.back();
      return true;
    });
    return () => backHandler.remove();
  }, []);

  const isValidProjectId = (projectId: string): boolean => {
    if (!projectId || typeof projectId !== 'string') return false;
    const trimmedId = projectId.trim();
    return trimmedId.length === 24 && /^[0-9a-f]{24}$/i.test(trimmedId);
  };

  const validateProjectIdWithServer = async (projectId: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/patient-auth/hospital_profile/${projectId}`);
      const data = await response.json();
      return response.status === 200 && data && data.isSuccess === true;
    } catch (error) {
      console.error("Server validation error:", error);
      return true;
    }
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (!scanning || validating) return;

    setScanning(false);
    setScanned(true);

    try {
      let projectId: string | null = null;
      const mainPattern = /\/stg_online-apmt\/([a-f0-9]{24})\/?/i;
      const mainMatch = data.match(mainPattern);
      const fallbackPattern = /\/([a-f0-9]{24})(?:\/|$)/i;
      const fallbackMatch = !mainMatch ? data.match(fallbackPattern) : null;
      const rawPattern = /([a-f0-9]{24})/i;
      const rawMatch = (!mainMatch && !fallbackMatch) ? data.match(rawPattern) : null;

      if (mainMatch) projectId = mainMatch[1].trim();
      else if (fallbackMatch) projectId = fallbackMatch[1].trim();
      else if (rawMatch) projectId = rawMatch[1].trim();


      if (projectId && isValidProjectId(projectId)) {
        setValidating(true);
        const isValidWithServer = await validateProjectIdWithServer(projectId);
        setValidating(false);

        if (!isValidWithServer) {
          Alert.alert("Invalid link", "The QR code contains a link that doesn't exist.", [{
            text: "Scan Again", onPress: () => {
              setScanning(true);
              setScanned(false);
            }
          }]);
          return;
        }

        setTimeout(() => {
          router.push({ pathname: "/auth/signup/[projectId]", params: { projectId } });
        }, 300);
        return;
      }

      Alert.alert("Invalid QR Code", "The scanned QR code is not a valid signup link.", [{
        text: "Scan Again", onPress: () => {
          setScanning(true);
          setScanned(false);
        }
      }]);
    } catch (error) {
      console.error("QR code parsing error:", error);
      Alert.alert("Error", "Could not process the QR code.", [{
        text: "Try Again", onPress: () => {
          setScanning(true);
          setScanned(false);
        }
      }]);
    }
  };

  if (!permission) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        <Text style={styles.permissionText}>Please allow camera access to scan QR codes.</Text>
        <Button 
          mode="contained" 
          onPress={requestPermission} 
          style={styles.permissionButton}>
          Grant Permission
        </Button>
        <Button 
          mode="outlined" 
          onPress={() => router.back()} 
          style={[styles.permissionButton, {marginTop: 10}]}>
          Go Back
        </Button>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionTitle}>Camera Access Denied</Text>
        <Text style={styles.permissionText}>Camera access is required to scan QR codes.</Text>
        <Button 
          mode="contained" 
          onPress={requestPermission} 
          style={styles.permissionButton}>
          Grant Permission   
        </Button>
        <Button 
          mode="outlined" 
          onPress={() => router.back()} 
          style={[styles.permissionButton, {marginTop: 10}]}>
          Go Back
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={scanned || !scanning ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ["qr"]
        }}
        active={scanning}
        mirror={false}
      />
      <View style={styles.overlay} pointerEvents="box-none">
        <View style={styles.scanWindowContainer}>
          <View style={styles.scanWindow}>
            <View style={[styles.cornerTL, styles.corner]} />
            <View style={[styles.cornerTR, styles.corner]} />
            <View style={[styles.cornerBL, styles.corner]} />
            <View style={[styles.cornerBR, styles.corner]} />
          </View>
        </View>
      </View>
      <View style={styles.headerContainer}>
        <Text style={styles.headerText}>Scan QR Code</Text>
        <Text style={styles.instructionText}>Align QR code within the frame</Text>
      </View>
      <View style={styles.bottomContainer}>
        {validating ? (
          <View style={styles.validatingContainer}>
            <ActivityIndicator color={COLORS.primary} size="small" />
            <Text style={styles.validatingText}>Validating...</Text>
          </View>
        ) : scanned ? (
          <Button
            mode="contained"
            onPress={() => { setScanning(true); setScanned(false); }}
            style={styles.scanButton}
            labelStyle={styles.buttonLabel}
          >
            Scan Again
          </Button>
        ) : null}
        <Button
          mode="outlined"
          onPress={() => router.back()}
          style={styles.cancelButton}
          labelStyle={styles.cancelButtonLabel}
        >
          Cancel
        </Button>
      </View>
    </View>
  );
};

const WINDOW_SIZE = 250;
const CORNER_SIZE = 30;
const STROKE_WIDTH = 3;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)' },
  scanWindowContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scanWindow: { width: WINDOW_SIZE, height: WINDOW_SIZE, backgroundColor: 'transparent' },
  corner: { position: 'absolute', width: CORNER_SIZE, height: CORNER_SIZE, borderColor: COLORS.primary, borderWidth: STROKE_WIDTH, backgroundColor: 'transparent' },
  cornerTL: { top: 0, left: 0, borderBottomWidth: 0, borderRightWidth: 0, borderTopLeftRadius: 10 },
  cornerTR: { top: 0, right: 0, borderBottomWidth: 0, borderLeftWidth: 0, borderTopRightRadius: 10 },
  cornerBL: { bottom: 0, left: 0, borderTopWidth: 0, borderRightWidth: 0, borderBottomLeftRadius: 10 },
  cornerBR: { bottom: 0, right: 0, borderTopWidth: 0, borderLeftWidth: 0, borderBottomRightRadius: 10 },
  headerContainer: { position: 'absolute', top: 50, left: 0, right: 0, alignItems: 'center' },
  headerText: { fontSize: 24, fontWeight: 'bold', color: 'white', marginBottom: 10 },
  instructionText: { color: 'rgba(255,255,255,0.8)', fontSize: 16, textAlign: 'center', marginHorizontal: 40 },
  bottomContainer: { position: 'absolute', bottom: 50, left: 0, right: 0, alignItems: 'center' },
  validatingContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 30, marginBottom: 16 },
  validatingText: { color: 'white', marginLeft: 8, fontSize: 14 },
  scanButton: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 8, borderRadius: 30, marginBottom: 16, elevation: 4 },
  buttonLabel: { fontSize: 16, fontWeight: 'bold' },
  cancelButton: { borderColor: 'white', backgroundColor: 'transparent', borderRadius: 30, borderWidth: 1.5, paddingHorizontal: 24 },
  cancelButtonLabel: { color: 'white', fontSize: 14 },
  permissionContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f5', padding: 20 },
  permissionTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  permissionText: { fontSize: 16, color: '#555', textAlign: 'center', marginBottom: 30 },
  permissionButton: { backgroundColor: COLORS.primary, paddingHorizontal: 24, borderRadius: 8 },
});

export default QRScannerScreen;