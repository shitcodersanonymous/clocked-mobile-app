import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { useThemedColors } from '../hooks/useThemedColors';
import { View, Text } from 'react-native';

// Test component that uses the theme
function TestComponent() {
  const { theme, effectiveTheme } = useTheme();
  const colors = useThemedColors();
  
  return (
    <View testID="test-view" style={{ backgroundColor: colors.background }}>
      <Text testID="theme-text">{theme}</Text>
      <Text testID="effective-theme-text">{effectiveTheme}</Text>
      <Text testID="text-color" style={{ color: colors.text }}>
        Sample Text
      </Text>
    </View>
  );
}

describe('Theme System', () => {
  it('provides theme context to children', () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    
    expect(getByTestId('test-view')).toBeTruthy();
    expect(getByTestId('theme-text')).toBeTruthy();
  });

  it('provides themed colors through useThemedColors hook', () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    
    const textElement = getByTestId('text-color');
    expect(textElement).toBeTruthy();
    expect(textElement.props.style.color).toBeDefined();
  });

  it('defaults to dark theme', () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    
    const themeText = getByTestId('theme-text');
    expect(themeText.props.children).toBe('dark');
  });
});

describe('Color Palette', () => {
  it('provides different colors for light and dark themes', () => {
    const colors = require('../constants/colors').colors;
    
    expect(colors.dark).toBeDefined();
    expect(colors.light).toBeDefined();
    expect(colors.common).toBeDefined();
    
    // Check that themes have different background colors
    expect(colors.dark.background).not.toBe(colors.light.background);
    expect(colors.dark.text).not.toBe(colors.light.text);
  });

  it('includes all required color categories', () => {
    const colors = require('../constants/colors').colors;
    
    const requiredColors = [
      'background',
      'text',
      'primary',
      'success',
      'error',
      'warning',
      'cardBackground',
      'border',
    ];
    
    requiredColors.forEach(colorName => {
      expect(colors.dark[colorName]).toBeDefined();
      expect(colors.light[colorName]).toBeDefined();
    });
  });

  it('includes gamification colors', () => {
    const colors = require('../constants/colors').colors;
    
    expect(colors.dark.tierRookie).toBeDefined();
    expect(colors.dark.tierContender).toBeDefined();
    expect(colors.dark.tierPro).toBeDefined();
    expect(colors.dark.tierBMF).toBeDefined();
    expect(colors.dark.xpBar).toBeDefined();
  });

  it('includes combo notation colors', () => {
    const colors = require('../constants/colors').colors;
    
    for (let i = 1; i <= 9; i++) {
      expect(colors.common[`combo${i}`]).toBeDefined();
    }
  });
});
