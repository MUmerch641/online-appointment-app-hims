import Constants from "expo-constants";

export const API_BASE_URL = `${Constants.expoConfig?.extra?.API_BASE_URL}/stg_online-apmt`;

export const API = {
  LOGIN: `${API_BASE_URL}/patient-auth/patient_login`,
  SIGNUP: `${API_BASE_URL}/patient-auth/patient_signup`,
  GET_PROFILE: `${API_BASE_URL}/patient-auth/getUserProfile`,
};
