/**
 * useDriverProfile - Hook za profil i podešavanja vozača
 * Ekstraktovano iz DriverViewScreen.js radi održivosti
 */
import { useState, useCallback } from 'react';
import { Alert, Platform, Linking } from 'react-native';
import { COUNTRY_CODES } from '../constants';

export const useDriverProfile = ({ user, logout, updateUserProfile }) => {
  // Settings modal state
  const [showSettings, setShowSettings] = useState(false);

  // Edit profile state
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCountryCode, setEditCountryCode] = useState('+381');
  const [editPhoneNumber, setEditPhoneNumber] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  // Open settings modal
  const openSettings = useCallback(() => {
    setShowSettings(true);
  }, []);

  // Close settings modal
  const closeSettings = useCallback(() => {
    setShowSettings(false);
  }, []);

  // Open edit profile modal
  const openEditProfile = useCallback(() => {
    setEditName(user?.name || '');
    // Parse existing phone number
    const existingPhone = user?.phone || '';
    const foundCode = COUNTRY_CODES.find(c => existingPhone.startsWith(c.code));
    if (foundCode) {
      setEditCountryCode(foundCode.code);
      setEditPhoneNumber(existingPhone.replace(foundCode.code, '').trim());
    } else {
      setEditCountryCode('+381');
      setEditPhoneNumber(existingPhone);
    }
    setShowEditProfile(true);
    setShowSettings(false);
  }, [user?.name, user?.phone]);

  // Close edit profile modal
  const closeEditProfile = useCallback(() => {
    setShowEditProfile(false);
    setShowCountryPicker(false);
  }, []);

  // Save profile changes
  const handleSaveProfile = useCallback(async () => {
    if (!editName.trim()) {
      Alert.alert('Greska', 'Ime je obavezno');
      return;
    }

    setSavingProfile(true);
    try {
      const phone = editPhoneNumber.trim()
        ? `${editCountryCode}${editPhoneNumber.trim().replace(/^0+/, '')}`
        : null;

      await updateUserProfile({
        name: editName.trim(),
        phone: phone,
      });

      Alert.alert('Uspesno', 'Profil je azuriran');
      setShowEditProfile(false);
    } catch (error) {
      Alert.alert('Greska', 'Nije moguce sacuvati promene');
    } finally {
      setSavingProfile(false);
    }
  }, [editName, editCountryCode, editPhoneNumber, updateUserProfile]);

  // Handle logout
  const handleLogout = useCallback(() => {
    Alert.alert(
      'Odjava',
      'Da li sigurno zelis da se odjavis?',
      [
        { text: 'Ne', style: 'cancel' },
        { text: 'Da', onPress: () => logout() },
      ]
    );
  }, [logout]);

  // Call client
  const handleCallClient = useCallback((request) => {
    const phone = request.client_phone;
    if (!phone) {
      Alert.alert('Nema broja', 'Klijent nema unet broj telefona');
      return;
    }

    Alert.alert(
      'Pozovi klijenta?',
      `Da li zelis da pozoves ${request.client_name}?`,
      [
        { text: 'Ne', style: 'cancel' },
        {
          text: 'Pozovi',
          onPress: () => {
            const phoneUrl = Platform.OS === 'ios'
              ? `telprompt:${phone}`
              : `tel:${phone}`;
            Linking.openURL(phoneUrl);
          },
        },
      ]
    );
  }, []);

  // Open navigation to client location
  const openNavigation = useCallback((request, app = 'google') => {
    if (!request.latitude || !request.longitude) {
      Alert.alert('Greska', 'Lokacija nije dostupna za ovog klijenta.');
      return;
    }

    const lat = request.latitude;
    const lng = request.longitude;

    if (app === 'waze') {
      Linking.openURL(`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`);
    } else {
      const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      Linking.openURL(googleMapsUrl);
    }
  }, []);

  // Select country code
  const selectCountryCode = useCallback((code) => {
    setEditCountryCode(code);
    setShowCountryPicker(false);
  }, []);

  // Toggle country picker
  const toggleCountryPicker = useCallback(() => {
    setShowCountryPicker(prev => !prev);
  }, []);

  return {
    // Settings state
    showSettings,

    // Edit profile state
    showEditProfile,
    editName,
    editCountryCode,
    editPhoneNumber,
    savingProfile,
    showCountryPicker,

    // Setters
    setEditName,
    setEditPhoneNumber,

    // Actions
    openSettings,
    closeSettings,
    openEditProfile,
    closeEditProfile,
    handleSaveProfile,
    handleLogout,
    handleCallClient,
    openNavigation,
    selectCountryCode,
    toggleCountryPicker,
  };
};

export default useDriverProfile;
