import { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  StyleSheet,
  Animated,
  Easing,
  Image,
  Modal,
} from "react-native";
import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Card } from "react-native-paper";
import {
  useGetAllDoctorsQuery,
  useGetAllSpecializationsQuery,
  useGetAllTimeSlotsQuery,
  useBookAppointmentMutation,
} from "../../redux/api/appointmentApi";
import { COLORS } from "@/constants/Colors";
import BottomNavigation from "@/services/bottomNavigation";

// Define interfaces for the data structures
interface Service {
  _id: string;
  serviceName: string;
  fee: number;
  hospitalChargesInPercentage: number;
  extra: Record<string, unknown>;
}

interface TimingSchedule {
  timeFrom: string;
  timeTo: string;
}

interface Schedule {
  day: string;
  timingScheedules: TimingSchedule[];
}

interface Doctor {
  _id: string;
  fullName: string;
  specialization: string;
  designationDetail?: string;
  availableDays: string[];
  photoUrl?: string;
  weeklySchedule: Schedule[];
  services?: Service[];
}

interface Specialization {
  specializations: string;
  details: string;
  _id: string;
}

interface TimeSlot {
  slotId: string;
  slot: string;
  status: number;
}

interface RouteParams {
  patientId?: string;
  patientName?: string;
  mrn?: string;
}

interface AppointmentPayload {
  doctorId: string;
  patientId: string;
  date: string;
  slotId: string;
  services: string[];
  feeStatus: "paid" | "unpaid";
  appointmentDate: string;
  fee: number;
  extra: Record<string, unknown>;
  discount: number;
  discountInPercentage: number;
}

interface PaginatedSlots {
  slots: TimeSlot[];
  totalPages: number;
  currentPage: number;
}

interface Route {
  key: string;
  title: string;
  icon: string;
}

interface NavigationProps {
  route: Route;
  focused: boolean;
}

const CreateAppointmentScreen: React.FC = () => {
  const router = useRouter();
  const { patientId = "", patientName = "", mrn = "" } = useLocalSearchParams<RouteParams>();

  const CURRENT_DATE = new Date();
  const TODAY_DATE_STRING = CURRENT_DATE.toISOString().split("T")[0];
  const days = ["Sun", "Mon", "Tue", "Wed", "Thur", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(100))[0];
  const spinAnim = useState(new Animated.Value(0))[0];

  const { data: doctorsData } = useGetAllDoctorsQuery({});
  const { data: specializationsData } = useGetAllSpecializationsQuery({});
  const [bookAppointment] = useBookAppointmentMutation();

  const [selectedDoctor, setSelectedDoctor] = useState<string | null>(null);
  const [selectedSpecialization, setSelectedSpecialization] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [specializationDescription, setSpecializationDescription] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<{ _id: string; serviceName: string; fee: number } | null>(null);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [feeStatus, setFeeStatus] = useState<"paid" | "unpaid">("unpaid");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [animate, setAnimate] = useState<boolean>(false);
  const [showDoctorSelection, setShowDoctorSelection] = useState<boolean>(true);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [navigationIndex, setNavigationIndex] = useState<number>(0);
  const [showServiceDropdown, setShowServiceDropdown] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const slotsPerPage = 6;

  const { data: timeSlotsData, refetch: fetchSlots } = useGetAllTimeSlotsQuery(
    selectedDoctor && selectedDate ? { doctorId: selectedDoctor, date: selectedDate } : undefined,
    { skip: !selectedDoctor || !selectedDate }
  );

  const selectedDoctorDetails = useMemo(() => {
    return doctorsData?.data?.find((doc: Doctor) => doc._id === selectedDoctor) || null;
  }, [selectedDoctor, doctorsData?.data]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    if (isLoading) {
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } else {
      spinAnim.setValue(0);
    }
  }, [isLoading, spinAnim]);

  useEffect(() => {
    if (selectedDoctor) {
      setAnimate(true);
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0.5,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => setAnimate(false));

      if (selectedDoctorDetails?.services && selectedDoctorDetails.services.length > 0) {
        setSelectedService(selectedDoctorDetails.services[0]);
      }
    }
  }, [selectedDoctor, selectedDoctorDetails, fadeAnim]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentTime(new Date());
    }, 100000);
    return () => clearInterval(intervalId);
  }, []);

  const filteredDoctors = useMemo(() => {
    if (!doctorsData?.data) return [];
    if (searchQuery.trim() === "") {
      return doctorsData.data;
    }
    const query = searchQuery.toLowerCase().trim();
    return doctorsData.data.filter((doc: Doctor) => {
      const nameMatch = doc.fullName.toLowerCase().includes(query);
      const specializationMatch = doc.specialization.toLowerCase().includes(query);
      return nameMatch || specializationMatch;
    });
  }, [searchQuery, doctorsData?.data]);

  const selectedSpecializationId = useMemo(() => {
    if (!selectedSpecialization || !specializationsData?.data) return null;
    const specObj = specializationsData.data.find((s: Specialization) => s.specializations === selectedSpecialization);
    return specObj?._id || null;
  }, [selectedSpecialization, specializationsData?.data]);

  const getStandardizedDayName = (date: Date): string => {
    return date.toLocaleString("en-US", { weekday: "long" }).toLowerCase();
  };

  const getShortDayName = (dayName: string): string => {
    const dayMap: Record<string, string> = {
      sunday: "Sun",
      monday: "Mon",
      tuesday: "Tue",
      wednesday: "Wed",
      thursday: "Thur",
      friday: "Fri",
      saturday: "Sat",
    };
    return dayMap[dayName.toLowerCase()] || dayName;
  };

  const isToday = (dateString: string): boolean => {
    return dateString === TODAY_DATE_STRING;
  };

  const isPastDate = (dateString: string): boolean => {
    const inputDate = new Date(dateString);
    inputDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return inputDate < today;
  };

  const calculateAvailableDates = (doctor: Doctor): string[] => {
    if (!doctor || !doctor.weeklySchedule) return [];
    const today = new Date();
    const available: string[] = [];
    const availableDaysMap = new Map<string, TimingSchedule[]>();
    doctor.weeklySchedule.forEach((schedule: Schedule) => {
      if (schedule.timingScheedules && schedule.timingScheedules.length > 0) {
        availableDaysMap.set(schedule.day.toLowerCase(), schedule.timingScheedules);
      }
    });
    if (availableDaysMap.size === 0) return [];
    for (let i = 0; i < 30; i++) {
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + i);
      if (futureDate < today && i > 0) continue;
      const dayName = getStandardizedDayName(futureDate);
      const dateString = futureDate.toISOString().split("T")[0];
      if (availableDaysMap.has(dayName)) {
        available.push(dateString);
      }
    }
    return available;
  };

  const handleSpecializationChange = (spec: string | null): void => {
    setSelectedSpecialization(spec);
    if (!spec || spec === "") {
      setSpecializationDescription(null);
      setSelectedDoctor(null);
      setSelectedDate(null);
      setSelectedSlot(null);
      setAvailableDates([]);
    } else {
      const foundSpecialization = specializationsData?.data?.find((s: Specialization) => s.specializations === spec);
      setSpecializationDescription(foundSpecialization?.details || "");
      setSelectedDoctor(null);
      setSelectedDate(null);
      setSelectedSlot(null);
      setAvailableDates([]);
    }
  };

  const handleDoctorChange = (doctorId: string | null): void => {
    setSelectedDoctor(doctorId);
    setSelectedSlot(null);
  
    // Set today's date by default
    const todayString = TODAY_DATE_STRING;
    setSelectedDate(todayString);
  
    if (!doctorId) {
      setAvailableDates([]);
      setShowDoctorSelection(true);
      return;
    }
  
    const doctorDetails = doctorsData?.data?.find((doc: Doctor) => doc._id === doctorId);
    if (!doctorDetails) {
      setAvailableDates([]);
      return;
    }
  
    const availableDays = calculateAvailableDates(doctorDetails);
    setAvailableDates(availableDays);
    setShowDoctorSelection(false);
  
    // Remove the direct fetchSlots call - the existing useEffect will handle this
    // when both selectedDoctor and selectedDate are set3
  };

  const handleBackToDoctorSelection = (): void => {
    setShowDoctorSelection(true);
    setSelectedDoctor(null);
    setSelectedDate(null);
    setSelectedSlot(null);
    setAvailableDates([]);
  };

  const isDateAvailable = (date: Date): boolean => {
    if (!selectedDoctorDetails || !selectedDoctorDetails.weeklySchedule) return false;
    const dayName = getStandardizedDayName(date);
    return selectedDoctorDetails.weeklySchedule.some(
      (schedule: Schedule) =>
        schedule?.day?.toLowerCase() === dayName && schedule.timingScheedules && schedule.timingScheedules.length > 0
    );
  };

  const filterAvailableDates = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return false;
    const futureLimit = new Date();
    futureLimit.setDate(today.getDate() + 30);
    if (date > futureLimit) return false;
    return isDateAvailable(date);
  };

  useEffect(() => {
    if (selectedDoctor && selectedDate) {
      fetchSlots();
    }
  }, [selectedDoctor, selectedDate, fetchSlots]);

  const handleDateChange = (event: DateTimePickerEvent, date?: Date): void => {
    setShowDatePicker(false);
    if (!date) return;
    const formattedDate = date.toISOString().split("T")[0];
    if (isPastDate(formattedDate)) {
      Alert.alert("Invalid Date", "Please select a current or future date.");
      return;
    }
    if (!isDateAvailable(date)) {
      Alert.alert("Doctor Unavailable", "This doctor is not available on the selected date.");
      return;
    }
    setSelectedDate(formattedDate);
    setSelectedSlot(null);
    setCurrentPage(0);
  };

  const parseTimeString = (timeStr: string): { hours: number; minutes: number } | null => {
    const timeRegex = /(\d+):(\d+)(?:\s*(AM|PM))?/i;
    const match = timeStr.match(timeRegex);
    if (match) {
      let hours = Number.parseInt(match[1], 10);
      const minutes = Number.parseInt(match[2], 10);
      const period = match[3]?.toUpperCase();
      if (period === "PM" && hours < 12) hours += 12;
      if (period === "AM" && hours === 12) hours = 0;
      return { hours, minutes };
    }
    return null;
  };

  const isTimeSlotPassed = (timeFromStr: string): boolean => {
    if (!selectedDate || !isToday(selectedDate)) return false;
    const parsedTime = parseTimeString(timeFromStr);
    if (!parsedTime) return false;
    const { hours, minutes } = parsedTime;
    const slotTime = new Date();
    slotTime.setHours(hours, minutes, 0, 0);
    return currentTime > slotTime;
  };

  const handleConfirmBooking = (): void => {
    if (!selectedDoctor || !selectedDate || !selectedSlot || !patientId) {
      Alert.alert("Incomplete Information", "Please select all required fields");
      return;
    }
    setShowConfirmModal(true);
  };

  const handleModalConfirm = async (): Promise<void> => {
    setShowConfirmModal(false);
    setIsLoading(true);
    try {
      const serviceId = selectedService?._id || selectedDoctorDetails?.services?.[0]?._id || selectedSpecializationId;
      const serviceFee = selectedService?.fee || selectedDoctorDetails?.services?.[0]?.fee || 0;

      if (!serviceId || !patientId) {
        throw new Error("Missing required appointment information");
      }

      const appointmentPayload: AppointmentPayload = {
        doctorId: selectedDoctor!,
        patientId,
        date: selectedDate!,
        slotId: selectedSlot!,
        services: serviceId ? [serviceId] : [],
        feeStatus: feeStatus,
        appointmentDate: selectedDate!,
        fee: serviceFee + 100,
        extra: {},
        discount: 0,
        discountInPercentage: 0,
      };
      const response = await bookAppointment(appointmentPayload).unwrap();
      if (response.isSuccess && response.data) {
        router.replace({
          pathname: "/appointments/AppointmentReciept",
          params: { appointmentId: response.data._id },
        });
      } else if (response.message === "Appointment already submitted") {
        Alert.alert(
          "Appointment Already Submitted",
          "Your appointment has already been submitted.",
          [
            {
              text: "OK",
              onPress: () => router.replace("/dashboard/DashboardScreen"),
            },
          ]
        );
      } else {
        Alert.alert("Error", response.message || "Failed to book appointment");
      }
    } catch (error) {
      Alert.alert("Error", "An error occurred while booking the appointment");
    } finally {
      setIsLoading(false);
    }
  };

  const handleModalCancel = (): void => {
    setShowConfirmModal(false);
  };

  const doctorProfilePic = selectedDoctorDetails?.photoUrl
    ? { uri: selectedDoctorDetails.photoUrl }
    : require("../../assets/images/defaultProfilePic.png");

  const allSpecializations = useMemo(() => {
    const specializationsFromAPI = specializationsData?.data?.map((spec: Specialization) => spec.specializations) || [];
    const specializationsFromDoctors = doctorsData?.data?.map((doc: Doctor) => doc.specialization) || [];
    const uniqueSpecializations = Array.from(new Set([...specializationsFromAPI, ...specializationsFromDoctors]));
    return ["All", ...uniqueSpecializations];
  }, [specializationsData?.data, doctorsData?.data]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const paginatedSlots = useMemo((): PaginatedSlots => {
    if (!timeSlotsData?.data) return { slots: [], totalPages: 0, currentPage: 0 };
    const totalPages = Math.ceil(timeSlotsData.data.length / slotsPerPage);
    const startIndex = currentPage * slotsPerPage;
    const endIndex = startIndex + slotsPerPage;
    return {
      slots: timeSlotsData.data.slice(startIndex, endIndex),
      totalPages,
      currentPage,
    };
  }, [timeSlotsData?.data, currentPage]);

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.header, { transform: [{ translateY: slideAnim }] }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Appointment</Text>
        </Animated.View>

        <Card style={styles.card}>
          <View style={styles.topSection}>
            <View style={styles.patientInfoContainer}>
              {!showDoctorSelection && (
                <TouchableOpacity onPress={handleBackToDoctorSelection} style={styles.backToDoctorButton}>
                  <Ionicons name="arrow-back-circle" size={24} color={COLORS.primary} />
                  <Text style={styles.backToDoctorText}>Back to Doctor Selection</Text>
                </TouchableOpacity>
              )}
              <View style={styles.infoWrapper}>
                <View style={styles.infoItem}>
                  <Ionicons name="person" size={16} color={COLORS.primary} style={styles.infoIcon} />
                  <View>
                    <Text style={styles.infoLabel}>Patient</Text>
                    <Text style={styles.infoValue}>{patientName || "N/A"} (MRN: {mrn || "N/A"})</Text>
                  </View>
                </View>
                <View style={styles.infoItem}>
                  <Ionicons name="calendar" size={16} color={COLORS.primary} style={styles.infoIcon} />
                  <View>
                    <Text style={styles.infoLabel}>Today's Date</Text>
                    <Text style={styles.infoValue}>
                      {`${months[CURRENT_DATE.getMonth()]} ${CURRENT_DATE.getDate()}, ${CURRENT_DATE.getFullYear()}, ${days[CURRENT_DATE.getDay()]}`}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {showDoctorSelection && (
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
                    <View key={doctor._id} style={styles.doctorCard}>
                      <View style={styles.cardTopSection}>
                        <View style={styles.doctorImageContainer}>
                          <Image
                            source={
                              doctor.photoUrl
                                ? { uri: doctor.photoUrl }
                                : require("../../assets/images/defaultProfilePic.png")
                            }
                            style={styles.doctorImage}
                          />
                        </View>
                        <View style={styles.doctorInfo}>
                          <Text style={styles.doctorName}>{doctor.fullName}</Text>
                          <Text style={styles.doctorSpecialty}>{doctor.specialization}</Text>
                          <Text style={styles.doctorDescription}>
                            {doctor.designationDetail || "Provides healthcare for infants, children, and adolescents."}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.availabilityFooter}>
                        <Text style={styles.availabilityLabel}>
                          Available:{" "}
                          <Text style={styles.availabilityDays}>
                            {doctor.availableDays?.length
                              ? doctor.availableDays.map((day) => getShortDayName(day)).join(", ")
                              : "Contact clinic for availability"}
                          </Text>
                        </Text>
                        <View style={styles.selectButtonContainer}>
                          <TouchableOpacity style={styles.selectButton} onPress={() => handleDoctorChange(doctor._id)}>
                            <Text style={styles.selectButtonText}>Select</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
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
          )}

          {!showDoctorSelection && (
            <>
              <View style={styles.formSection}>
                <View style={styles.doctorHeaderRow}>
                  <View style={styles.doctorNameContainer}>
                    <Text style={styles.doctorSelectedName}>Doctor: {selectedDoctorDetails?.fullName}</Text>
                  </View>
                  <View style={styles.doctorImageSmallContainer}>
                    <Image source={doctorProfilePic} style={styles.doctorImageSmall} />
                  </View>
                </View>
                <Text style={styles.sectionTitle}>Select Date</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.datePickerButton}>
                  <Ionicons name="calendar-outline" size={22} color={COLORS.primary} />
                  <TextInput
                    style={styles.dateInput}
                    value={selectedDate || ""}
                    placeholder="Select Date"
                    editable={false}
                    placeholderTextColor={COLORS.placeholder}
                  />
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    mode="date"
                    value={new Date()}
                    display="default"
                    onChange={handleDateChange}
                    minimumDate={new Date()}
                  />
                )}
                {availableDates.length > 0 && (
                  <View style={styles.availableDaysContainer}>
                    <Text style={styles.availableDaysTitle}>Select Date:</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.daysScrollView}
                      contentContainerStyle={styles.daysScrollViewContent}
                    >
                      {availableDates.map((date) => {
                        const dateObj = new Date(date);
                        const isCurrentDay = isToday(date);
                        const isSelected = selectedDate === date;
                        return (
                          <TouchableOpacity
                            key={date}
                            style={[
                              styles.dayButton,
                              isSelected && styles.selectedDayButton,
                              isCurrentDay && styles.todayButton,
                            ]}
                            onPress={() => {
                              setSelectedDate(date);
                              setSelectedSlot(null);
                              setCurrentPage(0);
                            }}
                          >
                            <Text style={[styles.dayButtonText, isSelected && styles.selectedDayText]}>
                              {dateObj.toLocaleString("default", { weekday: "short" })}
                            </Text>
                            <Text style={[styles.dateButtonText, isSelected && styles.selectedDayText]}>
                              {dateObj.getDate()}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Select Time Slot</Text>
                <View style={styles.slotLegendContainer}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendColor, { backgroundColor: COLORS.primary }]} />
                    <Text style={styles.legendText}>Available</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendColor, { backgroundColor: COLORS.booked }]} />
                    <Text style={styles.legendText}>Booked</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendColor, { backgroundColor: COLORS.success }]} />
                    <Text style={styles.legendText}>Selected</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendColor, { backgroundColor: COLORS.danger }]} />
                    <Text style={styles.legendText}>Expired</Text>
                  </View>
                </View>

                {selectedDoctor && selectedDoctorDetails?.services && selectedDoctorDetails.services.length > 0 && (
                  <View style={styles.serviceSelectContainer}>
                    <Text style={styles.serviceSelectLabel}>Select Service:</Text>
                    <View style={styles.serviceDropdownContainer}>
                      <Ionicons name="medkit-outline" size={20} color={COLORS.primary} style={styles.serviceIcon} />
                      <View style={styles.pickerContainer}>
                        <TouchableOpacity
                          style={styles.dropdownButton}
                          onPress={() => {
                            setShowServiceDropdown(!showServiceDropdown);
                          }}
                        >
                          <Text style={styles.dropdownButtonText}>
                            {selectedService?.serviceName || "Select Service"}
                          </Text>
                          <Ionicons
                            name={showServiceDropdown ? "chevron-up" : "chevron-down"}
                            size={18}
                            color={COLORS.primary}
                          />
                        </TouchableOpacity>

                        {showServiceDropdown && (
                          <View style={styles.dropdownMenu}>
                            {selectedDoctorDetails.services.map((service: Service) => (
                              <TouchableOpacity
                                key={service._id}
                                style={[
                                  styles.dropdownItem,
                                  selectedService?._id === service._id && styles.selectedDropdownItem,
                                ]}
                                onPress={() => {
                                  setSelectedService(service);
                                  setShowServiceDropdown(false);
                                }}
                              >
                                <Text
                                  style={[
                                    styles.dropdownItemText,
                                    selectedService?._id === service._id && styles.selectedDropdownItemText,
                                  ]}
                                >
                                  {service.serviceName} - Rs {service.fee}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                )}

                <View style={styles.timeSlotContainer}>
                  {selectedDoctor && selectedDate ? (
                    timeSlotsData?.data?.length ? (
                      <>
                        <Animated.View style={[styles.rowContainer, { opacity: fadeAnim }]}>
                          {paginatedSlots.slots.map((slot: TimeSlot) => {
                            const [timeFrom, timeTo] = slot.slot.split(" - ");
                            const isSelected = selectedSlot === slot.slotId;
                            const isPastSlot = isTimeSlotPassed(timeFrom);
                            const isAvailable = slot.status === 0 && !isPastSlot;
                            const isBooked = slot.status === 1;
                            const isExpired = slot.status === 2 || isPastSlot;
                            let slotStyle = {};
                            let textStyle = {};
                            if (isSelected) {
                              slotStyle = styles.selectedSlot;
                              textStyle = { color: COLORS.success };
                            } else if (isExpired) {
                              slotStyle = styles.expiredSlot;
                              textStyle = { color: COLORS.danger };
                            } else if (isBooked) {
                              slotStyle = styles.bookedSlot;
                              textStyle = { color: COLORS.booked };
                            } else if (isAvailable) {
                              slotStyle = styles.availableSlot;
                              textStyle = { color: COLORS.primary };
                            }
                            return (
                              <View key={slot.slotId} style={styles.slotWrapper}>
                                <TouchableOpacity
                                  onPress={() => {
                                    if (isBooked || isExpired || isPastSlot) return;
                                    setSelectedSlot(slot.slotId);
                                  }}
                                  style={[styles.slotButton, slotStyle]}
                                  disabled={isBooked || isExpired || isPastSlot}
                                >
                                  <Text style={[styles.slotText, textStyle]}>
                                    {timeFrom} - {timeTo}
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            );
                          })}
                        </Animated.View>

                        {paginatedSlots.totalPages > 1 && (
                          <View style={styles.paginationContainer}>
                            <TouchableOpacity
                              style={[
                                styles.paginationButton,
                                currentPage === 0 && styles.paginationButtonDisabled,
                              ]}
                              onPress={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
                              disabled={currentPage === 0}
                            >
                              <Ionicons
                                name="chevron-back"
                                size={20}
                                color={currentPage === 0 ? COLORS.lightGray : COLORS.primary}
                              />
                            </TouchableOpacity>

                            <Text style={styles.paginationText}>
                              {currentPage + 1} / {paginatedSlots.totalPages}
                            </Text>

                            <TouchableOpacity
                              style={[
                                styles.paginationButton,
                                currentPage === paginatedSlots.totalPages - 1 && styles.paginationButtonDisabled,
                              ]}
                              onPress={() => setCurrentPage((prev) => Math.min(paginatedSlots.totalPages - 1, prev + 1))}
                              disabled={currentPage === paginatedSlots.totalPages - 1}
                            >
                              <Ionicons
                                name="chevron-forward"
                                size={20}
                                color={currentPage === paginatedSlots.totalPages - 1 ? COLORS.lightGray : COLORS.primary}
                              />
                            </TouchableOpacity>
                          </View>
                        )}
                      </>
                    ) : (
                      <View style={styles.noSlotsContainer}>
                        <Ionicons name="calendar-outline" size={40} color={COLORS.lightGray} />
                        <Text style={styles.noSlotsText}>No Slots Available</Text>
                      </View>
                    )
                  ) : (
                    <View style={styles.noSlotsContainer}>
                      <Ionicons name="time-outline" size={40} color={COLORS.lightGray} />
                      <Text style={styles.noSlotsText}>
                        {selectedDoctor && !selectedDate
                          ? "Please select a date to view available slots"
                          : "Please select a doctor first"}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {selectedDoctorDetails?.services && selectedDoctorDetails.services.length > 0 && (
                <View style={styles.formSection}>
                  <Text style={styles.sectionTitle}>Payment Details</Text>
                  <View style={styles.feeContainer}>
                    <View style={styles.feeRow}>
                      <Text style={styles.feeLabel}>Service Fee:</Text>
                      <Text style={styles.feeAmount}>
                        RS {selectedService?.fee || selectedDoctorDetails.services[0].fee}
                      </Text>
                    </View>
                    <View style={styles.feeRow}>
                      <Text style={styles.feeLabel}>Online Booking Fee:</Text>
                      <Text style={styles.feeAmount}>RS 100</Text>
                    </View>
                    <View style={[styles.feeRow, styles.totalFeeRow]}>
                      <Text style={styles.totalFeeLabel}>Total Fee:</Text>
                      <Text style={styles.totalFeeAmount}>
                        RS {(selectedService?.fee || selectedDoctorDetails.services[0].fee) + 100}
                      </Text>
                    </View>
                    <Text style={styles.paymentLabel}>Payment Status:</Text>
                    <View style={styles.paymentOptionsContainer}>
                      <TouchableOpacity
                        style={[styles.paymentOption, feeStatus === "unpaid" && styles.selectedPaymentOption]}
                        onPress={() => setFeeStatus("unpaid")}
                      >
                        <Ionicons
                          name={feeStatus === "unpaid" ? "checkmark-circle" : "ellipse-outline"}
                          size={20}
                          color={feeStatus === "unpaid" ? COLORS.primary : COLORS.textSecondary}
                          style={styles.paymentIcon}
                        />
                        <Text style={[styles.paymentOptionText, feeStatus === "unpaid" && styles.selectedPaymentText]}>
                          Pay at Clinic
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.button,
                  (!selectedDoctor || !selectedDate || !selectedSlot || isLoading) && styles.disabledButton,
                ]}
                onPress={handleConfirmBooking}
                disabled={!selectedDoctor || !selectedDate || !selectedSlot || isLoading}
              >
                {isLoading ? (
                  <Animated.View style={styles.buttonContent}>
                    <Animated.View style={[styles.buttonIcon, { transform: [{ rotate: spin }] }]}>
                      <Ionicons name="reload-outline" size={20} color={COLORS.cardBackground} />
                    </Animated.View>
                    <Text style={styles.buttonText}>Processing...</Text>
                  </Animated.View>
                ) : (
                  <View style={styles.buttonContent}>
                    <Ionicons
                      name="calendar-outline"
                      size={20}
                      color={COLORS.cardBackground}
                      style={styles.buttonIcon}
                    />
                    <Text style={styles.buttonText}>Confirm Appointment</Text>
                  </View>
                )}
              </TouchableOpacity>
            </>
          )}
        </Card>
      </ScrollView>

      <View style={styles.bottomNav}>
        <BottomNavigation
          navigationState={{
            index: navigationIndex,
            routes: [
              { key: "appointment", title: "Appointment", icon: "calendar-alt" },
              { key: "patient", title: "Patient", icon: "hospital-user" },
              { key: "profile", title: "Profile", icon: "user" },
            ],
          }}
          onIndexChange={(index: number) => {
            setNavigationIndex(index);
            switch (index) {
              case 0:
                router.replace("/dashboard/DashboardScreen");
                break;
              case 1:
                router.replace("/dashboard/PatientScreen");
                break;
              case 2:
                router.replace("/dashboard/ProfileScreen");
                break;
            }
          }}
          renderIcon={({ route, focused }: NavigationProps) => (
            <FontAwesome5 name={route.icon} size={25} color={focused ? "#1F75FE" : "#666"} />
          )}
          renderLabel={({ route, focused }: NavigationProps) => (
            <Text
              style={{
                color: focused ? "#1F75FE" : "#666",
                fontSize: 10,
                marginTop: -5,
                textAlign: "center",
              }}
            >
              {route.title}
            </Text>
          )}
          renderScene={() => null}
          barStyle={{ backgroundColor: "white" }}
          activeColor="transparent"
          inactiveColor="transparent"
          style={{ backgroundColor: "transparent", height: 60 }}
          theme={{
            colors: {
              secondaryContainer: "transparent",
            },
          }}
          labeled={true}
        />
      </View>
      <Modal visible={showConfirmModal} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Ionicons name="help-circle-outline" size={24} color="#0099ff" style={styles.modalIcon} />
              <Text style={styles.modalTitle}>Confirm Appointment</Text>
            </View>
            <Text style={styles.modalMessage}>
              Please note that an additional fee of <Text style={{ fontWeight: "900", fontStyle: "italic" }}>Rs.100</Text> will apply for scheduling an appointment online. Would you like to proceed?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={handleModalCancel}>
                <Text style={styles.modalCancelText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmButton} onPress={handleModalConfirm}>
                <Text style={styles.modalConfirmText}>CONFIRM</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  bottomNav: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: COLORS.background,
  },
  noDataContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
  noDataText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: 12,
    backgroundColor: COLORS.cardBackground,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginLeft: 12,
    color: COLORS.textPrimary,
  },
  card: {
    backgroundColor: COLORS.cardBackground,
    padding: 16,
    borderRadius: 12,
    shadowColor: COLORS.textPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  topSection: {
    marginBottom: 20,
  },
  patientInfoContainer: {
    backgroundColor: COLORS.cardBackground,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  infoWrapper: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 16,
  },
  infoIcon: {
    marginRight: 8,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  formSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
    color: COLORS.textPrimary,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  doctorSelectedName: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  doctorHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  doctorNameContainer: {
    flex: 1,
  },
  backToDoctorButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  backToDoctorText: {
    fontSize: 16,
    color: COLORS.primary,
    marginLeft: 4,
  },
  doctorImageSmallContainer: {
    marginLeft: 12,
  },
  doctorImageSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  doctorCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardTopSection: {
    flexDirection: "row",
    marginBottom: 8,
  },
  doctorImageContainer: {
    marginRight: 12,
  },
  doctorsContainer: {
    flexDirection: "column",
    marginTop: 16,
  },
  doctorImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  doctorInfo: {
    flex: 1,
    justifyContent: "center",
  },
  doctorName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000000",
    marginBottom: 2,
  },
  doctorSpecialty: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 4,
  },
  doctorDescription: {
    fontSize: 13,
    color: "#000000",
  },
  selectButtonContainer: {
    width: "30%",
    marginLeft: 8,
    justifyContent: "center",
  },
  selectButton: {
    backgroundColor: "#0099ff",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  selectButtonText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
  },
  availabilityFooter: {
    borderTopWidth: 1,
    borderTopColor: "#E8E8E8",
    paddingTop: 8,
    marginTop: 4,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  availabilityLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#000000",
    width: "65%",
    flexWrap: "wrap",
  },
  availabilityDays: {
    fontSize: 13,
    color: "#666666",
    fontWeight: "400",
  },
  datePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dateInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textPrimary,
    marginLeft: 8,
  },
  availableDaysContainer: {
    marginTop: 12,
  },
  availableDaysTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  daysScrollView: {
    flexGrow: 0,
  },
  daysScrollViewContent: {
    paddingRight: 12,
  },
  dayButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    minWidth: 60,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  selectedDayButton: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  todayButton: {
    borderColor: COLORS.primary,
  },
  dayButtonText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  dateButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginTop: 4,
  },
  selectedDayText: {
    color: COLORS.cardBackground,
  },
  timeSlotContainer: {
    marginTop: 8,
    minHeight: 120,
  },
  rowContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  slotWrapper: {
    margin: 4,
    width: "30%",
  },
  slotButton: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderStyle: "dashed",
    paddingVertical: 12,
    paddingHorizontal: 8,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  selectedSlot: {
    borderColor: COLORS.success,
    backgroundColor: "rgba(76, 201, 240, 0.1)",
  },
  availableSlot: {
    borderColor: COLORS.primary,
    backgroundColor: "rgba(67, 97, 238, 0.05)",
  },
  bookedSlot: {
    borderColor: COLORS.booked,
    backgroundColor: "rgba(148, 158, 167, 0.027)",
  },
  expiredSlot: {
    borderColor: COLORS.danger,
    backgroundColor: "rgba(249, 65, 68, 0.05)",
  },
  slotText: {
    fontSize: 14,
    textAlign: "center",
  },
  noSlotsContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
  noSlotsText: {
    marginTop: 8,
    color: COLORS.textSecondary,
    textAlign: "center",
    fontSize: 14,
    paddingHorizontal: 20,
  },
  feeContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  feeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  feeLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.textPrimary,
  },
  feeAmount: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.primary,
  },
  paymentLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  paymentOptionsContainer: {
    marginTop: 4,
  },
  paymentOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.cardBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    padding: 12,
  },
  selectedPaymentOption: {
    borderColor: COLORS.primary,
    backgroundColor: "rgba(67, 97, 238, 0.05)",
  },
  paymentIcon: {
    marginRight: 8,
  },
  paymentOptionText: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  selectedPaymentText: {
    color: COLORS.primary,
    fontWeight: "500",
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 2,
    marginBottom: 25,
  },
  disabledButton: {
    backgroundColor: COLORS.placeholder,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: COLORS.cardBackground,
    fontSize: 16,
    fontWeight: "600",
  },
  slotLegendContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendColor: {
    width: 14,
    height: 14,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 8,
    padding: 20,
    width: "80%",
    maxWidth: 350,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  modalIcon: {
    marginRight: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0099ff",
  },
  modalMessage: {
    fontSize: 14,
    color: COLORS.textPrimary,
    marginBottom: 20,
    textAlign: "center",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  modalCancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 12,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 5,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
  },
  modalConfirmButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#0099ff",
    borderRadius: 5,
  },
  modalConfirmText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#0099ff",
    textTransform: "uppercase",
  },
  serviceSelectContainer: {
    marginBottom: 16,
  },
  serviceSelectLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  serviceDropdownContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  serviceIcon: {
    marginRight: 8,
  },
  pickerContainer: {
    flex: 1,
  },
  dropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.cardBackground,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  dropdownButtonText: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  dropdownMenu: {
    marginTop: 8,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    paddingVertical: 8,
  },
  dropdownItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  selectedDropdownItem: {
    backgroundColor: COLORS.primaryLight,
  },
  dropdownItemText: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  selectedDropdownItemText: {
    color: COLORS.cardBackground,
  },
  totalFeeRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  totalFeeLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  totalFeeAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
  },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },
  paginationButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  paginationButtonDisabled: {
    borderColor: COLORS.lightGray,
    backgroundColor: COLORS.background,
  },
  paginationText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  searchIcon: {
    marginRight: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  clearButton: {
    padding: 4,
  },
});

export default CreateAppointmentScreen;