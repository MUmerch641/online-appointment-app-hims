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
  Platform,
  Keyboard,
  Animated,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import * as Animatable from "react-native-animatable"
import { Feather } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { StatusBar } from "expo-status-bar"

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
  "province ": string // Note the space in the property name from API
}

// App interfaces
interface City {
  name: string
  province: string
  lat: string
  lng: string
  isPopular?: boolean
}

interface ProvinceWithCities {
  name: string
  cities: City[]
}

interface SelectCityScreenProps {
  navigation: any
}

// Constants
const API_ENDPOINT = "/stg_user-api/cms/getProviceAndCityLists"
const HOSPITAL_API_ENDPOINT = "/stg_online-apmt/patient-auth/getAllHospital"
const POPULAR_CITIES = ["Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad"]
const { width } = Dimensions.get("window")
const ANIMATION_DURATION = 800

// Skeleton loader component
const CitySkeletonLoader = () => (
  <Animatable.View animation="pulse" iterationCount="infinite" duration={1500} style={styles.skeletonCard}>
    <View style={styles.skeletonContent}>
      <View style={styles.skeletonIcon} />
      <View style={styles.skeletonTextContainer}>
        <View style={styles.skeletonText} />
        <View style={styles.skeletonSubtext} />
      </View>
      <View style={styles.skeletonArrow} />
    </View>
  </Animatable.View>
)

// City card component
const CityCard: React.FC<{
  city: City
  onSelect: () => void
  isPopular?: boolean
}> = ({ city, onSelect, isPopular }) => (
  <TouchableOpacity
    style={[styles.cityCard, isPopular && styles.popularCityCard]}
    onPress={onSelect}
    activeOpacity={0.7}
  >
    <View style={styles.cityCardContent}>
      <View style={[styles.cityIconContainer, isPopular && styles.popularCityIconContainer]}>
        <Feather name="map-pin" size={20} color={isPopular ? "#FFFFFF" : "#4A80F0"} />
      </View>
      <View style={styles.cityTextContainer}>
        <Text style={styles.cityName}>{city.name}</Text>
        <Text style={styles.cityProvince}>{city.province}</Text>
      </View>
      <Feather name="chevron-right" size={20} color="#999" />
    </View>
  </TouchableOpacity>
)

const SelectCityScreen: React.FC<SelectCityScreenProps> = ({ navigation }) => {
  const [allCities, setAllCities] = useState<City[]>([])
  const [filteredCities, setFilteredCities] = useState<City[]>([])
  const [provinces, setProvinces] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null)

  const searchInputRef = useRef<TextInput>(null)
  const scrollY = useRef(new Animated.Value(0)).current
  const insets = useSafeAreaInsets()

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

  // Fetch cities from API
  useEffect(() => {
    const fetchCitiesData = async () => {
      setLoading(true)
      setError(null)

      try {
        const API_BASE_URL = Constants.expoConfig?.extra?.API_BASE_URL || 
                 process.env.API_BASE_URL ;
                 
        
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINT}`, {
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
          // Process provinces
          setProvinces(data.data.provices || [])

          // Process cities
          const cities: City[] = (data.data.cities || []).map((cityData) => ({
            name: cityData.city,
            province: cityData["province "].trim(),
            lat: cityData.lat,
            lng: cityData.lng,
            isPopular: POPULAR_CITIES.includes(cityData.city),
          }))

          setAllCities(cities)
          setFilteredCities(cities)

          // Mock recent cities (would normally come from AsyncStorage)
          if (cities.length > 0) {
            const recentCitiesData = cities.slice(0, 2) // Get first 2 cities as recent
          }
        } else {
          setError(data.message || "Failed to fetch cities")
        }
      } catch (err) {
        console.error("Error fetching cities:", err)
        setError(err instanceof Error ? err.message : "An error occurred while fetching cities")
        
        // Fallback to mock data in case of network error (for development)
      
      } finally {
        setLoading(false)
      }
    }

    fetchCitiesData()

    // Add keyboard listeners
    
  }, [])

  // Handle search
  const handleSearch = (text: string): void => {
    setSearchQuery(text)



    let filtered = allCities

    // Filter by province if selected
    if (selectedProvince) {
      filtered = filtered.filter((city) => city.province === selectedProvince)
    }

    // Filter by search text
    if (text.length > 0) {
      filtered = filtered.filter((city) => city.name.toLowerCase().includes(text.toLowerCase()))
    }

    setFilteredCities(filtered)
  }

  // Handle province selection
  const handleSelectProvince = (province: string | null): void => {
    setSelectedProvince(province)

 if (!province) {
      // If "All" is selected, show all cities
      setFilteredCities(allCities)
      return  
    }


    let filtered = allCities.filter((city) => city.province === province)

    // Apply search filter if exists
    if (searchQuery.length > 0) {
      filtered = filtered.filter((city) => city.name.toLowerCase().includes(searchQuery.toLowerCase()))
    }

    setFilteredCities(filtered)
  }

  // Clear search
  const clearSearch = (): void => {
    setSearchQuery("")
    if (!selectedProvince) {
      setFilteredCities(allCities)
    } else {
      handleSelectProvince(selectedProvince)
    }
    Keyboard.dismiss()
  }

  // Handle city selection
  const handleSelectCity = async (city: City): Promise<void> => {
    try {
      
      // Show loading state (you might want to add a loading state for this)
      const API_BASE_URL = Constants.expoConfig?.extra?.API_BASE_URL || 
               process.env.API_BASE_URL;
      
      
      const response = await fetch(`${API_BASE_URL}${HOSPITAL_API_ENDPOINT}?city=${encodeURIComponent(city.name)}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const hospitalData = await response.json();

      // Navigate to the next screen with city and hospital data
      // Adjust the navigation path according to your app structure
      router.push({
        pathname: "/hospitals",
        params: {
          cityName: city.name,
          cityData: JSON.stringify(city),
          hospitalData: JSON.stringify(hospitalData)
        }
      });

    } catch (error) {
      console.error('Error fetching hospitals:', error);
      
      // Show error alert or handle gracefully
      // You might want to show a toast or alert here
      alert('Failed to fetch hospitals. Please try again.');
    }
  }

  // Handle login
  const handleLogin = (): void => {
    // Navigate to login screen
    router.push("/auth/LoginScreen");
  }

  // Render province pills
  const renderProvinceFilters = () => (
    <Animatable.View
      animation="fadeIn"
      duration={ANIMATION_DURATION}
      delay={200}
      style={styles.provincesContainer}
      useNativeDriver
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.provincesScrollContent}
      >
        <TouchableOpacity
          style={[styles.provinceButton, !selectedProvince && styles.provinceButtonActive]}
          onPress={() => handleSelectProvince(null)}
        >
          <Text style={[styles.provinceText, !selectedProvince && styles.provinceTextActive]}>All</Text>
        </TouchableOpacity>

        {provinces.map((province) => (
          <TouchableOpacity
            key={province}
            style={[styles.provinceButton, selectedProvince === province && styles.provinceButtonActive]}
            onPress={() => handleSelectProvince(province)}
          >
            <Text style={[styles.provinceText, selectedProvince === province && styles.provinceTextActive]}>
              {province}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </Animatable.View>
  )


  // Render city item
  const renderCityItem = ({ item, index }: { item: City; index: number }) => (
    <Animatable.View animation="fadeInUp" delay={index * 50} duration={300} useNativeDriver>
      <CityCard city={item} onSelect={() => handleSelectCity(item)} isPopular={item.isPopular} />
    </Animatable.View>
  )

  // Render list header
  const renderListHeader = () => (
    <>
      {renderProvinceFilters()}

      {filteredCities.length > 0 && (
        <Text style={styles.resultsText}>
          {selectedProvince ? `${selectedProvince}: ` : ""}
          Found {filteredCities.length} {filteredCities.length === 1 ? "city" : "cities"}
        </Text>
      )}
    </>
  )

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Feather name="map-pin" size={60} color="#CCCCCC" />
      <Text style={styles.emptyTitle}>No cities found</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery
          ? "Try a different search term"
          : selectedProvince
            ? `No cities found in ${selectedProvince}`
            : "Unable to load cities"}
      </Text>

      {(searchQuery || selectedProvince) && (
        <TouchableOpacity
          style={styles.resetButton}
          onPress={() => {
            setSearchQuery("")
            setSelectedProvince(null)
            setFilteredCities(allCities)
          }}
        >
          <Text style={styles.resetButtonText}>Reset filters</Text>
        </TouchableOpacity>
      )}
    </View>
  )

  // Render error state with retry functionality
  const renderError = () => (
    <View style={styles.errorContainer}>
      <Feather name="wifi-off" size={60} color="#FF6B6B" />
      <Text style={styles.errorTitle}>Connection Error</Text>
      <Text style={styles.errorMessage}>
        {error}
        {"\n"}Please check your internet connection and try again.
      </Text>
      <TouchableOpacity
        style={styles.retryButton}
        onPress={() => {
          // Retry fetching data
          const fetchCitiesData = async () => {
            setLoading(true)
            setError(null)
            // The useEffect will handle the API call
            setTimeout(() => {
              navigation.replace("SelectCity")
            }, 100)
          }
          fetchCitiesData()
        }}
      >
        <Feather name="refresh-cw" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
        <Text style={styles.retryButtonText}>Retry</Text>
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
          <View style={styles.titleRow}>
            <View style={styles.titleContainer}>
              <Animatable.Text animation="fadeIn" duration={ANIMATION_DURATION} style={styles.title} useNativeDriver>
                Select Your City
              </Animatable.Text>
              <Animatable.Text
                animation="fadeIn"
                duration={ANIMATION_DURATION}
                delay={100}
                style={styles.subtitle}
                useNativeDriver
              >
                Choose your city to find hospitals near you
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
            placeholder="Search for your city"
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
          {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
            <CitySkeletonLoader key={item} />
          ))}
        </View>
      ) : error ? (
        renderError()
      ) : (
        <Animated.FlatList
          data={filteredCities}
          keyExtractor={(item) => `${item.name}-${item.province}`}
          renderItem={renderCityItem}
          ListHeaderComponent={renderListHeader}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={[styles.listContainer, filteredCities.length === 0 && styles.emptyListContainer]}
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

// Import ScrollView
import { ScrollView } from "react-native"
import Constants from 'expo-constants';
import { router } from "expo-router"

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
    fontSize: 28,
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
  provincesContainer: {
    marginBottom: 20,
  },
  provincesScrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  provinceButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#F5F7FA",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  provinceButtonActive: {
    backgroundColor: "#4A80F0",
    borderColor: "#4A80F0",
  },
  provinceText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  provinceTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  
  sectionTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 12,
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
  resultsText: {
    fontSize: 15,
    color: "#666",
    marginBottom: 16,
    fontWeight: "500",
  },
  cityCard: {
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
  popularCityCard: {
    borderLeftWidth: 3,
    borderLeftColor: "#4A80F0",
  },
  cityCardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  cityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F0F4FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  popularCityIconContainer: {
    backgroundColor: "#4A80F0",
  },
  cityTextContainer: {
    flex: 1,
  },
  cityName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  cityProvince: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
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
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    height: 72,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
  },
  skeletonContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    height: "100%",
  },
  skeletonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    width: "65%",
    marginBottom: 8,
  },
  skeletonSubtext: {
    height: 12,
    backgroundColor: "#F0F0F0",
    borderRadius: 6,
    width: "45%",
  },
  skeletonArrow: {
    width: 20,
    height: 20,
    backgroundColor: "#E8E8E8",
    borderRadius: 10,
  },
})

export default SelectCityScreen
