import { useState, useMemo, useCallback } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Searchbar, Chip, Text, useTheme } from "react-native-paper";
import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { invoices } from "@repo/shared";
import type { Invoice } from "@repo/shared";

const statusFilters = ["all", "draft", "sent", "paid", "overdue", "cancelled"] as const;

const statusColors: Record<string, { bg: string; text: string }> = {
  paid: { bg: "#dcfce7", text: "#166534" },
  overdue: { bg: "#fecaca", text: "#991b1b" },
  sent: { bg: "#e0e7ff", text: "#3730a3" },
  draft: { bg: "#f1f5f9", text: "#475569" },
  cancelled: { bg: "#f1f5f9", text: "#6b7280" },
};

function InvoiceRow({ item, onPress }: { item: Invoice; onPress: () => void }) {
  const theme = useTheme();
  const colors = statusColors[item.status] ?? statusColors.draft;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? theme.colors.surfaceVariant : theme.colors.surface },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text variant="bodyMedium" style={{ fontWeight: "600" }}>{item.number}</Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {item.customer}
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {item.date}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text variant="bodyMedium" style={{ fontWeight: "700" }}>
          {item.grossTotal.toLocaleString("pl-PL", { style: "currency", currency: "PLN" })}
        </Text>
        <Chip
          compact
          style={{ marginTop: 4, backgroundColor: colors.bg }}
          textStyle={{ fontSize: 10, color: colors.text }}
        >
          {item.status}
        </Chip>
      </View>
    </Pressable>
  );
}

export default function InvoiceListScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      const matchSearch =
        inv.number.toLowerCase().includes(search.toLowerCase()) ||
        inv.customer.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || inv.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [search, statusFilter]);

  const renderItem = useCallback(({ item }: { item: Invoice }) => (
    <InvoiceRow
      item={item}
      onPress={() => router.push(`/(tabs)/invoices/${item.id}`)}
    />
  ), [router]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Search */}
      <Searchbar
        placeholder="Search invoices..."
        value={search}
        onChangeText={setSearch}
        style={styles.search}
      />

      {/* Filter chips */}
      <View style={styles.filters}>
        {statusFilters.map((s) => (
          <Chip
            key={s}
            selected={statusFilter === s}
            onPress={() => setStatusFilter(s)}
            compact
            style={styles.filterChip}
          >
            {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
          </Chip>
        ))}
      </View>

      {/* List */}
      <FlashList
        data={filtered}
        renderItem={renderItem}
        estimatedItemSize={80}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => (
          <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.outlineVariant }} />
        )}
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              No invoices found matching your criteria.
            </Text>
          </View>
        )}
      />

      {/* Footer */}
      <View style={[styles.footer, { borderTopColor: theme.colors.outlineVariant }]}>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {filtered.length} invoice{filtered.length !== 1 ? "s" : ""} found
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  search: { margin: 12, marginBottom: 8 },
  filters: { flexDirection: "row", paddingHorizontal: 12, gap: 6, marginBottom: 8, flexWrap: "wrap" },
  filterChip: { marginBottom: 4 },
  row: { flexDirection: "row", alignItems: "center", padding: 16 },
  empty: { padding: 32, alignItems: "center" },
  footer: { padding: 12, borderTopWidth: StyleSheet.hairlineWidth, alignItems: "center" },
});
