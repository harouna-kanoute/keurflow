import { describe, expect, it } from "vitest";
import { createSupplierSchema, updateSupplierSchema } from "./supplier";

describe("createSupplierSchema", () => {
  const base = {
    organizationId: "50450d0e-1ae3-46cc-a46e-b29ea758757d",
    name: "ABC Matériaux",
    countryCode: "SN",
  };

  it("accepts a supplier with only the required fields", () => {
    expect(createSupplierSchema.safeParse(base).success).toBe(true);
  });

  it("requires a name and a country", () => {
    expect(createSupplierSchema.safeParse({ ...base, name: "A" }).success).toBe(false);
    expect(createSupplierSchema.safeParse({ ...base, countryCode: "ZZ" }).success).toBe(false);
  });

  it("rejects a malformed email", () => {
    expect(createSupplierSchema.safeParse({ ...base, email: "pas-un-email" }).success).toBe(false);
  });

  it("normalizes email casing", () => {
    const result = createSupplierSchema.safeParse({ ...base, email: "Contact@ABC.SN" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("contact@abc.sn");
  });

  it("rejects a phone number that isn't international format", () => {
    expect(createSupplierSchema.safeParse({ ...base, phone: "77 123 45 67" }).success).toBe(false);
    expect(createSupplierSchema.safeParse({ ...base, phone: "+221771234567" }).success).toBe(true);
  });

  it("treats an untouched optional field as absent, not as an empty value", () => {
    const result = createSupplierSchema.safeParse({ ...base, phone: "", email: "", city: "" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBeUndefined();
      expect(result.data.email).toBeUndefined();
      expect(result.data.city).toBeUndefined();
    }
  });
});

describe("updateSupplierSchema", () => {
  it("carries the status so a supplier can be deactivated", () => {
    const result = updateSupplierSchema.safeParse({
      supplierId: "50450d0e-1ae3-46cc-a46e-b29ea758757d",
      name: "ABC Matériaux",
      countryCode: "SN",
      status: "inactive",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown status", () => {
    expect(
      updateSupplierSchema.safeParse({
        supplierId: "50450d0e-1ae3-46cc-a46e-b29ea758757d",
        name: "ABC Matériaux",
        countryCode: "SN",
        status: "archived",
      }).success,
    ).toBe(false);
  });
});
