import { configureStore } from "@reduxjs/toolkit";
import { persistReducer, persistStore } from "redux-persist";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setupListeners } from "@reduxjs/toolkit/query";
import { authApi } from "./api/authApi";
import { appointmentApi } from "./api/appointmentApi";
import { patientApi } from "./api/patientApi";  
import authReducer from "./slices/authSlice";
import userReducer from "./slices/userSlice";
import patientReducer from "./slices/patientSlice";  
import { doctorApi } from "./api/doctorApi";
import { timeSlotApi } from "./api/timeslotApi";

const persistConfig = {
  key: "auth",
  storage: AsyncStorage,
  whitelist: ["user", "token", "isAuthenticated"],
};

const persistedAuthReducer = persistReducer(persistConfig, authReducer);

export const store = configureStore({
  reducer: {
    auth: persistedAuthReducer, 
    user: userReducer,
    patient: patientReducer, 
    [authApi.reducerPath]: authApi.reducer,
    [appointmentApi.reducerPath]: appointmentApi.reducer,
    [patientApi.reducerPath]: patientApi.reducer,
    [doctorApi.reducerPath]: doctorApi.reducer,  
    [timeSlotApi.reducerPath]: timeSlotApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["persist/PERSIST", "persist/REHYDRATE"], 
      },
    }).concat(
      authApi.middleware, 
      appointmentApi.middleware,
      patientApi.middleware ,
      doctorApi.middleware,  
      timeSlotApi.middleware
    ),
});

export const persistor = persistStore(store);

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
