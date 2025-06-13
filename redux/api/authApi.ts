import { createApi, fetchBaseQuery, FetchBaseQueryError, FetchBaseQueryMeta } from "@reduxjs/toolkit/query/react";
import Constants from "expo-constants";
import { setUser } from "../slices/authSlice";
import { RootState } from "../store";

const API_BASE_URL = `${Constants.expoConfig?.extra?.API_BASE_URL}/online-apmt`;

// Define error response interface
interface ErrorResponse {
  status?: number;
  data?: {
    message?: string;
    error?: string;
  };
  message?: string;
  error?: string;
}

interface HospitalInfo {
  _id: string;
  hospitalName: string;
  hospitalLogoUrl: string;
  phoneNo: string;
  online_service_fee: number;
}

// Hospital response interface
interface HospitalResponse {
  isSuccess: boolean;
  data: HospitalInfo;
  message: string;
}

interface UserData {
  _id: string;
  mobileNo: string;
  fullName: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  isActive: boolean;
  token: string;
  refreshToken?: string;
  hospital?: HospitalInfo;
}

interface ApiResponse {
  isSuccess?: boolean;
  data?: UserData;
  message?: string;
  token?: string;
}

interface RegisterUserRequest {
  fullName: string;
  mobileNo: string;
  password: string;
  projectId: string;
}

interface UpdateProfileRequest {
  _id: string;
  fullName?: string;
  mobileNo?: string;
  profilePicture?: string;
}

interface ChangePasswordRequest {
  mobileNo: string;
  oldPassword: string;
  newPassword: string;
}

// Create a baseQuery with auth token handling
const baseQueryWithAuth = fetchBaseQuery({ 
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    // Try to get the token from the state
    const token = (getState() as RootState).auth.token;
    
    // If we have a token, add it to the Authorization header
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    
    return headers;
  },
});

// Enhanced base query with better error logging
const enhancedBaseQuery = async (args: any, api: any, extraOptions: any) => {
  
  // For debugging purposes only - don't log actual passwords
  const requestBody = args.body ? {...args.body} : undefined;
  if (requestBody && requestBody.password) {
    requestBody.password = '[REDACTED]';
  }
  

  
  const result = await baseQueryWithAuth(args, api, extraOptions);
  
  
  return result;
};

export const authApi = createApi({
  reducerPath: "authApi",
  baseQuery: enhancedBaseQuery,
  endpoints: (builder) => ({
    loginUser: builder.mutation({
      query: (credentials) => ({
        url: "/patient-auth/patient_login",
        method: "POST",
        body: credentials,
      }),
    }),
    registerUser: builder.mutation({
      query: (userData: RegisterUserRequest) => {
        
        // Additional validation for project ID
        if (!userData.projectId || userData.projectId.length !== 24) {
          console.error(`Invalid link: "${userData.projectId}", length: ${userData.projectId?.length}`);
          throw {
            status: 400,
            data: { message: 'Invalid link. Expected 24-character hex string.' }
          };
        }
        
        // Check if project ID is a valid hex string
        const hexPattern = /^[0-9a-f]{24}$/i;
        if (!hexPattern.test(userData.projectId)) {
          console.error(`Project ID is not a valid hex string: "${userData.projectId}"`);
          throw {
            status: 400,
            data: { message: 'Project ID must be a valid hexadecimal string.' }
          };
        }
        
        return {
          url: "/patient-auth/patient_signup",
          method: "POST",
          body: userData,
        };
      },
      // Transform successful response to ensure consistent structure
      transformResponse: (response: ApiResponse) => {
        
      
        
        if (response && !response.hasOwnProperty('isSuccess')) {

          return {
            isSuccess: true,
            data: response,
            message: "Registration successful"
          };
        }
        return response;
      },
      transformErrorResponse: (
        response: FetchBaseQueryError, 
        meta: FetchBaseQueryMeta | undefined, 
        arg: RegisterUserRequest
      ) => {
        
        const errorData = response.data as any;
        
        if (
          (response.status === 400 && errorData?.message?.includes('already exists')) ||
          (errorData?.message?.includes('already registered')) ||
          (errorData?.message?.includes('already registerd')) ||
          (errorData?.error?.includes('duplicate'))
        ) {
          return { 
            status: response.status || 400,
            data: { message: 'Phone number already registered' }
          };
        }
        return response;
      },
    }),
    getUserProfile: builder.query({
      query: () => "/patient-auth/getUserProfile",
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setUser(data));
        } catch (error) {
          console.error("❌ User Profile API Error:", error);
        }
      },
    }),
    updateProfile: builder.mutation({
      query: (profileData: UpdateProfileRequest) => ({
        url: `/patient-registration/updatePatient/${profileData._id}`,
        method: "PUT",
        body: profileData,
      }),
    }),
    changePassword: builder.mutation({
      query: (data: ChangePasswordRequest) => ({
        url: "/patient-auth/change_password",
        method: "POST",
        body: data,
      }),
    }),
    // Fixed implementation for hospital profile
    getHospitalByProjectId: builder.query<HospitalResponse, string>({
      query: (projectId) => {
        
        // Validate projectId before making the request
        if (!projectId || projectId.length !== 24) {
          throw {
            status: 400,
            data: { message: 'Invalid link' }
          };
        }
        
        // Using the direct endpoint you provided
        return {
          url: `/patient-auth/hospital_profile/${projectId}`,
          method: "GET",
          // No auth token needed for this endpoint
          credentials: 'omit' // Explicitly avoid sending credentials
        };
      },
      // Transform the response to handle errors gracefully
      transformResponse: (response: any) => {
        
        // If response is already in the expected format
        if (response && response.isSuccess === true && response.data) {
          return response;
        }
        
        // If we received data but it's not in the expected format,
        // structure it properly
        if (response) {
          return {
            isSuccess: true,
            data: {
              _id: response._id || '',
              hospitalName: response.hospitalName || 'Hospital',
              hospitalLogoUrl: response.hospitalLogoUrl || '',
              phoneNo: response.phoneNo || '',
              online_service_fee: response.online_service_fee || 0
            },
            message: "Hospital data retrieved"
          };
        }
        
        // Shouldn't reach here, but just in case
        throw {
          status: 404,
          data: { message: 'Hospital information not found' }
        };
      },
      // Handle errors by providing fallback data
      transformErrorResponse: (
        response: FetchBaseQueryError, 
        meta: FetchBaseQueryMeta | undefined, 
        arg: string
      ) => {
        
        return {
          status: response.status || 500,
          data: { 
            message: (response.data as any)?.message || 'Failed to fetch hospital information',
            fallback: true // Flag to indicate this is a fallback error
          }
        };
      },
      // Add error handling in the component
      async onQueryStarted(projectId, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
        } catch (error) {
          // Error already handled by transformErrorResponse
        }
      },
      // Keep cache for 5 minutes
      keepUnusedDataFor: 300,
    }),
  }),
});

export const {
  useLoginUserMutation,
  useRegisterUserMutation,
  useGetUserProfileQuery,
  useUpdateProfileMutation,
  useChangePasswordMutation,
  useGetHospitalByProjectIdQuery,
} = authApi;