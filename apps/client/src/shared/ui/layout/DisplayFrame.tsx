import React from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { colors, radius, spacing, typography } from "../theme";

interface DisplayFrameProps {
  title?: string;
  subtitle?: string;
  countdownProgress?: number | null;
  countdownLabel?: string | null;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const HEADER_GLOW_SIZE = 420;
const HEADER_GLOW_TOP_OFFSET = -260;
const HEADER_GLOW_RADIUS = HEADER_GLOW_SIZE / 2;
const HEADER_GLOW_CENTER_Y = HEADER_GLOW_TOP_OFFSET + HEADER_GLOW_RADIUS;
const ARC_HEIGHT = 170;
const ARC_STROKE_WIDTH = 6;

interface AmbientCountdownArcProps {
  progress: number;
  width: number;
}

function AmbientCountdownArc({ progress, width }: AmbientCountdownArcProps) {
  const centerX = width / 2;
  const arcPath = `M ${centerX - HEADER_GLOW_RADIUS} ${HEADER_GLOW_CENTER_Y} A ${HEADER_GLOW_RADIUS} ${HEADER_GLOW_RADIUS} 0 0 0 ${centerX + HEADER_GLOW_RADIUS} ${HEADER_GLOW_CENTER_Y}`;
  const arcLength = Math.PI * HEADER_GLOW_RADIUS;
  const dashOffset = arcLength * (1 - progress);

  return (
    <Svg width={width} height={ARC_HEIGHT} viewBox={`0 0 ${width} ${ARC_HEIGHT}`}>
      <Defs>
        <LinearGradient id="ambientCountdownGradient" x1={centerX - HEADER_GLOW_RADIUS} y1={ARC_HEIGHT} x2={centerX + HEADER_GLOW_RADIUS} y2={ARC_HEIGHT}>
          <Stop offset="0%" stopColor={colors.statusInfoText} />
          <Stop offset="60%" stopColor={colors.accentBlue} />
          <Stop offset="100%" stopColor={colors.buttonSecondaryBorder} />
        </LinearGradient>
      </Defs>
      <Path
        d={arcPath}
        stroke="rgba(121, 166, 209, 0.18)"
        strokeWidth={ARC_STROKE_WIDTH}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d={arcPath}
        stroke="url(#ambientCountdownGradient)"
        strokeWidth={ARC_STROKE_WIDTH}
        strokeLinecap="round"
        strokeDasharray={`${arcLength} ${arcLength}`}
        strokeDashoffset={dashOffset}
        fill="none"
      />
    </Svg>
  );
}

export function DisplayFrame({
  title,
  subtitle,
  countdownProgress = null,
  countdownLabel = null,
  children,
  footer,
}: DisplayFrameProps) {
  const { width: windowWidth } = useWindowDimensions();
  const contentWidth = Math.max(0, windowWidth - spacing.xl * 2);

  const progress = typeof countdownProgress === "number"
    ? Math.max(0, Math.min(1, countdownProgress))
    : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View pointerEvents="none" style={styles.backgroundGlowTop} />
        <View pointerEvents="none" style={styles.backgroundGlowBottom} />
        {(title || subtitle) && (
          <View style={styles.header}>
            {progress !== null ? (
              <View style={styles.arcWrap}>
                <AmbientCountdownArc progress={progress} width={contentWidth} />
              </View>
            ) : null}
            {title ? <Text style={styles.title}>{title}</Text> : null}
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            {countdownLabel ? <Text style={styles.countdownLabel}>{countdownLabel}</Text> : null}
          </View>
        )}

        <View style={styles.content}>{children}</View>

        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.backgroundPrimary,
  },
  container: {
    flex: 1,
    backgroundColor: colors.backgroundPrimary,
    paddingHorizontal: spacing.xl,
  },
  backgroundGlowTop: {
    position: "absolute",
    width: 420,
    height: 420,
    borderRadius: radius.pill,
    top: -260,
    alignSelf: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  backgroundGlowBottom: {
    position: "absolute",
    width: 320,
    height: 320,
    borderRadius: radius.pill,
    bottom: -220,
    right: -80,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
  },
  header: {
    alignItems: "center",
    paddingTop: spacing.xl,
    paddingBottom: 14,
    minHeight: 180,
    justifyContent: "center",
  },
  arcWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.title.fontSize,
    fontWeight: "700",
    letterSpacing: 0.8,
    textAlign: "center",
  },
  subtitle: {
    marginTop: 6,
    color: colors.textSecondary,
    fontSize: typography.body.fontSize,
    textAlign: "center",
  },
  content: {
    flex: 1,
  },
  footer: {
    alignItems: "center",
    paddingBottom: 18,
    paddingTop: spacing.sm,
  },
  countdownLabel: {
    marginTop: 6,
    color: colors.textSecondary,
    fontSize: typography.caption.fontSize,
    letterSpacing: 0.4,
  },
});
