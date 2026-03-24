import React from "react";
import { StyleSheet, Text, View } from "react-native";
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

const ARC_WIDTH = 320;
const ARC_HEIGHT = 160;
const ARC_RADIUS = 128;
const ARC_CENTER_X = 160;
const ARC_CENTER_Y = 160;
const ARC_PATH = `M ${ARC_CENTER_X - ARC_RADIUS} ${ARC_CENTER_Y} A ${ARC_RADIUS} ${ARC_RADIUS} 0 0 1 ${ARC_CENTER_X + ARC_RADIUS} ${ARC_CENTER_Y}`;
const ARC_LENGTH = Math.PI * ARC_RADIUS;

interface AmbientCountdownArcProps {
  progress: number;
}

function AmbientCountdownArc({ progress }: AmbientCountdownArcProps) {
  const dashOffset = ARC_LENGTH * (1 - progress);

  return (
    <Svg width={ARC_WIDTH} height={ARC_HEIGHT} viewBox="0 0 320 160">
      <Defs>
        <LinearGradient id="ambientCountdownGradient" x1="32" y1="160" x2="288" y2="160">
          <Stop offset="0%" stopColor={colors.statusInfoText} />
          <Stop offset="60%" stopColor={colors.accentBlue} />
          <Stop offset="100%" stopColor={colors.buttonSecondaryBorder} />
        </LinearGradient>
      </Defs>
      <Path
        d={ARC_PATH}
        stroke="rgba(121, 166, 209, 0.25)"
        strokeWidth={5}
        strokeLinecap="round"
        fill="none"
        transform="scaleY(-1)"
      />
      <Path
        d={ARC_PATH}
        stroke="url(#ambientCountdownGradient)"
        strokeWidth={5}
        strokeLinecap="round"
        strokeDasharray={`${ARC_LENGTH} ${ARC_LENGTH}`}
        strokeDashoffset={dashOffset}
        fill="none"
        transform="scaleY(-1)"
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
                <AmbientCountdownArc progress={progress} />
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
    top: 14,
    alignSelf: "center",
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
