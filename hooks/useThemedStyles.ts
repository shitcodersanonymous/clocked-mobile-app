import { useMemo } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Theme } from '@/constants/colors';

/**
 * Custom hook to create theme-aware styles
 * Usage:
 * const styles = useThemedStyles(createStyles);
 * 
 * function createStyles(theme: Theme) {
 *   return StyleSheet.create({
 *     container: {
 *       backgroundColor: theme.background,
 *       ...
 *     }
 *   });
 * }
 */
export function useThemedStyles<T>(
  createStyles: (theme: Theme) => T
): T {
  const { theme } = useTheme();
  return useMemo(() => createStyles(theme), [theme]);
}
