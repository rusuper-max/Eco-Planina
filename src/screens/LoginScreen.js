import React, { useState } from 'react';
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
import { useAppContext } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';

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
    red: '#EF4444',
};

const LoginScreen = ({ navigation }) => {
    const { loginUser, isLoading } = useAppContext();
    const { t, countryCodes } = useLanguage();
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [countryCode, setCountryCode] = useState('+381');
    const [showCountryPicker, setShowCountryPicker] = useState(false);

    const selectedCountry = countryCodes.find(c => c.code === countryCode) || countryCodes[0];

    const handleLogin = async () => {
        if (!phone.trim()) {
            Alert.alert(t('error'), t('phoneRequired'));
            return;
        }

        if (!password) {
            Alert.alert(t('error'), t('passwordRequired'));
            return;
        }

        try {
            const fullPhone = countryCode + phone.trim().replace(/^0+/, '');
            await loginUser(fullPhone, password);
            // Navigation handled by App.js state change
        } catch (error) {
            Alert.alert(t('error'), error.message || t('userNotFound'));
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Logo */}
                    <View style={styles.logoContainer}>
                        <Text style={styles.logoIcon}>🏔️</Text>
                        <Text style={styles.logoText}>Eco Planina</Text>
                        <Text style={styles.tagline}>{t('smartWasteManagement')}</Text>
                    </View>

                    {/* Login Form */}
                    <View style={styles.formContainer}>
                        <Text style={styles.formTitle}>{t('loginTitle')}</Text>
                        <Text style={styles.formSubtitle}>{t('loginSubtitle')}</Text>

                        <View style={[styles.inputGroup, { zIndex: 50 }]}>
                            <Text style={styles.label}>{t('phone')}</Text>
                            <Text style={styles.labelHint}>{t('phoneHint')}</Text>
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

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>{t('password')}</Text>
                            <TextInput
                                style={styles.textInput}
                                placeholder={t('passwordInputPlaceholder')}
                                placeholderTextColor={COLORS.mediumGray}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                            />
                        </View>

                        {/* Login Button */}
                        <TouchableOpacity
                            style={[
                                styles.loginButton,
                                !phone.trim() && styles.loginButtonDisabled,
                            ]}
                            onPress={handleLogin}
                            disabled={!phone.trim() || isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color={COLORS.white} />
                            ) : (
                                <Text style={styles.loginButtonText}>{t('loginBtn')}</Text>
                            )}
                        </TouchableOpacity>

                        {/* Divider */}
                        <View style={styles.divider}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>{t('or')}</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        {/* Register Link */}
                        <TouchableOpacity
                            style={styles.registerLink}
                            onPress={() => navigation.navigate('Register')}
                        >
                            <Text style={styles.registerLinkText}>
                                {t('noAccountQuestion')} <Text style={styles.registerLinkBold}>{t('registerLink')}</Text>
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>
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
        marginTop: 40,
        marginBottom: 30,
    },
    logoIcon: {
        fontSize: 60,
        marginBottom: 8,
    },
    logoText: {
        fontSize: 32,
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
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    formTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.darkGray,
        textAlign: 'center',
    },
    formSubtitle: {
        fontSize: 14,
        color: COLORS.mediumGray,
        textAlign: 'center',
        marginBottom: 24,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.darkGray,
        marginBottom: 6,
    },
    labelHint: {
        fontSize: 12,
        color: COLORS.mediumGray,
        marginBottom: 10,
        fontStyle: 'italic',
    },
    textInput: {
        backgroundColor: COLORS.lightGray,
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
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
    loginButton: {
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
    loginButtonDisabled: {
        backgroundColor: COLORS.mediumGray,
        shadowOpacity: 0,
        elevation: 0,
    },
    loginButtonText: {
        color: COLORS.white,
        fontSize: 17,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 24,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: COLORS.lightGray,
    },
    dividerText: {
        marginHorizontal: 16,
        color: COLORS.mediumGray,
        fontSize: 14,
    },
    registerLink: {
        alignItems: 'center',
    },
    registerLinkText: {
        fontSize: 15,
        color: COLORS.mediumGray,
    },
    registerLinkBold: {
        color: COLORS.primary,
        fontWeight: '600',
    },
});

export default LoginScreen;
