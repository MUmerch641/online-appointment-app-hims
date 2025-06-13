import React from 'react';
import { View, StyleSheet } from 'react-native';
import QRScannerTest from '../../components/QRScannerScreen';

const ScanQRScreen = () => {
  return (
    <View style={styles.container}>
      <QRScannerTest />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default ScanQRScreen;