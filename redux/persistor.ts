import AsyncStorage from "@react-native-async-storage/async-storage";
import { persistStore, persistReducer } from "redux-persist";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";

const persistConfig = {
  key: "root",
  storage: AsyncStorage,
  whitelist: ["auth"], 
};

const persistedAuthReducer = persistReducer(persistConfig, authReducer);

export const store = configureStore({
  reducer: {
    auth: persistedAuthReducer,
  },
});

export const persistor = persistStore(store);
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
