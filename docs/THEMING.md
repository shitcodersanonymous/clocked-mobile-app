# Theming System Documentation

## Overview

Clocked now supports light mode and dark mode themes with automatic system theme detection. The theme system is built using React Context and persists user preferences using AsyncStorage.

## Core Components

### 1. ThemeContext (`contexts/ThemeContext.tsx`)

The ThemeContext provides theme state management across the app.

**Features:**
- Three theme modes: `'light'`, `'dark'`, and `'system'`
- Automatic system theme detection
- AsyncStorage persistence
- React hooks for easy access

**Usage:**
```tsx
import { useTheme } from '@/contexts/ThemeContext';

function MyComponent() {
  const { theme, effectiveTheme, setTheme, isLoading } = useTheme();
  
  // theme: current setting ('light' | 'dark' | 'system')
  // effectiveTheme: resolved theme ('light' | 'dark')
  // setTheme: function to change theme
  // isLoading: true while loading saved preference
}
```

### 2. useThemedColors Hook (`hooks/useThemedColors.ts`)

A convenience hook that returns the current theme's color palette.

**Usage:**
```tsx
import { useThemedColors } from '@/hooks/useThemedColors';

function MyComponent() {
  const colors = useThemedColors();
  
  return (
    <View style={{ backgroundColor: colors.background }}>
      <Text style={{ color: colors.text }}>Hello</Text>
    </View>
  );
}
```

### 3. Color Palette (`constants/colors.ts`)

Contains both light and dark theme color definitions.

**Structure:**
```typescript
export const colors = {
  dark: { /* dark theme colors */ },
  light: { /* light theme colors */ },
  common: { /* theme-independent colors */ }
};
```

## Theme Toggle

Users can change their theme preference in Settings:
- **Light Mode**: Bright backgrounds, dark text
- **Dark Mode**: Dark backgrounds, light text
- **System**: Automatically follows device theme

## Migrating Components to Support Theming

### Step 1: Import the Hook

```tsx
import { useThemedColors } from '@/hooks/useThemedColors';
```

### Step 2: Get Themed Colors

```tsx
function MyComponent() {
  const colors = useThemedColors();
  // ... rest of component
}
```

### Step 3: Update Inline Styles

Replace hardcoded color references with themed colors:

**Before:**
```tsx
<View style={{ backgroundColor: '#0a0a0a' }}>
  <Text style={{ color: '#ffffff' }}>Hello</Text>
</View>
```

**After:**
```tsx
<View style={{ backgroundColor: colors.background }}>
  <Text style={{ color: colors.text }}>Hello</Text>
</View>
```

### Step 4: Update StyleSheet Styles

For static StyleSheet definitions, apply dynamic colors as overrides:

**Before:**
```tsx
const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.dark.background,
    padding: 16,
  },
});

// Usage
<View style={styles.container} />
```

**After:**
```tsx
const styles = StyleSheet.create({
  container: {
    padding: 16,
    // Remove static colors
  },
});

// Usage (apply dynamic colors as inline override)
<View style={[styles.container, { backgroundColor: colors.background }]} />
```

### Step 5: Handle Icons and Graphics

Update icon colors to use themed values:

**Before:**
```tsx
<Ionicons name="star" size={24} color="#ff4444" />
```

**After:**
```tsx
<Ionicons name="star" size={24} color={colors.primary} />
```

## Available Theme Colors

### Backgrounds
- `background` - Main app background
- `backgroundSecondary` - Secondary background
- `backgroundTertiary` - Tertiary background
- `surface` - Surface level (cards, modals)
- `surfaceElevated` - Elevated surfaces

### Text
- `text` - Primary text color
- `textSecondary` - Secondary text (less emphasis)
- `textTertiary` - Tertiary text (even less emphasis)
- `textMuted` - Muted/disabled text

### Brand Colors
- `primary` - Primary brand color (red/orange)
- `primaryLight` - Lighter variant
- `primaryDark` - Darker variant
- `accent` - Accent color
- `accentLight` - Lighter accent
- `accentDark` - Darker accent

### Status Colors
- `success` / `successLight` / `successDark`
- `warning` / `warningLight` / `warningDark`
- `error` / `errorLight` / `errorDark`
- `info` / `infoLight` / `infoDark`

### UI Elements
- `border` / `borderLight` / `borderDark`
- `divider`
- `buttonPrimary` / `buttonPrimaryHover` / `buttonPrimaryDisabled`
- `buttonSecondary` / `buttonSecondaryHover` / `buttonSecondaryDisabled`

### Cards
- `cardBackground`
- `cardBackgroundHover`
- `cardBorder`

### Overlays & Effects
- `overlay` / `overlayLight` / `overlayHeavy`
- `glow`
- `shadow`

### Gamification
- `xpBar`
- `xpBarBackground`
- `tierRookie` / `tierContender` / `tierPro` / `tierBMF`

### Navigation
- `tabBarBackground`
- `tabBarActive`
- `tabBarInactive`

### Inputs
- `input`
- `inputBorder`
- `inputFocus`
- `inputPlaceholder`

### Common (Theme-Independent)
- `common.black`
- `common.white`
- `common.transparent`
- `common.combo1` through `common.combo9` (punch notation colors)

## Best Practices

### 1. Always Use Themed Colors

❌ **Don't:**
```tsx
<View style={{ backgroundColor: '#0a0a0a' }} />
```

✅ **Do:**
```tsx
<View style={{ backgroundColor: colors.background }} />
```

### 2. Separate Static and Dynamic Styles

Keep layout/sizing in StyleSheet, apply colors inline:

```tsx
const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
});

// Apply dynamic colors
<View style={[
  styles.container,
  { 
    backgroundColor: colors.cardBackground,
    borderColor: colors.cardBorder 
  }
]} />
```

### 3. Consider Contrast

Ensure text remains readable in both themes:
- Light mode: Dark text on light backgrounds
- Dark mode: Light text on dark backgrounds

### 4. Test Both Themes

Always test your UI in both light and dark modes to ensure:
- Proper contrast
- No hardcoded colors showing through
- Icons are visible
- Borders and dividers are subtle but visible

### 5. Use Semantic Color Names

Prefer semantic names over specific colors:
- ✅ `colors.primary` (adapts to theme)
- ❌ `'#ff4444'` (hardcoded)

## Examples

### Updated Components

The following components have been updated to support theming:
- `app/_layout.tsx` - Root layout with theme provider
- `app/(tabs)/_layout.tsx` - Tab navigation
- `app/settings.tsx` - Theme toggle UI
- `components/ui/StatCard.tsx`
- `components/ui/WorkoutCard.tsx`
- `components/ui/XPBar.tsx`
- `components/ui/BadgeCard.tsx`

### Component Example: Themed Button

```tsx
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useThemedColors } from '@/hooks/useThemedColors';

function ThemedButton({ title, onPress }) {
  const colors = useThemedColors();
  
  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: colors.buttonPrimary }
      ]}
      onPress={onPress}
    >
      <Text style={[styles.text, { color: colors.common.white }]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});
```

### Full Screen Example

```tsx
import { View, ScrollView, Text, StyleSheet } from 'react-native';
import { useThemedColors } from '@/hooks/useThemedColors';

export default function MyScreen() {
  const colors = useThemedColors();
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView>
        <Text style={[styles.title, { color: colors.text }]}>
          My Screen
        </Text>
        <View style={[
          styles.card,
          { 
            backgroundColor: colors.cardBackground,
            borderColor: colors.cardBorder,
          }
        ]}>
          <Text style={[styles.cardText, { color: colors.textSecondary }]}>
            Card content
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    padding: 20,
  },
  card: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  cardText: {
    fontSize: 14,
  },
});
```

## Troubleshooting

### Colors not updating when theme changes

Make sure you're calling `useThemedColors()` inside the component function:

```tsx
// ❌ Wrong - colors are static
const colors = useThemedColors();

function MyComponent() {
  return <View style={{ backgroundColor: colors.background }} />;
}

// ✅ Correct - colors update with theme
function MyComponent() {
  const colors = useThemedColors();
  return <View style={{ backgroundColor: colors.background }} />;
}
```

### StatusBar not updating

The StatusBar is handled in `app/_layout.tsx`. It automatically switches between `'light-content'` (dark mode) and `'dark-content'` (light mode).

### BlurView tint

For iOS BlurView components, use the `effectiveTheme`:

```tsx
import { useTheme } from '@/contexts/ThemeContext';

function MyComponent() {
  const { effectiveTheme } = useTheme();
  
  return <BlurView tint={effectiveTheme} />;
}
```

## Migration Checklist

When updating a screen or component:

- [ ] Import `useThemedColors` hook
- [ ] Call the hook inside component function
- [ ] Replace all hardcoded colors with themed equivalents
- [ ] Update StyleSheet styles (separate static vs dynamic)
- [ ] Update icon colors
- [ ] Test in both light and dark modes
- [ ] Verify text contrast and readability
- [ ] Check borders and dividers are visible

## Future Enhancements

Potential future improvements:
- Custom theme colors per user
- High contrast mode
- Color blind friendly palettes
- Theme-specific animations or effects
- Per-screen theme overrides
