import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Card } from 'react-native-paper';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS } from '@/constants/Colors';
import { getMyHimsPatients } from '@/src/himsPatientApi';

interface Patient {
  _id: string;
  patientName: string;
  guardiansName: string;
  gender: string;
  dob: string;
  phoneNumber?: string;
  phonNumber?: string;
  cnic: string;
  helthId?: string;
  city: string;
  reference?: string;
  himsNo?: number;
  mrn?: number; // Added to match usage in code
}

const HimsPatientScreen = () => {
  const router = useRouter();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiResponse, setApiResponse] = useState<{ data: Patient[] }>({ data: [] });
  const [error, setError] = useState<string | null>(null);

  // Fetch patients
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    const fetchPatients = async () => {
      try {
        const res = await getMyHimsPatients();
        if (isMounted) {
          setApiResponse(res);
          setIsLoading(false);
        }
      } catch (error: any) {
        setIsLoading(false);
        console.error('Error fetching patients:', error);
        setError(error.message || 'Failed to fetch patients');
      }
    };
    fetchPatients();
    return () => {
      isMounted = false;
    };
  }, []);

  // Map API data to Patient interface
  const patients: Patient[] = apiResponse.data.map((patient) => ({
    ...patient,
    phoneNumber: patient.phonNumber,
    mrn: patient.himsNo,
  }));

  const calculateAge = (dob: string) => {
    if (!dob) return 'N/A';
    try {
      const birthDate = new Date(dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age.toString();
    } catch (e) {
      return 'N/A';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date
        .toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
        .replace(/\//g, '/');
    } catch (e) {
      return dateString;
    }
  };

  const filteredPatients = patients.filter(
    (patient) =>
      patient.patientName.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      patient.cnic.includes(searchKeyword) ||
      (patient.phoneNumber?.includes(searchKeyword) ?? false) ||
      String(patient.mrn ?? '').includes(searchKeyword),
  );

  const handleCreateAppointment = (patient: Patient) => {
    if (!patient || !patient._id) {
      Alert.alert('Error', 'Invalid patient data.');
      return;
    }
    router.push({
      pathname: '/appointments/CreateAppointmentScreen',
      params: {
        patientId: patient._id,
        patientName: patient.patientName,
        mrn: patient.mrn?.toString(),
        phoneNumber: patient.phoneNumber || patient.phonNumber,
      },
    });
  };

  const handleUpdate = (patient: Patient) => {
    if (!patient || !patient._id) {
      Alert.alert('Error', 'Invalid patient data.');
      return;
    }
    router.push({
      pathname: '/registration/PatientUpdate',
      params: { patientData: JSON.stringify(patient) },
    });
  };

  const handleGoBack = () => {
    router.back();
  };

  const handleCreatePatient = () => {
    router.push('/registration/CreateHimsPatient');
  };

  const clearSearch = () => {
    setSearchKeyword('');
  };

  const renderPatientCard = ({ item }: { item: Patient }) => {
    const phoneNumber = item.phoneNumber || item.phonNumber || 'N/A';
    return (
      <Card style={styles.card}>
        <View style={styles.patientHeader}>
          <Text style={styles.patientName}>{item.patientName}</Text>
          <Text style={styles.patientMeta}>
            {/* Age: {calculateAge(item.dob)} */}
             HimsNo: {item.mrn || 'N/A'}
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
            <Ionicons name="repeat-outline" size={16} color={'#4CAF50'} />
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
    );
  };

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <TouchableOpacity style={styles.backButton} onPress={handleGoBack} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={20} color={COLORS.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Hims Patients</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: COLORS.primary,
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 4,
                backgroundColor: 'transparent',
              }}
              onPress={handleCreatePatient}
            >
              <Ionicons name="add" size={20} color={COLORS.primary} />
              <Text style={{ fontSize: 15, color: COLORS.primary, textAlign: 'center', marginLeft: 4 }}>
                Hims Patients
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.container}>
          <View style={styles.emptyContainer}>
            <Ionicons name="alert-circle-outline" size={64} color={COLORS.danger} />
            <Text style={[styles.emptyText, { color: COLORS.danger }]}>Error loading patients</Text>
            <Text style={styles.emptySubtext}>{error}</Text>
            <TouchableOpacity style={[styles.appointmentButton, { marginTop: 20 }]} onPress={() => {
              setIsLoading(true);
              setError(null);
              getMyHimsPatients()
                .then((res) => setApiResponse(res))
                .catch((err) => setError(err.message || 'Failed to fetch patients'))
                .finally(() => setIsLoading(false));
            }}>
              <Text style={styles.appointmentText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <TouchableOpacity style={styles.backButton} onPress={handleGoBack} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Hims Patients</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: COLORS.primary,
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 4,
              backgroundColor: 'transparent',
            }}
            onPress={handleCreatePatient}
          >
            <Ionicons name="add" size={20} color={COLORS.primary} />
            <Text style={{ fontSize: 15, color: COLORS.primary, textAlign: 'center', marginLeft: 4 }}>
              Create Patients
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.container}>
        <View style={styles.searchBarContainer}>
          <View style={styles.searchContainer}>
            <View style={styles.searchInputWrapper}>
              <Feather name="search" size={18} color={COLORS.textSecondary} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name, ID or phone..."
                placeholderTextColor={COLORS.placeholder}
                value={searchKeyword}
                onChangeText={setSearchKeyword}
                returnKeyType="search"
                selectionColor={COLORS.primary}
              />
              {searchKeyword.length > 0 && (
                <TouchableOpacity style={styles.clearButton} onPress={clearSearch}>
                  <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
        {isLoading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading patients...</Text>
          </View>
        ) : filteredPatients.length > 0 ? (
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
              {searchKeyword ? 'Try a different search term' : 'No patients available'}
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: COLORS.cardBackground,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerRight: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appointmentButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appointmentText: {
    color: COLORS.cardBackground,
    fontSize: 16,
    fontWeight: '600',
  },
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: COLORS.background,
  },
  searchBarContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  searchContainer: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    height: 48,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    width: '100%',
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textPrimary,
    height: '100%',
    paddingVertical: 8,
    fontWeight: '400',
  },
  clearButton: {
    padding: 6,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  patientHeader: {
    marginBottom: 12,
  },
  patientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  patientMeta: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  infoContainer: {
    marginBottom: 12,
    backgroundColor: '#E4E4E4',
    padding: 12,
    borderRadius: 14,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
    textAlign: 'right',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: '#388E3C',
  },
  editButton: {
    borderColor: 'grey',
  },
  buttonText: {
    color: '#4CAF50',
    fontSize: 11,
    fontWeight: '600',
  },
  buttonTextE: {
    color: 'grey',
    fontSize: 11,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.placeholder,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});

export default HimsPatientScreen;