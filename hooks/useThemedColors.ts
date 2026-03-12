import { useTheme } from '../contexts/ThemeContext';
import { colors, ColorScheme } from '../constants/colors';

/**
 * Hook to get the current theme's color palette
 * Usage: const colors = useThemedColors();
 */
export function useThemedColors(): ColorScheme & { common: typeof colors.common } {
  const { effectiveTheme } = useTheme();
  
  return {
    ...colors[effectiveTheme],
    common: colors.common,
  };
}
