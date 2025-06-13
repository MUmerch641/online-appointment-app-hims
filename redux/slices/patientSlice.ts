import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "../store";

interface Patient {
  mrn: any;
  _id: string;  
  patientName: string;
  guardiansName: string;
  gender: string;
  dob: string;
  phonNumber: string;
  cnic: string;
  helthId?: string;
  city: string;
  reference?: string;
}

interface PatientState {
  patients: Patient[];
}

const initialState: PatientState = {
  patients: [],
};

const patientSlice = createSlice({
  name: "patient",
  initialState,
  reducers: {
    setPatients: (state, action: PayloadAction<Patient[]>) => {
      state.patients = action.payload;
    },

    addPatients: (state, action: PayloadAction<Patient>) => {
      state.patients.push(action.payload);
    },

    removePatient: (state) => {
      state.patients = [];
    },

  
    updatePatientInList: (state, action: PayloadAction<Patient>) => {
      const index = state.patients.findIndex((p) => p._id === action.payload._id);
      if (index !== -1) {
        state.patients[index] = action.payload;
      }
    },
  },
});

export const { setPatients, addPatients, removePatient, updatePatientInList } = patientSlice.actions;
export const selectPatients = (state: RootState) => state.patient.patients;
export default patientSlice.reducer;
