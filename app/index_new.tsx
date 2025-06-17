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
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import * as Animatable from "react-native-animatable"
import { Feather } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { StatusBar } from "expo-status-bar"
import Constants from 'expo-constants'
import { router } from "expo-router"
import AsyncStorage from '@react-native-async-storage/async-storage'
import Autocomplete from 'react-native-autocomplete-input'

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
const POPULAR_CITIES = ["Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad"]
const WELCOME_MODAL_KEY = "welcome_modal_shown"
const { width } = Dimensions.get("window")
const ANIMATION_DURATION = 800

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
  const [allCities, setAllCities] = useState<City[]>([])
  const [filteredCities, setFilteredCities] = useState<City[]>([])
  const [selectedCity, setSelectedCity] = useState<City | null>(null)
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(true)
  const [hospitalsLoading, setHospitalsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [showWelcomeModal, setShowWelcomeModal] = useState<boolean>(false)

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

  // Fetch hospitals based on selected city
  const fetchHospitals = useCallback(async (cityName: string) => {
    setHospitalsLoading(true)
    try {
      const response = await fetch(`${apiBaseUrl}${HOSPITAL_API_ENDPOINT}?city=${encodeURIComponent(cityName)}`, {
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
  }, [fetchCitiesData])

  // Handle city search and filtering
  const handleSearch = useCallback((text: string): void => {
    setSearchQuery(text)

    if (text.length > 0) {
      const filtered = allCities.filter((city) => 
        city.name.toLowerCase().includes(text.toLowerCase())
      )
      setFilteredCities(filtered)
    } else {
      setFilteredCities([])
      setSelectedCity(null)
      setHospitals([])
    }
  }, [allCities])

  // Handle city selection from autocomplete
  const handleSelectCity = useCallback((city: City): void => {
    setSelectedCity(city)
    setSearchQuery(city.name)
    setFilteredCities([])
    fetchHospitals(city.name)
    Keyboard.dismiss()
  }, [fetchHospitals])

  // Handle hospital selection
  const handleSelectHospital = useCallback((hospital: Hospital): void => {
    router.push({
      pathname: "/Doctors",
      params: {
        hospitalId: hospital._id,
        hospitalName: hospital.hospitalName,
        cityName: selectedCity?.name || hospital.city,
      }
    })
  }, [selectedCity])

  // Memoized login handler
  const handleLogin = useCallback((): void => {
    router.push("/auth/LoginScreen")
  }, [])

  // Clear search
  const clearSearch = useCallback((): void => {
    setSearchQuery("")
    setFilteredCities([])
    setSelectedCity(null)
    setHospitals([])
    Keyboard.dismiss()
  }, [])

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
        {selectedCity ? `No hospitals found in ${selectedCity.name}` : "Select a city to see hospitals"}
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
        </View>
      </Animated.View>

      <Animatable.View
        animation="fadeInUp"
        duration={ANIMATION_DURATION}
        style={styles.searchContainer}
        useNativeDriver
      >
        <View style={styles.autocompleteContainer}>
          <Autocomplete
            data={filteredCities}
            defaultValue={searchQuery}
            onChangeText={handleSearch}
            placeholder="Search for your city"
            placeholderTextColor="#999"
            flatListProps={{
              keyExtractor: (item: City) => `${item.name}-${item.province}`,
              renderItem: ({ item }: { item: City }) => (
                <TouchableOpacity
                  style={styles.autocompleteItem}
                  onPress={() => handleSelectCity(item)}
                >
                  <View style={styles.autocompleteItemContent}>
                    <Feather name="map-pin" size={16} color="#4A80F0" />
                    <View style={styles.autocompleteTextContainer}>
                      <Text style={styles.autocompleteCityName}>{item.name}</Text>
                      <Text style={styles.autocompleteProvince}>{item.province}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ),
              style: styles.autocompleteList,
            }}
            inputContainerStyle={styles.autocompleteInputContainer}
            renderTextInput={(props) => (
              <View style={styles.searchInputContainer}>
                <Feather name="search" size={20} color="#666" style={styles.searchIcon} />
                <TextInput
                  {...props}
                  ref={searchInputRef}
                  style={styles.searchInput}
                  returnKeyType="search"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
                    <Feather name="x" size={18} color="#999" />
                  </TouchableOpacity>
                )}
              </View>
            )}
          />
        </View>
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
      ) : selectedCity ? (
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
      ) : (
        <View style={styles.noSelectionContainer}>
          <Feather name="search" size={60} color="#CCCCCC" />
          <Text style={styles.noSelectionTitle}>Search for a city</Text>
          <Text style={styles.noSelectionSubtitle}>
            Start typing to find hospitals in your city
          </Text>
        </View>
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
    zIndex: 20,
  },
  autocompleteContainer: {
    zIndex: 1000,
  },
  autocompleteInputContainer: {
    borderWidth: 0,
    backgroundColor: 'transparent',
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
    elevation: 4,
    marginTop: 4,
  },
  autocompleteItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  autocompleteItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  autocompleteTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  autocompleteCityName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  autocompleteProvince: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
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
