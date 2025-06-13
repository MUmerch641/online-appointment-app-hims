import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesome5 } from "@expo/vector-icons";
import { useRouter, usePathname } from "expo-router";
import { COLORS } from "@/constants/Colors";

const BottomNavigation = () => {
  const router = useRouter();
  const currentPath = usePathname();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.tab}
        onPress={() => router.replace('/dashboard/DashboardScreen')}
      >
        <FontAwesome5 
          name="calendar-alt" 
          size={24} 
          color={currentPath.includes('DashboardScreen') ? COLORS.primary : '#666'} 
        />
        <Text style={[
          styles.tabText,
          currentPath.includes('DashboardScreen') && styles.activeTabText
        ]}>Appointment</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.tab}
        onPress={() => router.replace('/dashboard/PatientScreen')}
      >
        <FontAwesome5 
          name="hospital-user" 
          size={24} 
          color={currentPath.includes('PatientScreen') ? COLORS.primary : '#666'} 
        />
        <Text style={[
          styles.tabText,
          currentPath.includes('PatientScreen') && styles.activeTabText
        ]}>Patient</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.tab}
        onPress={() => router.replace('/dashboard/ProfileScreen')}
      >
        <FontAwesome5 
          name="user" 
          size={24} 
          color={currentPath.includes('ProfileScreen') ? COLORS.primary : '#666'} 
        />
        <Text style={[
          styles.tabText,
          currentPath.includes('ProfileScreen') && styles.activeTabText
        ]}>Profile</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    height: 60,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: 12,
    color: '#666',
  },
  activeTabText: {
    color: COLORS.primary,
  },
});

export default BottomNavigation;