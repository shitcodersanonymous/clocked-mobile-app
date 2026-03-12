# Theming Guide

Clocked supports both light and dark themes to provide a premium experience in any lighting condition.

## Overview

The theming system consists of:
- **Color definitions** in `constants/colors.ts`
- **ThemeContext** for global theme state management
- **useTheme hook** for accessing theme in components
- **Persistent storage** to remember user preference

## Using Themes in Components

### 1. Import the useTheme hook

```tsx
import { useTheme } from '@/contexts/ThemeContext';
```

### 2. Access theme colors in your component

```tsx
export function MyComponent() {
  const { theme, themeMode, isDark } = useTheme();
  
  return (
    <View style={{ backgroundColor: theme.background }}>
      <Text style={{ color: theme.text }}>Hello World</Text>
    </View>
  );
}
```

### 3. Theme Properties

- `theme` - The current theme object with all colors
- `themeMode` - Either 'light' or 'dark'
- `isDark` - Boolean for quick checks
- `setThemeMode(mode)` - Function to change theme

## Color Palette

Both themes provide the same color keys with different values optimized for their mode:

### Base Colors
- `background` - Main app background
- `surface` - Cards, panels, surfaces
- `surfaceVariant` - Alternative surface color

### Text Colors
- `text` - Primary text
- `textSecondary` - Secondary text
- `textMuted` - Muted/hint text

### Brand Colors
- `primary` - Primary brand color (electric cyan in dark, deeper cyan in light)
- `primaryMuted` - Muted version of primary

### Status Colors
- `success` - Success states
- `warning` - Warning states
- `error` - Error states
- `info` - Informational

### UI Elements
- `border` - Borders, dividers
- `borderLight` - Lighter borders
- `card` - Card backgrounds
- `cardHover` - Card hover/pressed states

### Special Purpose
- `xpGold` - XP indicators
- `punchRed` - Boxing-specific red
- `guardBlue` - Boxing-specific blue
- `tabIconDefault` - Inactive tab icons
- `tabIconSelected` - Active tab icons
- `overlay` - Modal overlays
- `shadow` - Shadow colors

## Switching Themes

Users can toggle between light and dark mode in the Settings screen. The preference is automatically saved and persisted across app sessions.

## Creating Theme-Aware Styles

### Option 1: Inline Styles (Recommended for simple components)

```tsx
export function SimpleCard() {
  const { theme } = useTheme();
  
  return (
    <View style={{
      backgroundColor: theme.card,
      borderColor: theme.border,
      borderWidth: 1,
      padding: 16,
    }}>
      <Text style={{ color: theme.text }}>Content</Text>
    </View>
  );
}
```

### Option 2: Dynamic StyleSheet (For complex styles)

```tsx
export function ComplexCard() {
  const { theme } = useTheme();
  
  const styles = StyleSheet.create({
    container: {
      backgroundColor: theme.card,
      borderColor: theme.border,
      borderWidth: 1,
      padding: 16,
    },
    title: {
      color: theme.text,
      fontSize: 18,
      fontWeight: '700',
    },
  });
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Content</Text>
    </View>
  );
}
```

### Option 3: useThemedStyles Hook (For memoized styles)

```tsx
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { Theme } from '@/constants/colors';

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    backgroundColor: theme.card,
    padding: 16,
  },
  title: {
    color: theme.text,
    fontSize: 18,
  },
});

export function OptimizedCard() {
  const styles = useThemedStyles(createStyles);
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Content</Text>
    </View>
  );
}
```

## StatusBar

The StatusBar automatically adjusts based on theme:
- Dark mode: `light-content` (white text/icons)
- Light mode: `dark-content` (black text/icons)

This is handled in `app/_layout.tsx` and requires no additional configuration.

## Design Guidelines

### Light Mode
- Clean, bright, professional aesthetic
- Soft shadows for depth
- High contrast for readability
- Cyan accents remain vibrant

### Dark Mode
- Premium boxing aesthetic
- Deep blacks (#0A0A0A)
- Electric cyan highlights
- Reduced eye strain

### Both Modes Should
- Maintain WCAG AA contrast standards
- Feel polished and premium
- Support the boxing/fitness theme
- Provide excellent readability

## Testing Themes

Toggle between themes frequently during development to ensure:
- All text is readable
- Borders and dividers are visible
- Interactive elements are clear
- Icons have proper contrast
- Status indicators stand out

## Common Patterns

### Cards with Accent Colors
```tsx
const { theme } = useTheme();
<View style={{ 
  backgroundColor: theme.card,
  borderLeftWidth: 3,
  borderLeftColor: theme.primary,
}}>
```

### Translucent Overlays
```tsx
const { theme } = useTheme();
<View style={{ backgroundColor: theme.overlay }}>
```

### Icon Colors
```tsx
const { theme } = useTheme();
<Ionicons name="star" color={theme.primary} />
```

### Muted Sections
```tsx
const { theme } = useTheme();
<Text style={{ color: theme.textMuted }}>Hint text</Text>
```

## Troubleshooting

**Theme not updating after change:**
- Ensure component is using `useTheme()` hook
- Check that colors reference `theme.*` not `colors.dark.*`

**Flash of wrong theme on startup:**
- ThemeProvider shows nothing until theme loads from storage
- This prevents FOUC (Flash of Unstyled Content)

**TypeScript errors:**
- Import `Theme` type from `@/constants/colors`
- All theme colors are strictly typed
