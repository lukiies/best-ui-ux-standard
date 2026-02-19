import { View, StyleSheet, useColorScheme } from "react-native";
import { ScrollView } from "react-native";
import { Card, Text, Button, Avatar, Chip, Divider, Switch, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { users } from "@repo/shared";
import { useAuthStore } from "@/lib/auth";

const roleBadgeColors: Record<string, string> = {
  superadmin: "#0f172a",
  admin: "#475569",
  user: "#94a3b8",
};

export default function ProfileScreen() {
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const switchUser = useAuthStore((s) => s.switchUser);

  if (!user) return null;

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const moduleCount = user.permissions.filter((p) => p.canView).length;

  return (
    <ScrollView style={{ backgroundColor: theme.colors.background }} contentContainerStyle={styles.container}>
      {/* User Info */}
      <Card style={styles.card}>
        <Card.Content style={styles.profileHeader}>
          <Avatar.Text size={64} label={initials} style={{ backgroundColor: theme.colors.primary }} />
          <View style={{ marginLeft: 16, flex: 1 }}>
            <Text variant="titleLarge" style={{ fontWeight: "700" }}>{user.name}</Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>{user.email}</Text>
            <Chip
              compact
              style={{ marginTop: 8, alignSelf: "flex-start", backgroundColor: roleBadgeColors[user.role] }}
              textStyle={{ color: "#fff", fontSize: 11 }}
            >
              {user.role.toUpperCase()}
            </Chip>
          </View>
        </Card.Content>
      </Card>

      {/* Stats */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={{ marginBottom: 12 }}>Account Details</Text>
          <View style={styles.statRow}>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>Modules Access</Text>
            <Text variant="bodyMedium" style={{ fontWeight: "600" }}>
              {user.role === "superadmin" ? "All" : `${moduleCount} modules`}
            </Text>
          </View>
          <Divider style={{ marginVertical: 8 }} />
          <View style={styles.statRow}>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>Last Login</Text>
            <Text variant="bodyMedium" style={{ fontWeight: "600" }}>
              {new Date(user.lastLogin).toLocaleDateString("en-GB")}
            </Text>
          </View>
          <Divider style={{ marginVertical: 8 }} />
          <View style={styles.statRow}>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>Member Since</Text>
            <Text variant="bodyMedium" style={{ fontWeight: "600" }}>
              {new Date(user.createdAt).toLocaleDateString("en-GB")}
            </Text>
          </View>
        </Card.Content>
      </Card>

      {/* Appearance */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={{ marginBottom: 12 }}>Appearance</Text>
          <View style={styles.statRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <MaterialCommunityIcons
                name={colorScheme === "dark" ? "weather-night" : "weather-sunny"}
                size={20}
                color={theme.colors.onSurface}
              />
              <Text variant="bodyMedium">Dark Mode</Text>
            </View>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {colorScheme === "dark" ? "On (system)" : "Off (system)"}
            </Text>
          </View>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
            Theme follows your device system settings.
          </Text>
        </Card.Content>
      </Card>

      {/* Switch User (Demo) */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={{ marginBottom: 4 }}>Switch User (Demo)</Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}>
            Tap to switch between demo roles
          </Text>
          {users.map((u) => (
            <Card
              key={u.id}
              mode="outlined"
              onPress={() => switchUser(u.id)}
              style={[
                styles.userCard,
                u.id === user.id && { borderColor: theme.colors.primary, borderWidth: 2 },
              ]}
            >
              <Card.Content style={styles.userCardContent}>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyMedium" style={{ fontWeight: "600" }}>{u.name}</Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{u.email}</Text>
                </View>
                <Chip
                  compact
                  style={{ backgroundColor: roleBadgeColors[u.role] }}
                  textStyle={{ color: "#fff", fontSize: 11 }}
                >
                  {u.role}
                </Chip>
              </Card.Content>
            </Card>
          ))}
        </Card.Content>
      </Card>

      {/* Logout */}
      <Button
        mode="outlined"
        onPress={logout}
        icon="logout"
        style={styles.logoutButton}
        textColor={theme.colors.error}
      >
        Sign out
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 32 },
  card: { marginBottom: 12 },
  profileHeader: { flexDirection: "row", alignItems: "center" },
  statRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  userCard: { marginBottom: 8 },
  userCardContent: { flexDirection: "row", alignItems: "center" },
  logoutButton: { marginTop: 4, borderColor: "#ef4444" },
});
