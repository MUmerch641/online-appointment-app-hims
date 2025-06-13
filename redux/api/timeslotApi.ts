import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import Constants from "expo-constants";

const API_BASE_URL = `${Constants.expoConfig?.extra?.API_BASE_URL}/online-apmt`;

export const timeSlotApi = createApi({
  reducerPath: "timeSlotApi",
  baseQuery: fetchBaseQuery({ baseUrl: API_BASE_URL }),
  endpoints: (builder) => ({
    getAllTimeSlots: builder.query({
      query: () => "/time-slots/get_all_time_slots",
    }),
  }),
});

export const { useGetAllTimeSlotsQuery } = timeSlotApi;
