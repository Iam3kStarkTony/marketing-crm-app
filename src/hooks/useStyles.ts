import { useTheme } from 'react-native-paper';
import { StyleSheet } from 'react-native';
import { AppTheme } from '../styles/types';
import { spacing, borderRadius, shadows } from '../config/theme';

export const useStyles = <T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (theme: AppTheme) => T
) => {
  const theme = useTheme<AppTheme>();
  const extendedTheme = {
    ...theme,
    spacing,
    borderRadius,
    shadows,
  };
  return factory(extendedTheme);
};