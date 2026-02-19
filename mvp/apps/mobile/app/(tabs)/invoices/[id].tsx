import { ScrollView, View, StyleSheet } from "react-native";
import { Card, Text, Chip, DataTable, Divider, useTheme } from "react-native-paper";
import { useLocalSearchParams } from "expo-router";
import { invoices } from "@repo/shared";

const statusColors: Record<string, { bg: string; text: string }> = {
  paid: { bg: "#dcfce7", text: "#166534" },
  overdue: { bg: "#fecaca", text: "#991b1b" },
  sent: { bg: "#e0e7ff", text: "#3730a3" },
  draft: { bg: "#f1f5f9", text: "#475569" },
  cancelled: { bg: "#f1f5f9", text: "#6b7280" },
};

export default function InvoiceDetailScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const invoice = invoices.find((i) => i.id === id);

  if (!invoice) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text variant="bodyLarge">Invoice not found</Text>
      </View>
    );
  }

  const fmt = (n: number) => n.toLocaleString("pl-PL", { style: "currency", currency: invoice.currency });
  const colors = statusColors[invoice.status] ?? statusColors.draft;

  return (
    <ScrollView style={{ backgroundColor: theme.colors.background }} contentContainerStyle={styles.container}>
      {/* Header */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text variant="titleLarge" style={{ fontWeight: "700" }}>{invoice.number}</Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                {invoice.customer}
              </Text>
            </View>
            <Chip
              style={{ backgroundColor: colors.bg }}
              textStyle={{ color: colors.text, fontWeight: "600" }}
            >
              {invoice.status.toUpperCase()}
            </Chip>
          </View>
        </Card.Content>
      </Card>

      {/* Dates & Currency */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.detailGrid}>
            <View style={styles.detailItem}>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Issue Date</Text>
              <Text variant="bodyMedium" style={{ fontWeight: "600" }}>{invoice.date}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Due Date</Text>
              <Text variant="bodyMedium" style={{ fontWeight: "600" }}>{invoice.dueDate}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Currency</Text>
              <Text variant="bodyMedium" style={{ fontWeight: "600" }}>{invoice.currency}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Tax ID</Text>
              <Text variant="bodyMedium" style={{ fontWeight: "600" }}>{invoice.customerTaxId}</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Line Items */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={{ marginBottom: 8 }}>Line Items</Text>
          <DataTable>
            <DataTable.Header>
              <DataTable.Title>Item</DataTable.Title>
              <DataTable.Title numeric>Qty</DataTable.Title>
              <DataTable.Title numeric>Price</DataTable.Title>
              <DataTable.Title numeric>Gross</DataTable.Title>
            </DataTable.Header>
            {invoice.items.map((item) => (
              <DataTable.Row key={item.id}>
                <DataTable.Cell>{item.name}</DataTable.Cell>
                <DataTable.Cell numeric>{item.quantity}</DataTable.Cell>
                <DataTable.Cell numeric>{fmt(item.unitPrice)}</DataTable.Cell>
                <DataTable.Cell numeric>{fmt(item.grossAmount)}</DataTable.Cell>
              </DataTable.Row>
            ))}
          </DataTable>
        </Card.Content>
      </Card>

      {/* Totals */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.totalRow}>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>Net Total</Text>
            <Text variant="bodyMedium">{fmt(invoice.netTotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>VAT Total</Text>
            <Text variant="bodyMedium">{fmt(invoice.vatTotal)}</Text>
          </View>
          <Divider style={{ marginVertical: 8 }} />
          <View style={styles.totalRow}>
            <Text variant="titleMedium" style={{ fontWeight: "700" }}>Gross Total</Text>
            <Text variant="titleMedium" style={{ fontWeight: "700" }}>{fmt(invoice.grossTotal)}</Text>
          </View>
        </Card.Content>
      </Card>

      {/* Notes */}
      {invoice.notes && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleSmall" style={{ marginBottom: 4 }}>Notes</Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {invoice.notes}
            </Text>
          </Card.Content>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: { marginBottom: 12 },
  headerRow: { flexDirection: "row", alignItems: "center" },
  detailGrid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  detailItem: { width: "45%", flexGrow: 1 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
});
