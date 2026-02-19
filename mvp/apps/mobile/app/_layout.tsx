import { useEffect, useState } from "react";
import { useColorScheme } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { PaperProvider, MD3LightTheme, MD3DarkTheme } from "react-native-paper";
import { StatusBar } from "expo-status-bar";
import { useAuthStore } from "@/lib/auth";

const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: "#0f172a",
    secondary: "#475569",
    surface: "#ffffff",
    background: "#f8fafc",
  },
};

const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: "#e2e8f0",
    secondary: "#94a3b8",
    surface: "#1e293b",
    background: "#0f172a",
  },
};

function AuthRedirect() {
  const segments = useSegments();
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const inAuthGroup = segments[0] === "(auth)";

    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (isAuthenticated && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [mounted, isAuthenticated, segments]);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? darkTheme : lightTheme;

  return (
    <PaperProvider theme={theme}>
      <AuthRedirect />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
    </PaperProvider>
  );
}
