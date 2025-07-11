import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import { selectUser } from '../../redux/slices/authSlice';
import { COLORS } from '@/constants/Colors';

const Header = () => {
  const user = useSelector(selectUser);
  const hospital = user?.hospital;

  return (
    <View style={styles.container}>
      {hospital?.hospitalLogoUrl ? (
        <Image
          source={{ uri: hospital.hospitalLogoUrl }}
          style={styles.logo}
          resizeMode="contain"
        />
      ) : (
        <View style={styles.logoPlaceholder}>
          <Text style={styles.logoText}>{hospital?.hospitalName?.[0] || 'H'}</Text>
        </View>
      )}
      <Text style={styles.hospitalName} numberOfLines={1}>
        {hospital?.hospitalName || 'Hospital'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    backgroundColor: COLORS.tokenPurple,
    borderRadius: 8,
    marginLeft: 8,
  },
  logo: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 6,
  },
  logoPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  logoText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.tokenPurple,
  },
  hospitalName: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
});

export default Header;