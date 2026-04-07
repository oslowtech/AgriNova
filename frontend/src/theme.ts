export const palette = {
  bg: "#FAF9F6",
  surface: "#FFFFFF",
  surfaceAlt: "#F5F3EF",
  ink: "#1A1A1A",
  muted: "#6B7280",
  subtle: "#9CA3AF",
  textSecondary: "#6B7280",
  
  primary: "#1B4332",
  primaryLight: "#2D5A45",
  primaryDark: "#143328",
  
  accent: "#D4A017",
  accentLight: "#E8B93D",
  accentDark: "#B8890F",
  
  success: "#22C55E",
  warning: "#F59E0B",
  danger: "#EF4444",
  info: "#3B82F6",
  
  dense: "#065F46",
  healthy: "#10B981",
  sparse: "#FBBF24",
  stressed: "#F87171",
  
  border: "#E5E7EB",
  borderDark: "#D1D5DB",
  
  overlay: "rgba(0, 0, 0, 0.5)",
  cardBg: "rgba(255, 255, 255, 0.95)"
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999
};

export const typography = {
  h1: { fontSize: 32, fontWeight: "800" as const, letterSpacing: -0.5 },
  h2: { fontSize: 24, fontWeight: "700" as const, letterSpacing: -0.3 },
  h3: { fontSize: 18, fontWeight: "700" as const },
  body: { fontSize: 16, fontWeight: "400" as const },
  bodyBold: { fontSize: 16, fontWeight: "600" as const },
  caption: { fontSize: 14, fontWeight: "500" as const },
  small: { fontSize: 12, fontWeight: "500" as const }
};

export const shadows = {
  sm: {
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1
  },
  md: {
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3
  },
  lg: {
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5
  }
};
