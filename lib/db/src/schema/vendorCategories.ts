import { mysqlTable, serial, varchar, text, timestamp } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const vendorCategoriesTable = mysqlTable("vendor_categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertVendorCategorySchema = createInsertSchema(vendorCategoriesTable).omit({ id: true, createdAt: true });
export type InsertVendorCategory = z.infer<typeof insertVendorCategorySchema>;
export type VendorCategory = typeof vendorCategoriesTable.$inferSelect;
