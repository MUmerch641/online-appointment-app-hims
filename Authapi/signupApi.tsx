import axios from 'axios';
import Constants from 'expo-constants';

// Base URL for API requests
const BASE_URL = `${Constants.expoConfig?.extra?.API_BASE_URL}/online-apmt`;

/**
 * Resends authentication token to the provided mobile number
 * @param mobileNo - The mobile number to send the token to
 * @returns Promise with the response data
 */
export const resendToken = async (mobileNo: string) => {
  try {
    const response = await axios.post(`${BASE_URL}/patient-auth/resend_token`, {
      mobileNo,
    });
    
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // Handle Axios specific errors
      throw new Error(error.response?.data?.message || 'Failed to resend token');
    }
    // Handle other errors
    throw new Error('An unexpected error occurred');
  }
};
/**
 * Verifies the authentication token for the provided mobile number
 * @param mobileNo - The mobile number to verify
 * @param token - The token to verify
 * @returns Promise with the response data
 */
export const verifyToken = async (mobileNo: string, token: number) => {
  try {
    
    const response = await axios.post(`${BASE_URL}/patient-auth/varify_token`, {
      mobileNo,
      token,
    });
    console.log("response", response);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // Handle Axios specific errors
      throw new Error(error.response?.data?.message || 'Failed to verify token');
    }
    // Handle other errors
    throw new Error('An unexpected error occurred');
  }
};
/**
 * Initiates a password reset request for the provided mobile number
 * @param mobileNo - The mobile number for password reset
 * @returns Promise with the response data
 */
export const forgetPassword = async (mobileNo: string) => {
  try {
    const response = await axios.post(`${BASE_URL}/patient-auth/forget_password`, {
      mobileNo,
    });
    
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // Handle Axios specific errors
      throw new Error(error.response?.data?.message || 'Failed to process forget password request');
    }
    // Handle other errors
    throw new Error('An unexpected error occurred');
  }
};
/**
 * Resets the password using the provided token
 * @param mobileNo - The mobile number associated with the account
 * @param pass_reset_token - The token received for password reset
 * @param newPassword - The new password to set
 * @returns Promise with the response data
 */
export const resetPassword = async (mobileNo: string, pass_reset_token: number, newPassword: string) => {
  try {
    const response = await axios.post(`${BASE_URL}/patient-auth/reset_password`, {
      mobileNo,
      pass_reset_token,
      newPassword,
    });
    
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // Handle Axios specific errors
      throw new Error(error.response?.data?.message || 'Failed to reset password');
    }
    // Handle other errors
    throw new Error('An unexpected error occurred');
  }
};
