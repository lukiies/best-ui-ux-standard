import { useState } from "react";
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { Text, Card, TextInput, Button, Chip, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { users } from "@repo/shared";
import { useAuthStore } from "@/lib/auth";

const roleColors: Record<string, string> = {
  superadmin: "#0f172a",
  admin: "#475569",
  user: "#94a3b8",
};

export default function LoginScreen() {
  const theme = useTheme();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = () => {
    setError("");
    const success = login(email, password);
    if (!success) {
      setError("Invalid credentials. Use one of the demo accounts below.");
    }
  };

  const quickLogin = (userEmail: string) => {
    login(userEmail, "demo");
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={[styles.logoBox, { backgroundColor: theme.colors.primary }]}>
            <MaterialCommunityIcons name="lightning-bolt" size={32} color="#fff" />
          </View>
          <Text variant="headlineMedium" style={styles.title}>UI/UX Standard</Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Enterprise Application Platform
          </Text>
        </View>

        {/* Login Form */}
        <Card style={styles.card}>
          <Card.Content style={styles.cardContent}>
            <Text variant="titleLarge">Sign in</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>
              Enter your credentials to access the system
            </Text>

            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              mode="outlined"
              style={styles.input}
            />

            {error ? (
              <Text variant="bodySmall" style={{ color: theme.colors.error, marginBottom: 8 }}>
                {error}
              </Text>
            ) : null}

            <Button mode="contained" onPress={handleLogin} style={styles.button}>
              Sign in
            </Button>
          </Card.Content>
        </Card>

        {/* Quick Access */}
        <Card style={styles.card}>
          <Card.Content style={styles.cardContent}>
            <Text variant="titleSmall">Demo Quick Access</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}>
              Tap to sign in as different roles
            </Text>

            {users.map((u) => (
              <Card
                key={u.id}
                mode="outlined"
                onPress={() => quickLogin(u.email)}
                style={styles.userCard}
              >
                <Card.Content style={styles.userCardContent}>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyMedium" style={{ fontWeight: "600" }}>{u.name}</Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {u.email}
                    </Text>
                  </View>
                  <Chip
                    compact
                    style={{ backgroundColor: roleColors[u.role] ?? theme.colors.primary }}
                    textStyle={{ color: "#fff", fontSize: 11 }}
                  >
                    {u.role}
                  </Chip>
                </Card.Content>
              </Card>
            ))}
          </Card.Content>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: "center", padding: 20 },
  logoContainer: { alignItems: "center", marginBottom: 24 },
  logoBox: {
    width: 56, height: 56, borderRadius: 14,
    alignItems: "center", justifyContent: "center", marginBottom: 12,
  },
  title: { fontWeight: "700", marginBottom: 4 },
  card: { marginBottom: 16 },
  cardContent: { gap: 4 },
  input: { marginBottom: 8 },
  button: { marginTop: 8 },
  userCard: { marginBottom: 8 },
  userCardContent: { flexDirection: "row", alignItems: "center" },
});
