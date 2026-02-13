/**
 * SettingsModal - Modal za podešavanja vozača
 * Ekstraktovano iz DriverViewScreen.js radi održivosti
 */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { styles } from '../styles';
import { COLORS, COUNTRY_CODES } from '../constants';

// Settings Modal
export const SettingsModal = ({
  visible,
  user,
  companyName,
  language,
  t,
  onClose,
  onEditProfile,
  onLogout,
  onChangeLanguage,
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={onClose}
  >
    <TouchableOpacity
      style={styles.modalOverlay}
      activeOpacity={1}
      onPress={onClose}
    >
      <View style={styles.settingsCard}>
        <View style={styles.settingsHeader}>
          <Text style={styles.settingsTitle}>⚙️ Podesavanja</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.settingsClose}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.settingsSection}>
          <Text style={styles.settingsSectionTitle}>Profil</Text>
          <TouchableOpacity
            style={styles.profileInfo}
            onPress={onEditProfile}
            activeOpacity={0.7}
          >
            <Text style={styles.profileIcon}>🚛</Text>
            <View style={styles.profileDetails}>
              <Text style={styles.profileName}>{user?.name}</Text>
              <Text style={styles.profileRole}>Vozac</Text>
              <Text style={styles.profileCompany}>{companyName}</Text>
              {user?.phone && (
                <Text style={styles.profilePhone}>📞 {user.phone}</Text>
              )}
            </View>
            <Text style={styles.profileEditIcon}>✏️</Text>
          </TouchableOpacity>
        </View>

        {/* Language Switcher */}
        <View style={styles.languageSection}>
          <Text style={styles.settingsSectionTitle}>{t('language')}</Text>
          <View style={styles.languageButtons}>
            <TouchableOpacity
              style={[styles.languageBtn, language === 'sr' && styles.languageBtnActive]}
              onPress={() => onChangeLanguage('sr')}
            >
              <Text style={styles.languageFlag}>🇷🇸</Text>
              <Text style={[styles.languageBtnText, language === 'sr' && styles.languageBtnTextActive]}>
                {t('serbian')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.languageBtn, language === 'en' && styles.languageBtnActive]}
              onPress={() => onChangeLanguage('en')}
            >
              <Text style={styles.languageFlag}>🇬🇧</Text>
              <Text style={[styles.languageBtnText, language === 'en' && styles.languageBtnTextActive]}>
                {t('english')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.modalLogoutBtn} onPress={onLogout}>
          <Text style={styles.modalLogoutBtnText}>Odjavi se</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  </Modal>
);

// Edit Profile Modal
export const EditProfileModal = ({
  visible,
  editName,
  editCountryCode,
  editPhoneNumber,
  showCountryPicker,
  savingProfile,
  onClose,
  onSave,
  onNameChange,
  onPhoneChange,
  onCountryCodeChange,
  onToggleCountryPicker,
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    onRequestClose={onClose}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.editProfileModal}>
        <View style={styles.editProfileHeader}>
          <Text style={styles.editProfileTitle}>Uredi profil</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.editProfileClose}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.editProfileContent}>
          {/* Name Input */}
          <View style={styles.editProfileField}>
            <Text style={styles.editProfileLabel}>Ime i prezime</Text>
            <TextInput
              style={styles.editProfileInput}
              value={editName}
              onChangeText={onNameChange}
              placeholder="Unesite ime"
              placeholderTextColor={COLORS.mediumGray}
            />
          </View>

          {/* Phone Input */}
          <View style={styles.editProfileField}>
            <Text style={styles.editProfileLabel}>Broj telefona (opciono)</Text>
            <View style={styles.phoneInputRow}>
              {/* Country Code Selector */}
              <TouchableOpacity
                style={styles.countryCodeBtn}
                onPress={onToggleCountryPicker}
              >
                <Text style={styles.countryCodeText}>{editCountryCode}</Text>
                <Text style={styles.countryCodeArrow}>▼</Text>
              </TouchableOpacity>

              {/* Phone Number */}
              <TextInput
                style={styles.phoneNumberInput}
                value={editPhoneNumber}
                onChangeText={onPhoneChange}
                placeholder="61234567"
                placeholderTextColor={COLORS.mediumGray}
                keyboardType="phone-pad"
              />
            </View>

            {/* Country Picker Dropdown */}
            {showCountryPicker && (
              <View style={styles.countryPickerDropdown}>
                {COUNTRY_CODES.map((item) => (
                  <TouchableOpacity
                    key={item.code}
                    style={[
                      styles.countryPickerItem,
                      editCountryCode === item.code && styles.countryPickerItemActive,
                    ]}
                    onPress={() => onCountryCodeChange(item.code)}
                  >
                    <Text style={styles.countryPickerText}>{item.country}</Text>
                    <Text style={styles.countryPickerCode}>{item.code}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveProfileBtn, savingProfile && styles.saveProfileBtnDisabled]}
          onPress={onSave}
          disabled={savingProfile}
        >
          {savingProfile ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Text style={styles.saveProfileBtnText}>Sacuvaj promene</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

export default {
  SettingsModal,
  EditProfileModal,
};
