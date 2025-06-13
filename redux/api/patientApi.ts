import { createApi, fetchBaseQuery, BaseQueryFn } from "@reduxjs/toolkit/query/react";
import Constants from "expo-constants";
import { RootState } from "../store";
import { logout, setUser } from "../slices/authSlice";
import { authApi } from "./authApi";

const API_BASE_URL = `${Constants.expoConfig?.extra?.API_BASE_URL}/online-apmt`;

interface ApiResponse {
  isSuccess: boolean;
  data?: any;
  message?: string;
}

interface Patient {
  patientName: string;
  guardiansName: string;
  gender: string;
  dob: string;
  phonNumber: string;
  cnic: string;
  healthId?: string;
  city: string;
  reference?: string;
}

const baseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.user?.token;
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    headers.set("Content-Type", "application/json");
    return headers;
  },
});

const baseQueryWithReauth: BaseQueryFn = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);

  if (result.error && typeof result.error === "object" && "data" in result.error) {
    const errorData = (result.error as any).data as { message?: string };

    // 🔄 Handle JWT Expiry
    if (errorData.message === "jwt expired") {
      console.warn("🔄 Token expired. Attempting to refresh...");

      const refreshToken = (api.getState() as RootState).auth.user?.refreshToken;
      if (!refreshToken) {
        console.error("❌ No refresh token found. Logging out...");
        api.dispatch(logout());
        return result;
      }

      const refreshResult = await api.dispatch(authApi.endpoints.refreshToken.initiate(refreshToken));

      if ((refreshResult as any).data?.token) {

        api.dispatch(setUser({
          ...api.getState().auth.user,
          token: refreshResult.data.token,
          refreshToken: refreshResult.data.refreshToken
        }));

        // 🔄 Retry the original request with the new token
        result = await baseQuery(args, api, extraOptions);
      } else {
        console.error("❌ Refresh token failed. Logging out...");
        api.dispatch(logout());
      }
    }
  }

  return result;
};

export const patientApi = createApi({
  reducerPath: "patientApi",
  baseQuery: baseQueryWithReauth,
  endpoints: (builder) => ({
    getAllPatients: builder.query<ApiResponse, void>({
      query: () => `/patient-registration/getAllPatients`,
    }),

    registerPatient: builder.mutation<ApiResponse, any>({
      query: (patientData) => ({
        url: `/patient-registration/registerPatient`,
        method: "POST",
        body: patientData,
      }),
    }),

    registerNewPatient: builder.mutation<ApiResponse, any>({
      query: (patientData) => ({
        url: `/patient-registration/registerNewPatient`,
        method: "POST",
        body: patientData,
      }),
    }),

    updatePatient: builder.mutation<ApiResponse, { id: string; updateData: any }>({
      query: ({ id, updateData }) => ({
        url: `/patient-registration/updatePatient/${id}`,
        method: "PUT",
        body: updateData,
      }),
    }),

    deletePatient: builder.mutation<ApiResponse, string>({
      query: (id) => ({
        url: `/patient-registration/deletePatientById/${id}`,
        method: "DELETE",
      }),
    }),

    // 🔍 Updated MRN Search Query
    searchPatientByMRN: builder.query<ApiResponse, string>({
      query: (mrn) => {

        return {
          url: `/patient-registration/searchPatientByKey`,
          method: "GET",
          params: { searchBy: "mrn", search: mrn },
        };
      },

      transformResponse: (response: ApiResponse) => {
        return response;
      },

      onQueryStarted: async (mrn, { dispatch, queryFulfilled }) => {
        try {
          const { data } = await queryFulfilled;
          if (!data || !data.isSuccess || !data.data) {
            console.warn("❌ No Patient Found in API Response");
          } else {
          }
        } catch (error) {
          console.error("❌ API Error in MRN Search:", error);
        }
      },
    }),
  }),
});

export const {
  useGetAllPatientsQuery,
  useRegisterPatientMutation,
  useUpdatePatientMutation,
  useDeletePatientMutation,
  useSearchPatientByMRNQuery,
  useRegisterNewPatientMutation
} = patientApi;
