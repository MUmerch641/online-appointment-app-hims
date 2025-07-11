import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { persistReducer } from "redux-persist";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { RootState } from "../store";

interface Hospital {
  _id?: string;
  hospitalName?: string;
  hospitalLogoUrl?: string | null;
  address?: string;
  city?: string;
}

interface Service {
  _id: string;
  serviceName: string;
  fee: number;
  hospitalChargesInPercentage: number;
  extra: Record<string, unknown>;
}

interface Doctor {
  _id: string;
  fullName: string;
  specialization: string;
  photoUrl?: string;
  designationDetail?: string;
  availableDays?: string[];
      services?: Service[]   // <-- Add this line to match the usage

}

interface User {
  _id: string;
  fullName: string;
  mobileNo: string;
  token: string;
  profilePicture?: string;
  projectId?: string;
  refreshToken: any;
  hospital?: Hospital;
  doctor?: Doctor | null; // Added doctor field
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User>) => {
      state.user = {
        ...action.payload,
        profilePicture: action.payload.profilePicture || state.user?.profilePicture || "",
        doctor: null, // Initialize doctor as null when setting user
      };
      state.token = action.payload.token;
      state.isAuthenticated = true;

      if (state.user?.profilePicture) {
        AsyncStorage.setItem("profilePicture", state.user.profilePicture);
      }
    },
    updateProfilePicture: (state, action: PayloadAction<string>) => {
      if (state.user) {
        state.user.profilePicture = action.payload;
        AsyncStorage.setItem("profilePicture", action.payload);
      }
    },
    updateHospitalData: (state, action: PayloadAction<Hospital>) => {
      if (state.user) {
        state.user.hospital = action.payload;
        state.user.doctor = null; // Clear doctor data when hospital changes
      }
    },
    updateDoctorData: (state, action: PayloadAction<Doctor | null>) => {
      if (state.user) {
        state.user.doctor = action.payload; // Set or clear doctor data
      }
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      AsyncStorage.removeItem("profilePicture");
    },
  },
});

export const { setUser, logout, updateProfilePicture, updateHospitalData, updateDoctorData } = authSlice.actions;

export const selectUser = (state: RootState) => state.auth.user;
export const selectIsAuthenticated = (state: RootState) => state.auth.isAuthenticated;
export const selectDoctor = (state: RootState) => state.auth.user?.doctor;

const persistConfig = {
  key: "auth",
  storage: AsyncStorage,
  whitelist: ["user", "token", "isAuthenticated"],
};

const persistedReducer = persistReducer(persistConfig, authSlice.reducer);
export default persistedReducer;