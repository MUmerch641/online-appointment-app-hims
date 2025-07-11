"use client"

import type React from "react"
import { useState, useEffect } from "react"
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Image,
    ScrollView,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import * as Animatable from "react-native-animatable"
import { Ionicons, Feather } from "@expo/vector-icons"
import { StatusBar } from "expo-status-bar"
import Constants from "expo-constants"
import { router, useLocalSearchParams } from "expo-router"
import AsyncStorage from '@react-native-async-storage/async-storage'
import AppointmentFlowService from '../services/appointmentFlowService'
import { isUserAuthenticated } from '../utils/authUtils'
import { useDispatch, useSelector } from 'react-redux'
import { updateHospitalData, updateDoctorData } from '../redux/slices/authSlice'
import { RootState } from '../redux/store'

// Interfaces
interface Service {
  _id: string;
  serviceName: string;
  fee: number;
  hospitalChargesInPercentage: number;
  extra: Record<string, unknown>;
}

interface Doctor {
    _id: string
    fullName: string
    specialization: string
    photoUrl?: string
    designationDetail?: string
    availableDays?: string[]
    email?: string
    phone?: string
    services?: Service[]
}

interface DoctorsApiResponse {
    isSuccess: boolean
    data: Doctor[]
    message: string
    totalCount: number
}

interface Hospital {
    _id: string
    hospitalName: string
    address: string
    city: string
    hospitalLogoUrl: string | null
}

// Constants
const COLORS = {
    primary: "#4A80F0",
    secondary: "#F0F4FF",
    textPrimary: "#1A1A1A",
    textSecondary: "#666",
    placeholder: "#999",
    lightGray: "#CCCCCC",
    white: "#FFFFFF",
    background: "#F8F9FA",
    border: "rgba(0,0,0,0.05)",
    success: "#4CAF50",
    error: "#FF6B6B",
}

const DOCTORS_API_ENDPOINT = "/stg_online-apmt/online-appointment/getAllDoctorsByHospitalId"
const AUTH_TOKEN_KEY = "persist:auth"

const DoctorsScreen: React.FC = () => {
    const dispatch = useDispatch()
    const [doctors, setDoctors] = useState<Doctor[]>([])
    const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([])
    const [searchQuery, setSearchQuery] = useState<string>("")
    const [loading, setLoading] = useState<boolean>(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null)
    const selectedDoctor = useSelector((state: RootState) => state.auth.user?.doctor)
    const [SendToSlot, setSendToSlot] = useState<string>("")
    const [dataForAppoitment, setdataForAppoitment] = useState<object>()

    const params = useLocalSearchParams()

    // Parse hospital data from params
    useEffect(() => {
        const hospitalId = params.hospitalId as string
        const hospitalName = params.hospitalName as string
        const hospitalDataParam = params.hospitalData as string
        const sndToSlot = params.sendToSlot as string
        const dataForAppoitment = params.dataForAppoitment as object

        if (hospitalDataParam) {
            try {
                const hospitalData = JSON.parse(hospitalDataParam) as Hospital
                setSelectedHospital(hospitalData)
                setSendToSlot(sndToSlot)
                setdataForAppoitment(dataForAppoitment)
                
                // Store hospital data in Redux for profile screen access
                dispatch(updateHospitalData({
                    _id: hospitalData._id,
                    hospitalName: hospitalData.hospitalName,
                    hospitalLogoUrl: hospitalData.hospitalLogoUrl,
                    address: hospitalData.address,
                    city: hospitalData.city,
                }))

                
                fetchDoctors(hospitalData._id)
            } catch (err) {
                console.error("Error parsing hospital data:", err)
                setError("Error loading hospital data")
                setLoading(false)
            }
        } else if (hospitalId) {
            // Create minimal hospital object if only ID is provided
            const hospitalInfo = {
                _id: hospitalId,
                hospitalName: hospitalName || "Hospital",
                address: "",
                city: "",
                hospitalLogoUrl: null,
            }
            setSelectedHospital(hospitalInfo)
            
            // Store minimal hospital data in Redux
            dispatch(updateHospitalData({
                _id: hospitalId,
                hospitalName: hospitalName || "Hospital",
            }))
            
            fetchDoctors(hospitalId)
        }


         else {
            setError("Hospital information is required")
            setLoading(false)
        }
    }, [params.hospitalId, params.hospitalName, params.hospitalData, params.sendToSlot])

    // Filter doctors based on search query
    useEffect(() => {
        if (searchQuery.trim() === "") {
            setFilteredDoctors(doctors)
        } else {
            const filtered = doctors.filter(
                (doctor) =>
                    doctor.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    doctor.specialization.toLowerCase().includes(searchQuery.toLowerCase())
            )
            setFilteredDoctors(filtered)
        }
    }, [searchQuery, doctors])

    // Fetch doctors from API
    const fetchDoctors = async (hospitalId: string) => {
        setLoading(true)
        setError(null)

        try {
            const API_BASE_URL = Constants.expoConfig?.extra?.API_BASE_URL || process.env.API_BASE_URL

            const response = await fetch(
                `${API_BASE_URL}${DOCTORS_API_ENDPOINT}/${hospitalId}`,
                {
                    method: "GET",
                    headers: {
                        Accept: "application/json",
                        "Content-Type": "application/json",
                    },
                }
            )

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            const data: DoctorsApiResponse = await response.json()

            if (data.isSuccess && data.data) {
                setDoctors(data.data)
                setFilteredDoctors(data.data)
            } else {
                setError(data.message || "Failed to load doctors")
            }
        } catch (err) {
            console.error("Error fetching doctors:", err)
            setError(err instanceof Error ? err.message : "An error occurred while fetching doctors")

            // Mock data for demo
            const mockDoctors: Doctor[] = [
                {
                    _id: "1",
                    fullName: "Dr. Ahmad Ali",
                    specialization: "Cardiologist",
                    photoUrl: "https://example.com/doctor1.jpg",
                    designationDetail: "Senior Consultant Cardiologist with 15+ years experience",
                    availableDays: ["Monday", "Wednesday", "Friday"],
                    services: [
                        { _id: "s1", serviceName: "Cardiac Consultation", fee: 1500, hospitalChargesInPercentage: 10, extra: {} },
                        { _id: "s2", serviceName: "Echocardiogram", fee: 3000, hospitalChargesInPercentage: 15, extra: {} },
                    ],
                },
                {
                    _id: "2",
                    fullName: "Dr. Fatima Khan",
                    specialization: "Pediatrician",
                    designationDetail: "Provides healthcare for infants, children, and adolescents",
                    availableDays: ["Tuesday", "Thursday", "Saturday"],
                    services: [
                        { _id: "s3", serviceName: "Pediatric Consultation", fee: 1200, hospitalChargesInPercentage: 10, extra: {} },
                        { _id: "s4", serviceName: "Vaccination", fee: 800, hospitalChargesInPercentage: 5, extra: {} },
                    ],
                },
            ]
            setDoctors(mockDoctors)
            setFilteredDoctors(mockDoctors)
        } finally {
            setLoading(false)
        }
    }

    // Get short day name
    const getShortDayName = (day: string): string => {
        const dayMap: { [key: string]: string } = {
            monday: "Mon",
            tuesday: "Tue",
            wednesday: "Wed",
            thursday: "Thu",
            friday: "Fri",
            saturday: "Sat",
            sunday: "Sun",
        }
        const lowerDay = day.toLowerCase()
        return dayMap[lowerDay] || day
    }

    // Check if user is authenticated
    const checkUserAuthentication = async (): Promise<boolean> => {
        try {
            const persistedAuth = await AsyncStorage.getItem(AUTH_TOKEN_KEY)
            if (persistedAuth) {
                const authData = JSON.parse(persistedAuth)
                return isUserAuthenticated(authData.isAuthenticated)
            }
            return false
        } catch (error) {
            console.error('Error checking user authentication:', error)
            return false
        }
    }

    // Handle doctor selection
    const handleDoctorChange = async (doctorId: string) => {
        try {
            const selectedDoctor = doctors.find((doc) => doc._id === doctorId)

            if (selectedDoctor) {
                // Store doctor data including services in Redux
                dispatch(updateDoctorData({
                    _id: selectedDoctor._id,
                    fullName: selectedDoctor.fullName,
                    specialization: selectedDoctor.specialization,
                    photoUrl: selectedDoctor.photoUrl,
                    designationDetail: selectedDoctor.designationDetail,
                    availableDays: selectedDoctor.availableDays,
                    services: selectedDoctor.services || [],
                }))

                // Check user authentication
                const isAuthenticated = await checkUserAuthentication()

                if (!isAuthenticated) {
                    // Store appointment flow data before redirecting to login
                    await AppointmentFlowService.storeAppointmentFlow({
                        hospitalId: selectedHospital?._id || params.hospitalId as string,
                        hospitalName: selectedHospital?.hospitalName || params.hospitalName as string,
                        hospitalData: selectedHospital ? JSON.stringify(selectedHospital) : undefined,
                        doctorId: selectedDoctor._id,
                        doctorData: JSON.stringify(selectedDoctor),
                        cityName: params.cityName as string,
                        mrn: params.mrn as string,
                        redirectAfterLogin: true,
                        timestamp: Date.now()
                    })

                    // Directly navigate to login screen without alert
                    router.push({
                        pathname: "/auth/LoginScreen",
                        params: { 
                            hospitalId: selectedHospital?._id || params.hospitalId,
                            redirectToAppointment: 'true'
                        }
                    })
                    return
                }

                // User is authenticated, proceed directly to appointment creation
                const persistedAuth = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
                let patientId = null;
                let patientName = null;

                if (persistedAuth) {
                    const authData = JSON.parse(persistedAuth);

                    if (authData.user) {
                        // Parse user data if it's stored as a string
                        const userData = typeof authData.user === 'string'
                            ? JSON.parse(authData.user)
                            : authData.user;
                        patientId = userData._id || null;
                        patientName = userData.fullName || null;
                    }
                }

                // Navigate directly to appointment creation screen
           if (SendToSlot) {
            console.log(dataForAppoitment)
                 router.push({
                    pathname: "/appointments/CreateAppointmentScreen",
                    params: {
                        ...dataForAppoitment
                    },
                })
           }
                router.push({
                    pathname: "/dashboard/HimsPatientScreen",
                    params: {
                        doctorId: selectedDoctor._id,
                        doctorData: JSON.stringify(selectedDoctor),
                        hospitalData: selectedHospital ? JSON.stringify(selectedHospital) : null,
                        patientId,
                        patientName,
                        mrn: params.mrn || null,
                    },
                })
            } else {
                console.error("Doctor not found");
            }
        } catch (error) {
            console.error('Error in handleDoctorChange:', error);
        }
    }

    // Handle back navigation
    const handleBack = () => {
        dispatch(updateDoctorData(null)) // Clear doctor data on back navigation
        router.back()
    }

    // Render loading state
    const renderLoading = () => (
        <View style={styles.centerContainer}>
            <Animatable.View animation="pulse" iterationCount="infinite" duration={1500}>
                <Ionicons name="medical" size={60} color={COLORS.primary} />
            </Animatable.View>
            <Text style={styles.loadingText}>Loading doctors...</Text>
        </View>
    )

    // Render error state
    const renderError = () => (
        <View style={styles.centerContainer}>
            <Ionicons name="alert-circle" size={60} color={COLORS.error} />
            <Text style={styles.errorTitle}>Something went wrong</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <TouchableOpacity
                style={styles.retryButton}
                onPress={() => selectedHospital && fetchDoctors(selectedHospital._id)}
            >
                <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
        </View>
    )

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                        <Feather name="arrow-left" size={22} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Select Doctor</Text>
                    <View style={styles.placeholder} />
                </View>
                {selectedHospital && (
                    <Text style={styles.hospitalName}>{selectedHospital.hospitalName}</Text>
                )}
            </View>

            {loading ? (
                renderLoading()
            ) : error ? (
                renderError()
            ) : (
                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    <View style={styles.formSection}>
                        <Text style={styles.sectionTitle}>Select Doctor</Text>
                        <View style={styles.searchContainer}>
                            <Ionicons name="search" size={20} color={COLORS.primary} style={styles.searchIcon} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search by doctor name or specialization"
                                placeholderTextColor={COLORS.placeholder}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                            {searchQuery ? (
                                <TouchableOpacity onPress={() => setSearchQuery("")} style={styles.clearButton}>
                                    <Ionicons name="close-circle" size={16} color={COLORS.textSecondary} />
                                </TouchableOpacity>
                            ) : null}
                        </View>
                        <View style={styles.doctorsContainer}>
                            {filteredDoctors?.length ? (
                                filteredDoctors.map((doctor: Doctor) => (
                                    <Animatable.View
                                        key={doctor._id}
                                        animation="fadeInUp"
                                        duration={300}
                                        style={styles.doctorCard}
                                    >
                                        <View style={styles.cardTopSection}>
                                            <View style={styles.doctorImageContainer}>
                                                <Image
                                                    source={
                                                        doctor.photoUrl
                                                            ? { uri: doctor.photoUrl }
                                                            : require("../assets/images/icon.png")
                                                    }
                                                    style={styles.doctorImage}
                                                />
                                            </View>
                                            <View style={styles.doctorInfo}>
                                                <Text style={styles.doctorName}>{doctor.fullName}</Text>
                                                <Text style={styles.doctorSpecialty}>{doctor.specialization}</Text>
                                                <Text style={styles.doctorDescription}>
                                                    {doctor.designationDetail ||
                                                        "Provides healthcare for infants, children, and adolescents."}
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={styles.availabilityFooter}>
                                            <Text style={styles.availabilityLabel}>
                                                Available:{" "}
                                                <Text style={styles.availabilityDays}>
                                                    {doctor.availableDays?.length
                                                        ? (() => {
                                                            const shortDays = doctor.availableDays.map(getShortDayName)
                                                            return shortDays.join(", ")
                                                        })()
                                                        : "Contact clinic for availability"}
                                                </Text>
                                            </Text>
                                            <View style={styles.selectButtonContainer}>
                                                <TouchableOpacity
                                                    style={styles.selectButton}
                                                    onPress={() => handleDoctorChange(doctor._id)}
                                                    activeOpacity={0.7}
                                                >
                                                    <Text style={styles.selectButtonText}>Select</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    </Animatable.View>
                                ))
                            ) : (
                                <View style={styles.noDataContainer}>
                                    <Ionicons name="medical" size={40} color={COLORS.lightGray} />
                                    <Text style={styles.noDataText}>
                                        {searchQuery ? "No doctors found matching your search" : "No doctors available"}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                </ScrollView>
            )}
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    headerTop: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.secondary,
        justifyContent: "center",
        alignItems: "center",
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: COLORS.textPrimary,
    },
    placeholder: {
        width: 40,
    },
    hospitalName: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginTop: 4,
        textAlign: "center",
    },
    content: {
        flex: 1,
    },
    formSection: {
        padding: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: COLORS.textPrimary,
        marginBottom: 16,
    },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.white,
        borderRadius: 12,
        paddingHorizontal: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    searchIcon: {
        marginRight: 12,
    },
    searchInput: {
        flex: 1,
        height: 48,
        fontSize: 16,
        color: COLORS.textPrimary,
    },
    clearButton: {
        padding: 4,
    },
    doctorsContainer: {
        gap: 16,
    },
    doctorCard: {
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    cardTopSection: {
        flexDirection: "row",
        marginBottom: 12,
    },
    doctorImageContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        overflow: "hidden",
        marginRight: 12,
        backgroundColor: COLORS.secondary,
    },
    doctorImage: {
        width: 60,
        height: 60,
        borderRadius: 30,
        resizeMode: "cover",
    },
    doctorInfo: {
        flex: 1,
    },
    doctorName: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    doctorSpecialty: {
        fontSize: 14,
        color: COLORS.primary,
        fontWeight: "500",
        marginBottom: 4,
    },
    doctorDescription: {
        fontSize: 12,
        color: COLORS.textSecondary,
        lineHeight: 16,
    },
    availabilityFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    availabilityLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
        flex: 1,
    },
    availabilityDays: {
        fontWeight: "500",
        color: COLORS.success,
    },
    selectButtonContainer: {
        marginLeft: 12,
    },
    selectButton: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 6,
    },
    selectButtonText: {
        color: COLORS.white,
        fontSize: 14,
        fontWeight: "500",
    },
    noDataContainer: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 40,
    },
    noDataText: {
        fontSize: 16,
        color: COLORS.textSecondary,
        textAlign: "center",
        marginTop: 12,
    },
    centerContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 40,
    },
    loadingText: {
        fontSize: 16,
        color: COLORS.textSecondary,
        marginTop: 16,
    },
    errorTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: COLORS.textPrimary,
        marginTop: 16,
        textAlign: "center",
    },
    errorMessage: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginTop: 8,
        textAlign: "center",
        lineHeight: 20,
    },
    retryButton: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
        marginTop: 20,
    },
    retryButtonText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: "500",
    },
})

export default DoctorsScreen