import { View, Text, StyleSheet, Pressable } from "react-native"
import { Feather } from "@expo/vector-icons"

interface City {
  name: string;
  hospitalCount: number;
}

interface CityCardProps {
  city: City;
  onSelect: () => void;
}

const CityCard = ({ city, onSelect }: CityCardProps) => {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onSelect}
      android_ripple={{ color: "rgba(0, 0, 0, 0.1)" }}
    >
      <View style={styles.cardContent}>
        <View style={styles.iconContainer}>
          <Feather name="map-pin" size={20} color="#4A80F0" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.cityName}>{city.name}</Text>
          <Text style={styles.hospitalCount}>{city.hospitalCount} Hospitals</Text>
        </View>
        <Feather name="chevron-right" size={20} color="#999" />
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardPressed: {
    backgroundColor: "#F0F4FF",
    transform: [{ scale: 0.98 }],
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  cityName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  hospitalCount: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
})

export default CityCard
