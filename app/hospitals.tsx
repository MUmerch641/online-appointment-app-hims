"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Dimensions,
    Keyboard,
    Animated,
    Image,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import * as Animatable from "react-native-animatable"
import { Feather } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { StatusBar } from "expo-status-bar"
import Constants from "expo-constants"
import { router, useLocalSearchParams } from "expo-router"

// API response interfaces
interface HospitalApiResponse {
    isSuccess: boolean
    data: Hospital[]
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

interface City {
    name: string
    province: string
    lat: string
    lng: string
    coordinates?: {
        latitude: number
        longitude: number
    }
}

interface HospitalScreenProps {
    navigation?: any
}

// Constants
const { width } = Dimensions.get("window")
const ANIMATION_DURATION = 800
const HOSPITAL_API_ENDPOINT = "/stg_online-apmt/patient-auth/getAllHospital"

// Skeleton loader component
const HospitalSkeletonLoader = () => (
    <Animatable.View animation="pulse" iterationCount="infinite" duration={1500} style={styles.skeletonCard}>
        <View style={styles.skeletonContent}>
            <View style={styles.skeletonLogo} />
            <View style={styles.skeletonTextContainer}>
                <View style={styles.skeletonText} />
                <View style={styles.skeletonSubtext} />
            </View>
            <View style={styles.skeletonArrow} />
        </View>
    </Animatable.View>
)

// Hospital card component
const HospitalCard: React.FC<{
    hospital: Hospital
    onSelect: () => void
}> = ({ hospital, onSelect }) => (
    <TouchableOpacity style={styles.hospitalCard} onPress={onSelect} activeOpacity={0.7}>
        <View style={styles.hospitalCardContent}>
            <View style={styles.logoContainer}>
                {hospital.hospitalLogoUrl ? (
                    <Image source={{ uri: hospital.hospitalLogoUrl }} style={styles.hospitalLogo} resizeMode="contain" />
                ) : (
                    <View style={styles.placeholderLogo}>
                        <Text style={styles.placeholderText}>{hospital.hospitalName.charAt(0).toUpperCase()}</Text>
                    </View>
                )}
            </View>
            <View style={styles.hospitalTextContainer}>
                <Text style={styles.hospitalName} numberOfLines={2} ellipsizeMode="tail">
                    {hospital.hospitalName}
                </Text>
                <Text style={styles.hospitalAddress}>
                    <Feather name="map-pin" size={12} color="#666" /> {hospital.address}
                </Text>
            </View>
            <Feather name="chevron-right" size={20} color="#999" />
        </View>
    </TouchableOpacity>
)

const HospitalScreen: React.FC<HospitalScreenProps> = ({ navigation }) => {
    const [hospitals, setHospitals] = useState<Hospital[]>([])
    const [filteredHospitals, setFilteredHospitals] = useState<Hospital[]>([])
    const [searchQuery, setSearchQuery] = useState<string>("")
    const [loading, setLoading] = useState<boolean>(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedCity, setSelectedCity] = useState<City | null>(null)

    const searchInputRef = useRef<TextInput>(null)
    const scrollY = useRef(new Animated.Value(0)).current
    const insets = useSafeAreaInsets()
    const params = useLocalSearchParams()

    // Animation values
    const headerOpacity = scrollY.interpolate({
        inputRange: [0, 100],
        outputRange: [1, 0.9],
        extrapolate: "clamp",
    })

    const headerTranslateY = scrollY.interpolate({
        inputRange: [0, 100],
        outputRange: [0, -20],
        extrapolate: "clamp",
    })

    // Parse params
    useEffect(() => {
        const cityName = params.cityName as string
        const hospitalDataParam = params.hospitalData as string
        const cityDataParam = params.cityData as string

        if (cityName && hospitalDataParam) {
            try {
                const hospitalData = JSON.parse(hospitalDataParam) as HospitalApiResponse
                const cityData = cityDataParam ? (JSON.parse(cityDataParam) as City) : null

                if (cityData) {
                    setSelectedCity(cityData)
                } else {
                    setSelectedCity({
                        name: cityName,
                        province: "",
                        lat: "",
                        lng: "",
                    })
                }

                if (hospitalData.isSuccess && hospitalData.data) {
                    setHospitals(hospitalData.data)
                    setFilteredHospitals(hospitalData.data)
                } else {
                    setError(hospitalData.message || "Failed to load hospitals")
                }
                setLoading(false)
            } catch (err) {
                console.error("Error parsing params:", err)
                setError("Error loading hospital data")
                setLoading(false)
            }
        } else if (cityName) {
            // If only cityName is provided, fetch hospitals directly
            fetchHospitals(cityName)
        } else {
            setError("City name is required")
            setLoading(false)
        }
    }, [params.cityName, params.hospitalData, params.cityData])

    // Fetch hospitals from API
    const fetchHospitals = async (cityName?: string) => {
        setLoading(true)
        setError(null)

        try {
            const targetCity = cityName || (params.cityName as string)
            if (!targetCity) {
                throw new Error("City name is required")
            }

            setSelectedCity({
                name: targetCity,
                province: "",
                lat: "",
                lng: "",
            })

            const API_BASE_URL = Constants.expoConfig?.extra?.API_BASE_URL || process.env.API_BASE_URL

            const response = await fetch(`${API_BASE_URL}${HOSPITAL_API_ENDPOINT}?city=${encodeURIComponent(targetCity)}`, {
                method: "GET",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                },
            })

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            const data: HospitalApiResponse = await response.json()

            if (data.isSuccess && data.data) {
                setHospitals(data.data)
                setFilteredHospitals(data.data)
            } else {
                setError(data.message || "Failed to load hospitals")
            }
        } catch (err) {
            console.error("Error fetching hospitals:", err)
            setError(err instanceof Error ? err.message : "An error occurred while fetching hospitals")

            // For demo purposes, use mock data if API fails
            const mockResponse: HospitalApiResponse = {
                isSuccess: true,
                data: [
                    {
                        _id: "65e60592d38b237f73c1d4de",
                        hospitalName: "Curelogic Hospital",
                        address: "123 Medical Avenue, Lahore",
                        city: "Lahore",
                        hospitalLogoUrl: "https://pakhims.com/stg/public/uploads/08c4043e-3eec-4308-86a1-332107c206fe-ssdad.PNG",
                    },
                    {
                        _id: "67d90ae1f558b6ad454654e4",
                        hospitalName: "City Medical Center",
                        hospitalLogoUrl: "https://pakhims.com/stg/public/uploads/373d6754-eeb6-4d49-8d2f-ac8068a481b0-ssdad.PNG",
                        address: "45 Healthcare Road, Lahore",
                        city: "Lahore",
                    },
                    {
                        _id: "67d953a5c108f8694cf58f64",
                        hospitalName: "General Hospital & Medical Research Center",
                        hospitalLogoUrl: null,
                        address: "786 Wellness Street, Lahore",
                        city: "Lahore",
                    },
                ],
                message: "Get Hospitals successfully",
                totalCount: 3,
            }

            setHospitals(mockResponse.data)
            setFilteredHospitals(mockResponse.data)
        } finally {
            setLoading(false)
        }
    }

    // Handle search
    const handleSearch = (text: string): void => {
        setSearchQuery(text)

        if (text.length === 0) {
            setFilteredHospitals(hospitals)
            return
        }

        const filtered = hospitals.filter(
            (hospital) =>
                hospital.hospitalName.toLowerCase().includes(text.toLowerCase()) ||
                hospital.address.toLowerCase().includes(text.toLowerCase()),
        )

        setFilteredHospitals(filtered)
    }

    // Clear search
    const clearSearch = (): void => {
        setSearchQuery("")
        setFilteredHospitals(hospitals)
        Keyboard.dismiss()
    }

    // Handle hospital selection
    const handleSelectHospital = (hospital: Hospital): void => {
        console.log("Selected hospital:", hospital)

        // Navigate to hospital detail screen
        // router.push({
        //   pathname: "/hospital-detail",
        //   params: {
        //     hospitalId: hospital._id,
        //     hospitalData: JSON.stringify(hospital),
        //   },
        // })
    }

    // Handle back button
    const handleBack = (): void => {
        router.back()
    }

    // Handle login
    const handleLogin = (): void => {
        router.push("/auth/LoginScreen")
    }

    // Render empty state
    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <Feather name="clipboard" size={60} color="#CCCCCC" />
            <Text style={styles.emptyTitle}>No hospitals found</Text>
            <Text style={styles.emptySubtitle}>
                {searchQuery ? "Try a different search term" : `No hospitals available in ${selectedCity?.name || "this city"}`}
            </Text>

            {searchQuery && (
                <TouchableOpacity style={styles.resetButton} onPress={clearSearch}>
                    <Text style={styles.resetButtonText}>Clear search</Text>
                </TouchableOpacity>
            )}
        </View>
    )

    // Render error state
    const renderError = () => (
        <View style={styles.errorContainer}>
            <Feather name="alert-circle" size={60} color="#FF6B6B" />
            <Text style={styles.errorTitle}>Something went wrong</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => fetchHospitals()}>
                <Feather name="refresh-cw" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
        </View>
    )

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <StatusBar style="dark" />

            {/* Header */}
            <Animated.View
                style={[
                    styles.header,
                    {
                        opacity: headerOpacity,
                        transform: [{ translateY: headerTranslateY }],
                        paddingTop: insets.top > 0 ? 10 : 20,
                    },
                ]}
            >
                <View style={styles.headerContent}>
                    <View style={styles.headerTopRow}>
                        <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
                            <Feather name="arrow-left" size={22} color="#333" />
                        </TouchableOpacity>

                        <Animatable.View
                            animation="pulse"
                            iterationCount="infinite"
                            duration={2000}
                            useNativeDriver
                        >
                            <TouchableOpacity style={styles.loginButton} onPress={handleLogin} activeOpacity={0.7}>
                                <Feather name="user" size={16} color="#FFFFFF" />
                                <Text style={styles.loginButtonText}>Login</Text>
                            </TouchableOpacity>
                        </Animatable.View>

                    </View>

                    <View style={styles.titleContainer}>
                        <Animatable.Text animation="fadeIn" duration={ANIMATION_DURATION} style={styles.title} useNativeDriver>
                            Hospitals in {selectedCity?.name || ""}
                        </Animatable.Text>
                        <Animatable.Text
                            animation="fadeIn"
                            duration={ANIMATION_DURATION}
                            delay={100}
                            style={styles.subtitle}
                            useNativeDriver
                        >
                            {filteredHospitals.length} {filteredHospitals.length === 1 ? "hospital" : "hospitals"} available
                        </Animatable.Text>
                    </View>
                </View>
            </Animated.View>

            {/* Search Bar */}
            <Animatable.View
                animation="fadeInUp"
                duration={ANIMATION_DURATION}
                style={styles.searchContainer}
                useNativeDriver
            >
                <View style={styles.searchInputContainer}>
                    <Feather name="search" size={20} color="#666" style={styles.searchIcon} />
                    <TextInput
                        ref={searchInputRef}
                        style={styles.searchInput}
                        placeholder="Search hospitals"
                        value={searchQuery}
                        onChangeText={handleSearch}
                        placeholderTextColor="#999"
                        returnKeyType="search"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
                            <Feather name="x" size={18} color="#999" />
                        </TouchableOpacity>
                    )}
                </View>
            </Animatable.View>

            {/* Main Content */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    {[1, 2, 3, 4, 5].map((item) => (
                        <HospitalSkeletonLoader key={item} />
                    ))}
                </View>
            ) : error ? (
                renderError()
            ) : (
                <Animated.FlatList
                    data={filteredHospitals}
                    keyExtractor={(item) => item._id}
                    renderItem={({ item, index }) => (
                        <Animatable.View animation="fadeInUp" delay={index * 50} duration={300} useNativeDriver>
                            <HospitalCard hospital={item} onSelect={() => handleSelectHospital(item)} />
                        </Animatable.View>
                    )}
                    ListEmptyComponent={renderEmptyState}
                    contentContainerStyle={[styles.listContainer, filteredHospitals.length === 0 && styles.emptyListContainer]}
                    showsVerticalScrollIndicator={false}
                    onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
                    scrollEventThrottle={16}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                />
            )}
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F8F9FA",
    },
    header: {
        paddingHorizontal: 20,
        paddingBottom: 15,
        backgroundColor: "#F8F9FA",
        zIndex: 10,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(0,0,0,0.05)",
    },
    headerContent: {
        paddingTop: 10,
    },
    headerTopRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#FFFFFF",
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
    titleContainer: {
        marginTop: 4,
    },
    loginButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#4A80F0",
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 24,
        shadowColor: "#4A80F0",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    loginButtonText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#FFFFFF",
        marginLeft: 6,
    },
    title: {
        fontSize: 28,
        fontWeight: "700",
        color: "#1A1A1A",
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 15,
        color: "#666",
        marginTop: 6,
    },
    searchContainer: {
        paddingHorizontal: 20,
        marginVertical: 16,
        zIndex: 20,
    },
    searchInputContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 52,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.06)",
    },
    searchIcon: {
        marginRight: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: "#333",
        height: 52,
    },
    clearButton: {
        padding: 6,
    },
    listContainer: {
        paddingHorizontal: 20,
        paddingBottom: 30,
    },
    emptyListContainer: {
        flexGrow: 1,
        justifyContent: "center",
    },
    loadingContainer: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    hospitalCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.03)",
        overflow: "hidden",
    },
    hospitalCardContent: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
    },
    logoContainer: {
        width: 60,
        height: 60,
        borderRadius: 12,
        backgroundColor: "#F0F4FF",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 16,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.05)",
    },
    hospitalLogo: {
        width: 60,
        height: 60,
    },
    placeholderLogo: {
        width: 60,
        height: 60,
        backgroundColor: "#4A80F0",
        justifyContent: "center",
        alignItems: "center",
    },
    placeholderText: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#FFFFFF",
    },
    hospitalTextContainer: {
        flex: 1,
        marginRight: 8,
    },
    hospitalName: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1A1A1A",
        marginBottom: 6,
        lineHeight: 22,
    },
    hospitalAddress: {
        fontSize: 14,
        color: "#666",
        lineHeight: 18,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 40,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#1A1A1A",
        marginTop: 20,
        textAlign: "center",
    },
    emptySubtitle: {
        fontSize: 15,
        color: "#666",
        marginTop: 8,
        textAlign: "center",
        lineHeight: 22,
    },
    resetButton: {
        marginTop: 20,
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: "#F0F4FF",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#4A80F0",
    },
    resetButtonText: {
        color: "#4A80F0",
        fontWeight: "600",
        fontSize: 15,
    },
    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 40,
    },
    errorTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#1A1A1A",
        marginTop: 20,
        textAlign: "center",
    },
    errorMessage: {
        fontSize: 15,
        color: "#666",
        marginTop: 8,
        textAlign: "center",
        lineHeight: 22,
    },
    retryButton: {
        marginTop: 20,
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: "#4A80F0",
        borderRadius: 8,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    retryButtonText: {
        color: "#FFFFFF",
        fontWeight: "600",
        fontSize: 15,
    },
    skeletonCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
        height: 92,
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.03)",
    },
    skeletonContent: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        height: "100%",
    },
    skeletonLogo: {
        width: 60,
        height: 60,
        borderRadius: 12,
        backgroundColor: "#E8E8E8",
        marginRight: 16,
    },
    skeletonTextContainer: {
        flex: 1,
    },
    skeletonText: {
        height: 16,
        backgroundColor: "#E8E8E8",
        borderRadius: 8,
        width: "80%",
        marginBottom: 10,
    },
    skeletonSubtext: {
        height: 12,
        backgroundColor: "#F0F0F0",
        borderRadius: 6,
        width: "60%",
    },
    skeletonArrow: {
        width: 20,
        height: 20,
        backgroundColor: "#E8E8E8",
        borderRadius: 10,
    },
})

export default HospitalScreen
