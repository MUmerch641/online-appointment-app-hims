import AsyncStorage from '@react-native-async-storage/async-storage';

// Keys for storing appointment flow data
const APPOINTMENT_FLOW_KEY = 'appointmentFlow';
const PENDING_APPOINTMENT_KEY = 'pendingAppointment';

// Interfaces
export interface AppointmentFlowData {
  hospitalId: string;
  hospitalName: string;
  hospitalData?: string; // JSON string of hospital object
  doctorId: string;
  doctorData: string; // JSON string of doctor object
  cityName?: string;
  mrn?: string;
  redirectAfterLogin: boolean;
  timestamp: number;
}

export interface PendingAppointmentData {
  hospitalId: string;
  hospitalName: string;
  hospitalData?: any;
  doctorId: string;
  doctorData: any;
  patientId?: string;
  patientName?: string;
  mrn?: string;
}

class AppointmentFlowService {
  /**
   * Store appointment flow data before redirecting to login
   */
  static async storeAppointmentFlow(data: AppointmentFlowData): Promise<void> {
    try {
      const flowData = {
        ...data,
        timestamp: Date.now(),
        redirectAfterLogin: true
      };
      await AsyncStorage.setItem(APPOINTMENT_FLOW_KEY, JSON.stringify(flowData));
      console.log('Appointment flow data stored successfully');
    } catch (error) {
      console.error('Error storing appointment flow data:', error);
    }
  }

  /**
   * Retrieve stored appointment flow data
   */
  static async getAppointmentFlow(): Promise<AppointmentFlowData | null> {
    try {
      const storedData = await AsyncStorage.getItem(APPOINTMENT_FLOW_KEY);
      if (storedData) {
        const flowData: AppointmentFlowData = JSON.parse(storedData);
        
        // Check if data is not too old (24 hours)
        const now = Date.now();
        const dayInMs = 24 * 60 * 60 * 1000;
        
        if (now - flowData.timestamp < dayInMs) {
          return flowData;
        } else {
          // Data is too old, remove it
          await this.clearAppointmentFlow();
          return null;
        }
      }
      return null;
    } catch (error) {
      console.error('Error retrieving appointment flow data:', error);
      return null;
    }
  }

  /**
   * Clear stored appointment flow data
   */
  static async clearAppointmentFlow(): Promise<void> {
    try {
      await AsyncStorage.removeItem(APPOINTMENT_FLOW_KEY);
      console.log('Appointment flow data cleared');
    } catch (error) {
      console.error('Error clearing appointment flow data:', error);
    }
  }

  /**
   * Check if there's a pending appointment flow after login
   */
  static async hasPendingAppointmentFlow(): Promise<boolean> {
    try {
      const flowData = await this.getAppointmentFlow();
      return flowData !== null && flowData.redirectAfterLogin;
    } catch (error) {
      console.error('Error checking pending appointment flow:', error);
      return false;
    }
  }

  /**
   * Store pending appointment data (used during appointment creation)
   */
  static async storePendingAppointment(data: PendingAppointmentData): Promise<void> {
    try {
      await AsyncStorage.setItem(PENDING_APPOINTMENT_KEY, JSON.stringify(data));
      console.log('Pending appointment data stored successfully');
    } catch (error) {
      console.error('Error storing pending appointment data:', error);
    }
  }

  /**
   * Retrieve pending appointment data
   */
  static async getPendingAppointment(): Promise<PendingAppointmentData | null> {
    try {
      const storedData = await AsyncStorage.getItem(PENDING_APPOINTMENT_KEY);
      if (storedData) {
        return JSON.parse(storedData);
      }
      return null;
    } catch (error) {
      console.error('Error retrieving pending appointment data:', error);
      return null;
    }
  }

  /**
   * Clear pending appointment data
   */
  static async clearPendingAppointment(): Promise<void> {
    try {
      await AsyncStorage.removeItem(PENDING_APPOINTMENT_KEY);
      console.log('Pending appointment data cleared');
    } catch (error) {
      console.error('Error clearing pending appointment data:', error);
    }
  }
}

export default AppointmentFlowService;
