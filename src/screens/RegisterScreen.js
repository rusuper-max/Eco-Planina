import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';
import LocationPicker from '../components/LocationPicker';

const SUPABASE_URL = 'https://vmsfsstxxndpxbsdylog.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_IvJ2RkPfu_4HC2qffHi4bA_118ZZatm';

const COLORS = {
  primary: '#10B981',
  primaryDark: '#059669',
  primaryLight: '#D1FAE5',
  white: '#FFFFFF',
  darkGray: '#1F2937',
  lightGray: '#F3F4F6',
  mediumGray: '#6B7280',
  blue: '#3B82F6',
  blueLight: '#DBEAFE',
  orange: '#F97316',
  orangeLight: '#FED7AA',
  red: '#EF4444',
};

const RegisterScreen = ({ navigation }) => {
  const { t, countryCodes } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+381'); // Default Serbia
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [companyCode, setCompanyCode] = useState('');
  const [selectedRole, setSelectedRole] = useState(null); // 'client' or 'driver'

  // Address search state (only for clients)
  const [addressQuery, setAddressQuery] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const searchTimeout = useRef(null);

  const selectedCountry = countryCodes.find(c => c.code === countryCode) || countryCodes[0];

  // Search addresses using OpenStreetMap Nominatim (FREE!)
  const searchAddresses = async (query) => {
    if (query.length < 3) {
      setAddressSuggestions([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=rs,ba,hr,me&limit=5&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'sr',
            'User-Agent': 'EcoPlanina/1.0',
          },
        }
      );
      const data = await response.json();
      setAddressSuggestions(data);
    } catch (error) {
      console.error('Address search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search
  const handleAddressQueryChange = (text) => {
    setAddressQuery(text);
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    searchTimeout.current = setTimeout(() => {
      searchAddresses(text);
    }, 500);
  };

  // Select address from suggestions
  const selectAddress = (item) => {
    setAddress(item.display_name);
    setLatitude(parseFloat(item.lat));
    setLongitude(parseFloat(item.lon));
    setAddressQuery(item.display_name);
    setAddressSuggestions([]);
  };

  const handleLocationSelect = (location) => {
    setLatitude(location.lat);
    setLongitude(location.lng);
    setAddress(location.address);
    setAddressQuery(location.address);
    setShowMap(false);
  };

  const handleRegister = async () => {
    if (!selectedRole) {
      Alert.alert(t('error'), t('selectAccountType'));
      return;
    }

    // Common validation
    if (!name.trim()) {
      Alert.alert(t('error'), t('enterYourName'));
      return;
    }
    if (!companyCode.trim()) {
      Alert.alert(t('error'), t('enterCompanyCode'));
      return;
    }
    if (!phone.trim()) {
      Alert.alert(t('error'), t('phoneRequired'));
      return;
    }
    if (password.length < 6) {
      Alert.alert(t('error'), t('passwordMin'));
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert(t('error'), t('passwordMismatch'));
      return;
    }

    // Client-specific validation
    if (selectedRole === 'client' && !address.trim()) {
      Alert.alert(t('error'), t('selectAddress'));
      return;
    }

    setIsLoading(true);
    try {
      const fullPhone = countryCode + phone.trim().replace(/^0+/, ''); // Remove leading zeros

      // Call Edge Function for registration
      const response = await fetch(`${SUPABASE_URL}/functions/v1/auth-register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          phone: fullPhone,
          password: password,
          address: selectedRole === 'client' ? address.trim() : null,
          latitude: selectedRole === 'client' ? latitude : null,
          longitude: selectedRole === 'client' ? longitude : null,
          companyCode: companyCode.trim().toUpperCase(),
          role: selectedRole,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Greska pri registraciji');
      }

      // Success
      const roleLabel = selectedRole === 'driver' ? 'Vozac' : 'Klijent';
      Alert.alert(
        t('registrationSuccess'),
        `${roleLabel} uspesno registrovan!\n\nFirma: ${result.companyName}\n\nBicete prebaceni na ekran za prijavu.`,
        [
          {
            text: t('ok'),
            onPress: () => navigation.navigate('Login'),
          },
        ]
      );
    } catch (error) {
      Alert.alert(t('error'), error.message || t('registrationError'));
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = () => {
    if (!selectedRole) return false;
    const baseValid = name.trim() && companyCode.trim() && phone.trim() && password.length >= 6 && password === confirmPassword;

    if (selectedRole === 'client') {
      return baseValid && address.trim();
    }
    // Driver doesn't need address
    return baseValid;
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled={true}
        >
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Text style={styles.logoIcon}>🏔️</Text>
            <Text style={styles.logoText}>Eco Planina</Text>
            <Text style={styles.tagline}>{t('smartWasteManagement')}</Text>
          </View>

          {/* Registration Form */}
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>{t('createAccount')}</Text>
            <Text style={styles.formSubtitle}>{t('register')}</Text>

            {/* Role Selection FIRST */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('accountType')}</Text>
              <Text style={styles.labelHint}>{t('chooseOnceHint')}</Text>

              {/* Client Option */}
              <TouchableOpacity
                style={[
                  styles.roleCard,
                  selectedRole === 'client' && styles.roleCardSelected,
                ]}
                onPress={() => setSelectedRole('client')}
                activeOpacity={0.8}
              >
                <View style={[
                  styles.roleIconContainer,
                  selectedRole === 'client' && styles.roleIconContainerSelected,
                ]}>
                  <Text style={styles.roleIcon}>🏢</Text>
                </View>
                <View style={styles.roleTextContainer}>
                  <Text style={styles.roleTitle}>{t('clientRole')}</Text>
                  <Text style={styles.roleDescription}>
                    {t('clientRoleDesc')}
                  </Text>
                </View>
                <View style={[
                  styles.radioOuter,
                  selectedRole === 'client' && styles.radioOuterSelected,
                ]}>
                  {selectedRole === 'client' && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>

              {/* Driver Option */}
              <TouchableOpacity
                style={[
                  styles.roleCard,
                  selectedRole === 'driver' && styles.roleCardSelectedDriver,
                ]}
                onPress={() => setSelectedRole('driver')}
                activeOpacity={0.8}
              >
                <View style={[
                  styles.roleIconContainer,
                  { backgroundColor: COLORS.orangeLight },
                  selectedRole === 'driver' && styles.roleIconContainerSelectedDriver,
                ]}>
                  <Text style={styles.roleIcon}>🚛</Text>
                </View>
                <View style={styles.roleTextContainer}>
                  <Text style={styles.roleTitle}>Vozac</Text>
                  <Text style={styles.roleDescription}>
                    Preuzimam robu od klijenata
                  </Text>
                </View>
                <View style={[
                  styles.radioOuter,
                  selectedRole === 'driver' && styles.radioOuterSelectedDriver,
                ]}>
                  {selectedRole === 'driver' && <View style={styles.radioInnerDriver} />}
                </View>
              </TouchableOpacity>
            </View>

            {/* Common Fields (shown when role is selected) */}
            {selectedRole && (
              <>
                {/* Company Code */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t('companyCodeLabel')}</Text>
                  <Text style={styles.labelHint}>{t('companyCodeHintReg')}</Text>
                  <TextInput
                    style={[styles.textInput, styles.codeInput]}
                    placeholder={t('companyCodePlaceholder')}
                    placeholderTextColor={COLORS.mediumGray}
                    value={companyCode}
                    onChangeText={(text) => setCompanyCode(text.toUpperCase())}
                    autoCapitalize="characters"
                    autoCorrect={false}
                  />
                </View>

                {/* Name */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>
                    {selectedRole === 'driver' ? 'Ime i prezime' : t('nameOrFirmLabel')}
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder={selectedRole === 'driver' ? 'Marko Markovic' : t('nameOrFirmPlaceholder')}
                    placeholderTextColor={COLORS.mediumGray}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    autoCorrect={false}
                  />
                </View>

                {/* Address - Only for Clients */}
                {selectedRole === 'client' && (
                  <View style={[styles.inputGroup, { zIndex: 100 }]}>
                    <Text style={styles.label}>{t('locationAddressLabel')}</Text>
                    <View style={styles.labelRow}>
                      <Text style={styles.labelHint}>{t('addressSearchHint')}</Text>
                      <TouchableOpacity onPress={() => setShowMap(true)} style={styles.mapLinkBtn}>
                        <Text style={styles.mapLinkText}>📍 {t('selectOnMapBtn')}</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.addressSearchContainer}>
                      <TextInput
                        style={styles.textInput}
                        placeholder={t('addressPlaceholder')}
                        placeholderTextColor={COLORS.mediumGray}
                        value={addressQuery}
                        onChangeText={handleAddressQueryChange}
                        autoCapitalize="words"
                      />
                      {isSearching && (
                        <View style={styles.searchingIndicator}>
                          <ActivityIndicator size="small" color={COLORS.primary} />
                        </View>
                      )}
                    </View>

                    {/* Address suggestions dropdown */}
                    {addressSuggestions.length > 0 && (
                      <View style={styles.suggestionsContainer}>
                        {addressSuggestions.map((item, index) => (
                          <TouchableOpacity
                            key={item.place_id || index}
                            style={styles.suggestionItem}
                            onPress={() => selectAddress(item)}
                          >
                            <Text style={styles.suggestionIcon}>📍</Text>
                            <Text style={styles.suggestionText} numberOfLines={2}>
                              {item.display_name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}

                    {/* Selected address display */}
                    {address && addressSuggestions.length === 0 ? (
                      <View style={styles.selectedAddress}>
                        <Text style={styles.selectedAddressIcon}>✅</Text>
                        <Text style={styles.selectedAddressText} numberOfLines={2}>{address}</Text>
                        <TouchableOpacity
                          onPress={() => {
                            setAddress('');
                            setAddressQuery('');
                            setLatitude(null);
                            setLongitude(null);
                          }}
                          style={styles.clearAddressBtn}
                        >
                          <Text style={styles.clearAddressBtnText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </View>
                )}

                {/* Phone */}
                <View style={[styles.inputGroup, { zIndex: 50 }]}>
                  <Text style={styles.label}>{t('phone')}</Text>
                  <View style={styles.phoneInputRow}>
                    <TouchableOpacity
                      style={styles.countryCodeBtn}
                      onPress={() => setShowCountryPicker(!showCountryPicker)}
                    >
                      <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
                      <Text style={styles.countryCodeText}>{countryCode}</Text>
                      <Text style={styles.dropdownArrow}>▼</Text>
                    </TouchableOpacity>
                    <TextInput
                      style={[styles.textInput, styles.phoneInput]}
                      placeholder="641234567"
                      placeholderTextColor={COLORS.mediumGray}
                      value={phone}
                      onChangeText={setPhone}
                      keyboardType="phone-pad"
                    />
                  </View>
                  {showCountryPicker && (
                    <View style={styles.countryPickerDropdown}>
                      {countryCodes.map((country) => (
                        <TouchableOpacity
                          key={country.code}
                          style={[
                            styles.countryOption,
                            countryCode === country.code && styles.countryOptionSelected
                          ]}
                          onPress={() => {
                            setCountryCode(country.code);
                            setShowCountryPicker(false);
                          }}
                        >
                          <Text style={styles.countryFlag}>{country.flag}</Text>
                          <Text style={styles.countryName}>{country.name}</Text>
                          <Text style={styles.countryCodeText}>{country.code}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* Password */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t('password')}</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder={t('passwordPlaceholder')}
                    placeholderTextColor={COLORS.mediumGray}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />
                  {password.length > 0 && password.length < 6 && (
                    <Text style={styles.errorText}>{t('passwordMin')}</Text>
                  )}
                </View>

                {/* Confirm Password */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t('confirmPassword')}</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder={t('confirmPasswordPlaceholder')}
                    placeholderTextColor={COLORS.mediumGray}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                  />
                </View>

                {/* Info box for driver */}
                {selectedRole === 'driver' && (
                  <View style={[styles.infoBox, { backgroundColor: COLORS.orangeLight }]}>
                    <Text style={styles.infoIcon}>💡</Text>
                    <Text style={[styles.infoText, { color: COLORS.orange }]}>
                      Kao vozac, dobicete pristup ruti i spisku lokacija za preuzimanje robe.
                    </Text>
                  </View>
                )}
              </>
            )}

            {/* Register Button */}
            <TouchableOpacity
              style={[
                styles.registerButton,
                selectedRole === 'driver' && styles.registerButtonDriver,
                !isFormValid() && styles.registerButtonDisabled,
              ]}
              onPress={handleRegister}
              disabled={!isFormValid() || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.registerButtonText}>{t('registerBtn')}</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.disclaimer}>
              {t('roleDisclaimer')}
            </Text>

            {/* Login Link */}
            <TouchableOpacity
              style={styles.loginLink}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.loginLinkText}>
                {t('hasAccountQuestion')} <Text style={styles.loginLinkBold}>{t('loginLink')}</Text>
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <LocationPicker
        visible={showMap}
        onClose={() => setShowMap(false)}
        onSelect={handleLocationSelect}
        initialLocation={latitude && longitude ? { lat: latitude, lng: longitude } : null}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 20,
  },
  logoIcon: {
    fontSize: 50,
    marginBottom: 8,
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  tagline: {
    fontSize: 14,
    color: COLORS.mediumGray,
    marginTop: 4,
  },
  formContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.darkGray,
    textAlign: 'center',
  },
  formSubtitle: {
    fontSize: 14,
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
    zIndex: 1,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.darkGray,
    marginBottom: 6,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  labelHint: {
    fontSize: 12,
    color: COLORS.mediumGray,
    fontStyle: 'italic',
    marginBottom: 0,
  },
  mapLinkBtn: {
    backgroundColor: COLORS.blueLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  mapLinkText: {
    color: COLORS.blue,
    fontSize: 12,
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: COLORS.darkGray,
  },
  phoneInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  countryCodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 6,
  },
  countryFlag: {
    fontSize: 18,
  },
  countryCodeText: {
    fontSize: 15,
    color: COLORS.darkGray,
    fontWeight: '500',
  },
  dropdownArrow: {
    fontSize: 10,
    color: COLORS.mediumGray,
  },
  phoneInput: {
    flex: 1,
  },
  countryPickerDropdown: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  countryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
    gap: 10,
  },
  countryOptionSelected: {
    backgroundColor: COLORS.primaryLight,
  },
  countryName: {
    flex: 1,
    fontSize: 14,
    color: COLORS.darkGray,
  },
  codeInput: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 18,
    letterSpacing: 2,
    textAlign: 'center',
  },
  addressSearchContainer: {
    position: 'relative',
  },
  searchingIndicator: {
    position: 'absolute',
    right: 14,
    top: 14,
  },
  suggestionsContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    maxHeight: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  suggestionIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  suggestionText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.darkGray,
    lineHeight: 20,
  },
  selectedAddress: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
  },
  selectedAddressIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  selectedAddressText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.primaryDark,
  },
  clearAddressBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.mediumGray,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  clearAddressBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  roleCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  roleCardSelectedDriver: {
    borderColor: COLORS.orange,
    backgroundColor: COLORS.orangeLight,
  },
  roleIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  roleIconContainerSelected: {
    backgroundColor: COLORS.primary,
  },
  roleIconContainerSelectedDriver: {
    backgroundColor: COLORS.orange,
  },
  roleIcon: {
    fontSize: 22,
  },
  roleTextContainer: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.darkGray,
  },
  roleDescription: {
    fontSize: 12,
    color: COLORS.mediumGray,
    marginTop: 2,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.mediumGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: COLORS.primary,
  },
  radioOuterSelectedDriver: {
    borderColor: COLORS.orange,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  radioInnerDriver: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.orange,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.blueLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  infoIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.blue,
    lineHeight: 18,
  },
  registerButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  registerButtonDriver: {
    backgroundColor: COLORS.orange,
    shadowColor: COLORS.orange,
  },
  registerButtonDisabled: {
    backgroundColor: COLORS.mediumGray,
    shadowOpacity: 0,
    elevation: 0,
  },
  registerButtonText: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  disclaimer: {
    fontSize: 11,
    color: COLORS.mediumGray,
    textAlign: 'center',
    marginTop: 14,
    fontStyle: 'italic',
  },
  loginLink: {
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 10,
  },
  loginLinkText: {
    fontSize: 15,
    color: COLORS.mediumGray,
  },
  loginLinkBold: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 12,
    color: COLORS.red,
    marginTop: 4,
    marginLeft: 4,
  },
});

export default RegisterScreen;
