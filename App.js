// App.js - Main Application with Authentication

import React, { useState, useEffect, useRef } from 'react';
import {
  ActivityIndicator, View, Text, ScrollView, TouchableOpacity,
  SafeAreaView, StatusBar, Modal, TextInput, Image, Animated,
  LayoutAnimation, UIManager, Platform, Alert,
} from 'react-native';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import MapView, { Marker } from 'react-native-maps';

import LoginPage from './login.js';
import SignupPage from './signup.js';
import { onAuthStateChange, getCurrentUser, signOut } from './auth.js';
import {
  getUserProfile, upsertUserProfile, getUserFarms, createFarm, deleteFarm,
  saveCropRecommendation, getCropRecommendations, getLearningProgress,
  completeModule, updateSelectedCrops, getAllCrops, updateLearningProgress,
  getEducationalModules, getModuleParagraphs, uploadProfilePictureToStorage,
  updateUserProfile,
} from './database.js';
import styles from './Styles.js';
import { base } from './supabase.js';

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

// ============================================
// APP ROOT
// ============================================

export default function AppRoot() {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [authPage, setAuthPage] = useState('login');

  useEffect(() => {
    checkUser();
    const subscription = onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        setUserProfile(await getUserProfile());
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setUserProfile(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const checkUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      if (currentUser) setUserProfile(await getUserProfile());
    } catch (e) {
      console.error('Error checking user:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (userData) => {
    setUser(userData.user);
    setUserProfile(await getUserProfile());
  };

  const handleSignup = async (userData) => {
    setUser(userData.user);
    setUserProfile(await getUserProfile());
  };

  const handleLogout = async () => {
    await signOut();
    setUser(null);
    setUserProfile(null);
    setAuthPage('login');
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  if (!user) {
    return authPage === 'login'
      ? <LoginPage onLogin={handleLogin} onSwitchToSignup={() => setAuthPage('signup')} />
      : <SignupPage onSignup={handleSignup} onSwitchToLogin={() => setAuthPage('login')} />;
  }

  return <CropIQAppDashboard user={user} userProfile={userProfile} onLogout={handleLogout} />;
}

// ============================================
// DASHBOARD
// ============================================

export function CropIQAppDashboard({ user, userProfile: initialUserProfile, onLogout }) {
  const [userProfile, setUserProfile] = useState(initialUserProfile);
  const [userFarms, setUserFarms] = useState([]);
  const [savedRecommendations, setSavedRecommendations] = useState([]);
  const [learningProgress, setLearningProgress] = useState([]);
  const [crops, setCrops] = useState([]);
  const [educationalModules, setEducationalModules] = useState([]);
  const [currentPage, setCurrentPage] = useState('home');

  // Location
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedLocationData, setSelectedLocationData] = useState(null);
  const [selectedFarm, setSelectedFarm] = useState(null);
  const [customLocationInput, setCustomLocationInput] = useState('');
  const [isGeocodingLocation, setIsGeocodingLocation] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals — showLocationModal and showMapModal are NEVER true at the same time
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [showModuleModal, setShowModuleModal] = useState(false);

  // Map
  const [mapRegion, setMapRegion] = useState({
    latitude: -13.1339, longitude: 27.8493, latitudeDelta: 5, longitudeDelta: 5,
  });
  const [selectedMapPin, setSelectedMapPin] = useState(null);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);

  // Weather
  const [weatherData, setWeatherData] = useState(null);
  const [monthlyWeatherData, setMonthlyWeatherData] = useState({});
  const [plantingSignal, setPlantingSignal] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedPeriod] = useState('5years');

  // Crops
  const [recommendations, setRecommendations] = useState([]);
  const [selectedCrop, setSelectedCrop] = useState(null);
  
  // Education
  const [selectedModule, setSelectedModule] = useState(null);
  const [selectedModuleContent, setSelectedModuleContent] = useState([]);
  const [isLoadingModule, setIsLoadingModule] = useState(false);
  // Profile editing
  const [isEditing, setIsEditing] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editProvince, setEditProvince] = useState('');
  const [editExperienceYears, setEditExperienceYears] = useState('');
  const [editPrimaryCrops, setEditPrimaryCrops] = useState('');
  const [editFarmSize, setEditFarmSize] = useState('');
  const [editSoilType, setEditSoilType] = useState('');
  const [editProfilePicture, setEditProfilePicture] = useState(null);
  const [isUploadingProfilePicture, setIsUploadingProfilePicture] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(50);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [currentPage]);

  useEffect(() => { if (user) loadUserData(); }, [user]);
  useEffect(() => { loadCrops(); }, []);

  // ── Data loaders ──────────────────────────────────────────────

  const loadUserData = async () => {
    try {
      const [profile, farms, recs, progress, modules] = await Promise.all([
        getUserProfile(), getUserFarms(), getCropRecommendations(), getLearningProgress(), getEducationalModules(),
      ]);
      setUserProfile(profile);
      setUserFarms(farms);
      setSavedRecommendations(recs);
      setLearningProgress(progress);
      setEducationalModules(modules);
      if (farms.length > 0 && !selectedFarm) {
        setSelectedFarm(farms[0]);
        setSelectedLocationData({ name: farms[0].name, province: farms[0].province, lat: parseFloat(farms[0].latitude), lon: parseFloat(farms[0].longitude) });
        setSelectedLocation(farms[0].name);
      }
    } catch (e) { console.error('Error loading user data:', e); }
  };

  const loadCrops = async () => {
    try { setCrops(await getAllCrops()); }
    catch (e) { console.error('Error loading crops:', e); }
  };

  // ── Season helpers ────────────────────────────────────────────

  const getCurrentSeasonInfo = () => {
    const month = new Date().getMonth();
    const season = month >= 10 || month <= 3 ? 'rainy' : 'dry';
    return { month: month + 1, monthName: new Date().toLocaleString('default', { month: 'long' }), season, seasonName: season === 'rainy' ? 'Rainy Season' : 'Dry Season' };
  };

  const isPlantingSeason = (plantingMonths, currentMonth) => {
    if (!plantingMonths) return false;
    const lower = plantingMonths.toLowerCase();
    if (lower.includes('year-round') || lower.includes('all year')) return true;
    const monthMap = { jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12 };
    const parts = lower.split('-');
    if (parts.length >= 2) {
      let start = null, end = null;
      for (const [k, v] of Object.entries(monthMap)) {
        if (parts[0].trim().includes(k)) start = v;
        if (parts[1].trim().includes(k)) end = v;
      }
      if (start && end) return start <= end ? currentMonth >= start && currentMonth <= end : currentMonth >= start || currentMonth <= end;
    }
    const name = new Date(2000, currentMonth - 1).toLocaleString('default', { month: 'long' }).toLowerCase();
    return lower.includes(name) || lower.includes(name.substring(0, 3));
  };

  // ── Suitability ───────────────────────────────────────────────

 const calculateCropSuitability = (crop, weather, monthlyWeather = null, currentMonth = null) => {
  if (!weather || !crop) return 0;

  const scores = [];
  const weights = [];

  // ── 1. RAINFALL — highest weight (40%) ────────────────────
  // Most critical factor for rain-fed Zambian farming
  if (crop.rainfall) {
    const m = crop.rainfall.match(/(\d+)-(\d+)/);
    if (m) {
      const min = parseFloat(m[1]);
      const max = parseFloat(m[2]);
      const actual = weather.rainfall?.annual || 0;
      const mid = (min + max) / 2;
      const range = max - min;

      let score;
      if (actual >= min && actual <= max) {
        // Within range — score based on how close to ideal midpoint
        const distanceFromMid = Math.abs(actual - mid);
        score = 100 - (distanceFromMid / (range / 2)) * 15; // 85-100
      } else if (actual < min) {
        // Too dry — penalise heavily, drought kills crops
        const deficit = min - actual;
        score = Math.max(0, 80 - (deficit / min) * 120);
      } else {
        // Too wet — penalise moderately, flooding is bad but some crops tolerate it
        const excess = actual - max;
        score = Math.max(10, 80 - (excess / max) * 80);
      }
      scores.push(Math.round(score));
      weights.push(40);
    }
  }

  // ── 2. TEMPERATURE — high weight (30%) ────────────────────
  if (crop.tempRange) {
    const m = crop.tempRange.match(/(\d+)-(\d+)/);
    if (m) {
      const min = parseFloat(m[1]);
      const max = parseFloat(m[2]);

      // Use monthly temp if available for the current planting month
      // otherwise fall back to annual average
      const actual = (monthlyWeather && currentMonth)
        ? (monthlyWeather[currentMonth]?.temperature || weather.temperature?.avg || 0)
        : (weather.temperature?.avg || 0);

      const mid = (min + max) / 2;
      const range = max - min;

      let score;
      if (actual >= min && actual <= max) {
        const distanceFromMid = Math.abs(actual - mid);
        score = 100 - (distanceFromMid / (range / 2)) * 10; // 90-100
      } else if (actual < min) {
        // Too cold
        const deficit = min - actual;
        score = Math.max(0, 85 - deficit * 15);
      } else {
        // Too hot
        const excess = actual - max;
        score = Math.max(0, 85 - excess * 12);
      }
      scores.push(Math.round(score));
      weights.push(30);
    }
  }

  // ── 3. HUMIDITY — medium weight (15%) ─────────────────────
  if (crop.humidity) {
    const m = crop.humidity.match(/(\d+)-(\d+)/);
    if (m) {
      const min = parseFloat(m[1]);
      const max = parseFloat(m[2]);
      const actual = weather.humidity || 0;
      const mid = (min + max) / 2;
      const range = max - min;

      let score;
      if (actual >= min && actual <= max) {
        const distanceFromMid = Math.abs(actual - mid);
        score = 100 - (distanceFromMid / (range / 2)) * 10;
      } else if (actual < min) {
        const deficit = min - actual;
        score = Math.max(10, 85 - deficit * 2);
      } else {
        const excess = actual - max;
        score = Math.max(10, 85 - excess * 2);
      }
      scores.push(Math.round(score));
      weights.push(15);
    }
  }

  // ── 4. WATER NEEDS vs RAINFALL PATTERN (10%) ──────────────
  // Cross-references crop's water needs with actual rainfall pattern
  if (crop.waterNeeds && weather.rainfall?.pattern) {
    const waterNeeds = crop.waterNeeds.toLowerCase();
    const pattern = weather.rainfall.pattern.toLowerCase();

    let score = 70; // default neutral

    if (waterNeeds.includes('high') || waterNeeds.includes('frequent')) {
      if (pattern === 'high') score = 100;
      else if (pattern === 'moderate') score = 65;
      else score = 25; // low rainfall, high water needs = bad
    } else if (waterNeeds.includes('moderate')) {
      if (pattern === 'moderate') score = 100;
      else if (pattern === 'high') score = 80;
      else score = 55;
    } else if (waterNeeds.includes('low') || waterNeeds.includes('drought')) {
      if (pattern === 'low') score = 100;
      else if (pattern === 'moderate') score = 85;
      else score = 65; // high rainfall for drought-tolerant = ok but not ideal
    }

    scores.push(score);
    weights.push(10);
  }

  // ── 5. SOIL TYPE bonus (5%) — if user has set soil type ───
  if (crop.soil && weather.soilType) {
    const cropSoil = crop.soil.toLowerCase();
    const farmSoil = weather.soilType.toLowerCase();

    let score = 70;
    if (cropSoil.includes(farmSoil) || farmSoil.includes('loam')) {
      score = 100; // exact match or loam (grows almost anything)
    } else if (cropSoil.includes('well-drained') && !farmSoil.includes('clay')) {
      score = 85;
    } else if (cropSoil.includes('clay') && farmSoil.includes('clay')) {
      score = 100;
    } else if (cropSoil.includes('sandy') && farmSoil.includes('sandy')) {
      score = 100;
    }

    scores.push(score);
    weights.push(5);
  }

  if (scores.length === 0) return crop.suitability || 70;

  // ── Weighted average ───────────────────────────────────────
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const weightedSum = scores.reduce((sum, score, i) => sum + score * weights[i], 0);
  const finalScore = Math.round(weightedSum / totalWeight);

  return Math.min(100, Math.max(0, finalScore));
};

const calculateSeasonalSuitability = (crop, weather, currentMonth) => {
  // Pass monthlyWeatherData so temperature uses the right month
  let base = calculateCropSuitability(crop, weather, monthlyWeatherData, currentMonth);

  const inSeason = isPlantingSeason(crop.growingMonths, currentMonth);

  // More nuanced seasonal adjustment
  if (inSeason) {
    // How deep into planting season are we?
    base = Math.min(100, base + 12);
  } else {
    // How far out of season?
    base = Math.max(0, base - 25);
  }

  return Math.round(base);
};

const getSuitabilityLabel = (score) => {
  if (score >= 90) return 'Excellent';
  if (score >= 78) return 'Very Good';
  if (score >= 65) return 'Good';
  if (score >= 52) return 'Moderate';
  if (score >= 38) return 'Risky';
  if (score >= 20) return 'Poor';
  return 'Not Suitable';
};
const getSuitabilityColor = (score) => {
  if (score >= 90) return '#065f46';
  if (score >= 78) return '#166534';
  if (score >= 65) return '#854d0e';
  if (score >= 52) return '#9a3412';
  return '#991b1b';
};

const getSuitabilityBackground = (score) => {
  if (score >= 90) return '#d1fae5';
  if (score >= 78) return '#dcfce7';
  if (score >= 65) return '#fef9c3';
  if (score >= 52) return '#ffedd5';
  return '#fee2e2';
};

  // ── Geocoding ─────────────────────────────────────────────────

  const reverseGeocodeLocation = async (lat, lon) => {
    setIsReverseGeocoding(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`);
      if (!res.ok) throw new Error('Reverse geocoding failed');
      const result = await res.json();
      const a = result.address || {};
      return { name: a.city || a.town || a.village || a.county || 'Unknown Location', district: a.district || a.county || a.state || '', province: a.state || a.province || '', lat, lon };
    } finally {
      setIsReverseGeocoding(false);
    }
  };

  const geocodeLocation = async (locationName) => {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationName + ', Zambia')}&format=json&limit=1&addressdetails=1`);
    if (!res.ok) throw new Error('Geocoding failed');
    const results = await res.json();
    if (!results?.length) throw new Error(`Location "${locationName}" not found in Zambia`);
    const a = results[0].address || {};
    return { name: locationName, district: a.district || a.county || a.state || '', province: a.state || a.province || '', lat: parseFloat(results[0].lat), lon: parseFloat(results[0].lon) };
  };

  // ── Weather fetching ──────────────────────────────────────────

  const timePeriods = [{ id: '5years', label: 'Last 5 years', months: 60 }];

  const calculateMonthlyWeather = (data, dailyTimes) => {
    const monthly = {};
    for (let m = 1; m <= 12; m++) monthly[m] = { temps: [], rainfall: [] };
    if (dailyTimes?.length) {
      const temps = data.daily.temperature_2m_mean || [];
      const precip = data.daily.precipitation_sum || [];
      dailyTimes.forEach((d, i) => {
        const m = new Date(d).getMonth() + 1;
        if (temps[i] !== null) monthly[m].temps.push(temps[i]);
        if (precip[i] !== null) monthly[m].rainfall.push(precip[i]);
      });
    }
    const averages = {};
    for (let m = 1; m <= 12; m++) {
      const d = monthly[m];
      averages[m] = {
        temperature: d.temps.length ? Math.round(d.temps.reduce((a, b) => a + b, 0) / d.temps.length) : 0,
        rainfall: d.rainfall.length ? Math.round(d.rainfall.reduce((a, b) => a + b, 0)) : 0,
        humidity: 65,
      };
    }
    return averages;
  };

  const fetchWeatherData = async (location, period = selectedPeriod) => {
    setSelectedLocation(location.name);
    setSelectedLocationData(location);
    setShowLocationModal(false);
    setShowMapModal(false);
    setSearchQuery('');
    setIsLoading(true);
    setError(null);
    setPlantingSignal(null);

    try {
      if (user) {
        let farm = userFarms.find(f => Math.abs(parseFloat(f.latitude) - location.lat) < 0.01 && Math.abs(parseFloat(f.longitude) - location.lon) < 0.01);
        if (!farm) {
          farm = await createFarm({ name: location.name, latitude: location.lat, longitude: location.lon, province: location.province || '', soil_type: null });
          setUserFarms(prev => [...prev, farm]);
        } else {
          setSelectedFarm(farm);
        }
      }
    } catch (e) { console.error('Error saving farm:', e); }

    try {
      const endDate = new Date();
      const startDate = new Date();
      const p = timePeriods.find(x => x.id === period);
      startDate.setMonth(endDate.getMonth() - p.months);
      const fmt = d => d.toISOString().split('T')[0];

      const [histRes, foreRes] = await Promise.all([
        fetch(`https://archive-api.open-meteo.com/v1/archive?latitude=${location.lat}&longitude=${location.lon}&start_date=${fmt(startDate)}&end_date=${fmt(endDate)}&daily=temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum,relative_humidity_2m_mean&timezone=Africa/Lusaka`),
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lon}&daily=precipitation_sum&forecast_days=10&timezone=Africa/Lusaka`),
      ]);

      if (!histRes.ok) throw new Error(`API Error: ${histRes.status}`);
      const data = await histRes.json();
      const forecastData = foreRes.ok ? await foreRes.json() : null;

      if (data.daily?.time?.length > 0) {
        const tMax = (data.daily.temperature_2m_max || []).filter(x => x !== null);
        const tMin = (data.daily.temperature_2m_min || []).filter(x => x !== null);
        const tMean = (data.daily.temperature_2m_mean || []).filter(x => x !== null);
        const precip = (data.daily.precipitation_sum || []).filter(x => x !== null);
        const humid = (data.daily.relative_humidity_2m_mean || []).filter(x => x !== null);

        if (!tMax.length || !tMean.length) throw new Error('No valid weather data');

        const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
        const totalRain = precip.reduce((a, b) => a + b, 0);
        let avgHumidity = humid.length ? Math.round(avg(humid)) : Math.round(Math.max(40, Math.min(90, 85 - (avg(tMax) - avg(tMin)) * 2)));
        if (isNaN(avgHumidity)) avgHumidity = 65;

        const processed = {
          temperature: { min: Math.round(avg(tMin)), max: Math.round(avg(tMax)), avg: Math.round(avg(tMean)) },
          rainfall: { annual: Math.round(totalRain), pattern: totalRain > 1000 ? 'High' : totalRain > 700 ? 'Moderate' : 'Low' },
          humidity: Math.max(40, Math.min(90, avgHumidity)),
          growingDays: Math.min(240, Math.round(precip.filter(p => p > 1).length * 1.5)),
          soilType: userProfile?.soil_type || null,
        };

        setMonthlyWeatherData(calculateMonthlyWeather(data, data.daily.time));

        if (forecastData?.daily?.precipitation_sum) {
          const rain10 = forecastData.daily.precipitation_sum.reduce((a, b) => a + b, 0);
          const season = getCurrentSeasonInfo().season;
          setPlantingSignal({ status: season === 'rainy' ? (rain10 > 20 ? 'plant_now' : 'wait_for_rain') : 'off_season', rainForecast: Math.round(rain10) });
        }

        setWeatherData(processed);

        const { month } = getCurrentSeasonInfo();
        const recCrops = crops.map(crop => {
          const suitability = calculateSeasonalSuitability(crop, processed, month);
          const inSeason = isPlantingSeason(crop.growingMonths, month);
          return { ...crop, suitability, suitabilityLabel: getSuitabilityLabel(suitability), inPlantingSeason: inSeason, seasonalBoost: inSeason ? '✓ In Season' : '⚠ Off Season' };
        }).sort((a, b) => {
          if (a.inPlantingSeason && !b.inPlantingSeason) return -1;
          if (!a.inPlantingSeason && b.inPlantingSeason) return 1;
          return b.suitability - a.suitability;
        });
        setRecommendations(recCrops);

        if (user && selectedFarm) {
          try {
            const summary = `Avg Temp: ${processed.temperature.avg}°C, Rainfall: ${processed.rainfall.annual}mm, Humidity: ${processed.humidity}%`;
            for (const crop of recCrops.filter(c => c.suitability >= 80)) {
              await saveCropRecommendation({ farm_id: selectedFarm.id, crop_name: crop.name, crop_category: crop.category, suitability_score: crop.suitability, suitability_label: crop.suitabilityLabel, weather_summary: summary, temperature_avg: processed.temperature.avg, temperature_min: processed.temperature.min, temperature_max: processed.temperature.max, rainfall_total: processed.rainfall.annual, humidity: processed.humidity });
            }
            setSavedRecommendations(await getCropRecommendations(selectedFarm.id));
          } catch (e) { console.error('Error saving recommendations:', e); }
        }
      } else {
        throw new Error('No weather data available for this location');
      }
    } catch (err) {
      setError(err.message.includes('Network') || err.message.includes('fetch') ? 'Network error. Please check your internet connection.' : `Failed to fetch weather data: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }; 

  // ── Static data ───────────────────────────────────────────────

  const zambianLocations = [
    { id: 1, name: 'Lusaka', district: 'Lusaka District', province: 'Lusaka Province', lat: -15.4167, lon: 28.2833 },
    { id: 2, name: 'Chilanga', district: 'Chilanga District', province: 'Lusaka Province', lat: -15.6500, lon: 28.4333 },
    { id: 3, name: 'Kitwe', district: 'Kitwe District', province: 'Copperbelt Province', lat: -12.8024, lon: 28.2132 },
    { id: 4, name: 'Ndola', district: 'Ndola District', province: 'Copperbelt Province', lat: -12.9587, lon: 28.6366 },
    { id: 5, name: 'Chingola', district: 'Chingola District', province: 'Copperbelt Province', lat: -12.5289, lon: 27.8631 },
    { id: 6, name: 'Mufulira', district: 'Mufulira District', province: 'Copperbelt Province', lat: -12.5497, lon: 28.2406 },
    { id: 7, name: 'Luanshya', district: 'Luanshya District', province: 'Copperbelt Province', lat: -13.1367, lon: 28.4167 },
    { id: 8, name: 'Livingstone', district: 'Livingstone District', province: 'Southern Province', lat: -17.8419, lon: 25.8544 },
    { id: 9, name: 'Choma', district: 'Choma District', province: 'Southern Province', lat: -16.8089, lon: 26.9872 },
    { id: 10, name: 'Mazabuka', district: 'Mazabuka District', province: 'Southern Province', lat: -15.8561, lon: 27.7481 },
    { id: 11, name: 'Monze', district: 'Monze District', province: 'Southern Province', lat: -16.2833, lon: 27.4833 },
    { id: 12, name: 'Kazungula', district: 'Kazungula District', province: 'Southern Province', lat: -17.7667, lon: 25.8667 },
    { id: 13, name: 'Chipata', district: 'Chipata District', province: 'Eastern Province', lat: -13.6333, lon: 32.6500 },
    { id: 14, name: 'Petauke', district: 'Petauke District', province: 'Eastern Province', lat: -14.2410, lon: 31.3197 },
    { id: 15, name: 'Katete', district: 'Katete District', province: 'Eastern Province', lat: -14.0667, lon: 32.0500 },
    { id: 16, name: 'Lundazi', district: 'Lundazi District', province: 'Eastern Province', lat: -12.2933, lon: 33.1767 },
    { id: 17, name: 'Kabwe', district: 'Kabwe District', province: 'Central Province', lat: -14.4469, lon: 28.4464 },
    { id: 18, name: 'Serenje', district: 'Serenje District', province: 'Central Province', lat: -13.4263, lon: 30.2830 },
    { id: 19, name: 'Kapiri Mposhi', district: 'Kapiri Mposhi District', province: 'Central Province', lat: -14.4833, lon: 28.6333 },
    { id: 20, name: 'Kasama', district: 'Kasama District', province: 'Northern Province', lat: -10.2129, lon: 31.1808 },
    { id: 21, name: 'Mporokoso', district: 'Mporokoso District', province: 'Northern Province', lat: -9.6833, lon: 30.8667 },
    { id: 22, name: 'Mongu', district: 'Mongu District', province: 'Western Province', lat: -15.2694, lon: 23.1514 },
    { id: 23, name: 'Senanga', district: 'Senanga District', province: 'Western Province', lat: -16.1167, lon: 23.2667 },
    { id: 24, name: 'Sesheke', district: 'Sesheke District', province: 'Western Province', lat: -17.4758, lon: 24.2967 },
    { id: 25, name: 'Solwezi', district: 'Solwezi District', province: 'North-Western Province', lat: -12.1739, lon: 26.3909 },
    { id: 26, name: 'Zambezi', district: 'Zambezi District', province: 'North-Western Province', lat: -13.5425, lon: 23.1042 },
    { id: 27, name: 'Mwinilunga', district: 'Mwinilunga District', province: 'North-Western Province', lat: -11.7358, lon: 24.4294 },
    { id: 28, name: 'Mansa', district: 'Mansa District', province: 'Luapula Province', lat: -11.1994, lon: 28.8939 },
    { id: 29, name: 'Kawambwa', district: 'Kawambwa District', province: 'Luapula Province', lat: -9.7914, lon: 29.0789 },
    { id: 30, name: 'Mpika', district: 'Mpika District', province: 'Muchinga Province', lat: -11.8350, lon: 31.4528 },
    { id: 31, name: 'Chinsali', district: 'Chinsali District', province: 'Muchinga Province', lat: -10.5411, lon: 32.0831 },
    { id: 32, name: 'THE HOUSE FOR LENGWE', district: 'Lusaka District', province: 'Lusaka Province', lat: -15.4167, lon: 28.2833 },
  ];

  const filteredLocations = zambianLocations.filter(loc =>
    loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    loc.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
    loc.province.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── Profile helpers ───────────────────────────────────────────

  const pickProfilePicture = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { alert('Camera roll permission required'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (!result.canceled) setEditProfilePicture(result.assets[0].uri);
  };

  const handleSaveInlineProfile = async () => {
    if (!user) { alert('Please log in'); return; }
    setIsSavingProfile(true);
    try {
      let pictureUrl = userProfile?.profile_picture_url || null;
      
      // If user selected a new local image, upload it first
      if (editProfilePicture && (editProfilePicture.startsWith('file://') || editProfilePicture.startsWith('content://'))) {
        pictureUrl = await uploadProfilePictureToStorage(editProfilePicture, user);
      } else if (editProfilePicture?.startsWith('http')) {
        pictureUrl = editProfilePicture;
      }

      await upsertUserProfile({
        full_name: editFullName || undefined, 
        province: editProvince || undefined,
        experience_years: editExperienceYears ? parseInt(editExperienceYears, 10) : undefined,
        primary_crops: editPrimaryCrops ? editPrimaryCrops.split(',').map(s => s.trim()).filter(Boolean) : undefined,
        farm_size: editFarmSize || undefined, 
        soil_type: editSoilType || undefined,
        profile_picture_url: pictureUrl || undefined,
      }, user);

      const updatedProfile = await getUserProfile();
      setUserProfile(updatedProfile);
      setIsEditing(false);
      alert('Profile saved successfully!');
    } catch (e) {
      console.error('Error saving profile:', e);
      alert('Failed to save profile. Please try again.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleDeleteFarm = async (farmId) => {
    Alert.alert(
      'Delete Location',
      'Are you sure you want to delete this saved location?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteFarm(farmId);
              setUserFarms(prev => prev.filter(f => f.id !== farmId));
              if (selectedFarm?.id === farmId) {
                setSelectedFarm(null);
                setSelectedLocation('');
                setSelectedLocationData(null);
                setWeatherData(null);
                setRecommendations([]);
              }
            } catch (e) {
              alert('Failed to delete location');
            }
          }
        }
      ]
    );
  };

  // ── Shared components ─────────────────────────────────────────

  const DetailRow = ({ label, value }) => (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );

  const ProfileField = ({ label, value }) => (
    <View style={styles.profileField}>
      <Text style={styles.profileFieldLabel}>{label}</Text>
      <Text style={styles.profileFieldValue}>{value}</Text>
    </View>
  );

  const NavButton = ({ icon, label, active, onPress }) => (
    <TouchableOpacity style={[styles.navButton, active && styles.navButtonActive]} onPress={onPress}>
      {icon}
      <Text style={[styles.navLabel, active && styles.navLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );

  const BottomNav = () => (
    <View style={styles.bottomNav}>
      <NavButton icon={<Ionicons name="home" size={22} color={currentPage === 'home' ? '#16a34a' : '#666'} />} label="Home" active={currentPage === 'home'} onPress={() => setCurrentPage('home')} />
      <NavButton icon={<Ionicons name="leaf" size={22} color={currentPage === 'recommendations' ? '#16a34a' : '#666'} />} label="Crops" active={currentPage === 'recommendations'} onPress={() => setCurrentPage('recommendations')} />
      <NavButton icon={<Ionicons name="book" size={22} color={currentPage === 'education' ? '#16a34a' : '#666'} />} label="Learn" active={currentPage === 'education'} onPress={() => setCurrentPage('education')} />
      <NavButton icon={<Ionicons name="person" size={22} color={currentPage === 'profile' ? '#16a34a' : '#666'} />} label="Profile" active={currentPage === 'profile'} onPress={() => setCurrentPage('profile')} />
    </View>
  );

  // ── Pages ─────────────────────────────────────────────────────

  const HomePage = () => (
    <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <ScrollView style={styles.container}>

        <View style={styles.currentLocationSection}>
          <View style={styles.locationHeader}>
            <View style={styles.locationInfo}>
              <Text style={styles.currentLocationLabel}>📍 Current Location</Text>
              <Text style={styles.currentLocationName}>{selectedLocation || 'Not Selected'}</Text>
              {selectedLocationData && <Text style={styles.currentLocationProvince}>{selectedLocationData.province}</Text>}
            </View>
            <TouchableOpacity style={styles.changeButton} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setShowLocationModal(true); }}>
              <Text style={styles.changeButtonText}>Change</Text>
            </TouchableOpacity>
          </View>
          {weatherData && !isLoading && (
            <View style={styles.weatherSummaryCards}>
              {[{ icon: '🌡️', label: 'Avg Temp', value: `${weatherData.temperature.avg}°C` }, { icon: '💧', label: 'Rainfall', value: `${weatherData.rainfall.annual}mm` }, { icon: '💨', label: 'Humidity', value: `${weatherData.humidity}%` }].map(c => (
                <View key={c.label} style={styles.summaryCard}>
                  <Text style={styles.summaryIcon}>{c.icon}</Text>
                  <Text style={styles.summaryLabel}>{c.label}</Text>
                  <Text style={styles.summaryValue}>{c.value}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.getCropRecommendationBox}>
          <View style={styles.recommendationIcon}><Text style={styles.recommendationIconText}>📈</Text></View>
          <View style={styles.recommendationContent}>
            <Text style={styles.recommendationTitle}>Get Crop Recommendations</Text>
            <Text style={styles.recommendationSubtitle}>Based on your local weather and soil conditions</Text>
          </View>
          <TouchableOpacity style={styles.viewRecommendationsButton} onPress={() => selectedLocation ? setCurrentPage('recommendations') : setShowLocationModal(true)}>
            <Text style={styles.viewRecommendationsButtonText}>{selectedLocation ? 'View Recommendations' : 'Select Location'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.weatherHistoryHeader}>
            <Text style={styles.weatherHistoryTitle}>Weather History (Last 5 Years)</Text>
          </View>
          {isLoading && (<View style={styles.loadingContainer}><ActivityIndicator size="large" color="#16a34a" /><Text style={styles.loadingText}>Fetching weather data...</Text></View>)}
          {error && (<View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text><TouchableOpacity style={styles.retryButton} onPress={() => selectedLocationData && fetchWeatherData(selectedLocationData)}><Text style={styles.retryButtonText}>Retry</Text></TouchableOpacity></View>)}
          {weatherData && !isLoading && (
            <View>
              {[
                { title: '🌡️ Temperature Range', items: [{ label: 'Average', value: `${weatherData.temperature.avg}°C` }, { label: 'Average Min', value: `${weatherData.temperature.min}°C` }, { label: 'Average Max', value: `${weatherData.temperature.max}°C` }] },
                { title: '💧 Rainfall Pattern', items: [{ label: 'Total', value: `${weatherData.rainfall.annual}mm` }, { label: 'Pattern', value: weatherData.rainfall.pattern }] },
                { title: '💨 Humidity Levels', items: [{ label: 'Average', value: `${weatherData.humidity}%` }, { label: 'Condition', value: weatherData.humidity > 70 ? 'Humid' : weatherData.humidity > 50 ? 'Moderate' : 'Dry' }] },
              ].map(card => (
                <View key={card.title} style={styles.temperatureTrendsCard}>
                  <Text style={styles.cardTitle}>{card.title}</Text>
                  <View style={styles.trendDetails}>
                    {card.items.map(item => (<View key={item.label} style={styles.trendItem}><Text style={styles.trendLabel}>{item.label}</Text><Text style={styles.trendValue}>{item.value}</Text></View>))}
                  </View>
                </View>
              ))}
            </View>
          )}
          {!weatherData && !isLoading && !error && (
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>Get Started</Text>
              <Text style={styles.infoText}>Select your location above to view historical weather data and receive personalized crop recommendations.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </Animated.View>
  );

  const RecommendationsPage = () => {
    const [isUpdatingCrop, setIsUpdatingCrop] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [monthlyRecommendations, setMonthlyRecommendations] = useState([]);
    const selectedCrops = userProfile?.selected_crops || [];

    const months = [
      { id: 1, name: 'January' }, { id: 2, name: 'February' }, { id: 3, name: 'March' },
      { id: 4, name: 'April' }, { id: 5, name: 'May' }, { id: 6, name: 'June' },
      { id: 7, name: 'July' }, { id: 8, name: 'August' }, { id: 9, name: 'September' },
      { id: 10, name: 'October' }, { id: 11, name: 'November' }, { id: 12, name: 'December' },
    ];

    useEffect(() => {
      if (monthlyWeatherData[selectedMonth] && crops.length > 0) {
        const mw = monthlyWeatherData[selectedMonth];
        const recs = crops.map(crop => {
          let s = 50;
          const tm = crop.tempRange?.match(/(\d+)-(\d+)/);
          if (tm) { const [min, max] = [parseInt(tm[1]), parseInt(tm[2])]; if (mw.temperature >= min && mw.temperature <= max) s += 25; else if (mw.temperature >= min - 3 && mw.temperature <= max + 3) s += 15; }
          const rm = crop.rainfall?.match(/(\d+)-(\d+)/);
          if (rm) { const [min, max] = [parseInt(rm[1]), parseInt(rm[2])]; if (mw.rainfall >= min && mw.rainfall <= max) s += 25; else if (mw.rainfall >= min - 30 && mw.rainfall <= max + 30) s += 15; }
          const inSeason = isPlantingSeason(crop.growingMonths, selectedMonth);
          if (inSeason) s += 15;
          s = Math.min(100, Math.max(0, s));
          return { ...crop, suitability: s, suitabilityLabel: getSuitabilityLabel(s), inPlantingSeason: inSeason, seasonalBoost: inSeason ? '✓ In Season' : '⚠ Off Season' };
        }).sort((a, b) => { if (a.inPlantingSeason && !b.inPlantingSeason) return -1; if (!a.inPlantingSeason && b.inPlantingSeason) return 1; return b.suitability - a.suitability; });
        setMonthlyRecommendations(recs);
      } else if (recommendations.length > 0) {
        setMonthlyRecommendations(recommendations);
      }
    }, [selectedMonth, monthlyWeatherData, crops, recommendations]);

    const handleCropToggle = async (cropName) => {
      if (!user) { alert('Please log in to select crops'); return; }
      setIsUpdatingCrop(cropName);
      try {
        const isSel = selectedCrops.includes(cropName);
        const updated = isSel ? selectedCrops.filter(n => n !== cropName) : [...selectedCrops, cropName];
        await updateSelectedCrops(updated, user);
        
        setUserProfile(await getUserProfile());
      } catch (e) { alert('Failed to update selected crops.'); } finally { setIsUpdatingCrop(null); }
    };

    return (
      <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <ScrollView style={styles.container}>
          <Text style={styles.pageTitle}>Crop Recommendations</Text>
          {!selectedLocation ? (
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>Please select a location first to see recommendations.</Text>
              <TouchableOpacity style={styles.warningButton} onPress={() => setCurrentPage('home')}><Text style={styles.warningButtonText}>Select Location</Text></TouchableOpacity>
            </View>
          ) : (
            <View style={styles.section}>
              <View style={{ marginBottom: 20, paddingHorizontal: 4 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#6b7280', marginBottom: 10 }}>Select a Month to View Best Crops</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
                  {months.map(month => (
                    <TouchableOpacity key={month.id} style={{ paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, borderRadius: 20, backgroundColor: selectedMonth === month.id ? '#16a34a' : '#f3f4f6', borderWidth: 1, borderColor: selectedMonth === month.id ? '#16a34a' : '#e5e7eb' }} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setSelectedMonth(month.id); }}>
                      <Text style={{ fontSize: 12, fontWeight: selectedMonth === month.id ? '600' : '500', color: selectedMonth === month.id ? '#ffffff' : '#374151' }}>{month.name.substring(0, 3)}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={{ marginBottom: 16, paddingHorizontal: 4 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Recommended Crops for {months.find(m => m.id === selectedMonth)?.name}</Text>
                <Text style={{ fontSize: 13, color: '#6b7280' }}>{selectedMonth >= 11 || selectedMonth <= 4 ? 'Rainy Season' : 'Dry Season'} — Best crops to plant this month</Text>
                {monthlyWeatherData[selectedMonth] && (
                  <View style={{ marginTop: 10, padding: 10, backgroundColor: '#f0fdf4', borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#16a34a' }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#166534', marginBottom: 6 }}>Historical Average for {months.find(m => m.id === selectedMonth)?.name}:</Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 12, color: '#166534' }}>🌡️ {monthlyWeatherData[selectedMonth].temperature}°C</Text>
                      <Text style={{ fontSize: 12, color: '#166534' }}>💧 {monthlyWeatherData[selectedMonth].rainfall}mm</Text>
                    </View>
                  </View>
                )}
              </View>

              {recommendations.length > 0
                ? monthlyRecommendations.filter(crop => isPlantingSeason(crop.growingMonths, selectedMonth)).sort((a, b) => b.suitability - a.suitability).map(crop => {
                    const isSel = selectedCrops.includes(crop.name);
                    const isUpd = isUpdatingCrop === crop.name;
                    return (
                      <TouchableOpacity key={crop.id} style={[styles.modernCropCard, isSel && styles.cropCardSelected, crop.inPlantingSeason && styles.cropCardInSeason]} onPress={() => handleCropToggle(crop.name)} disabled={isUpd}>
                        <View style={styles.cropCardContent}>
                          <View style={styles.cropImageContainer}>
                            {crop.imageUrl ? <Image source={{ uri: crop.imageUrl }} style={styles.cropImage} resizeMode="cover" /> : typeof crop.image === 'number' ? <Image source={crop.image} style={styles.cropImage} resizeMode="cover" /> : crop.image ? <Text style={styles.cropEmoji}>{crop.image}</Text> : <Text style={styles.cropEmoji}>🌾</Text>}
                          </View>
                          <View style={styles.cropMainInfo}>
                            <View style={styles.cropHeaderRow}>
                              <View style={styles.cropTitleContainer}>
                                <View style={styles.cropTitleRow}>
                                  <Text style={styles.modernCropName}>{crop.fullName}</Text>
                                  {crop.inPlantingSeason && <View style={styles.inSeasonBadge}><Text style={styles.inSeasonBadgeText}>IN SEASON</Text></View>}
                                </View>
                                <Text style={styles.cropCategory}>{crop.category}</Text>
                              </View>
                              <View style={[styles.modernSuitabilityBadge, { borderRadius: 10 }, { backgroundColor: getSuitabilityColor(crop.suitability) }]}>
                                <Text style={styles.modernSuitabilityPercent}>{crop.suitability}%</Text>
                                <Text style={styles.modernSuitabilityLabel}>{crop.suitabilityLabel}</Text>
                              </View>
                            </View>
                            <Text style={styles.cropShortDescription}>{crop.shortDescription}</Text>
                            <View style={styles.cropQuickStats}>
                              {[['calendar-outline', crop.growingMonths], ['water-outline', crop.rainfall], ['thermometer-outline', crop.tempRange]].map(([icon, val]) => (
                                <View key={icon} style={styles.quickStat}><Ionicons name={icon} size={14} color="#6b7280" /><Text style={styles.quickStatText}>{val}</Text></View>
                              ))}
                            </View>
                            <View style={styles.cropActionButtons}>
                              <TouchableOpacity style={[styles.viewDetailsButton, { flex: 1, marginRight: 8 }]} onPress={e => { e.stopPropagation(); setSelectedCrop(crop); }}><Text style={styles.viewDetailsButtonText}>View Details</Text></TouchableOpacity>
                              <TouchableOpacity style={[styles.cropSelectButton, isSel && styles.cropSelectButtonSelected]} onPress={e => { e.stopPropagation(); handleCropToggle(crop.name); }} disabled={isUpd}>
                                {isUpd ? <ActivityIndicator size="small" color={isSel ? '#fff' : '#16a34a'} /> : (<><Ionicons name={isSel ? 'checkmark-circle' : 'add-circle-outline'} size={20} color={isSel ? '#fff' : '#16a34a'} /><Text style={[styles.cropSelectButtonText, isSel && styles.cropSelectButtonTextSelected]}>{isSel ? 'Selected' : 'Select'}</Text></>)}
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                : <View style={styles.infoBox}><Text style={styles.infoTitle}>No Crops in Season</Text><Text style={styles.infoText}>No crops recommended for {months.find(m => m.id === selectedMonth)?.name}. Try a different month.</Text></View>}
            </View>
          )}

          {selectedCrop && (
            <Modal visible={true} animationType="slide">
              <SafeAreaView style={styles.modalFull}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalHeaderTitle}>{selectedCrop.fullName}</Text>
                  <TouchableOpacity onPress={() => setSelectedCrop(null)}><Text style={styles.closeIcon}>✕</Text></TouchableOpacity>
                </View>
                <ScrollView style={styles.modalBody}>
                  <View style={styles.cropDetailImageSection}>
                    {selectedCrop.imageUrl ? <Image source={{ uri: selectedCrop.imageUrl }} style={styles.cropDetailImage} resizeMode="cover" /> : typeof selectedCrop.image === 'number' ? <Image source={selectedCrop.image} style={styles.cropDetailImage} resizeMode="cover" /> : selectedCrop.image ? <Text style={styles.cropDetailEmoji}>{selectedCrop.image}</Text> : <Text style={styles.cropDetailEmoji}>🌾</Text>}
                    <View style={styles.cropCategoryBadge}><Text style={styles.cropCategoryText}>{selectedCrop.category}</Text></View>
                  </View>
                  <Text style={styles.cropDetailDescription}>{selectedCrop.description}</Text>
                  <View style={styles.detailSection}><Text style={styles.detailSectionTitle}>🌱 Planting Details</Text><DetailRow label="Planting Depth" value={selectedCrop.plantingDepth} /><DetailRow label="Spacing" value={selectedCrop.spacing} /><DetailRow label="Growing Season" value={selectedCrop.growingSeason} /></View>
                  <View style={styles.detailSection}><Text style={styles.detailSectionTitle}>🌤️ Climate Requirements</Text><DetailRow label="Temperature" value={selectedCrop.tempRange} /><DetailRow label="Rainfall" value={selectedCrop.rainfall} /><DetailRow label="Humidity" value={selectedCrop.humidity} /></View>
                  <View style={styles.detailSection}><Text style={styles.detailSectionTitle}>🌾 Soil & Water</Text><DetailRow label="Soil Type" value={selectedCrop.soil} /><DetailRow label="Water Needs" value={selectedCrop.waterNeeds} /></View>
                  <View style={styles.detailSection}><Text style={styles.detailSectionTitle}>🌿 Companion Plants</Text><Text style={styles.companionPlantsText}>{selectedCrop.companionPlants}</Text><Text style={styles.companionPlantsNote}>Plants that grow well together can improve yields and reduce pests</Text></View>
                  <View style={styles.detailSection}><Text style={styles.detailSectionTitle}>⚠️ Common Diseases</Text>{selectedCrop.commonDiseases.map((d, i) => <Text key={i} style={styles.diseaseItem}>• {d}</Text>)}</View>
                  <View style={styles.detailSection}><Text style={styles.detailSectionTitle}>💡 Management Practices</Text><Text style={styles.managementText}>{selectedCrop.management}</Text></View>
                </ScrollView>
              </SafeAreaView>
            </Modal>
          )}
        </ScrollView>
      </Animated.View>
    );
  };

  const EducationPage = () => {
    const handleModuleStart = async (module) => {
      setSelectedModule(module);
      setSelectedModuleContent([]);
      setIsLoadingModule(true);
      setShowModuleModal(true);
      try {
        const content = await getModuleParagraphs(module.id);
        setSelectedModuleContent(content);
        // Track that they started it
        await updateLearningProgress(module.id, { progress_percentage: 10 });
        setLearningProgress(await getLearningProgress());
      } catch (e) {
        console.error('Error loading module:', e);
      } finally {
        setIsLoadingModule(false);
      }
    };

    const handleModuleComplete = async (moduleId) => {
      try {
        await completeModule(moduleId);
        setLearningProgress(await getLearningProgress());
        setShowModuleModal(false);
        alert('Module completed! Great job!');
      } catch (e) {
        console.error(e);
      }
    };

    return (
      <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <ScrollView style={styles.container}>
          <Text style={styles.pageTitle}>Educational Resources</Text>
          <View style={styles.section}>
            {educationalModules.length > 0 ? educationalModules.map(module => {
              const progress = learningProgress.find(p => p.module_id === module.id);
              const isCompleted = progress?.completed || false;
              return (
                <View key={module.id} style={styles.moduleCard}>
                  
                  <Text style={styles.moduleIcon}>{module.icon || '📚'}</Text>
                  <View style={styles.moduleContent}>
                    <Text style={styles.moduleTitle}>{module.title}</Text>
                    <Text style={styles.moduleDescription}>{module.description}</Text>

                    <Text style={styles.moduleDuration}>{module.duration}</Text>
                    {progress && <Text style={{ fontSize: 12, color: '#16a34a', marginTop: 4 }}>Progress: {progress.progress_percentage}% {isCompleted && '✓ Completed'}</Text>}
                  </View>
                  <TouchableOpacity
                    style={[styles.moduleButton, isCompleted && { backgroundColor: '#16a34a' }]}
                    onPress={() => handleModuleStart(module)}
                  >
                    <Text style={styles.moduleButtonText}>{isCompleted ? 'Review →' : 'Start →'}</Text>
                  </TouchableOpacity>
                </View>
              );
            }) : (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#16a34a" />
                <Text style={styles.loadingText}>Loading modules...</Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Module Content Modal */}
        <Modal
          visible={showModuleModal}
          animationType="slide"
          onRequestClose={() => setShowModuleModal(false)}
        >
          <SafeAreaView style={styles.modalFull}>
            {/* Floating Back Button */}
            <TouchableOpacity 
              style={styles.articleFloatingBack} 
              onPress={() => setShowModuleModal(false)}
            >
              <Text style={{ fontSize: 20, color: '#16a34a', fontWeight: 'bold' }}>✕</Text>
            </TouchableOpacity>

            <ScrollView style={[styles.container, { backgroundColor: '#fff' }]}>
              {/* Modern Article Header */}
              <View style={styles.articleHeader}>
                {selectedModule?.image_url ? (
                  <Image source={{ uri: selectedModule.image_url }} style={styles.articleHeaderImage} resizeMode="cover" />
                ) : (
                  <View style={[styles.articleHeaderImage, { backgroundColor: '#16a34a', opacity: 1 }]} />
                )}
                <View style={styles.articleHeaderOverlay}>
                  <View style={styles.articleMetaContainer}>
                    <View style={styles.articleBadge}>
                      <Text style={styles.articleBadgeText}>{selectedModule?.icon || '📚'} LESSON</Text>
                    </View>
                    <Text style={styles.articleDuration}>{selectedModule?.duration || '5 min read'}</Text>
                  </View>
                  <Text style={styles.articleTitle}>{selectedModule?.title || 'Learning Module'}</Text>
                </View>
              </View>

              <View style={styles.articleBody}>
                {isLoadingModule ? (
                  <View style={{ padding: 40, alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#16a34a" />
                    <Text style={styles.loadingText}>Loading lesson content...</Text>
                  </View>
                ) : (
                  <>
                    {/* Module Description as Introduction */}
                    <View style={styles.articleQuoteBox}>
                      <Text style={styles.articleQuoteText}>{selectedModule?.description}</Text>
                    </View>
                    
                    {selectedModuleContent.length > 0 ? selectedModuleContent.map((item, index) => (
                      <View key={index} style={{ marginBottom: 24 }}>
                        {item.type === 'image' ? (
                          <View>
                            <Image source={{ uri: item.uri }} style={styles.articleContentImage} resizeMode="cover" />
                            {item.value && <Text style={styles.articleImageCaption}>{item.value}</Text>}
                          </View>
                        ) : (
                          <Text style={styles.articleParagraph}>{item.value}</Text>
                        )}
                      </View>
                    )) : (
                      <Text style={{ color: '#6b7280', textAlign: 'center', marginTop: 20 }}>No content available for this module yet.</Text>
                    )}

                    <View style={styles.articleFooter}>
                      {learningProgress.find(p => p.module_id === selectedModule?.id)?.completed ? (
                        <View style={styles.completedBanner}>
                          <Text style={{ fontSize: 24 }}>✅</Text>
                          <Text style={styles.completedBannerText}>You've completed this lesson! Great job on learning more about farming.</Text>
                        </View>
                      ) : (
                        selectedModuleContent.length > 0 && (
                          <TouchableOpacity
                            style={styles.completeButton}
                            onPress={() => handleModuleComplete(selectedModule.id)}
                          >
                            <Text style={styles.completeButtonText}>Finish Lesson ✓</Text>
                          </TouchableOpacity>
                        )
                      )}
                    </View>
                  </>
                )}
              </View>
            </ScrollView>
          </SafeAreaView>
        </Modal>
      </Animated.View>
    );
  };

  const ProfilePage = () => (
    <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.profileContainer}>
        {/* Header */}
        <View style={styles.profileMainHeader}>
          <View style={styles.profileHeaderContent}>
            <TouchableOpacity 
              onPress={isEditing ? pickProfilePicture : undefined}
              disabled={!isEditing}
              style={[styles.profileHeaderIconCircle, isEditing && { backgroundColor: 'rgba(255, 255, 255, 0.4)' }]}
            >
              {(isEditing ? editProfilePicture : userProfile?.profile_picture_url) ? (
                <Image source={{ uri: isEditing ? editProfilePicture : userProfile.profile_picture_url }} style={{ width: 60, height: 60, borderRadius: 30 }} />
              ) : (
                <Ionicons name="person" size={32} color="#FFFFFF" />
              )}
              {isEditing && (
                <View style={{ position: 'absolute', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 15, padding: 4 }}>
                  <Ionicons name="camera" size={16} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              {isEditing ? (
                <TextInput
                  style={[styles.inlineInput, { backgroundColor: 'rgba(255, 255, 255, 0.15)', color: '#FFFFFF', borderColor: 'rgba(255, 255, 255, 0.3)', fontWeight: 'bold', fontSize: 20 }]}
                  value={editFullName}
                  onChangeText={setEditFullName}
                  placeholder="Your Name"
                  placeholderTextColor="rgba(255, 255, 255, 0.6)"
                />
              ) : (
                <Text style={styles.profileHeaderTitle}>{userProfile?.full_name || user?.user_metadata?.full_name || 'My Profile'}</Text>
              )}
              <Text style={styles.profileHeaderSubtitle}>{userProfile?.province ? `${userProfile.province}, Zambia` : 'Manage your farm information'}</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.profileHeaderEditButton}
            onPress={isEditing ? handleSaveInlineProfile : () => {
              setEditFullName(userProfile?.full_name || user?.user_metadata?.full_name || '');
              setEditProfilePicture(userProfile?.profile_picture_url || null);
              setEditFarmSize(userProfile?.farm_size || '');
              setEditSoilType(userProfile?.soil_type || '');
              setEditPrimaryCrops(userProfile?.primary_crops?.join(', ') || '');
              setIsEditing(true);
            }}
          >
            {isSavingProfile ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name={isEditing ? "checkmark" : "create-outline"} size={22} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.profileContentScroll} showsVerticalScrollIndicator={false}>
          {/* Current Location Card */}
          <View style={styles.profileSectionCard}>
            <View style={styles.profileSectionHeader}>
              <Text style={styles.profileSectionTitle}>Current Location</Text>
            </View>
            <View style={styles.profileLocationCard}>
              <View style={styles.profileLocationIconCircle}>
                <Ionicons name="location" size={24} color="#16a34a" />
              </View>
              <View>
                <Text style={styles.profileLocationLabel}>{selectedLocation || 'Not Selected'}</Text>
                {selectedLocationData && (
                  <Text style={styles.profileLocationValue}>{selectedLocationData.province}, Zambia</Text>
                )}
              </View>
            </View>
          </View>

          {/* Saved Locations Card */}
          {userFarms.length > 0 && (
            <View style={styles.profileSectionCard}>
              <View style={styles.profileSectionHeader}>
                <Text style={styles.profileSectionTitle}>Saved Locations</Text>
              </View>
              {userFarms.map((farm, index) => (
                <View key={farm.id} style={[styles.savedLocationItem, index < userFarms.length - 1 && { marginBottom: 12 }, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Ionicons name="location-outline" size={20} color="#999999" />
                    <View style={{ marginLeft: 12 }}>
                      <Text style={styles.profileLocationLabel}>{farm.name}</Text>
                      <Text style={styles.profileLocationValue}>{farm.province}, Zambia</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => handleDeleteFarm(farm.id)} style={{ padding: 8 }}>
                    <Ionicons name="trash-outline" size={20} color="#dc2626" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Farm Details Card */}
          <View style={styles.profileSectionCard}>
            <View style={styles.profileSectionHeader}>
              <Text style={styles.profileSectionTitle}>Farm Details</Text>
            </View>

            {/* Farm Size */}
            <View style={styles.profileDetailItem}>
              <View style={[styles.profileDetailIconCircle, { backgroundColor: '#DCFCE7' }]}>
                <MaterialCommunityIcons name="leaf" size={20} color="#16a34a" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.profileDetailLabel}>Farm Size</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.inlineInput}
                    value={editFarmSize}
                    onChangeText={setEditFarmSize}
                    placeholder="e.g. 2 hectares"
                  />
                ) : (
                  <Text style={styles.profileDetailValue}>{userProfile?.farm_size || 'Not specified'}</Text>
                )}
              </View>
            </View>

            {/* Soil Type */}
            <View style={styles.profileDetailItem}>
              <View style={[styles.profileDetailIconCircle, { backgroundColor: '#FEF3C7' }]}>
                <MaterialCommunityIcons name="test-tube" size={20} color="#D97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.profileDetailLabel}>Soil Type</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.inlineInput}
                    value={editSoilType}
                    onChangeText={setEditSoilType}
                    placeholder="e.g. Clay, Sandy, Loam"
                  />
                ) : (
                  <Text style={styles.profileDetailValue}>{userProfile?.soil_type || 'Not specified'}</Text>
                )}
              </View>
            </View>

            {/* Current Crops */}
            <View style={[styles.profileDetailItem, styles.profileDetailItemLast]}>
              <View style={[styles.profileDetailIconCircle, { backgroundColor: '#DBEAFE' }]}>
                <Ionicons name="leaf-outline" size={20} color="#2563EB" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.profileDetailLabel}>Current Crops</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.inlineInput}
                    value={editPrimaryCrops}
                    onChangeText={setEditPrimaryCrops}
                    placeholder="Maize, Groundnuts, etc."
                  />
                ) : (
                  <Text style={styles.profileDetailValue}>
                    {userProfile?.primary_crops?.join(', ') || 'Not specified'}
                  </Text>
                )}
              </View>
            </View>

            {isEditing && (
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
                <TouchableOpacity 
                  style={[styles.viewRecommendationsButton, { flex: 1, backgroundColor: '#f3f4f6' }]} 
                  onPress={() => setIsEditing(false)}
                >
                  <Text style={[styles.viewRecommendationsButtonText, { color: '#6b7280' }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.viewRecommendationsButton, { flex: 2 }]} 
                  onPress={handleSaveInlineProfile}
                  disabled={isSavingProfile}
                >
                  {isSavingProfile ? <ActivityIndicator color="#fff" /> : <Text style={styles.viewRecommendationsButtonText}>Save Changes</Text>}
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Activity Card */}
          <View style={styles.profileSectionCard}>
            <View style={styles.profileSectionHeader}>
              <Text style={styles.profileSectionTitle}>Activity</Text>
            </View>
            <View style={styles.profileStatsRow}>
              <View style={styles.profileStatCard}>
                <Text style={styles.profileStatNumber}>{userFarms.length}</Text>
                <Text style={styles.profileStatLabel}>Saved Locations</Text>
              </View>
              <View style={styles.profileStatCard}>
                <Text style={styles.profileStatNumber}>
                  {learningProgress.filter(p => p.completed).length}
                </Text>
                <Text style={styles.profileStatLabel}>Modules Completed</Text>
              </View>
            </View>
          </View>

          {/* Sign Out Button */}
          <TouchableOpacity 
            style={[styles.editButton, { backgroundColor: '#dc2626', borderColor: '#dc2626', marginBottom: 40 }]} 
            onPress={onLogout}
          >
            <Text style={[styles.editButtonText, { color: '#ffffff' }]}>Sign Out</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Animated.View>
  );

  // ── Main render ───────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#16a34a" />

      {currentPage === 'home' && <View style={styles.header}><Text style={styles.headerSlogan}>CropIQ</Text></View>}

      {currentPage === 'home' && <HomePage />}
      {currentPage === 'recommendations' && <RecommendationsPage />}
      {currentPage === 'education' && <EducationPage />}
      {currentPage === 'profile' && <ProfilePage />}

      {/* ────────────────────────────────────────────────────────
          MODAL 1 — Location search (transparent overlay)
          The map NEVER lives inside here.
      ──────────────────────────────────────────────────────── */}
      <Modal
        visible={showLocationModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => { setShowLocationModal(false); setSearchQuery(''); }}
      >
        <TouchableOpacity
          style={styles.modalContainer}
          activeOpacity={1}
          onPress={() => { setShowLocationModal(false); setSearchQuery(''); }}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Select Your Location</Text>

            {/* Tab buttons */}
            <View style={{ flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, gap: 8 }}>
              <View style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#16a34a', alignItems: 'center' }}>
                <Text style={{ color: '#ffffff', fontWeight: '600', fontSize: 13 }}>📍 Search</Text>
              </View>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#e5e7eb', alignItems: 'center' }}
                onPress={() => {
                  // Close location modal first, then open map modal after animation completes
                  setShowLocationModal(false);
                  setTimeout(() => setShowMapModal(true), 300);
                }}
              >
                <Text style={{ color: '#374151', fontWeight: '600', fontSize: 13 }}>🗺️ Map Picker</Text>
              </TouchableOpacity>
            </View>

            {/* Search content — always shown, no map ternary */}
            <ScrollView style={styles.locationList} keyboardShouldPersistTaps="handled">
              <View style={styles.customLocationSection}>
                <Text style={styles.customLocationLabel}>Enter your location:</Text>
                <View style={styles.customLocationInputContainer}>
                  <TextInput
                    style={styles.customLocationInput}
                    placeholder="e.g., Livingstone, Kafue, Solwezi..."
                    value={customLocationInput}
                    onChangeText={setCustomLocationInput}
                    autoCapitalize="words"
                    autoCorrect={false}
                    editable={!isGeocodingLocation}
                  />
                  <TouchableOpacity
                    style={[styles.searchCustomButton, isGeocodingLocation && styles.searchCustomButtonDisabled]}
                    onPress={async () => {
                      if (!customLocationInput.trim()) { alert('Please enter a location name'); return; }
                      setIsGeocodingLocation(true);
                      try {
                        const loc = await geocodeLocation(customLocationInput.trim());
                        setCustomLocationInput('');
                        setShowLocationModal(false);
                        setSearchQuery('');
                        await fetchWeatherData(loc);
                      } catch (e) { alert(`Location not found: ${e.message}`); }
                      finally { setIsGeocodingLocation(false); }
                    }}
                    disabled={isGeocodingLocation}
                    activeOpacity={0.7}
                  >
                    {isGeocodingLocation ? <ActivityIndicator size="small" color="#ffffff" /> : <Ionicons name="arrow-forward" size={20} color="#ffffff" />}
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.customLocationDivider} />
              <Text style={styles.predefinedLocationsLabel}>Predefined Locations:</Text>

              {filteredLocations.length > 0
                ? filteredLocations.map(loc => (
                    <TouchableOpacity key={loc.id} style={styles.locationOption} onPress={() => fetchWeatherData(loc)}>
                      <Text style={styles.locationName}>{loc.name}</Text>
                      <Text style={styles.locationProvince}>{loc.district}</Text>
                      <Text style={{ fontSize: 12, color: '#9ca3af' }}>{loc.province}</Text>
                    </TouchableOpacity>
                  ))
                : <View style={styles.noResultsContainer}><Text style={styles.noResultsText}>No locations found</Text><Text style={styles.noResultsSubtext}>Try a different search term</Text></View>}
            </ScrollView>

            <TouchableOpacity style={styles.closeButton} onPress={() => { setShowLocationModal(false); setSearchQuery(''); setSelectedMapPin(null); }}>
              <Text style={styles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ────────────────────────────────────────────────────────
          MODAL 2 — Full-screen map picker
          Completely separate from Modal 1.
          No transparent backdrop = no accidental dismissal.
          MapView has flex:1 = fills 100% of available space.
      ──────────────────────────────────────────────────────── */}
      <Modal
        visible={showMapModal}
        animationType="slide"
        onRequestClose={() => { setShowMapModal(false); setShowLocationModal(true); }}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>

          {/* Green header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#16a34a' }}>
            <TouchableOpacity
              onPress={() => { setShowMapModal(false); setSelectedMapPin(null); setShowLocationModal(true); }}
              style={{ padding: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.15)' }}
            >
              <Ionicons name="arrow-back" size={22} color="#ffffff" />
            </TouchableOpacity>
            <Text style={{ fontSize: 17, fontWeight: '700', color: '#ffffff', letterSpacing: 0.3 }}>Pick Location on Map</Text>
            <View style={{ width: 34 }} />
          </View>

          {/* Instruction banner */}
          <View style={{ backgroundColor: '#f0fdf4', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#bbf7d0', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="information-circle-outline" size={18} color="#16a34a" />
            <Text style={{ fontSize: 13, color: '#166534', flex: 1 }}>Tap anywhere on the map to drop a pin on your farm location</Text>
          </View>

          {/* Map — flex:1 fills ALL remaining space */}
          <MapView
            style={{ flex: 1 }}
            initialRegion={mapRegion}
            onRegionChangeComplete={region => setMapRegion(region)}
            onPress={e => {
              const { latitude, longitude } = e.nativeEvent.coordinate;
              setSelectedMapPin({ latitude, longitude });
            }}
          >
            {selectedMapPin && (
              <Marker
                coordinate={selectedMapPin}
                title="Selected Location"
                description={`${selectedMapPin.latitude.toFixed(4)}, ${selectedMapPin.longitude.toFixed(4)}`}
                pinColor="#16a34a"
              />
            )}
          </MapView>

          {/* Bottom panel */}
          {selectedMapPin ? (
            <View style={{ backgroundColor: '#fff', padding: 16, borderTopWidth: 1, borderTopColor: '#e5e7eb', shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0fdf4', borderRadius: 10, padding: 12, marginBottom: 12, gap: 10, borderWidth: 1, borderColor: '#bbf7d0' }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#16a34a', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="location" size={20} color="#ffffff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: '#6b7280', marginBottom: 2, fontWeight: '500' }}>SELECTED COORDINATES</Text>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#166534' }}>{selectedMapPin.latitude.toFixed(5)},  {selectedMapPin.longitude.toFixed(5)}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity style={{ flex: 1, paddingVertical: 13, borderRadius: 10, borderWidth: 1.5, borderColor: '#e5e7eb', alignItems: 'center', backgroundColor: '#f9fafb' }} onPress={() => setSelectedMapPin(null)}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#6b7280' }}>Clear Pin</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 2, paddingVertical: 13, borderRadius: 10, backgroundColor: isReverseGeocoding ? '#86efac' : '#16a34a', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                  onPress={async () => {
                    try {
                      const loc = await reverseGeocodeLocation(selectedMapPin.latitude, selectedMapPin.longitude);
                      setShowMapModal(false);
                      setSelectedMapPin(null);
                      await fetchWeatherData(loc);
                    } catch (e) { alert('Could not identify location. Please try again.'); }
                  }}
                  disabled={isReverseGeocoding}
                >
                  {isReverseGeocoding
                    ? <><ActivityIndicator size="small" color="#ffffff" /><Text style={{ fontSize: 14, fontWeight: '700', color: '#ffffff' }}>Identifying...</Text></>
                    : <><Ionicons name="checkmark-circle" size={20} color="#ffffff" /><Text style={{ fontSize: 14, fontWeight: '700', color: '#ffffff' }}>Confirm Location</Text></>}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={{ backgroundColor: '#fff', padding: 16, borderTopWidth: 1, borderTopColor: '#e5e7eb', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fef9c3', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#fde047' }}>
                <Text style={{ fontSize: 18 }}>👆</Text>
                <Text style={{ fontSize: 13, color: '#854d0e', fontWeight: '600' }}>Tap the map to place your pin</Text>
              </View>
            </View>
          )}
        </SafeAreaView>
      </Modal>

      <BottomNav />
    </SafeAreaView>
  );
}
