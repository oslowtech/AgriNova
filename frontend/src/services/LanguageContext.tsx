import React, { createContext, useContext, useState, useEffect } from "react";
import * as SecureStore from "expo-secure-store";

export type Language = "en" | "ta";

const translations = {
  en: {
    // Common
    loading: "Loading...",
    error: "Error",
    cancel: "Cancel",
    save: "Save",
    delete: "Delete",
    edit: "Edit",
    close: "Close",
    retry: "Retry",
    
    // Navigation
    home: "Home",
    map: "Map",
    profile: "Profile",
    settings: "Settings",
    
    // Map Screen
    predict: "Predict",
    draw: "Draw",
    point: "Point",
    line: "Line", 
    area: "Area",
    clear: "Clear",
    landPredictions: "🎯 Land Predictions",
    healthScore: "Health Score",
    status: "Status",
    estValue: "Est. Value",
    topValueDrivers: "💡 Top Value Drivers",
    ndviZones: "NDVI Zones",
    dense: "Dense",
    healthy: "Healthy",
    sparse: "Sparse",
    stressed: "Stressed",
    
    // Measurements
    tapToGetCoordinates: "📍 Tap to get coordinates",
    tapTwoPointsDistance: "📏 Tap two points to measure distance",
    tapPointsCreateArea: "🗺️ Tap points to create area (min 3)",
    tapMapAddBoundary: "👆 Tap on the map to add boundary points",
    measurements: "📐 Measurements",
    clearAll: "Clear All",
    
    // Settings Screen
    appSettings: "App Settings",
    language: "Language",
    selectLanguage: "Select Language",
    english: "English",
    tamil: "Tamil (தமிழ்)",
    notifications_settings: "Notifications",
    enableNotifications: "Enable Notifications",
    locationSettings: "Location",
    highAccuracy: "High Accuracy GPS",
    about: "About",
    version: "Version",
    privacyPolicy: "Privacy Policy",
    termsOfService: "Terms of Service",
    clearCache: "Clear Cache",
    clearCacheConfirm: "This will clear all cached data. Are you sure?",
    
    // Health Labels
    healthyLabel: "Healthy",
    moderateLabel: "Moderate", 
    atRiskLabel: "At Risk",
  },
  
  ta: {
    // Common
    loading: "ஏற்றுகிறது...",
    error: "பிழை",
    cancel: "ரத்து",
    save: "சேமி",
    delete: "நீக்கு",
    edit: "திருத்து",
    close: "மூடு",
    retry: "மீண்டும் முயற்சி",
    
    // Navigation
    home: "முகப்பு",
    map: "வரைபடம்",
    profile: "சுயவிவரம்",
    settings: "அமைப்புகள்",
    
    // Map Screen
    predict: "கணிப்பு",
    draw: "வரை",
    point: "புள்ளி",
    line: "கோடு",
    area: "பகுதி", 
    clear: "அழி",
    landPredictions: "🎯 நில கணிப்புகள்",
    healthScore: "ஆரோக்கிய மதிப்பு",
    status: "நிலை",
    estValue: "மதிப்பீட்டு மதிப்பு",
    topValueDrivers: "💡 முக்கிய மதிப்பு காரணிகள்",
    ndviZones: "NDVI மண்டலங்கள்",
    dense: "அடர்த்தியான",
    healthy: "ஆரோக்கியமான",
    sparse: "குறைவான",
    stressed: "அழுத்தமுள்ள",
    
    // Measurements  
    tapToGetCoordinates: "📍 ஆயத்தொலைவுகளைப் பெற தட்டவும்",
    tapTwoPointsDistance: "📏 தூரத்தை அளவிட இரு புள்ளிகளைத் தட்டவும்",
    tapPointsCreateArea: "🗺️ பகுதியை உருவாக்க புள்ளிகளைத் தட்டவும் (குறைந்தது 3)",
    tapMapAddBoundary: "👆 எல்லைப் புள்ளிகளைச் சேர்க்க வரைபடத்தில் தட்டவும்",
    measurements: "📐 அளவீடுகள்",
    clearAll: "அனைத்தையும் அழி",
    
    // Settings Screen
    appSettings: "செயலி அமைப்புகள்",
    language: "மொழி",
    selectLanguage: "மொழியைத் தேர்வுசெய்",
    english: "ஆங்கிலம்",
    tamil: "தமிழ்",
    notifications_settings: "அறிவிப்புகள்",
    enableNotifications: "அறிவிப்புகளை இயக்கு",
    locationSettings: "இருப்பிடம்",
    highAccuracy: "உயர் துல்லிய GPS",
    about: "பற்றி",
    version: "பதிப்பு",
    privacyPolicy: "தனியுரிமைக் கொள்கை",
    termsOfService: "சேவை விதிமுறைகள்",
    clearCache: "தற்காலிக சேமிப்பை அழி",
    clearCacheConfirm: "இது எல்லா தற்காலிக தரவையும் அழிக்கும். நீங்கள் உறுதியா?",
    
    // Health Labels
    healthyLabel: "ஆரோக்கியமான",
    moderateLabel: "மிதமான",
    atRiskLabel: "ஆபத்தில்",
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations.en, params?: Record<string, string>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>("en");

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    await SecureStore.setItemAsync("user_language", lang);
  };

  const t = (key: keyof typeof translations.en, params?: Record<string, string>): string => {
    let text = translations[language][key] || translations.en[key] || key;
    
    // Replace parameters in text
    if (params) {
      Object.entries(params).forEach(([param, value]) => {
        text = text.replace(`{${param}}`, value);
      });
    }
    
    return text;
  };

  useEffect(() => {
    async function loadLanguage() {
      try {
        const saved = await SecureStore.getItemAsync("user_language");
        if (saved === "en" || saved === "ta") {
          setLanguageState(saved);
        }
      } catch (error) {
        console.error("Failed to load language preference:", error);
      }
    }
    loadLanguage();
  }, []);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};