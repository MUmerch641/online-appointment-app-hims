import React from "react";
import { Provider } from "react-redux";
import { Slot, useRouter } from "expo-router";
import { store, persistor } from "../redux/store"; 
import { PaperProvider } from "react-native-paper";
import { PersistGate } from "redux-persist/integration/react";
import { StatusBar } from "react-native";
import { useEffect } from 'react';
import { I18nManager } from 'react-native';

import { NavigationContainer } from '@react-navigation/native';

const Layout = () => {
  // Add this inside your main component
useEffect(() => {
  // Force LTR for the entire app
  if (I18nManager.isRTL) {
    I18nManager.allowRTL(false);
    I18nManager.forceRTL(false);
    
    try {
     
    } catch (error) {
      console.error("Failed to reload app:", error);
    }
  }
}, []);
  return (
    <NavigationContainer>
    <Provider store={store}>  
      <PersistGate loading={null} persistor={persistor}>
        <PaperProvider>
          <Slot />
          <StatusBar barStyle="light-content" backgroundColor="#1F75FE" />
        </PaperProvider>
      </PersistGate>
    </Provider>
        </NavigationContainer>

  );
};

export default Layout;
