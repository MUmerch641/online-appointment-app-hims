import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Base URL for API requests
const BASE_URL = `${Constants.expoConfig?.extra?.API_BASE_URL}/stg_online-apmt`;

// Helper to get token from AsyncStorage (persist:auth)
const getToken = async (): Promise<string> => {
  try {
    const persistAuth = await AsyncStorage.getItem('persist:auth');
    if (persistAuth) {
      const authObj = JSON.parse(persistAuth);
      if (authObj.token) {
        return JSON.parse(authObj.token);
      }
    }
  } catch {
    // ignore error
  }
  return '';
};

/**
 * Fetches the list of HIMS patients for the current user
 * Sends Authorization token from AsyncStorage (persist:auth)
 * @returns Promise with the response data
 */
export const getMyHimsPatients = async () => {
  try {
    const token = await getToken();
    const response = await axios.get(
      `${BASE_URL}/hims-patients/getMyHimsPatients`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || 'Failed to fetch HIMS patients');
    }
    throw new Error('An unexpected error occurred');
  }
};

/**
 * Creates a new HIMS patient
 * @param patientData - Patient data object
 * @returns Promise with the response data
 */
export const createHimsPatient = async (patientData: {
  patientName: string;
  guardiansName: string;
  gender: string;
  dob: string;
  phonNumber: string;
  cnic?: string;
  helthId?: string;
  city?: string;
  reference?: string;
  extra?: object;
}) => {
  try {
    const token = await getToken();
    const response = await axios.post(
      `${BASE_URL}/hims-patients/createHimsPatient`,
      patientData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || 'Failed to create HIMS patient');
    }
    throw new Error('An unexpected error occurred');
  }
};