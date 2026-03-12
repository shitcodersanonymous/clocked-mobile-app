/**
 * Color palette for the Clocked app
 * Supports both dark and light themes with a premium boxing aesthetic
 */

const tintColorDark = '#00D9FF'; // Electric cyan for dark mode
const tintColorLight = '#00A8CC'; // Deeper cyan for light mode (better contrast)

export const colors = {
  dark: {
    // Base colors
    background: '#0A0A0A',
    surface: '#1A1A1A',
    surfaceVariant: '#2A2A2A',
    
    // Text colors
    text: '#FFFFFF',
    textSecondary: '#A0A0A0',
    textMuted: '#666666',
    
    // Brand colors
    primary: tintColorDark,
    primaryMuted: '#007A99',
    
    // Status colors
    success: '#00FF88',
    warning: '#FFB800',
    error: '#FF3B30',
    info: tintColorDark,
    
    // UI elements
    border: '#333333',
    borderLight: '#262626',
    divider: '#1F1F1F',
    
    // Card/Surface variants
    card: '#1A1A1A',
    cardHover: '#252525',
    
    // XP and progress
    xpGold: '#FFD700',
    xpBar: '#333333',
    
    // Boxing-specific
    punchRed: '#FF3B30',
    guardBlue: '#007AFF',
    
    // Overlays
    overlay: 'rgba(0, 0, 0, 0.8)',
    overlayLight: 'rgba(0, 0, 0, 0.5)',
    
    // Shadows
    shadow: '#000000',
    
    // Tab bar
    tabIconDefault: '#666666',
    tabIconSelected: tintColorDark,
    
    tint: tintColorDark,
  },
  
  light: {
    // Base colors - clean, bright, professional
    background: '#FFFFFF',
    surface: '#F8F9FA',
    surfaceVariant: '#E9ECEF',
    
    // Text colors
    text: '#0A0A0A',
    textSecondary: '#495057',
    textMuted: '#6C757D',
    
    // Brand colors
    primary: tintColorLight,
    primaryMuted: '#0077AA',
    
    // Status colors
    success: '#00CC70',
    warning: '#FF9500',
    error: '#DC3545',
    info: tintColorLight,
    
    // UI elements
    border: '#DEE2E6',
    borderLight: '#E9ECEF',
    divider: '#F1F3F5',
    
    // Card/Surface variants
    card: '#FFFFFF',
    cardHover: '#F8F9FA',
    
    // XP and progress
    xpGold: '#F0A500',
    xpBar: '#E9ECEF',
    
    // Boxing-specific
    punchRed: '#DC3545',
    guardBlue: '#0066CC',
    
    // Overlays
    overlay: 'rgba(0, 0, 0, 0.6)',
    overlayLight: 'rgba(0, 0, 0, 0.3)',
    
    // Shadows
    shadow: 'rgba(0, 0, 0, 0.15)',
    
    // Tab bar
    tabIconDefault: '#6C757D',
    tabIconSelected: tintColorLight,
    
    tint: tintColorLight,
  },
};

export type Theme = typeof colors.dark;
export type ThemeMode = 'light' | 'dark';
