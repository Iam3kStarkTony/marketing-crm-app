import { MD3Theme } from 'react-native-paper';
import { spacing, borderRadius, shadows } from '../config/theme';

export type AppTheme = MD3Theme & {
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
  shadows: typeof shadows;
};