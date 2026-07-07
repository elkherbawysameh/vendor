import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const vendorCategoriesTable = pgTable("vendor_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertVendorCategorySchema = createInsertSchema(vendorCategoriesTable).omit({ id: true, createdAt: true });
export type InsertVendorCategory = z.infer<typeof insertVendorCategorySchema>;
export type VendorCategory = typeof vendorCategoriesTable.$inferSelect;
