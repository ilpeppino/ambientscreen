import React, { useMemo, useState } from "react";
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "../auth.context";
import { TextInput as AppTextInput } from "../../../shared/ui/components";
import { Button } from "../../../shared/ui/Button";
import { colors, radius, spacing, typography } from "../../../shared/ui/theme";

type AuthMode = "login" | "register";

export function LoginScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title = useMemo(() => (mode === "login" ? "Sign in" : "Create account"), [mode]);

  async function handleSubmit() {
    setIsSubmitting(true);
    setError(null);

    try {
      if (mode === "login") {
        await login(email.trim(), password);
      } else {
        await register(email.trim(), password);
      }
    } catch (submitError) {
      setError((submitError as Error).message || "Authentication failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <AppTextInput
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Email"
          inputStyle={styles.input}
        />
        <AppTextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Password"
          inputStyle={styles.input}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          label={mode === "login" ? "Login" : "Register"}
          onPress={() => { void handleSubmit(); }}
          variant="primary"
          size="lg"
          loading={isSubmitting}
          fullWidth
        />

        <Pressable
          onPress={() => {
            setMode(mode === "login" ? "register" : "login");
            setError(null);
          }}
          disabled={isSubmitting}
        >
          <Text style={styles.switchText}>
            {mode === "login" ? "Need an account? Register" : "Have an account? Login"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.backgroundAuth,
    justifyContent: "center",
    padding: spacing.screenPadding,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    backgroundColor: colors.surfaceAuth,
    borderRadius: radius.md,
    padding: spacing.screenPadding,
    gap: spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.textOnLight,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: typography.body.fontSize,
    color: colors.textOnLight,
    backgroundColor: colors.surfaceAuth,
  },
  switchText: {
    marginTop: 6,
    color: colors.accentTeal,
    textAlign: "center",
    fontWeight: "600",
  },
  error: {
    color: colors.errorStrong,
    fontSize: typography.label.fontSize,
  },
});
