import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme';

interface MetricCardProps {
  label: string;
  value: string;
  unit?: string;
}

export default function MetricCard({ label, value, unit }: MetricCardProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        s.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.borderStrong,
          borderRadius: theme.radius.lg,
          padding: theme.spacing.md,
        },
      ]}
    >
      <Text
        style={[
          s.label,
          { color: theme.colors.textMuted, fontSize: theme.fontSize.xs, marginBottom: theme.spacing.xs },
        ]}
      >
        {label.toUpperCase()}
      </Text>
      <View style={s.valueRow}>
        <Text
          style={[
            s.value,
            { color: theme.colors.primary, fontSize: theme.fontSize.xxl },
          ]}
        >
          {value}
        </Text>
        {unit ? (
          <Text
            style={[
              s.unit,
              { color: theme.colors.text, fontSize: theme.fontSize.md, marginLeft: theme.spacing.xs },
            ]}
          >
            {unit}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { borderWidth: 1 },
  label: { fontWeight: '600', letterSpacing: 1 },
  valueRow: { flexDirection: 'row', alignItems: 'baseline' },
  value: { fontWeight: '700' },
  unit: { fontWeight: '500' },
});