import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { persistReducer } from "redux-persist";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { RootState } from "../store"; 
interface User {
  _id: string;
  fullName: string;
  mobileNo: string;
  token: string;
  profilePicture?: string;
  projectId?: string;
  refreshToken:any;
  

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
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;

      AsyncStorage.removeItem("profilePicture");
    },
  },
});

export const { setUser, logout,updateProfilePicture } = authSlice.actions;

export const selectUser = (state: RootState) => state.auth.user;
export const selectIsAuthenticated = (state: RootState) => state.auth.isAuthenticated;

const persistConfig = {
  key: "auth",
  storage: AsyncStorage,
  whitelist: ["user", "token", "isAuthenticated"],
};

const persistedReducer = persistReducer(persistConfig, authSlice.reducer);
export default persistedReducer;
