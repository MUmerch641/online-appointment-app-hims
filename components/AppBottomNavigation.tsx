import { StyleSheet, Text, View } from 'react-native'
import React, { useState } from 'react'
import { router } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { COLORS } from "@/constants/Colors";
import { BottomNavigation } from 'react-native-paper';


type MyRoute = {
  key: string;
  title: string;
  icon: string;
};

type MyNavigationState = {
  index: number;
  routes: MyRoute[];
};

const AppBottomNavigation = () => {
  const [navigationIndex, setNavigationIndex] = useState<number>(0);

  const navigationState: MyNavigationState = {
    index: navigationIndex,
    routes: [
      { key: "appointment", title: "Appointment", icon: "calendar-alt" },
      { key: "patient", title: "Patient", icon: "hospital-user" },
      { key: "HimsPatientScreen", title: "HIMS Patient", icon: "user-md" },
      { key: "profile", title: "Profile", icon: "user" },
    ],
  };

  return (
    <View style={styles.bottomNav}>
      <BottomNavigation
        navigationState={navigationState}
        onIndexChange={(index: number) => {
          setNavigationIndex(index);
          switch (index) {
            case 0:
              router.replace("/dashboard/DashboardScreen");
              break;
            case 1:
              router.replace("/dashboard/PatientScreen");
              break;
            case 2:
              router.replace("/dashboard/HimsPatientScreen");
              break;
            case 3:
              router.replace("/dashboard/ProfileScreen");
              break;
          }
        }}
        renderIcon={({ route, focused, color }: { route: any; focused: boolean; color: string }) => (
          <FontAwesome5 name={(route as MyRoute).icon} size={25} color={focused ? COLORS.primary : "#666"} />
        )}
        renderLabel={({ route, focused, color }: { route: { title?: string }; focused: boolean; color: string }) => (
          <Text
            style={{
              color: focused ? COLORS.primary : "#666",
              fontSize: 10,
              marginTop: -5,
              textAlign: "center",
            }}
          >
            {route.title ?? ""}
          </Text>
        )}
        renderScene={() => null}
        barStyle={{ backgroundColor: "white" }}
        activeColor="transparent"
        inactiveColor="transparent"
        style={{ backgroundColor: "transparent", height: 60 }}
        theme={{
          colors: {
            secondaryContainer: "transparent",
          },
        }}
        labeled={true}
      />
      </View>
  )
}

export default AppBottomNavigation

const styles = StyleSheet.create({

    bottomNav: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    elevation: 8,
    backgroundColor: "white",
  },
})