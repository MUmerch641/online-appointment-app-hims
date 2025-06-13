import Constants from "expo-constants";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  StyleSheet,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { useChangePasswordMutation } from "../../redux/api/authApi";
import { selectUser, logout, updateProfilePicture } from "../../redux/slices/authSlice";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { COLORS } from "@/constants/Colors";

// TypeScript interfaces
interface Hospital {
  hospitalName?: string;
  hospitalLogoUrl?: string;
}

interface User {
  fullName?: string;
  mobileNo?: string;
  profilePicture?: string;
  token?: string;
  hospital?: Hospital;
}

const ProfileScreen: React.FC = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const user = useSelector(selectUser) as User | null;

  const [newPassword, setNewPassword] = useState<string>("");
  const [oldPassword, setOldPassword] = useState<string>("");
  const [changePassword, { isLoading }] = useChangePasswordMutation();
  const [profilePicture, setProfilePicture] = useState<string>(user?.profilePicture || "");
  const [isImageLoading, setIsImageLoading] = useState<boolean>(false);
  
  const fadeAnim = useState(new Animated.Value(0))[0];
  const scaleAnim = useState(new Animated.Value(0.9))[0];

  useEffect(() => {
    loadProfilePicture();
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const loadProfilePicture = async () => {
    try {
      setIsImageLoading(true);
      const persistentProfilePic = await AsyncStorage.getItem("persistentProfilePicture");
      
      if (persistentProfilePic) {
        setProfilePicture(persistentProfilePic);
        dispatch(updateProfilePicture(persistentProfilePic));
        await AsyncStorage.setItem("profilePicture", persistentProfilePic);
      } else {
        const regularProfilePic = await AsyncStorage.getItem("profilePicture");
        if (regularProfilePic) {
          setProfilePicture(regularProfilePic);
          dispatch(updateProfilePicture(regularProfilePic));
          await AsyncStorage.setItem("persistentProfilePicture", regularProfilePic);
        }
      }
    } catch (error) {
      Alert.alert("Error", "Failed to load profile picture");
    } finally {
      setIsImageLoading(false);
    }
  };

  const handleUploadImage = async () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled && result.assets?.length > 0) {
      const selectedImageUri = result.assets[0].uri;
      setProfilePicture(selectedImageUri);

      const formData = new FormData();
      formData.append("file", {
        uri: selectedImageUri,
        type: "image/jpeg",
        name: "profile.jpg",
      } as any);
      formData.append("upload_preset", "PAKHIMS");

      try {
        setIsImageLoading(true);
        const response = await fetch(`https://api.cloudinary.com/v1_1/dd1chofv4/image/upload`, {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (data.secure_url) {
          const imageUrl = data.secure_url;
          setProfilePicture(imageUrl);
          dispatch(updateProfilePicture(imageUrl));
          
          await AsyncStorage.setItem("profilePicture", imageUrl);
          await AsyncStorage.setItem("persistentProfilePicture", imageUrl);
          
          Alert.alert("Success", "Profile picture uploaded successfully!");
        } else {
          Alert.alert("Error", "Failed to upload image");
        }
      } catch (err) {
        Alert.alert("Error", "An error occurred while uploading the image");
      } finally {
        setIsImageLoading(false);
      }
    }
  };

  const handleChangePassword = async () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();

    if (!oldPassword || !newPassword) {
      Alert.alert("Error", "Please enter both passwords");
      return;
    }

    if (!user?.mobileNo) {
      Alert.alert("Error", "User data missing. Please log in again");
      return;
    }

    try {
      const response = await fetch(
        `${Constants.expoConfig?.extra?.API_BASE_URL}/online-apmt/patient-auth/change_password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.token}`,
          },
          body: JSON.stringify({
            mobileNo: user.mobileNo,
            oldPassword,
            newPassword,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        Alert.alert("Success", "Password updated successfully!");
        setOldPassword("");
        setNewPassword("");
      } else {
        Alert.alert("Error", data?.message || "Failed to change password");
      }
    } catch (error) {
      Alert.alert("Error", "An error occurred while updating password");
    }
  };

  const handleLogout = async () => {
    try {
      if (profilePicture) {
        await AsyncStorage.setItem("persistentProfilePicture", profilePicture);
      }
      
      dispatch(logout());
      await AsyncStorage.multiRemove(["token", "refreshToken", "profilePicture"]);
      router.replace("/auth/LoginScreen");
    } catch (error) {
      Alert.alert("Error", "Failed to logout");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <Animated.View
        style={[
          styles.mainContainer,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        ]}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={styles.placeholderView} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >  
          {/* Hospital Information */}
          <View style={styles.hospitalSection}>
            {user?.hospital?.hospitalLogoUrl ? (
              <Image
                source={{ uri: user.hospital.hospitalLogoUrl }}
                style={styles.hospitalLogo}
                onError={() => Alert.alert("Error", "Failed to load hospital logo")}
              />
            ) : (
              <View style={styles.hospitalLogoPlaceholder}>
                <Ionicons name="business" size={40} color={COLORS.textSecondary} />
              </View>
            )}
            <Text style={styles.hospitalName}>
              {user?.hospital?.hospitalName || "No Hospital Assigned"}
            </Text>
            <View style={styles.hospitalDivider} />
          </View>

          <Animated.View style={styles.profileSection}>
            <TouchableOpacity
              style={styles.profilePictureContainer}
              onPress={handleUploadImage}
              activeOpacity={0.8}
              disabled={isImageLoading}
            >
              {isImageLoading ? (
                <ActivityIndicator size="large" color={COLORS.primary} />
              ) : (
                <Image
                  source={{ uri: profilePicture || "https://via.placeholder.com/150" }}
                  style={styles.profilePicture}
                />
              )}
              <View style={styles.editIcon}>
                <Ionicons name="camera" size={20} color="white" />
              </View>
            </TouchableOpacity>
            <Text style={styles.userName}>{user?.fullName || "User Name"}</Text>
          </Animated.View>

          <View style={styles.infoSection}>
            <View style={styles.inputContainer}>
              <Text style={styles.sectionTitle}>User Information</Text>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={user?.fullName || ""}
                editable={false}
              />
              <Text style={styles.label}>Mobile Number</Text>
              <TextInput
                style={styles.input}
                value={user?.mobileNo || ""}
                editable={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.sectionTitle}>Change Password</Text>
              <Text style={styles.label}>Current Password</Text>
              <TextInput
                style={styles.input}
                value={oldPassword}
                onChangeText={setOldPassword}
                secureTextEntry
                placeholder="Enter current password"
                placeholderTextColor={COLORS.placeholder}
              />
              <Text style={styles.label}>New Password</Text>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                placeholder="Enter new password"
                placeholderTextColor={COLORS.placeholder}
              />
            </View>

            <TouchableOpacity
              style={[styles.changePasswordButton, isLoading && styles.buttonDisabled]}
              onPress={handleChangePassword}
              activeOpacity={0.8}
              disabled={isLoading}
            >
              <Text style={styles.changePasswordText}>
                {isLoading ? "Changing..." : "Change Password"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
              activeOpacity={0.8}
            >
              <Ionicons name="log-out-outline" size={20} color="white" style={styles.buttonIcon} />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Animated.View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  mainContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 50,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  backButton: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: COLORS.cardBackground,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  placeholderView: {
    width: 44,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  hospitalSection: {
    alignItems: "center",
    marginBottom: 24,
    padding: 20,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  hospitalLogo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
    resizeMode: "contain",
    backgroundColor: COLORS.background,
  },
  hospitalLogoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
    backgroundColor: COLORS.lightGray,
    justifyContent: "center",
    alignItems: "center",
  },
  hospitalName: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.textPrimary,
    textAlign: "center",
    marginBottom: 12,
  },
  hospitalDivider: {
    width: "80%",
    height: 1,
    backgroundColor: COLORS.lightGray,
    marginVertical: 8,
  },
  profileSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  profilePictureContainer: {
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 16,
  },
  profilePicture: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 4,
    borderColor: COLORS.cardBackground,
  },
  editIcon: {
    position: "absolute",
    bottom: 4,
    right: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: COLORS.cardBackground,
  },
  userName: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  infoSection: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
    fontWeight: "500",
  },
  input: {
    width: "100%",
    height: 50,
    borderColor: COLORS.lightGray,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: COLORS.background,
    marginBottom: 16,
    color: COLORS.textPrimary,
  },
  changePasswordButton: {
    alignItems: "center",
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: COLORS.lightGray,
    opacity: 0.7,
  },
  changePasswordText: {
    fontSize: 16,
    color: COLORS.cardBackground,
    fontWeight: "700",
  },
  logoutButton: {
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.danger,
    padding: 16,
    borderRadius: 12,
    shadowColor: COLORS.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  buttonIcon: {
    marginRight: 8,
  },
  logoutText: {
    fontSize: 16,
    color: COLORS.cardBackground,
    fontWeight: "700",
  },
});

export default ProfileScreen;