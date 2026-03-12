import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '@/constants/colors';
import { useTheme } from "@/contexts/ThemeContext";

interface RoundFeedbackPanelProps {
  roundNumber: number;
  onRate: (rating: 'easy' | 'perfect' | 'hard') => void;
}

const RATINGS = [
  { key: 'easy' as const, label: 'Easy', icon: 'chevron-down-circle' as const, color: theme.green },
  { key: 'perfect' as const, label: 'Perfect', icon: 'checkmark-circle' as const, color: theme.volt },
  { key: 'hard' as const, label: 'Hard', icon: 'flame' as const, color: theme.red },
];

export default function RoundFeedbackPanel({ roundNumber, onRate }: RoundFeedbackPanelProps) {
  const { theme } = useTheme();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Round {roundNumber}</Text>
      <Text style={styles.subtitle}>How was that?</Text>
      <View style={styles.buttons}>
        {RATINGS.map((r) => (
          <TouchableOpacity
            key={r.key}
            style={[styles.button, { borderColor: r.color }]}
            onPress={() => onRate(r.key)}
            activeOpacity={0.7}
          >
            <Ionicons name={r.icon} size={28} color={r.color} />
            <Text style={[styles.buttonLabel, { color: r.color }]}>{r.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.surface2,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  title: {
    color: theme.foreground,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    color: theme.mutedForeground,
    fontSize: 14,
    marginBottom: 16,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: theme.surface3,
    gap: 6,
  },
  buttonLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
});
