import React from 'react';
import { View, StyleSheet, TextInput, Text } from 'react-native';
import { Button } from 'react-native-paper';
import QRCode from 'react-native-qrcode-svg';

// Note: You'll need to install: npm install react-native-qrcode-svg
// And if using Expo: npx expo install react-native-svg

const QRCodeGenerator = () => {
  const [projectId, setProjectId] = React.useState('12345');
  const [qrValue, setQrValue] = React.useState('');
  
  const generateQR = () => {
    // Format: Create a URL that includes the domain and projectId
    // Using the proper domain structure from your API
    const signupUrl = `https://pakhims.com/online-apmt/signup/${projectId}`;
    setQrValue(signupUrl);
  };
  
  React.useEffect(() => {
    generateQR();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>QR Code Generator</Text>
      
      <Text style={styles.label}>Project ID:</Text>
      <TextInput
        style={styles.input}
        value={projectId}
        onChangeText={setProjectId}
        placeholder="Enter Project ID"
      />
      
      <Button 
        mode="contained" 
        onPress={generateQR}
        style={styles.button}
      >
        Generate QR Code
      </Button>
      
      {qrValue ? (
        <View style={styles.qrContainer}>
          <QRCode
            value={qrValue}
            size={200}
            color="black"
            backgroundColor="white"
          />
          <Text style={styles.urlText}>{qrValue}</Text>
        </View>
      ) : null}
      
      <Text style={styles.helpText}>
        This QR code contains a URL with your project ID.
        When scanned, it will redirect to your signup page
        with the project ID automatically populated.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1F75FE',
  },
  label: {
    alignSelf: 'flex-start',
    marginBottom: 5,
    fontSize: 16,
    fontWeight: '500',
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 20,
    paddingHorizontal: 10,
    backgroundColor: 'white',
  },
  button: {
    marginBottom: 30,
    backgroundColor: '#1F75FE',
    paddingHorizontal: 20,
  },
  qrContainer: {
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    marginBottom: 20,
  },
  urlText: {
    marginTop: 15,
    color: '#333',
    textAlign: 'center',
  },
  helpText: {
    marginTop: 20,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});

export default QRCodeGenerator;