import { ScrollView, View, StyleSheet } from "react-native";
import { Card, Text, Chip, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { invoices, appModules } from "@repo/shared";
import { useAuthStore } from "@/lib/auth";
import { getIconName } from "@/lib/icons";

const stats = [
  { label: "Total Invoices", value: "50", change: "+12%", icon: "FileText", moduleId: "invoices" },
  { label: "Revenue (PLN)", value: "847,320", change: "+8.2%", icon: "DollarSign", moduleId: "invoices" },
  { label: "Customers", value: "128", change: "+3", icon: "Users", moduleId: "customers" },
  { label: "Products", value: "456", change: "+15", icon: "Package", moduleId: "products" },
  { label: "Orders Today", value: "23", change: "+5", icon: "ShoppingCart", moduleId: "warehouse" },
  { label: "Growth Rate", value: "18.3%", change: "+2.1%", icon: "TrendingUp", moduleId: "reports" },
];

export default function DashboardScreen() {
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const hasModuleAccess = useAuthStore((s) => s.hasModuleAccess);

  const overdueCount = invoices.filter((i) => i.status === "overdue").length;
  const paidTotal = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.grossTotal, 0);
  const recentInvoices = invoices.slice(0, 6);
  const visibleStats = stats.filter((s) => hasModuleAccess(s.moduleId));

  return (
    <ScrollView style={{ backgroundColor: theme.colors.background }} contentContainerStyle={styles.container}>
      {/* Welcome */}
      <Text variant="headlineSmall" style={styles.welcome}>
        Welcome back, {user?.name?.split(" ")[0]}
      </Text>
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 20 }}>
        Here's what's happening across your modules today.
      </Text>

      {/* KPI Cards */}
      <View style={styles.grid}>
        {visibleStats.map((stat) => (
          <Card key={stat.label} style={styles.statCard}>
            <Card.Content>
              <View style={styles.statHeader}>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {stat.label}
                </Text>
                <MaterialCommunityIcons
                  name={getIconName(stat.icon) as any}
                  size={16}
                  color={theme.colors.onSurfaceVariant}
                />
              </View>
              <Text variant="headlineSmall" style={{ fontWeight: "700", marginTop: 4 }}>
                {stat.value}
              </Text>
              <Text variant="bodySmall" style={{ color: "#16a34a", marginTop: 2 }}>
                {stat.change} from last month
              </Text>
            </Card.Content>
          </Card>
        ))}
      </View>

      {/* Alerts */}
      {hasModuleAccess("invoices") && overdueCount > 0 && (
        <Card style={styles.section}>
          <Card.Content>
            <View style={styles.alertHeader}>
              <MaterialCommunityIcons name="alert-circle" size={20} color={theme.colors.error} />
              <Text variant="titleMedium" style={{ marginLeft: 8 }}>Attention Required</Text>
            </View>
            <Card mode="outlined" style={{ marginTop: 12 }}>
              <Card.Content style={styles.alertRow}>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyMedium" style={{ fontWeight: "600" }}>{overdueCount} overdue invoices</Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    Require follow-up with customers
                  </Text>
                </View>
                <Chip compact textStyle={{ fontSize: 11 }}>Overdue</Chip>
              </Card.Content>
            </Card>
            <Card mode="outlined" style={{ marginTop: 8 }}>
              <Card.Content style={styles.alertRow}>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyMedium" style={{ fontWeight: "600" }}>Paid this month</Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {paidTotal.toLocaleString("pl-PL", { style: "currency", currency: "PLN" })}
                  </Text>
                </View>
                <Chip compact textStyle={{ fontSize: 11 }}>Collected</Chip>
              </Card.Content>
            </Card>
          </Card.Content>
        </Card>
      )}

      {/* Recent Invoices */}
      {hasModuleAccess("invoices") && (
        <Card style={styles.section}>
          <Card.Content>
            <Text variant="titleMedium" style={{ marginBottom: 4 }}>Recent Invoices</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}>
              Last {recentInvoices.length} invoices in the system
            </Text>
            {recentInvoices.map((inv) => (
              <View key={inv.id} style={styles.invoiceRow}>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyMedium" style={{ fontWeight: "600" }}>{inv.number}</Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {inv.customer}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text variant="bodyMedium" style={{ fontWeight: "600" }}>
                    {inv.grossTotal.toLocaleString("pl-PL", { style: "currency", currency: "PLN" })}
                  </Text>
                  <Chip
                    compact
                    style={{
                      marginTop: 2,
                      backgroundColor:
                        inv.status === "paid" ? "#dcfce7" :
                        inv.status === "overdue" ? "#fecaca" :
                        inv.status === "sent" ? "#e0e7ff" : "#f1f5f9",
                    }}
                    textStyle={{
                      fontSize: 10,
                      color:
                        inv.status === "paid" ? "#166534" :
                        inv.status === "overdue" ? "#991b1b" :
                        inv.status === "sent" ? "#3730a3" : "#475569",
                    }}
                  >
                    {inv.status}
                  </Chip>
                </View>
              </View>
            ))}
          </Card.Content>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 32 },
  welcome: { fontWeight: "700" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 16 },
  statCard: { width: "47%", flexGrow: 1 },
  statHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  section: { marginBottom: 16 },
  alertHeader: { flexDirection: "row", alignItems: "center" },
  alertRow: { flexDirection: "row", alignItems: "center" },
  invoiceRow: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#e5e7eb",
  },
});
