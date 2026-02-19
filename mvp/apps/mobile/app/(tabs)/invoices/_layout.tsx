import { Stack } from "expo-router";
import { useTheme } from "react-native-paper";

export default function InvoicesLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.onSurface,
      }}
    >
      <Stack.Screen name="index" options={{ title: "Invoices" }} />
      <Stack.Screen name="[id]" options={{ title: "Invoice Detail" }} />
    </Stack>
  );
}
