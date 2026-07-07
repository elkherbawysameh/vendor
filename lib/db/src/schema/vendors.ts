import { pgTable, serial, text, timestamp, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const vendorsTable = pgTable("vendors", {
  id: serial("id").primaryKey(),
  companyName: text("company_name").notNull(),
  contactPerson: text("contact_person"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  bankName: text("bank_name"),
  bankAccountName: text("bank_account_name"),
  bankAccountNumber: text("bank_account_number"),
  iban: text("iban"),
  swiftCode: text("swift_code"),
  bankBranch: text("bank_branch"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const vendorCategoryLinksTable = pgTable("vendor_category_links", {
  id: serial("id").primaryKey(),
  vendorId: integer("vendor_id").notNull(),
  categoryId: integer("category_id").notNull(),
});

export const vendorDocumentsTable = pgTable("vendor_documents", {
  id: serial("id").primaryKey(),
  vendorId: integer("vendor_id").notNull(),
  documentType: text("document_type").notNull(),
  documentNumber: text("document_number"),
  expiryDate: text("expiry_date"),
  fileUrl: text("file_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const vendorTransactionsTable = pgTable("vendor_transactions", {
  id: serial("id").primaryKey(),
  vendorId: integer("vendor_id").notNull(),
  purchaseRequestId: integer("purchase_request_id").notNull(),
  amount: real("amount").notNull(),
  quantity: integer("quantity").notNull(),
  executedAt: timestamp("executed_at").defaultNow().notNull(),
  executedBy: text("executed_by").notNull(),
  notes: text("notes"),
});

export const insertVendorSchema = createInsertSchema(vendorsTable).omit({ id: true, createdAt: true });
export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type Vendor = typeof vendorsTable.$inferSelect;

export const insertVendorDocumentSchema = createInsertSchema(vendorDocumentsTable).omit({ id: true, createdAt: true });
export type InsertVendorDocument = z.infer<typeof insertVendorDocumentSchema>;
export type VendorDocument = typeof vendorDocumentsTable.$inferSelect;
