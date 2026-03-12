/**
 * Color palette for Clocked app
 * Supports both dark and light themes
 */

export const colors = {
  dark: {
    // Backgrounds
    background: '#0a0a0a',
    backgroundSecondary: '#121212',
    backgroundTertiary: '#1a1a1a',
    surface: '#1e1e1e',
    surfaceElevated: '#2a2a2a',
    
    // Text
    text: '#ffffff',
    textSecondary: '#a0a0a0',
    textTertiary: '#666666',
    textMuted: '#4a4a4a',
    
    // Primary brand colors (boxing red/orange)
    primary: '#ff4444',
    primaryLight: '#ff6666',
    primaryDark: '#cc0000',
    
    // Accent colors
    accent: '#ff8800',
    accentLight: '#ffaa44',
    accentDark: '#cc6600',
    
    // Status colors
    success: '#00cc44',
    successLight: '#00ff55',
    successDark: '#009933',
    
    warning: '#ffaa00',
    warningLight: '#ffcc44',
    warningDark: '#cc8800',
    
    error: '#ff3333',
    errorLight: '#ff6666',
    errorDark: '#cc0000',
    
    info: '#3399ff',
    infoLight: '#66bbff',
    infoDark: '#0066cc',
    
    // UI elements
    border: '#2a2a2a',
    borderLight: '#3a3a3a',
    borderDark: '#1a1a1a',
    
    divider: '#2a2a2a',
    
    // Interactive elements
    buttonPrimary: '#ff4444',
    buttonPrimaryHover: '#ff6666',
    buttonPrimaryDisabled: '#663333',
    
    buttonSecondary: '#2a2a2a',
    buttonSecondaryHover: '#3a3a3a',
    buttonSecondaryDisabled: '#1a1a1a',
    
    // Overlays
    overlay: 'rgba(0, 0, 0, 0.7)',
    overlayLight: 'rgba(0, 0, 0, 0.5)',
    overlayHeavy: 'rgba(0, 0, 0, 0.9)',
    
    // Special effects
    glow: 'rgba(255, 68, 68, 0.3)',
    shadow: 'rgba(0, 0, 0, 0.5)',
    
    // XP & Gamification
    xpBar: '#ffaa00',
    xpBarBackground: '#2a2a2a',
    
    // Tiers (Rookie, Contender, Pro, BMF)
    tierRookie: '#888888',
    tierContender: '#3399ff',
    tierPro: '#9944ff',
    tierBMF: '#ffaa00',
    
    // Card backgrounds
    cardBackground: '#1a1a1a',
    cardBackgroundHover: '#222222',
    cardBorder: '#2a2a2a',
    
    // Input fields
    input: '#2a2a2a',
    inputBorder: '#3a3a3a',
    inputFocus: '#ff4444',
    inputPlaceholder: '#666666',
    
    // Tab bar
    tabBarBackground: '#121212',
    tabBarActive: '#ff4444',
    tabBarInactive: '#666666',
  },
  
  light: {
    // Backgrounds
    background: '#ffffff',
    backgroundSecondary: '#f8f8f8',
    backgroundTertiary: '#f0f0f0',
    surface: '#ffffff',
    surfaceElevated: '#fafafa',
    
    // Text
    text: '#0a0a0a',
    textSecondary: '#4a4a4a',
    textTertiary: '#777777',
    textMuted: '#999999',
    
    // Primary brand colors (boxing red/orange) - slightly adjusted for light mode
    primary: '#e63939',
    primaryLight: '#ff5555',
    primaryDark: '#b82e2e',
    
    // Accent colors
    accent: '#ff7700',
    accentLight: '#ff9933',
    accentDark: '#cc5500',
    
    // Status colors
    success: '#00aa33',
    successLight: '#00cc44',
    successDark: '#008829',
    
    warning: '#ff9900',
    warningLight: '#ffbb33',
    warningDark: '#cc7700',
    
    error: '#dd2222',
    errorLight: '#ff4444',
    errorDark: '#aa1111',
    
    info: '#2288ee',
    infoLight: '#4499ff',
    infoDark: '#0066cc',
    
    // UI elements
    border: '#e0e0e0',
    borderLight: '#eeeeee',
    borderDark: '#cccccc',
    
    divider: '#e8e8e8',
    
    // Interactive elements
    buttonPrimary: '#e63939',
    buttonPrimaryHover: '#ff5555',
    buttonPrimaryDisabled: '#ffcccc',
    
    buttonSecondary: '#f0f0f0',
    buttonSecondaryHover: '#e8e8e8',
    buttonSecondaryDisabled: '#f8f8f8',
    
    // Overlays
    overlay: 'rgba(0, 0, 0, 0.4)',
    overlayLight: 'rgba(0, 0, 0, 0.2)',
    overlayHeavy: 'rgba(0, 0, 0, 0.7)',
    
    // Special effects
    glow: 'rgba(230, 57, 57, 0.2)',
    shadow: 'rgba(0, 0, 0, 0.1)',
    
    // XP & Gamification
    xpBar: '#ff9900',
    xpBarBackground: '#e8e8e8',
    
    // Tiers (Rookie, Contender, Pro, BMF)
    tierRookie: '#777777',
    tierContender: '#2288ee',
    tierPro: '#8833ee',
    tierBMF: '#ff9900',
    
    // Card backgrounds
    cardBackground: '#ffffff',
    cardBackgroundHover: '#f8f8f8',
    cardBorder: '#e8e8e8',
    
    // Input fields
    input: '#f8f8f8',
    inputBorder: '#e0e0e0',
    inputFocus: '#e63939',
    inputPlaceholder: '#999999',
    
    // Tab bar
    tabBarBackground: '#ffffff',
    tabBarActive: '#e63939',
    tabBarInactive: '#777777',
  },
  
  // Common colors (same in both themes)
  common: {
    black: '#000000',
    white: '#ffffff',
    transparent: 'transparent',
    
    // Combo notation colors (remain consistent across themes)
    combo1: '#ff4444', // Jab
    combo2: '#ff8800', // Cross
    combo3: '#00ccff', // Lead Hook
    combo4: '#00ff88', // Rear Hook
    combo5: '#ff44ff', // Lead Uppercut
    combo6: '#ffff44', // Rear Uppercut
    combo7: '#8844ff', // Lead Body Shot
    combo8: '#44ff88', // Rear Body Shot
    combo9: '#ff4488', // Duck/Slip/Defensive
  },
};

export type ColorScheme = typeof colors.dark;
