"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Animated,
  StatusBar,
  SafeAreaView,
} from "react-native"
import { useGetAllPatientsQuery, useDeletePatientMutation } from "../../redux/api/patientApi"
import { Ionicons, Feather } from "@expo/vector-icons"
import { Card } from "react-native-paper"
import { useRouter } from "expo-router"
import { useSelector, useDispatch } from "react-redux"
import { selectUser } from "../../redux/slices/authSlice"
import { selectPatients, setPatients, removePatient } from "../../redux/slices/patientSlice"
import { useFocusEffect } from "@react-navigation/native"
import { COLORS } from "@/constants/Colors"

interface Patient {
  _id: string
  patientName: string
  guardiansName: string
  gender: string
  dob: string
  phoneNumber?: string // Correct property name
  phonNumber?: string // Include legacy property name for backward compatibility
  cnic: string
  healthId?: string
  city: string
  reference?: string
  projectId?: string
  mrn?: number
}

const PatientsScreen = () => {
  const router = useRouter()
  const dispatch = useDispatch()
  const user = useSelector(selectUser)
  const projectId = user?.projectId ?? ""
  const searchAnimation = useRef(new Animated.Value(0)).current
  const fadeAnim = useRef(new Animated.Value(0)).current
  const headerAnimation = useRef(new Animated.Value(0)).current
  const [isSearchExpanded, setIsSearchExpanded] = useState(false)
  const searchInputRef = useRef<TextInput | null>(null)
  const [isSearchFocused, setIsSearchFocused] = useState(false)

  const {
    data: fetchedPatients,
    isLoading,
    refetch,
    error,
  } = useGetAllPatientsQuery(undefined, {
    refetchOnFocus: true, // Changed to true for better reloading on screen focus
    refetchOnReconnect: true,
    refetchOnMountOrArgChange: true, // Added for better reload behavior
  })

  const [deletePatient, { isLoading: isDeleting }] = useDeletePatientMutation()
  const patients = useSelector(selectPatients)
  const [searchKeyword, setSearchKeyword] = useState("")
  const listItemAnimations = useRef<Animated.Value[]>([])

  const calculateAge = (dob: string) => {
    if (!dob) return "N/A"

    try {
      const birthDate = new Date(dob)
      const today = new Date()
      let age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()

      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--
      }

      return age.toString()
    } catch (e) {
      return "N/A"
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A"

    try {
      const date = new Date(dateString)
      return date
        .toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
        .replace(/\//g, "/")
    } catch (e) {
      return dateString
    }
  }

  useEffect(() => {
    refetch()
  }, [])

  useEffect(() => {
    if (fetchedPatients?.data) {
      // Map API response to correct property names if needed
      const mappedPatients = fetchedPatients.data.map((patient: Patient & { phonNumber?: string }) => ({
        ...patient,
        // Ensure phoneNumber exists even if API returns phonNumber
        phoneNumber: patient.phoneNumber || patient.phonNumber,
      }))

      dispatch(setPatients(mappedPatients))

      if (mappedPatients.length > 0) {
        listItemAnimations.current = mappedPatients.map(() => new Animated.Value(0))
      }
    }
  }, [fetchedPatients, dispatch])

  useEffect(() => {
    if (patients && patients.length > 0 && listItemAnimations.current.length > 0) {
      Animated.stagger(
        50,
        listItemAnimations.current.map((anim) =>
          Animated.timing(anim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ),
      ).start()
    }
  }, [patients])

  useFocusEffect(
    useCallback(() => {
      refetch().catch((err) => console.error("Failed to fetch patients:", err))

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(headerAnimation, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start()

      return () => {
        fadeAnim.setValue(0)
        headerAnimation.setValue(0)
      }
    }, [refetch, fadeAnim, headerAnimation]),
  )

  const filteredPatients =
    patients?.filter(
      (patient: Patient) =>
        patient.projectId === projectId &&
        (!searchKeyword ||
          patient.patientName.toLowerCase().includes(searchKeyword.toLowerCase()) ||
          patient.cnic.includes(searchKeyword) ||
          ((patient.phoneNumber?.includes(searchKeyword) || patient.phonNumber?.includes(searchKeyword)) ?? false) ||
          String(patient.mrn ?? "").includes(searchKeyword)),
    ) || []

  const handleUpdate = (patient: Patient) => {
    if (!patient || !patient._id) {
      Alert.alert("Error", "Invalid patient data.")
      return
    }

    router.push({
      pathname: "/registration/PatientUpdate",
      params: { patientData: JSON.stringify(patient) },
    })
  }

  const handleDelete = async (id: string) => {
    Alert.alert("Confirm Delete", "Are you sure you want to delete this patient?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        onPress: async () => {
          try {
            await deletePatient(id).unwrap()
            dispatch(removePatient(id as any))
            Alert.alert("Deleted", "Patient deleted successfully.")
            refetch()
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error"
            Alert.alert("Error", `Failed to delete patient: ${errorMessage}`)
          }
        },
      },
    ])
  }

  const handleCreateAppointment = (patient: Patient) => {
    if (!patient || !patient._id) {
      Alert.alert("Error", "Invalid patient data.")
      return
    }

    router.push({
      pathname: "/appointments/CreateAppointmentScreen",
      params: { 
        patientId: patient._id,
        patientName: patient.patientName,
        mrn: patient.mrn?.toString(),
        phoneNumber: patient.phoneNumber || patient.phonNumber
      },
    })
  }

  const handleGoBack = () => {
    router.back()
  }

  const toggleSearch = () => {
    const toValue = isSearchExpanded ? 0 : 1

    Animated.spring(searchAnimation, {
      toValue,
      friction: 8,
      tension: 40,
      useNativeDriver: false,
    }).start(() => {
      if (!isSearchExpanded) {
        searchInputRef.current?.focus()
      } else {
        setSearchKeyword("")
      }
    })

    setIsSearchExpanded(!isSearchExpanded)
  }

  const clearSearch = () => {
    setSearchKeyword("")
    searchInputRef.current?.focus()
  }

  const headerTranslateY = headerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-50, 0],
  })

  const headerOpacity = headerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  })

  const renderPatientCard = ({ item, index }: { item: Patient; index: number }) => {
    const itemAnimation = listItemAnimations.current[index] || new Animated.Value(1)

    const translateY = itemAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [50, 0],
    })

    const opacity = itemAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    })

    // Extract phone number from either property
    const phoneNumber = item.phoneNumber || item.phonNumber || "N/A"

    return (
      <Animated.View style={{ opacity, transform: [{ translateY }] }}>
        <Card style={styles.card}>
          <View style={styles.patientHeader}>
            <Text style={styles.patientName}>{item.patientName}</Text>
            <Text style={styles.patientMeta}>
              Age: {calculateAge(item.dob)} MRN: {item.mrn || "N/A"}
            </Text>
          </View>

          <View style={styles.infoContainer}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Father Name:</Text>
              <Text style={styles.infoValue}>{item.guardiansName}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone Number:</Text>
              <Text style={styles.infoValue}>{phoneNumber}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>DOB:</Text>
              <Text style={styles.infoValue}>{formatDate(item.dob)}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Gender:</Text>
              <Text style={styles.infoValue}>{item.gender}</Text>
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleCreateAppointment(item)}
              activeOpacity={0.7}
            >
              <Ionicons name="repeat-outline"  size={16} color={'#4CAF50'} />
              <Text style={styles.buttonText}>Retake Appointment</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={() => handleUpdate(item)}
              activeOpacity={0.7}
            >
              <Ionicons name="create-outline" size={16} color={'grey'} />
              <Text style={styles.buttonTextE}>Edit Patient</Text>
            </TouchableOpacity>
          </View>
        </Card>
      </Animated.View>
    )
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
        <View style={styles.container}>
          <View style={styles.emptyContainer}>
            <Ionicons name="alert-circle-outline" size={64} color={COLORS.danger} />
            <Text style={[styles.emptyText, { color: COLORS.danger }]}>Error loading patients</Text>
            <Text style={styles.emptySubtext}>Something went wrong. Please try again.</Text>
            <TouchableOpacity style={[styles.appointmentButton, { marginTop: 20 }]} onPress={() => refetch()}>
              <Text style={styles.appointmentText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <Animated.View
        style={[
          styles.header,
          {
            opacity: headerOpacity,
            transform: [{ translateY: headerTranslateY }],
          },
        ]}
      >
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Patients</Text>
        <View style={styles.headerRight} />
      </Animated.View>

      <View style={styles.container}>
        <View style={styles.searchBarContainer}>
          <Animated.View style={[styles.searchContainer, { width: '100%' }]}>
            <View style={styles.searchInputWrapper}>
              <Feather name="search" size={18} color={COLORS.textSecondary} style={styles.searchIcon} />
              <TextInput
                ref={searchInputRef}
                style={styles.searchInput}
                placeholder="Search by name, ID or phone..."
                placeholderTextColor={COLORS.placeholder}
                value={searchKeyword}
                onChangeText={(text) => setSearchKeyword(text)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                returnKeyType="search"
                selectionColor={COLORS.primary}
              />
            
            </View>
          </Animated.View>

        </View>

        {isLoading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading patients...</Text>
          </View>
        ) : (
          <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
            {filteredPatients.length > 0 ? (
              <FlatList
                data={filteredPatients}
                keyExtractor={(item) => item._id}
                renderItem={renderPatientCard}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={64} color={COLORS.lightGray} />
                <Text style={styles.emptyText}>No patients found</Text>
                <Text style={styles.emptySubtext}>
                  {searchKeyword ? "Try a different search term" : "Add patients to get started"}
                </Text>
              </View>
            )}
          </Animated.View>
        )}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  appointmentButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  appointmentText: {
    color: COLORS.cardBackground,
    fontSize: 16,
    fontWeight: "600",
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: COLORS.cardBackground,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  headerRight: {
    width: 40,
  },
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: COLORS.background,
  },
  searchBarContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  searchContainer: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    height: 48,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  searchInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    height: "100%",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textPrimary,
    height: "100%",
    paddingVertical: 8,
    fontWeight: "400",
  },
  clearButton: {
    padding: 6,
  },
  searchButton: {
    backgroundColor: COLORS.cardBackground,
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: COLORS.textSecondary,
    fontSize: 16,
  },
  listContainer: {
    paddingBottom: 20,
  },
  card: {
    padding: 14,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  patientHeader: {
    marginBottom: 12,
  },
  patientMeta: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  patientName: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  infoContainer: {
    marginBottom: 12,
    backgroundColor: "#E4E4E4", // Add grey background
    padding: 12,                // Add padding
    borderRadius: 14,           // Add rounded corners
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.textPrimary,
    textAlign: "right",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  actionButton: {
    flex: 1,
    backgroundColor: "transparent",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: "#388E3C", // Green border
  },
  editButton: {
    backgroundColor: "transparent",
    borderColor: "grey", // Grey border for edit button
  },
  buttonText: {
    color: "#4CAF50", // Green text for appointment button
    fontSize: 11,
    fontWeight: "600",
  },
  buttonTextE: {
    color: "grey", // Green text for appointment button
    fontSize: 11,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.placeholder,
    marginTop: 8,
    textAlign: "center",
    paddingHorizontal: 32,
  },
})

export default PatientsScreen