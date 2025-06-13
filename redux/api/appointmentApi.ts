import { API_BASE_URL } from "@/config/apiConfig";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { RootState } from "../store";

export const appointmentApi = createApi({
  reducerPath: "appointmentApi",
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.user?.token;
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      headers.set("Content-Type", "application/json");
      return headers;
    },
  }),
  endpoints: (builder) => ({
    getAllAppointments: builder.query({
      query: (params) => {
        
        if (params) {
          const queryParams = new URLSearchParams();
          if (params.search) queryParams.append('search', params.search);
          if (params.doctorId) queryParams.append('doctorId', params.doctorId);
          if (params.date) queryParams.append('date', params.date);
          if (params.isCanceled !== undefined) queryParams.append('isCanceled', params.isCanceled.toString());
          
          const queryString = queryParams.toString();
          return `/online-appointment/getMyAllAppointments${queryString ? `?${queryString}` : ''}`;
        }
        return "/online-appointment/getMyAllAppointments";
      },
    }),
    bookAppointment: builder.mutation({
      query: (appointmentData) => ({
        url: "/online-appointment/create_appointment",
        method: "POST",
        body: appointmentData,
      }),
    }),
    cancelAppointment: builder.mutation({
      query: ({ id, cancel_reason }) => ({
        url: "/online-appointment/cancel_appointment",
        method: "POST",
        body: { id, cancel_reason },
      }),
    }),
    getAllDoctors: builder.query({
      query: () => "/online-appointment/getAllDoctors",
    }),
    getAllSpecializations: builder.query({
      query: () => "/online-appointment/get_all_specializations",
    }),
    getAllTimeSlots: builder.query({
      query: ({ doctorId, date }) => ({
        url: "/time-slots/get_all_time_slots",
        method: "GET",
        params: { doctorId, date },
      }),
    }),
    generateAppointmentToken: builder.mutation({
      query: ({ appointmentId }) => ({
        url: `/online-appointment/generateToken/${appointmentId}`,
        method: "POST",
      }),
      transformErrorResponse: (response) => {
        console.error("❌ API Error:", response);
        return response;
      },
    }),
  }),
});

export const {
  useGetAllAppointmentsQuery,
  useBookAppointmentMutation,
  useCancelAppointmentMutation,
  useGetAllDoctorsQuery,
  useGetAllSpecializationsQuery,
  useGetAllTimeSlotsQuery,
  useGenerateAppointmentTokenMutation
} = appointmentApi;