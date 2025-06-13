import React from "react";
import { Tabs } from "expo-router";
import { View, Image } from "react-native";
import { useSelector } from "react-redux";
import { selectUser } from "../../redux/slices/authSlice";
import { FontAwesome5 } from "@expo/vector-icons";

const ProfilePicture = () => {
  const user = useSelector(selectUser);
  return (
    <View style={{ marginRight: 15 }}>
      <Image
        source={{ uri: user?.profilePicture || "https://via.placeholder.com/40" }}
        style={{ width: 40, height: 40, borderRadius: 20 }}
      />
    </View>
  );
};

export default function Layout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        headerRight: () => <ProfilePicture />,
        tabBarActiveTintColor: "#1F75FE",
        tabBarInactiveTintColor: "#666",
      }}
    >
      <Tabs.Screen
        name="DashboardScreen"
        options={{
          title: "Appointment",
          tabBarIcon: ({ color, size }) => <FontAwesome5 name="calendar-alt" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="PatientScreen"
        options={{
          title: "Patient",
          tabBarIcon: ({ color, size }) => <FontAwesome5 name="hospital-user" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="ProfileScreen" 
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <FontAwesome5 name="user" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
