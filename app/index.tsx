import React from "react"
import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Dimensions,
  Platform,
  Keyboard,
  Animated,
  Modal,
  Image,
  ScrollView,
  FlatList,
  TouchableWithoutFeedback,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import * as Animatable from "react-native-animatable"
import { Feather } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { StatusBar } from "expo-status-bar"
import Constants from 'expo-constants'
import { router, useFocusEffect } from "expo-router"
import AsyncStorage from '@react-native-async-storage/async-storage'
import Autocomplete from 'react-native-autocomplete-input'
import AppointmentFlowService from '../services/appointmentFlowService'
import { useDispatch } from 'react-redux'
import { logout, updateHospitalData } from '../redux/slices/authSlice'
import { isUserAuthenticated } from '../utils/authUtils'

// API response interfaces
interface ApiResponse {
  isSuccess: boolean
  data: {
    provices: string[]
    cities: CityData[]
  }
  message: string
}

interface CityData {
  city: string
  lat: string
  lng: string
  "province ": string
}

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

interface TokenPerHospitalResponse {
  isSuccess: boolean
  data: {
    token: string
  }
  message: string
}

// App interfaces
interface City {
  name: string
  province: string
  lat: string
  lng: string
  isPopular?: boolean
}

interface SelectCityScreenProps {
  navigation: any
}

// Constants
const API_ENDPOINT = "/stg_user-api/cms/getProviceAndCityLists"
const HOSPITAL_API_ENDPOINT = "/stg_online-apmt/patient-auth/getAllHospital"
const TOKEN_PER_HOSPITAL_API_ENDPOINT = "/stg_online-apmt/patient-auth/getTokenPerHospital"
const POPULAR_CITIES = ["Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad"]
const WELCOME_MODAL_KEY = "welcome_modal_shown"
const { width } = Dimensions.get("window")
const ANIMATION_DURATION = 800
const AUTH_TOKEN_KEY = "persist:auth"

// Memoized Hospital card component
const HospitalCard = React.memo<{
  hospital: Hospital
  onSelect: () => void
}>(({ hospital, onSelect }) => (
  <TouchableOpacity
    style={styles.hospitalCard}
    onPress={onSelect}
    activeOpacity={0.7}
  >
    <View style={styles.hospitalCardContent}>
      <View style={styles.hospitalImageContainer}>
        {hospital.hospitalLogoUrl ? (
          <Image
            source={{ uri: hospital.hospitalLogoUrl }}
            style={styles.hospitalImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.hospitalPlaceholder}>
            <Feather name="plus" size={24} color="#4A80F0" />
          </View>
        )}
      </View>
      <View style={styles.hospitalTextContainer}>
        <Text style={styles.hospitalName}>{hospital.hospitalName}</Text>
        <Text style={styles.hospitalAddress}>{hospital.address}</Text>
        <Text style={styles.hospitalCity}>{hospital.city}</Text>
      </View>
      <Feather name="chevron-right" size={20} color="#999" />
    </View>
  </TouchableOpacity>
))

// Memoized Skeleton loader component for hospitals
const HospitalSkeletonLoader = React.memo(() => (
  <Animatable.View animation="pulse" iterationCount="infinite" duration={1500} style={styles.skeletonCard}>
    <View style={styles.skeletonContent}>
      <View style={styles.skeletonImage} />
      <View style={styles.skeletonTextContainer}>
        <View style={styles.skeletonText} />
        <View style={styles.skeletonSubtext} />
        <View style={styles.skeletonSmallText} />
      </View>
      <View style={styles.skeletonArrow} />
    </View>
  </Animatable.View>
))

const SelectCityScreen: React.FC<SelectCityScreenProps> = ({ navigation }) => {
  const dispatch = useDispatch()
  const [allCities, setAllCities] = useState<City[]>([])
  const [filteredCities, setFilteredCities] = useState<City[]>([])
  const [selectedCity, setSelectedCity] = useState<City | null>(null)
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(true)
  const [hospitalsLoading, setHospitalsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [showWelcomeModal, setShowWelcomeModal] = useState<boolean>(false)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [user, setUser] = useState<any>(null)
  const [showProfileDropdown, setShowProfileDropdown] = useState<boolean>(false)

  const searchInputRef = useRef<TextInput>(null)
  const scrollY = useRef(new Animated.Value(0)).current
  const insets = useSafeAreaInsets()
  const welcomeAnimValue = useRef(new Animated.Value(0)).current
  const welcomeSlideValue = useRef(new Animated.Value(50)).current
  const hasShownWelcome = useRef(false)

  // Memoized animation values
  const headerOpacity = useMemo(() => scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.9],
    extrapolate: "clamp",
  }), [scrollY])

  const headerTranslateY = useMemo(() => scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, -20],
    extrapolate: "clamp",
  }), [scrollY])

  // Check if welcome modal should be shown (only on first app launch)
  useEffect(() => {
    const checkWelcomeModal = async () => {
      try {
        const hasShown = await AsyncStorage.getItem(WELCOME_MODAL_KEY)
        if (!hasShown && !hasShownWelcome.current) {
          setShowWelcomeModal(true)
          hasShownWelcome.current = true
        }
      } catch (error) {
        console.error('Error checking welcome modal status:', error)
      }
    }
    checkWelcomeModal()
  }, [])

  // Check authentication status when component mounts
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const persistedAuth = await AsyncStorage.getItem(AUTH_TOKEN_KEY)
        if (persistedAuth) {
          const authData = JSON.parse(persistedAuth)
          if (isUserAuthenticated(authData.isAuthenticated) && authData.user) {
            setIsAuthenticated(true)
            const userData = typeof authData.user === 'string' 
              ? JSON.parse(authData.user) 
              : authData.user
            setUser(userData)
          } else {
            setIsAuthenticated(false)
            setUser(null)
          }
        } else {
          setIsAuthenticated(false)
          setUser(null)
        }
      } catch (error) {
        console.error('Error checking auth status:', error)
        setIsAuthenticated(false)
        setUser(null)
      }
    }
    checkAuthStatus()
  }, [])

  // Refresh auth status when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const checkAuthStatus = async () => {
        try {
          const persistedAuth = await AsyncStorage.getItem(AUTH_TOKEN_KEY)
          if (persistedAuth) {
            const authData = JSON.parse(persistedAuth)
            if (isUserAuthenticated(authData.isAuthenticated) && authData.user) {
              setIsAuthenticated(true)
              const userData = typeof authData.user === 'string' 
                ? JSON.parse(authData.user) 
                : authData.user
              setUser(userData)
            } else {
              setIsAuthenticated(false)
              setUser(null)
            }
          } else {
            setIsAuthenticated(false)
            setUser(null)
          }
        } catch (error) {
          console.error('Error checking auth status:', error)
          setIsAuthenticated(false)
          setUser(null)
        }
      }
      checkAuthStatus()
    }, [])
  )

  // Welcome modal animation
  useEffect(() => {
    if (showWelcomeModal) {
      Animated.parallel([
        Animated.timing(welcomeAnimValue, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(welcomeSlideValue, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start()
    }
  }, [showWelcomeModal, welcomeAnimValue, welcomeSlideValue])

  // Memoized close welcome modal function
  const closeWelcomeModal = useCallback(async () => {
    try {
      await AsyncStorage.setItem(WELCOME_MODAL_KEY, 'true')
    } catch (error) {
      console.error('Error saving welcome modal status:', error)
    }

    Animated.parallel([
      Animated.timing(welcomeAnimValue, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(welcomeSlideValue, {
        toValue: 50,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowWelcomeModal(false)
    })
  }, [welcomeAnimValue, welcomeSlideValue])

  // Quick start - close modal and focus search
  const handleQuickStart = useCallback(() => {
    closeWelcomeModal()
    setTimeout(() => {
      searchInputRef.current?.focus()
    }, 300)
  }, [closeWelcomeModal])

  // Memoized API base URL
  const apiBaseUrl = useMemo(() =>
    Constants.expoConfig?.extra?.API_BASE_URL || process.env.API_BASE_URL,
    []
  )

  // Fetch cities from API
  const fetchCitiesData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${apiBaseUrl}${API_ENDPOINT}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: ApiResponse = await response.json()

      if (data.isSuccess && data.data) {
        const cities: City[] = (data.data.cities || []).map((cityData) => ({
          name: cityData.city,
          province: cityData["province "].trim(),
          lat: cityData.lat,
          lng: cityData.lng,
          isPopular: POPULAR_CITIES.includes(cityData.city),
        }))

        setAllCities(cities)
        setFilteredCities(cities)
      } else {
        setError(data.message || "Failed to fetch cities")
      }
    } catch (err) {
      console.error("Error fetching cities:", err)
      setError(err instanceof Error ? err.message : "An error occurred while fetching cities")
    } finally {
      setLoading(false)
    }
  }, [apiBaseUrl])
  // Fetch hospitals based on selected city or all hospitals if no city provided
  const fetchHospitals = useCallback(async (cityName?: string) => {
    setHospitalsLoading(true)
    try {
      const url = cityName
        ? `${apiBaseUrl}${HOSPITAL_API_ENDPOINT}?city=${encodeURIComponent(cityName)}`
        : `${apiBaseUrl}${HOSPITAL_API_ENDPOINT}`

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const hospitalData: HospitalApiResponse = await response.json()

      if (hospitalData.isSuccess && hospitalData.data) {
        setHospitals(hospitalData.data)
      } else {
        setHospitals([])
        console.error('Failed to fetch hospitals:', hospitalData.message)
      }
    } catch (error) {
      console.error('Error fetching hospitals:', error)
      setHospitals([])
    } finally {
      setHospitalsLoading(false)
    }
  }, [apiBaseUrl])
  useEffect(() => {
    fetchCitiesData()
    // Fetch all hospitals by default
    fetchHospitals()
  }, [fetchCitiesData, fetchHospitals])

  // Check for pending appointment flow after user authentication
  useEffect(() => {
    const checkPendingAppointmentFlow = async () => {
      try {
        // Check if user is authenticated
        const persistedAuth = await AsyncStorage.getItem(AUTH_TOKEN_KEY)
        if (persistedAuth) {
          const authData = JSON.parse(persistedAuth)
          
          if (isUserAuthenticated(authData.isAuthenticated) && authData.user) {
            // Check if there's a pending appointment flow
            const appointmentFlow = await AppointmentFlowService.getAppointmentFlow()
            
            if (appointmentFlow && appointmentFlow.redirectAfterLogin) {
              // Get patient info from stored auth data
              const userData = typeof authData.user === 'string' 
                ? JSON.parse(authData.user) 
                : authData.user
              const patientId = userData._id || null
              const patientName = userData.fullName || null
              
              // Navigate directly to appointment creation screen
              router.push({
                pathname: "/appointments/CreateAppointmentScreen",
                params: {
                  doctorId: appointmentFlow.doctorId,
                  doctorData: appointmentFlow.doctorData,
                  hospitalData: appointmentFlow.hospitalData || null,
                  patientId,
                  patientName,
                  mrn: appointmentFlow.mrn || null,
                },
              })
              
              // Clear the stored appointment flow data
              await AppointmentFlowService.clearAppointmentFlow()
            }
          }
        }
      } catch (error) {
        console.error('Error checking pending appointment flow:', error)
      }
    }

    // Add a small delay to ensure the component is fully mounted
    const timer = setTimeout(checkPendingAppointmentFlow, 1000)
    return () => clearTimeout(timer)
  }, [])
  // Handle city search and filtering
  const handleSearch = useCallback((text: string): void => {
    setSearchQuery(text)

    if (text.length > 0) {
      const filtered = allCities.filter((city) =>
        city.name.toLowerCase().includes(text.toLowerCase()) ||
        city.province.toLowerCase().includes(text.toLowerCase())
      )
      setFilteredCities(filtered.slice(0, 10)) // Limit results for performance
    } else {
      setFilteredCities([])
      setSelectedCity(null)
      // Fetch all hospitals when search is cleared
      fetchHospitals()
    }
  }, [allCities, fetchHospitals])

  // Handle city selection from autocomplete
  const handleSelectCity = useCallback((city: City): void => {
    setSelectedCity(city)
    setSearchQuery(city.name)
    setFilteredCities([]) // Clear the dropdown
    fetchHospitals(city.name)
    Keyboard.dismiss()

    // Blur the input to hide keyboard
    if (searchInputRef.current) {
      searchInputRef.current.blur()
    }
  }, [fetchHospitals])

  // Add function to get token per hospital
  const getTokenPerHospital = useCallback(async (hospitalId: string, authToken: string): Promise<string | null> => {
    try {
      // Strip double quotes from auth token if present
      const cleanToken = authToken.startsWith('"') && authToken.endsWith('"') 
        ? authToken.slice(1, -1) 
        : authToken;

      const response = await fetch(`${apiBaseUrl}${TOKEN_PER_HOSPITAL_API_ENDPOINT}/${hospitalId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${cleanToken}`,
        },
      })


      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: TokenPerHospitalResponse = await response.json()

      if (data.isSuccess && data.data) {
        return data.data.token
      } else {
        console.error('Failed to get token per hospital:', data.message)
        return null
      }
    } catch (error) {
      console.error('Error getting token per hospital:', error)
      return null
    }
  }, [apiBaseUrl])

  // Check if user has persisted auth token
  const checkAuthToken = useCallback(async (): Promise<string | null> => {
    try {
      const persistedAuth = await AsyncStorage.getItem(AUTH_TOKEN_KEY)
      if (persistedAuth) {
        const authData = JSON.parse(persistedAuth)
        return authData.token || null
      }
      return null
    } catch (error) {
      console.error('Error checking auth token:', error)
      return null
    }
  }, [])

  // Handle hospital selection with token check
  const handleSelectHospital = useCallback(async (hospital: Hospital): Promise<void> => {
    try {
      // Store hospital data in Redux for profile screen access
      dispatch(updateHospitalData({
        _id: hospital._id,
        hospitalName: hospital.hospitalName,
        hospitalLogoUrl: hospital.hospitalLogoUrl,
        address: hospital.address,
        city: hospital.city,
      }))
      
      // Check if user has persisted auth token
      const authToken = await checkAuthToken()
      
      if (authToken) {
        // User has auth token, get token per hospital
        const hospitalToken = await getTokenPerHospital(hospital._id, authToken)
        
        if (hospitalToken) {
          // Update AsyncStorage with hospital token
          try {
            const persistedAuth = await AsyncStorage.getItem(AUTH_TOKEN_KEY)
            if (persistedAuth) {
              const authData = JSON.parse(persistedAuth)
                authData.token = JSON.stringify(hospitalToken) // This adds quotes and escapes them properly
                await AsyncStorage.setItem(AUTH_TOKEN_KEY, JSON.stringify(authData))
            }
          } catch (storageError) {
            console.error('Error updating auth token in storage:', storageError)
          }

          // Navigate with hospital token (replacing auth token)
          router.push({
            pathname: "/Doctors",
            params: {
              hospitalId: hospital._id,
              hospitalName: hospital.hospitalName,
              cityName: selectedCity?.name || hospital.city,
              authToken: hospitalToken, // Use hospital token instead of auth token
              hospitalToken: hospitalToken,
            }
          })
        } else {
          // Failed to get hospital token, navigate with original auth token
          router.push({
            pathname: "/Doctors",
            params: {
              hospitalId: hospital._id,
              hospitalName: hospital.hospitalName,
              cityName: selectedCity?.name || hospital.city,
              authToken: authToken,
            }
          })
        }
      } else {
        // No auth token, navigate without API call
        router.push({
          pathname: "/Doctors",
          params: {
            hospitalId: hospital._id,
            hospitalName: hospital.hospitalName,
            cityName: selectedCity?.name || hospital.city,
          }
        })
      }
    } catch (error) {
      console.error('Error in hospital selection:', error)
      // Fallback navigation
      router.push({
        pathname: "/Doctors",
        params: {
          hospitalId: hospital._id,
          hospitalName: hospital.hospitalName,
          cityName: selectedCity?.name || hospital.city,
        }
      })
    }
  }, [selectedCity, checkAuthToken, getTokenPerHospital, dispatch])

  // Memoized login handler
  const handleLogin = useCallback((): void => {
    router.push("/auth/LoginScreen")
  }, [])

  // Handle logout
  const handleLogout = useCallback(async (): Promise<void> => {
    try {
      // Preserve profile picture if it exists
      if (user?.profilePicture) {
        await AsyncStorage.setItem("persistentProfilePicture", user.profilePicture);
      }
      
      // Use Redux logout action
      dispatch(logout());
      
      // Remove specific auth-related items
      await AsyncStorage.multiRemove([
        "persist:auth", 
        "token", 
        "refreshToken", 
        "profilePicture"
      ]);
      
      // Update local state
      setIsAuthenticated(false)
      setUser(null)
      setShowProfileDropdown(false)
      
      // Clear any pending appointment flow
      await AppointmentFlowService.clearAppointmentFlow()
       
      // Navigate to login screen
      router.push("/auth/LoginScreen");
    } catch (error) {
      console.error('Error during logout:', error)
    }
  }, [dispatch, user])

  // Toggle profile dropdown
  const toggleProfileDropdown = useCallback(() => {
    setShowProfileDropdown(!showProfileDropdown)
  }, [showProfileDropdown])

  // Close profile dropdown
  const closeProfileDropdown = useCallback(() => {
    setShowProfileDropdown(false)
  }, [])

  // Clear search
  const clearSearch = useCallback((): void => {
    setSearchQuery("")
    setFilteredCities([])
    setSelectedCity(null)
    // Fetch all hospitals when search is cleared
    fetchHospitals()
    Keyboard.dismiss()
  }, [fetchHospitals])

  // Memoized hospital item renderer
  const renderHospitalItem = useCallback(({ item, index }: { item: Hospital; index: number }) => (
    <Animatable.View animation="fadeInUp" delay={index * 50} duration={300} useNativeDriver>
      <HospitalCard
        hospital={item}
        onSelect={() => handleSelectHospital(item)}
      />
    </Animatable.View>
  ), [handleSelectHospital])

  // Memoized key extractor for hospitals
  const keyExtractor = useCallback((item: Hospital) => item._id, [])
  // Memoized empty state for hospitals
  const renderEmptyHospitalState = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Feather name="plus" size={60} color="#CCCCCC" />
      <Text style={styles.emptyTitle}>No hospitals found</Text>
      <Text style={styles.emptySubtitle}>
        {selectedCity ? `No hospitals found in ${selectedCity.name}` : "No hospitals available at the moment"}
      </Text>
    </View>
  ), [selectedCity])

  // Memoized error state
  const renderError = useCallback(() => (
    <View style={styles.errorContainer}>
      <Feather name="wifi-off" size={60} color="#FF6B6B" />
      <Text style={styles.errorTitle}>Connection Error</Text>
      <Text style={styles.errorMessage}>
        {error}
        {"\n"}Please check your internet connection and try again.
      </Text>
      <TouchableOpacity style={styles.retryButton} onPress={fetchCitiesData}>
        <Feather name="refresh-cw" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  ), [error, fetchCitiesData])

  // Memoized loading skeletons for hospitals
  const renderHospitalLoadingSkeletons = useMemo(() => (
    <View style={styles.loadingContainer}>
      {Array.from({ length: 5 }, (_, index) => (
        <HospitalSkeletonLoader key={index} />
      ))}
    </View>
  ), [])

  // Welcome Modal Component
  const WelcomeModal = useCallback(() => (
    <Modal
      visible={showWelcomeModal}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <Animated.View
        style={[
          styles.welcomeOverlay,
          { opacity: welcomeAnimValue }
        ]}
      >
        <Animated.View
          style={[
            styles.welcomeContainer,
            {
              opacity: welcomeAnimValue,
              transform: [{ translateY: welcomeSlideValue }],
            }
          ]}
        >
          <View style={styles.welcomeIconContainer}>
            <View style={styles.welcomeIcon}>
              <Image
                source={require('../assets/images/icon.png')}
                style={{ width: 80, height: 80, borderRadius: 35 }}
              />
            </View>
            <View style={styles.welcomeIconBg} />
          </View>

          <View style={styles.welcomeContent}>
            <Text style={styles.welcomeTitle}>Welcome to PakHIMS</Text>
            <Text style={styles.welcomeSubtitle}>
              Find hospitals and book appointments in your city quickly and easily
            </Text>

            <View style={styles.welcomeFeatures}>
              <View style={styles.featureItem}>
                <Feather name="map-pin" size={16} color="#4A80F0" />
                <Text style={styles.featureText}>Find nearby hospitals</Text>
              </View>
              <View style={styles.featureItem}>
                <Feather name="calendar" size={16} color="#4A80F0" />
                <Text style={styles.featureText}>Book appointments</Text>
              </View>
              <View style={styles.featureItem}>
                <Feather name="clock" size={16} color="#4A80F0" />
                <Text style={styles.featureText}>Save time</Text>
              </View>
            </View>
          </View>

          <View style={styles.welcomeActions}>
            <TouchableOpacity
              style={styles.quickStartButton}
              onPress={handleQuickStart}
              activeOpacity={0.8}
            >
              <Text style={styles.quickStartText}>Get Started</Text>
              <Feather name="arrow-right" size={16} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.loginFromWelcomeButton}
              onPress={() => {
                closeWelcomeModal()
                handleLogin()
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.loginFromWelcomeText}>I have an account</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={closeWelcomeModal}
            activeOpacity={0.7}
          >
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  ), [showWelcomeModal, welcomeAnimValue, welcomeSlideValue, handleQuickStart, closeWelcomeModal, handleLogin])

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="dark" />

        <WelcomeModal />

        {/* Profile Dropdown Modal - Only show when user is authenticated */}
        {isUserAuthenticated(isAuthenticated) && (
          <Modal
            visible={showProfileDropdown}
            transparent
            animationType="fade"
            onRequestClose={closeProfileDropdown}
          >
            <TouchableWithoutFeedback onPress={closeProfileDropdown}>
              <View style={styles.profileModalOverlay}>
                <TouchableWithoutFeedback>
                  <View style={styles.profileModalContent}>
                    <View style={styles.profileModalHeader}>
                      <View style={styles.profileModalAvatar}>
                        <Text style={styles.profileModalAvatarText}>
                          {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
                        </Text>
                      </View>
                      <Text style={styles.profileModalName} numberOfLines={1}>
                        {user?.fullName || 'User'}
                      </Text>
                    </View>
                    
                    <View style={styles.profileModalActions}>
                      <TouchableOpacity 
                        style={styles.profileModalLogoutButton}
                        onPress={handleLogout}
                        activeOpacity={0.7}
                      >
                        <Feather name="log-out" size={16} color="#FF6B6B" />
                        <Text style={styles.profileModalLogoutText}>Logout</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        )}

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
          <View style={styles.titleRow}>
            <View style={styles.titleContainer}>
              <Animatable.Text animation="fadeIn" duration={ANIMATION_DURATION} style={styles.title} useNativeDriver>
                Find Hospitals
              </Animatable.Text>
              <Animatable.Text
                animation="fadeIn"
                duration={ANIMATION_DURATION}
                delay={100}
                style={styles.subtitle}
                useNativeDriver
              >
                Search for your city to find hospitals near you
              </Animatable.Text>
            </View>
            {isUserAuthenticated(isAuthenticated) ? (
              // Profile dropdown when user is logged in
              <View style={styles.profileContainer}>
                <TouchableOpacity 
                  style={styles.profileButton} 
                  onPress={toggleProfileDropdown}
                  activeOpacity={0.7}
                >
                  <View style={styles.profileAvatar}>
                    <Text style={styles.profileAvatarText}>
                      {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
                    </Text>
                  </View>
                  <Feather 
                    name={showProfileDropdown ? "chevron-up" : "chevron-down"} 
                    size={16} 
                    color="#4A80F0" 
                  />
                </TouchableOpacity>
              </View>
            ) : (
              // Login button when user is not logged in
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
            )}
          </View>
        </View>
      </Animated.View>

      <Animatable.View
        animation="fadeInUp"
        duration={ANIMATION_DURATION}
        style={styles.searchContainer}
        useNativeDriver
      >
        <View style={styles.autocompleteContainer}>
          {/* Custom Autocomplete Implementation */}
          <View style={styles.searchInputContainer}>
            <Feather name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={handleSearch}
              placeholder="Search for your city"
              placeholderTextColor="#999"
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="words"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
                <Feather name="x" size={18} color="#999" />
              </TouchableOpacity>
            )}
          </View>

          {/* Custom Dropdown */}
          {filteredCities.length > 0 && searchQuery.length > 0 && (
            <ScrollView
              style={styles.autocompleteList}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.autocompleteScrollContent}
            >
              {filteredCities.map((city) => (
                <TouchableOpacity
                  key={`${city.name}-${city.province}`}
                  style={styles.autocompleteItem}
                  onPress={() => handleSelectCity(city)}
                  activeOpacity={0.7}
                >
                  <View style={styles.autocompleteItemContent}>
                    <Feather name="map-pin" size={16} color="#4A80F0" />
                    <View style={styles.autocompleteTextContainer}>
                      <Text style={styles.autocompleteCityName}>{city.name}</Text>
                      <Text style={styles.autocompleteProvince}>{city.province}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}        </View>
      </Animatable.View>

      {selectedCity && (
        <View style={styles.selectedCityContainer}>
          <Text style={styles.selectedCityText}>
            Hospitals in {selectedCity.name}, {selectedCity.province}
          </Text>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading cities...</Text>
        </View>
      ) : error ? (
        renderError()
      ) : (
        hospitalsLoading ? (
          renderHospitalLoadingSkeletons
        ) : (
          <Animated.FlatList
            data={hospitals}
            keyExtractor={keyExtractor}
            renderItem={renderHospitalItem}
            ListEmptyComponent={renderEmptyHospitalState}
            contentContainerStyle={[styles.listContainer, hospitals.length === 0 && styles.emptyListContainer]}
            showsVerticalScrollIndicator={false}
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
            scrollEventThrottle={16}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={10}
            removeClippedSubviews={true}
          />
        )
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
    paddingBottom: 20,
    backgroundColor: "#F8F9FA",
    zIndex: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  headerContent: {
    paddingTop: 10,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  titleContainer: {
    flex: 1,
    marginRight: 20,
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
  profileContainer: {
    position: 'relative',
  },
  profileButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F4FF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E1E7FF",
  },
  profileAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#4A80F0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  profileAvatarText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  profileModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 100,
    paddingRight: 20,
  },
  profileModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 200,
  },
  profileModalHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    alignItems: "center",
  },
  profileModalAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#4A80F0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  profileModalAvatarText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  profileModalName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    textAlign: "center",
  },
  profileModalActions: {
    padding: 12,
  },
  profileModalLogoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#FFF5F5",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FFE5E5",
  },
  profileModalLogoutText: {
    fontSize: 14,
    color: "#FF6B6B",
    marginLeft: 8,
    fontWeight: "600",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1A1A1A",
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 15,
    color: "#666",
    marginTop: 6,
    lineHeight: 20,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
    zIndex: 1000,
    elevation: 1000, // Add elevation for Android
  },
  autocompleteContainer: {
    zIndex: 1001,
    elevation: 1001, // Add elevation for Android
    position: 'relative',
  },
  autocompleteInputContainer: {
    borderWidth: 0,
    backgroundColor: 'transparent',
    margin: 0,
    padding: 0,
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
  autocompleteList: {
    maxHeight: 200,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8, // Increase elevation for Android
    marginTop: 4,
    position: 'absolute',
    top: 56, // Position below input
    left: 0,
    right: 0,
    zIndex: 1002,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  autocompleteScrollContent: {
    flexGrow: 1,
  },
  autocompleteItem: {
    paddingVertical: 15, // Increase touch area
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
    minHeight: 50, // Ensure minimum touch target
  },
  autocompleteItemContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  autocompleteTextContainer: {
    flex: 1,
    marginLeft: 10,
  },
  autocompleteCityName: {
    fontSize: 15,
    fontWeight: "500",
    color: "#1A1A1A",
    marginBottom: 2,
  },
  autocompleteProvince: {
    fontSize: 13,
    color: "#666",
  },
  selectedCityContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  selectedCityText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  hospitalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
  },
  hospitalCardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  hospitalImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 14,
    overflow: 'hidden',
  },
  hospitalImage: {
    width: 60,
    height: 60,
  },
  hospitalPlaceholder: {
    width: 60,
    height: 60,
    backgroundColor: "#F0F4FF",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
  },
  hospitalTextContainer: {
    flex: 1,
  },
  hospitalName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  hospitalAddress: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  hospitalCity: {
    fontSize: 12,
    color: "#999",
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
    marginTop: 10,
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
  noSelectionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  noSelectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A1A",
    marginTop: 20,
    textAlign: "center",
  },
  noSelectionSubtitle: {
    fontSize: 15,
    color: "#666",
    marginTop: 8,
    textAlign: "center",
    lineHeight: 22,
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
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    height: 92,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
  },
  skeletonContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    height: "100%",
    width: "100%",
  },
  skeletonImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: "#E8E8E8",
    marginRight: 14,
  },
  skeletonTextContainer: {
    flex: 1,
  },
  skeletonText: {
    height: 16,
    backgroundColor: "#E8E8E8",
    borderRadius: 8,
    width: "70%",
    marginBottom: 8,
  },
  skeletonSubtext: {
    height: 12,
    backgroundColor: "#F0F0F0",
    borderRadius: 6,
    width: "90%",
    marginBottom: 4,
  },
  skeletonSmallText: {
    height: 10,
    backgroundColor: "#F0F0F0",
    borderRadius: 5,
    width: "40%",
  },
  skeletonArrow: {
    width: 20,
    height: 20,
    backgroundColor: "#E8E8E8",
    borderRadius: 10,
  },
  welcomeOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  welcomeContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    maxWidth: width * 0.9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  welcomeIconContainer: {
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  welcomeIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F4FF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  welcomeIconBg: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(74, 128, 240, 0.1)',
    top: -10,
    left: -10,
  },
  welcomeContent: {
    alignItems: 'center',
    marginBottom: 32,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  welcomeFeatures: {
    alignItems: 'flex-start',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 15,
    color: '#666',
    marginLeft: 12,
    fontWeight: '500',
  },
  welcomeActions: {
    width: '100%',
    alignItems: 'center',
  },
  quickStartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4A80F0',
    paddingHorizontal: 36,
    paddingVertical: 16,
    borderRadius: 16,
    width: '100%',
    marginBottom: 12,
    shadowColor: '#4A80F0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  quickStartText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: 8,
  },
  loginFromWelcomeButton: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(74, 128, 240, 0.1)',
    width: '100%',
    alignItems: 'center',
  },
  loginFromWelcomeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4A80F0',
  },
  skipButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
})

export default SelectCityScreen
