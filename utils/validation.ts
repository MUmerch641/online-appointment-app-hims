export const validatePatientRegistration = (patientData: any) => {
    if (!patientData.patientName || !patientData.guardiansName || !patientData.phoneNumber || !patientData.cnic || !patientData.city) {
      return "Please fill in all required fields.";
    }
  
    if (patientData.phoneNumber.length !== 11) {
      return "Phone number must be 11 digits.";
    }
  
    return null;
  };
  