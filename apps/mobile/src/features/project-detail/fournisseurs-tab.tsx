import { formatMoney, recordedAveragePrices } from "@keurflow/business";
import { materialDisplayName } from "@keurflow/config";
import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { Badge } from "../../components/badge";
import { Card } from "../../components/card";
import { SheetModal } from "../../components/sheet-modal";
import { minorUnitFor } from "../../lib/projectSummary";
import { supabase } from "../../lib/supabase";
import { entranceAnimation, useStyles, useTheme, type Theme } from "../../theme";
import { AddPurchaseSheet } from "./add-purchase-sheet";
import { AddSupplierSheet } from "./add-supplier-sheet";
import type { ProjectDetailState, Purchase, Supplier } from "./types";

const MAX_STAGGER_INDEX = 6;
const STAGGER_STEP_MS = 50;

// One tab holding both lists, mirroring web: the chantier's tab bar is
// already long, and a supplier is read together with what was bought from it.
export function FournisseursTab({
  state,
  projectId,
  onChanged,
  isBlocked,
}: {
  state: Extract<ProjectDetailState, { status: "ready" }>;
  projectId: string;
  onChanged: () => void;
  isBlocked: boolean;
}) {
  const theme = useTheme();
  const styles = useStyles(createStyles);
  const { project, suppliers, purchases, organizationId, canManageSuppliers } = state;
  const [section, setSection] = useState<"suppliers" | "purchases">("suppliers");
  const [supplierSheetOpen, setSupplierSheetOpen] = useState(false);
  const [purchaseSheetOpen, setPurchaseSheetOpen] = useState(false);
  const [openSupplier, setOpenSupplier] = useState<Supplier | null>(null);

  const projectPurchases = useMemo(
    () => purchases.filter((p) => p.project_id === projectId),
    [purchases, projectId],
  );

  const purchaseCountBySupplier = useMemo(() => {
    const counts = new Map<string, number>();
    for (const purchase of purchases) {
      counts.set(purchase.supplier_id, (counts.get(purchase.supplier_id) ?? 0) + 1);
    }
    return counts;
  }, [purchases]);

  const canAdd = !isBlocked && (section === "suppliers" ? canManageSuppliers : true);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.segment}>
          {(
            [
              ["suppliers", "Fournisseurs"],
              ["purchases", "Achats"],
            ] as const
          ).map(([id, label]) => (
            <Pressable
              key={id}
              onPress={() => setSection(id)}
              style={[styles.segmentItem, section === id && styles.segmentItemActive]}
            >
              <Text style={[styles.segmentLabel, section === id && styles.segmentLabelActive]}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
        {canAdd && (
          <Pressable
            style={styles.addButton}
            onPress={() => (section === "suppliers" ? setSupplierSheetOpen(true) : setPurchaseSheetOpen(true))}
            accessibilityRole="button"
            accessibilityLabel={
              section === "suppliers" ? "Ajouter un fournisseur" : "Enregistrer un achat"
            }
          >
            <Ionicons name="add" size={18} color={styles.addButtonIcon.color} />
          </Pressable>
        )}
      </View>

      {section === "suppliers" ? (
        suppliers.length > 0 ? (
          suppliers.map((supplier, index) => (
            <Animated.View
              key={supplier.id}
              entering={entranceAnimation(theme.reducedMotion, {
                index,
                maxStaggerIndex: MAX_STAGGER_INDEX,
                stepMs: STAGGER_STEP_MS,
                duration: 250,
              })}
            >
              <Card style={styles.row} onPress={() => setOpenSupplier(supplier)}>
                <View style={styles.rowText}>
                  <Text style={styles.name} numberOfLines={1}>
                    {supplier.name}
                  </Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {[supplier.city, supplier.countryName, supplier.specialties]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </Text>
                </View>
                <View style={styles.rowEnd}>
                  {supplier.status === "inactive" && <Badge label="Inactif" tone="neutral" />}
                  <Text style={styles.count}>{purchaseCountBySupplier.get(supplier.id) ?? 0}</Text>
                </View>
              </Card>
            </Animated.View>
          ))
        ) : (
          <Text style={styles.empty}>
            {canManageSuppliers
              ? "Aucun fournisseur pour le moment. Appuyez sur + pour ajouter le premier."
              : "Aucun fournisseur pour le moment."}
          </Text>
        )
      ) : projectPurchases.length > 0 ? (
        projectPurchases.map((purchase, index) => (
          <Animated.View
            key={purchase.id}
            entering={entranceAnimation(theme.reducedMotion, {
              index,
              maxStaggerIndex: MAX_STAGGER_INDEX,
              stepMs: STAGGER_STEP_MS,
              duration: 250,
            })}
          >
            <Card style={styles.purchaseCard}>
              <View style={styles.purchaseHeader}>
                <Text style={styles.name} numberOfLines={1}>
                  {materialDisplayName(purchase.material_code, purchase.material_name)}
                </Text>
                <Text style={styles.amount}>
                  {formatMoney(
                    purchase.total_amount_minor,
                    purchase.currency_code,
                    minorUnitFor(purchase.currency_code),
                  )}
                </Text>
              </View>
              <Text style={styles.meta}>
                {purchase.supplierName} · {purchase.quantity} {purchase.unit} ·{" "}
                {purchase.purchase_date}
              </Text>
              {(purchase.paymentMethodLabel || purchase.expense_id) && (
                <Text style={styles.meta}>
                  {[purchase.paymentMethodLabel, purchase.expense_id ? "Dépense liée" : null]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              )}
            </Card>
          </Animated.View>
        ))
      ) : (
        <Text style={styles.empty}>Aucun achat enregistré pour ce chantier.</Text>
      )}

      <AddSupplierSheet
        visible={supplierSheetOpen}
        onClose={() => setSupplierSheetOpen(false)}
        onSaved={onChanged}
        organizationId={organizationId}
      />
      <AddPurchaseSheet
        visible={purchaseSheetOpen}
        onClose={() => setPurchaseSheetOpen(false)}
        onCreated={onChanged}
        projectId={projectId}
        currencyCode={project.currency_code}
        suppliers={suppliers}
      />
      <SupplierDetailSheet
        supplier={openSupplier}
        purchases={purchases}
        canManage={canManageSuppliers}
        onClose={() => setOpenSupplier(null)}
        onChanged={onChanged}
      />
    </View>
  );
}

function SupplierDetailSheet({
  supplier,
  purchases,
  canManage,
  onClose,
  onChanged,
}: {
  supplier: Supplier | null;
  purchases: Purchase[];
  canManage: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const styles = useStyles(createStyles);
  const [pending, setPending] = useState(false);

  const supplierPurchases = useMemo(
    () => (supplier ? purchases.filter((p) => p.supplier_id === supplier.id) : []),
    [purchases, supplier],
  );

  const averages = useMemo(
    () =>
      recordedAveragePrices(
        supplierPurchases.map((p) => ({
          materialCode: p.material_code,
          materialName: p.material_name,
          unit: p.unit,
          currencyCode: p.currency_code,
          unitPriceMinor: p.unit_price_minor,
        })),
      ),
    [supplierPurchases],
  );

  if (!supplier) return null;

  const toggleStatus = async () => {
    setPending(true);
    const { error } = await supabase
      .from("suppliers")
      .update({ status: supplier.status === "active" ? "inactive" : "active" })
      .eq("id", supplier.id);
    if (error) console.error("[toggleSupplierStatus] Supabase error:", error.code, error.message);
    setPending(false);
    onChanged();
    onClose();
  };

  const openWhatsApp = () => {
    const digits = (supplier.whatsapp ?? supplier.phone ?? "").replace(/\D/g, "");
    if (!digits) return;
    Linking.openURL(`https://wa.me/${digits}`).catch(() => {});
  };

  return (
    <SheetModal visible onClose={onClose} title={supplier.name}>
      <View style={styles.detailBlock}>
        <DetailRow label="Contact" value={supplier.contact_name} />
        <DetailRow label="Téléphone" value={supplier.phone} />
        <DetailRow label="WhatsApp" value={supplier.whatsapp} />
        <DetailRow label="Email" value={supplier.email} />
        <DetailRow label="Adresse" value={supplier.address} />
        <DetailRow
          label="Localisation"
          value={[supplier.city, supplier.countryName].filter(Boolean).join(", ") || null}
        />
        <DetailRow label="Spécialités" value={supplier.specialties} />
        <DetailRow label="Notes" value={supplier.notes} />
        <DetailRow label="Statut" value={supplier.status === "active" ? "Actif" : "Inactif"} />
      </View>

      {(supplier.whatsapp || supplier.phone) && (
        <Pressable style={styles.whatsappButton} onPress={openWhatsApp}>
          <Ionicons name="logo-whatsapp" size={18} color={styles.whatsappIcon.color} />
          <Text style={styles.whatsappLabel}>Contacter sur WhatsApp</Text>
        </Pressable>
      )}

      {averages.length > 0 && (
        <View style={styles.detailBlock}>
          <Text style={styles.sectionLabel}>Prix moyen enregistré dans KeurFlow</Text>
          {averages.map((avg) => (
            <View
              key={`${avg.materialCode}-${avg.materialName}-${avg.unit}-${avg.currencyCode}`}
              style={styles.priceRow}
            >
              <Text style={styles.meta}>
                {materialDisplayName(avg.materialCode, avg.materialName)}
              </Text>
              <Text style={styles.priceValue}>
                {formatMoney(
                  avg.averageUnitPriceMinor,
                  avg.currencyCode,
                  minorUnitFor(avg.currencyCode),
                )}{" "}
                / {avg.unit}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.detailBlock}>
        <Text style={styles.sectionLabel}>Historique des achats</Text>
        {supplierPurchases.length > 0 ? (
          supplierPurchases.map((purchase) => (
            <View key={purchase.id} style={styles.priceRow}>
              <Text style={styles.meta} numberOfLines={1}>
                {purchase.purchase_date} ·{" "}
                {materialDisplayName(purchase.material_code, purchase.material_name)}
              </Text>
              <Text style={styles.priceValue}>
                {formatMoney(
                  purchase.total_amount_minor,
                  purchase.currency_code,
                  minorUnitFor(purchase.currency_code),
                )}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.meta}>Aucun achat enregistré auprès de ce fournisseur.</Text>
        )}
      </View>

      {canManage && (
        <Pressable style={styles.statusButton} onPress={toggleStatus} disabled={pending}>
          <Text style={styles.statusLabel}>
            {supplier.status === "active" ? "Désactiver le fournisseur" : "Réactiver le fournisseur"}
          </Text>
        </Pressable>
      )}
    </SheetModal>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null }) {
  const styles = useStyles(createStyles);
  if (!value) return null;
  return (
    <View style={styles.priceRow}>
      <Text style={styles.meta}>{label}</Text>
      <Text style={styles.detailValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function createStyles(theme: Theme) {
  return {
    container: { gap: theme.spacing.md },
    header: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      gap: theme.spacing.sm,
    },
    segment: {
      flexDirection: "row" as const,
      backgroundColor: theme.colors.background,
      borderRadius: theme.radius.full,
      padding: 3,
    },
    segmentItem: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: theme.radius.full },
    segmentItemActive: { backgroundColor: theme.colors.card },
    segmentLabel: { fontSize: 13, fontWeight: "600" as const, color: theme.colors.textMuted },
    segmentLabelActive: { color: theme.colors.text },
    addButton: {
      width: 32,
      height: 32,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.primary,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    addButtonIcon: { color: theme.colors.primaryText },
    empty: { fontSize: 13, color: theme.colors.textMuted, textAlign: "center" as const, marginTop: 12 },
    row: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      gap: theme.spacing.sm,
    },
    rowText: { flexShrink: 1, gap: 2 },
    rowEnd: { flexDirection: "row" as const, alignItems: "center" as const, gap: theme.spacing.sm },
    name: { fontSize: 14, fontWeight: "600" as const, color: theme.colors.text },
    meta: { fontSize: 12, color: theme.colors.textMuted, flexShrink: 1 },
    count: { fontSize: 12, color: theme.colors.textMuted },
    purchaseCard: { gap: 4 },
    purchaseHeader: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      gap: theme.spacing.sm,
    },
    amount: { fontSize: 14, fontWeight: "700" as const, color: theme.colors.text },
    detailBlock: { gap: 6 },
    sectionLabel: {
      fontSize: 11,
      fontWeight: "600" as const,
      letterSpacing: 0.5,
      textTransform: "uppercase" as const,
      color: theme.colors.textMuted,
    },
    priceRow: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
      gap: theme.spacing.sm,
    },
    priceValue: { fontSize: 13, fontWeight: "600" as const, color: theme.colors.text },
    detailValue: {
      fontSize: 13,
      fontWeight: "600" as const,
      color: theme.colors.text,
      flexShrink: 1,
      textAlign: "right" as const,
    },
    whatsappButton: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.full,
      paddingVertical: 10,
    },
    whatsappIcon: { color: theme.colors.success },
    whatsappLabel: { fontSize: 14, fontWeight: "600" as const, color: theme.colors.text },
    statusButton: {
      alignItems: "center" as const,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.full,
      paddingVertical: 11,
    },
    statusLabel: { fontSize: 14, fontWeight: "600" as const, color: theme.colors.text },
  };
}
