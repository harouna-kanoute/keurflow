"use client";

import { useMemo, useState, useTransition } from "react";
import { formatMoney, recordedAveragePrices } from "@keurflow/business";
import { materialDisplayName } from "@keurflow/config";
import { Modal } from "@/components/modal";
import { SupplierForm, type SupplierFormValues } from "./supplier-form";
import { PurchaseForm, type PurchaseExpenseOption } from "./purchase-form";
import { updateSupplierStatus } from "./supplier-actions";

export interface SupplierRow extends SupplierFormValues {
  countryName: string;
}

export interface PurchaseRow {
  id: string;
  projectId: string;
  projectName: string;
  supplierId: string;
  supplierName: string;
  materialCode: string;
  materialName: string | null;
  purchaseDate: string;
  quantity: number;
  unit: string;
  unitPriceMinor: number;
  currencyCode: string;
  totalAmountMinor: number;
  paymentMethodLabel: string | null;
  expenseId: string | null;
  documentCount: number;
}

function minorUnitOf(currencyCode: string, minorUnits: Record<string, number>): number {
  return minorUnits[currencyCode] ?? 2;
}

// One tab in the chantier's navigation rather than two ("Fournisseurs" +
// "Achats"): the project already carries 7 tabs, and the two lists are read
// together — supplier first, then what was bought from them.
export function SuppliersPanel({
  projectId,
  organizationId,
  currencyCode,
  minorUnits,
  suppliers,
  purchases,
  expenses,
  canManageSuppliers,
  canCreatePurchase,
}: {
  projectId: string;
  organizationId: string;
  currencyCode: string;
  minorUnits: Record<string, number>;
  suppliers: SupplierRow[];
  purchases: PurchaseRow[];
  expenses: PurchaseExpenseOption[];
  canManageSuppliers: boolean;
  canCreatePurchase: boolean;
}) {
  const [section, setSection] = useState<"suppliers" | "purchases">("suppliers");
  const [openSupplier, setOpenSupplier] = useState<SupplierRow | null>(null);

  const projectPurchases = useMemo(
    () => purchases.filter((p) => p.projectId === projectId),
    [purchases, projectId],
  );

  const purchaseCountBySupplier = useMemo(() => {
    const counts = new Map<string, number>();
    for (const purchase of purchases) {
      counts.set(purchase.supplierId, (counts.get(purchase.supplierId) ?? 0) + 1);
    }
    return counts;
  }, [purchases]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-full bg-slate-100 p-1 dark:bg-slate-800">
          {(
            [
              ["suppliers", `Fournisseurs${suppliers.length ? ` (${suppliers.length})` : ""}`],
              ["purchases", `Achats${projectPurchases.length ? ` (${projectPurchases.length})` : ""}`],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setSection(id)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                section === id
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-slate-50"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {section === "suppliers"
          ? canManageSuppliers && (
              <Modal triggerLabel="Fournisseur" title="Ajouter un fournisseur" variant="secondary">
                <SupplierForm organizationId={organizationId} />
              </Modal>
            )
          : canCreatePurchase && (
              <Modal triggerLabel="Achat" title="Enregistrer un achat" variant="secondary">
                <PurchaseForm
                  projectId={projectId}
                  currencyCode={currencyCode}
                  minorUnit={minorUnitOf(currencyCode, minorUnits)}
                  suppliers={suppliers}
                  expenses={expenses}
                />
              </Modal>
            )}
      </div>

      {section === "suppliers" ? (
        suppliers.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {suppliers.map((supplier) => (
              <li key={supplier.id}>
                <button
                  type="button"
                  onClick={() => setOpenSupplier(supplier)}
                  className="flex w-full flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition-colors hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
                >
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                        {supplier.name}
                      </span>
                      {supplier.status === "inactive" && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          Inactif
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">
                      {[supplier.city, supplier.countryName, supplier.specialties]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {purchaseCountBySupplier.get(supplier.id) ?? 0} achat
                    {(purchaseCountBySupplier.get(supplier.id) ?? 0) > 1 ? "s" : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            message="Aucun fournisseur pour le moment"
            action={
              canManageSuppliers && (
                <Modal triggerLabel="Ajouter mon premier fournisseur" title="Ajouter un fournisseur">
                  <SupplierForm organizationId={organizationId} />
                </Modal>
              )
            }
          />
        )
      ) : projectPurchases.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {projectPurchases.map((purchase) => (
            <li
              key={purchase.id}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {materialDisplayName(purchase.materialCode, purchase.materialName)}
                  <span className="font-normal text-slate-500 dark:text-slate-400">
                    {" "}
                    · {purchase.supplierName}
                  </span>
                </span>
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {formatMoney(
                    purchase.totalAmountMinor,
                    purchase.currencyCode,
                    minorUnitOf(purchase.currencyCode, minorUnits),
                  )}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                <span>{purchase.purchaseDate}</span>
                <span>
                  {purchase.quantity} {purchase.unit} ×{" "}
                  {formatMoney(
                    purchase.unitPriceMinor,
                    purchase.currencyCode,
                    minorUnitOf(purchase.currencyCode, minorUnits),
                  )}
                </span>
                {purchase.paymentMethodLabel && <span>{purchase.paymentMethodLabel}</span>}
                {purchase.expenseId && <span>Dépense liée</span>}
                {purchase.documentCount > 0 && (
                  <span>
                    {purchase.documentCount} justificatif{purchase.documentCount > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState message="Aucun achat enregistré pour ce chantier" />
      )}

      {openSupplier && (
        <SupplierDetailDialog
          supplier={openSupplier}
          organizationId={organizationId}
          purchases={purchases.filter((p) => p.supplierId === openSupplier.id)}
          minorUnits={minorUnits}
          canManage={canManageSuppliers}
          onClose={() => setOpenSupplier(null)}
        />
      )}
    </div>
  );
}

function EmptyState({ message, action }: { message: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-200 px-6 py-10 text-center dark:border-slate-800">
      <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>
      {action}
    </div>
  );
}

function SupplierDetailDialog({
  supplier,
  organizationId,
  purchases,
  minorUnits,
  canManage,
  onClose,
}: {
  supplier: SupplierRow;
  organizationId: string;
  purchases: PurchaseRow[];
  minorUnits: Record<string, number>;
  canManage: boolean;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const averages = useMemo(
    () =>
      recordedAveragePrices(
        purchases.map((p) => ({
          materialCode: p.materialCode,
          materialName: p.materialName,
          unit: p.unit,
          currencyCode: p.currencyCode,
          unitPriceMinor: p.unitPriceMinor,
        })),
      ),
    [purchases],
  );

  const toggleStatus = () => {
    setError(null);
    startTransition(async () => {
      const result = await updateSupplierStatus({
        supplierId: supplier.id,
        status: supplier.status === "active" ? "inactive" : "active",
      });
      if (result?.error) {
        setError(result.error);
        return;
      }
      onClose();
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4 dark:bg-black/70"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-slate-200 bg-white p-6 shadow-lg sm:rounded-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-slate-900 dark:text-slate-50">
              {supplier.name}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {[supplier.city, supplier.countryName].filter(Boolean).join(" · ")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="shrink-0 text-xl leading-none text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
          >
            ×
          </button>
        </div>

        <dl className="mt-4 flex flex-col gap-2 text-sm">
          <DetailRow label="Contact" value={supplier.contactName} />
          <DetailRow label="Téléphone" value={supplier.phone} />
          <DetailRow label="WhatsApp" value={supplier.whatsapp} />
          <DetailRow label="Email" value={supplier.email} />
          <DetailRow label="Adresse" value={supplier.address} />
          <DetailRow label="Spécialités" value={supplier.specialties} />
          <DetailRow label="Notes" value={supplier.notes} />
          <DetailRow label="Statut" value={supplier.status === "active" ? "Actif" : "Inactif"} />
        </dl>

        {averages.length > 0 && (
          <section className="mt-6">
            <h3 className="text-xs font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
              Prix moyen enregistré dans KeurFlow
            </h3>
            <ul className="mt-2 flex flex-col gap-1.5">
              {averages.map((avg) => (
                <li
                  key={`${avg.materialCode}-${avg.materialName}-${avg.unit}-${avg.currencyCode}`}
                  className="flex items-baseline justify-between gap-3 text-sm"
                >
                  <span className="text-slate-600 dark:text-slate-300">
                    {materialDisplayName(avg.materialCode, avg.materialName)}
                  </span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {formatMoney(
                      avg.averageUnitPriceMinor,
                      avg.currencyCode,
                      minorUnitOf(avg.currencyCode, minorUnits),
                    )}{" "}
                    / {avg.unit}
                    <span className="ml-1 font-normal text-xs text-slate-400">
                      ({avg.sampleCount} achats)
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-6">
          <h3 className="text-xs font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
            Historique des achats
          </h3>
          {purchases.length > 0 ? (
            <ul className="mt-2 flex flex-col gap-2">
              {purchases.map((purchase) => (
                <li key={purchase.id} className="text-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-slate-900 dark:text-slate-100">
                      {materialDisplayName(purchase.materialCode, purchase.materialName)}
                    </span>
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      {formatMoney(
                        purchase.totalAmountMinor,
                        purchase.currencyCode,
                        minorUnitOf(purchase.currencyCode, minorUnits),
                      )}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {purchase.purchaseDate} · {purchase.quantity} {purchase.unit} ·{" "}
                    {purchase.projectName}
                    {purchase.expenseId ? " · Dépense liée" : ""}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Aucun achat enregistré auprès de ce fournisseur.
            </p>
          )}
        </section>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        {canManage && (
          <div className="mt-6 flex flex-wrap gap-2">
            <Modal triggerLabel="Modifier" title="Modifier le fournisseur" variant="secondary">
              <SupplierForm organizationId={organizationId} supplier={supplier} />
            </Modal>
            <button
              type="button"
              onClick={toggleStatus}
              disabled={isPending}
              className="flex h-9 items-center justify-center rounded-full border border-slate-300 px-4 text-sm font-medium text-slate-900 transition-colors hover:border-slate-400 disabled:opacity-50 dark:border-slate-700 dark:text-slate-100"
            >
              {supplier.status === "active" ? "Désactiver" : "Réactiver"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex flex-wrap justify-between gap-2">
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="text-right text-slate-900 dark:text-slate-100">{value}</dd>
    </div>
  );
}
