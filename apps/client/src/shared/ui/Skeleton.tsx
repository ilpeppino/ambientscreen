import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { colors, radius, spacing } from "./theme";

// ---------------------------------------------------------------------------
// Base Skeleton block — a pulsing rectangle that communicates loading shape
// ---------------------------------------------------------------------------

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: object;
}

export function Skeleton({ width = "100%", height = 16, borderRadius = radius.sm, style }: SkeletonProps) {
  const opacity = useSharedValue(0.35);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.75, { duration: 900 }),
      -1,
      true,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        { width, height, borderRadius, backgroundColor: colors.border },
        animatedStyle,
        style,
      ]}
    />
  );
}

// ---------------------------------------------------------------------------
// WidgetSkeleton — fills a widget frame while data loads
// ---------------------------------------------------------------------------

export function WidgetSkeleton() {
  return (
    <View style={styles.widgetContainer}>
      <Skeleton height={12} width="45%" />
      <Skeleton height={40} width="70%" style={{ marginTop: spacing.sm }} />
      <Skeleton height={10} width="35%" style={{ marginTop: spacing.xs }} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// CardSkeleton — approximates a marketplace PluginCard while list loads
// ---------------------------------------------------------------------------

export function CardSkeleton() {
  return (
    <View style={styles.card}>
      {/* Icon + title row */}
      <View style={styles.cardHeader}>
        <Skeleton width={32} height={32} borderRadius={radius.md} />
        <View style={styles.cardTitleBlock}>
          <Skeleton height={14} width="60%" />
          <Skeleton height={10} width="40%" style={{ marginTop: 5 }} />
        </View>
      </View>

      {/* Badge strip */}
      <View style={styles.badgeRow}>
        <Skeleton width={72} height={22} borderRadius={radius.sm} />
        <Skeleton width={56} height={22} borderRadius={radius.sm} />
      </View>

      {/* Meta rows */}
      <Skeleton height={10} width="100%" />
      <Skeleton height={10} width="80%" style={{ marginTop: 6 }} />

      {/* Footer actions */}
      <View style={styles.cardFooter}>
        <Skeleton width={90} height={30} borderRadius={radius.md} />
        <Skeleton width={90} height={30} borderRadius={radius.md} />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// ListItemSkeleton — approximates a horizontal management list row
// ---------------------------------------------------------------------------

export function ListItemSkeleton() {
  return (
    <View style={styles.listItem}>
      <Skeleton width={36} height={36} borderRadius={radius.md} />
      <View style={styles.listItemText}>
        <Skeleton height={13} width="55%" />
        <Skeleton height={10} width="38%" style={{ marginTop: 5 }} />
      </View>
      <Skeleton width={60} height={28} borderRadius={radius.md} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  widgetContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceCard,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  cardTitleBlock: {
    flex: 1,
    gap: 5,
  },
  badgeRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  cardFooter: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  listItemText: {
    flex: 1,
    gap: 5,
  },
});
