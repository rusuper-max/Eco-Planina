import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  FlatList,
  Image,
} from 'react-native';
import { useAppContext } from '../context/AppContext';

const { width, height } = Dimensions.get('window');

const COLORS = {
  primary: '#10B981', // Emerald Green
  primaryDark: '#059669',
  white: '#FFFFFF',
  darkGray: '#1F2937',
  lightGray: '#F3F4F6',
  mediumGray: '#9CA3AF',
};

const welcomeSlides = [
  {
    id: '1',
    title: 'Containers & Boxes',
    subtitle: 'Kontejneri i Kutije',
    description: 'Manage all types of waste containers efficiently. From small boxes to large industrial containers.',
    descriptionSr: 'Upravljajte svim vrstama kontejnera za otpad. Od malih kutija do velikih industrijskih kontejnera.',
    icon: '📦',
    bgColor: '#ECFDF5',
  },
  {
    id: '2',
    title: 'Glass Bottles',
    subtitle: 'Staklene Flaše',
    description: 'Proper glass recycling with our smart tracking system. Keep the environment clean.',
    descriptionSr: 'Pravilno recikliranje stakla sa našim pametnim sistemom praćenja. Čuvajte životnu sredinu.',
    icon: '🍾',
    bgColor: '#F0FDF4',
  },
  {
    id: '3',
    title: 'Stretch Film & Nylon',
    subtitle: 'Stretch Folija i Najlon',
    description: 'Plastic film and nylon waste collection made easy. Schedule pickups with one tap.',
    descriptionSr: 'Sakupljanje plastične folije i najlona na jednostavan način. Zakažite preuzimanje jednim dodirom.',
    icon: '🎞️',
    bgColor: '#ECFDF5',
  },
];

const WelcomeScreen = ({ navigation }) => {
  const { setHasSeenWelcome } = useAppContext();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);

  const handleNext = () => {
    if (currentIndex < welcomeSlides.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      setHasSeenWelcome(true);
      navigation.replace('Home');
    }
  };

  const handleSkip = () => {
    setHasSeenWelcome(true);
    navigation.replace('Home');
  };

  const renderSlide = ({ item, index }) => (
    <View style={[styles.slide, { backgroundColor: item.bgColor }]}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{item.icon}</Text>
      </View>

      <View style={styles.textContainer}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.subtitle}>{item.subtitle}</Text>

        <View style={styles.divider} />

        <Text style={styles.description}>{item.description}</Text>
        <Text style={styles.descriptionSr}>{item.descriptionSr}</Text>
      </View>
    </View>
  );

  const renderPagination = () => (
    <View style={styles.pagination}>
      {welcomeSlides.map((_, index) => (
        <View
          key={index}
          style={[
            styles.paginationDot,
            currentIndex === index && styles.paginationDotActive,
          ]}
        />
      ))}
    </View>
  );

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoIcon}>♻️</Text>
          <Text style={styles.logoText}>EcoLogistics</Text>
        </View>
        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={welcomeSlides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        bounces={false}
      />

      {/* Bottom Section */}
      <View style={styles.bottomSection}>
        {renderPagination()}

        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>
            {currentIndex === welcomeSlides.length - 1 ? 'Get Started' : 'Next'}
          </Text>
          <Text style={styles.nextButtonArrow}>→</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 10,
    backgroundColor: COLORS.white,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIcon: {
    fontSize: 28,
    marginRight: 8,
  },
  logoText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  skipButton: {
    padding: 10,
  },
  skipText: {
    fontSize: 16,
    color: COLORS.mediumGray,
    fontWeight: '500',
  },
  slide: {
    width: width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  iconContainer: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  icon: {
    fontSize: 80,
  },
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.darkGray,
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 18,
    color: COLORS.primary,
    fontWeight: '600',
    marginBottom: 20,
  },
  divider: {
    width: 60,
    height: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
    marginBottom: 20,
  },
  description: {
    fontSize: 16,
    color: COLORS.darkGray,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 10,
  },
  descriptionSr: {
    fontSize: 14,
    color: COLORS.mediumGray,
    textAlign: 'center',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  bottomSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 20,
    backgroundColor: COLORS.white,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
  },
  paginationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.lightGray,
    marginHorizontal: 5,
  },
  paginationDotActive: {
    backgroundColor: COLORS.primary,
    width: 30,
  },
  nextButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  nextButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 10,
  },
  nextButtonArrow: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: 'bold',
  },
});

export default WelcomeScreen;
