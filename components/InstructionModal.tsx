import React, { memo, useCallback, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TouchableWithoutFeedback,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface InstructionModalProps {
  visible: boolean;
  onClose: () => void;
  navigateToAppointment: () => void;
  navigateToPatients: () => void;
}

const { width, height } = Dimensions.get('window');

const InstructionModal: React.FC<InstructionModalProps> = ({
  visible,
  onClose,
  navigateToAppointment,
  navigateToPatients,
}) => {
  // Animation for modal entrance
  const fadeAnim = useMemo(() => new Animated.Value(0), []);
  const slideAnim = useMemo(() => new Animated.Value(50), []);

  // Handle modal visibility changes
  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200, // Faster animation
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 80,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, fadeAnim, slideAnim]);

  // Memoized callbacks to prevent re-renders
  const handleClose = useCallback(() => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => onClose());
  }, [onClose, fadeAnim]);

  const handleNavigateToAppointment = useCallback(() => {
    handleClose();
    navigateToAppointment();
  }, [handleClose, navigateToAppointment]);

  const handleNavigateToPatients = useCallback(() => {
    handleClose();
    navigateToPatients();
  }, [handleClose, navigateToPatients]);

  // Prevent propagation of touch events
  const stopPropagation = useCallback((e: any) => e.stopPropagation(), []);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none" // Custom animation handled manually
      onRequestClose={handleClose}
      statusBarTranslucent={true}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <Animated.View
          style={[
            styles.modalOverlay,
            { opacity: fadeAnim },
          ]}
        >
          <TouchableWithoutFeedback onPress={stopPropagation}>
            <Animated.View
              style={[
                styles.modalView,
                {
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleClose}
                accessibilityLabel="Close modal"
                accessibilityRole="button"
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>

              <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
              >
                <View style={styles.contentContainer}>
                  <Text style={styles.heading}>ہدایات:</Text>

                  <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>نئی اپائنٹمنٹ بنائیں</Text>
                    <Text style={styles.sectionText}>
                      لاگ آن کرنے کے بعد، اپائنٹمنٹ سیکشن میں جائیں۔ پھر{' '}
                      <Text style={styles.highlight}>APPOINTMENT +</Text> پر کلک کریں،
                      مطلوبہ تفصیلات درج کریں اور{' '}
                      <Text style={styles.highlight}>SUBMIT</Text> پر کلک کریں۔ اگر آپ کا
                      مریض مختلف ہسپتال میں پہلے سے رجسٹرڈ ہے تو{' '}
                      <Text style={styles.highlight}>MR</Text> نمبر سے تلاش کریں اور{' '}
                      <Text style={styles.highlight}>NEXT</Text> پر کلک کریں۔
                    </Text>
                  </View>

                  <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>اپائنٹمنٹ کی تفصیلات چیک کریں</Text>
                    <Text style={styles.sectionText}>
                      ڈاکٹر کا نام، خدمات، اپائنٹمنٹ کی تاریخ اور وقت منتخب کریں۔ پھر{' '}
                      <Text style={styles.highlight}>DONE</Text> پر کلک کرکے اس کو
                      محفوظ کریں تاکہ مریض کے وقت پر اپائنٹمنٹ کو دکھایا جا سکے۔
                    </Text>
                  </View>

                  <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>دوبارہ اپائنٹمنٹ لینا</Text>
                    <Text style={styles.sectionText}>
                      اگر آپ کو اسی ڈاکٹر کا دوبارہ اپائنٹمنٹ لینا ہے تو متعلقہ مریض کی
                      معلومات معلوم ہونے کے لئے{' '}
                      <Text style={styles.highlight}>
                        <Ionicons name="refresh" size={18} /> Retake
                      </Text>{' '}
                      آئیکن پر کلک کریں۔
                    </Text>
                  </View>

                  <View style={styles.buttonsContainer}>
                    <TouchableOpacity
                      style={styles.createButton}
                      onPress={handleNavigateToAppointment}
                      accessibilityLabel="Create new appointment"
                      accessibilityRole="button"
                    >
                      <Text style={styles.buttonText}>+APPOINTMENT</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.patientsButton}
                      onPress={handleNavigateToPatients}
                      accessibilityLabel="View patients"
                      accessibilityRole="button"
                    >
                      <Text style={styles.buttonText}>PATIENTS</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// Memoize the component to prevent unnecessary re-renders
export default memo(InstructionModal);

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)', // Slightly darker for better contrast
  },
  modalView: {
    width: width * 0.9,
    maxHeight: height * 0.85,
    backgroundColor: 'white',
    borderRadius: 12, // Softer corners
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  contentContainer: {
    paddingTop: 20,
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
    color: '#212529',
  },
  sectionContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 6,
    color: '#212529',
    textAlign: 'right',
  },
  sectionText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#495057',
    textAlign: 'right',
  },
  highlight: {
    color: '#0d6efd',
    fontWeight: '600',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  createButton: {
    backgroundColor: '#0d6efd',
    paddingVertical: 12,
    paddingHorizontal: 7,
    borderRadius: 6,
    flex: 1,
    marginRight: 4,
    alignItems: 'center',
  },
  patientsButton: {
    backgroundColor: '#0d6efd',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    flex: 1,
    marginLeft: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
});