import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import Constants from "expo-constants";

const API_BASE_URL = `${Constants.expoConfig?.extra?.API_BASE_URL}/online-apmt`;

export const doctorApi = createApi({
  reducerPath: "doctorApi",
  baseQuery: fetchBaseQuery({ baseUrl: API_BASE_URL }),
  endpoints: (builder) => ({
    getAllDoctors: builder.query({
      query: () => "/getAllDoctors",
    }),
  }),
});

export const { useGetAllDoctorsQuery } = doctorApi;
