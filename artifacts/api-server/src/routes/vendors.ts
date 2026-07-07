import { Router } from "express";
import { db } from "@workspace/db";
import {
  vendorsTable,
  vendorCategoryLinksTable,
  vendorDocumentsTable,
  vendorTransactionsTable,
  vendorCategoriesTable,
} from "@workspace/db";
import { eq, inArray, ilike, sql, and } from "drizzle-orm";
import {
  CreateVendorBody,
  UpdateVendorBody,
  UpdateVendorParams,
  GetVendorParams,
  DeleteVendorParams,
  ImportVendorsBody,
  CreateVendorDocumentBody,
  CreateVendorDocumentParams,
  UpdateVendorDocumentBody,
  UpdateVendorDocumentParams,
  DeleteVendorDocumentParams,
  ListVendorDocumentsParams,
} from "@workspace/api-zod";

const router = Router();

async function enrichVendor(vendor: typeof vendorsTable.$inferSelect) {
  const links = await db
    .select({ categoryId: vendorCategoryLinksTable.categoryId })
    .from(vendorCategoryLinksTable)
    .where(eq(vendorCategoryLinksTable.vendorId, vendor.id));
  const categoryIds = links.map((l) => l.categoryId);
  let categories: typeof vendorCategoriesTable.$inferSelect[] = [];
  if (categoryIds.length > 0) {
    categories = await db
      .select()
      .from(vendorCategoriesTable)
      .where(inArray(vendorCategoriesTable.id, categoryIds));
  }
  const documents = await db
    .select()
    .from(vendorDocumentsTable)
    .where(eq(vendorDocumentsTable.vendorId, vendor.id));
  const txResult = await db
    .select({
      totalSpent: sql<number>`coalesce(sum(${vendorTransactionsTable.amount}), 0)`,
      transactionCount: sql<number>`count(*)`,
    })
    .from(vendorTransactionsTable)
    .where(eq(vendorTransactionsTable.vendorId, vendor.id));
  return {
    ...vendor,
    categoryIds,
    categories,
    documents,
    totalSpent: txResult[0]?.totalSpent ?? 0,
    transactionCount: Number(txResult[0]?.transactionCount ?? 0),
  };
}

// GET /vendors
router.get("/vendors", async (req, res) => {
  const { categoryId, search } = req.query as { categoryId?: string; search?: string };
  let vendorIds: number[] | null = null;
  if (categoryId) {
    const links = await db
      .select({ vendorId: vendorCategoryLinksTable.vendorId })
      .from(vendorCategoryLinksTable)
      .where(eq(vendorCategoryLinksTable.categoryId, Number(categoryId)));
    vendorIds = links.map((l) => l.vendorId);
    if (vendorIds.length === 0) return res.json([]);
  }
  let vendors: typeof vendorsTable.$inferSelect[];
  if (vendorIds && search) {
    vendors = await db
      .select()
      .from(vendorsTable)
      .where(and(inArray(vendorsTable.id, vendorIds), ilike(vendorsTable.companyName, `%${search}%`)))
      .orderBy(vendorsTable.companyName);
  } else if (vendorIds) {
    vendors = await db
      .select()
      .from(vendorsTable)
      .where(inArray(vendorsTable.id, vendorIds))
      .orderBy(vendorsTable.companyName);
  } else if (search) {
    vendors = await db
      .select()
      .from(vendorsTable)
      .where(ilike(vendorsTable.companyName, `%${search}%`))
      .orderBy(vendorsTable.companyName);
  } else {
    vendors = await db.select().from(vendorsTable).orderBy(vendorsTable.companyName);
  }
  const enriched = await Promise.all(vendors.map(enrichVendor));
  return res.json(enriched);
});

// GET /vendors/summary
router.get("/vendors/summary", async (req, res) => {
  const totalVendors = await db.select({ count: sql<number>`count(*)` }).from(vendorsTable);
  const spendingResult = await db
    .select({ totalSpent: sql<number>`coalesce(sum(${vendorTransactionsTable.amount}), 0)` })
    .from(vendorTransactionsTable);
  const activeResult = await db
    .select({ count: sql<number>`count(distinct ${vendorTransactionsTable.vendorId})` })
    .from(vendorTransactionsTable);
  const today = new Date().toISOString().split("T")[0];
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const expiringResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(vendorDocumentsTable)
    .where(
      and(
        sql`${vendorDocumentsTable.expiryDate} is not null`,
        sql`${vendorDocumentsTable.expiryDate} >= ${today}`,
        sql`${vendorDocumentsTable.expiryDate} <= ${thirtyDaysFromNow}`
      )
    );
  return res.json({
    totalVendors: Number(totalVendors[0]?.count ?? 0),
    totalSpent: Number(spendingResult[0]?.totalSpent ?? 0),
    activeVendors: Number(activeResult[0]?.count ?? 0),
    expiringDocumentsCount: Number(expiringResult[0]?.count ?? 0),
  });
});

// GET /vendors/export
router.get("/vendors/export", async (req, res) => {
  const vendors = await db.select().from(vendorsTable).orderBy(vendorsTable.companyName);
  const headers = ["id", "companyName", "contactPerson", "contactEmail", "contactPhone", "bankName", "iban", "createdAt"];
  const rows = vendors.map((v) =>
    [v.id, v.companyName, v.contactPerson ?? "", v.contactEmail ?? "", v.contactPhone ?? "", v.bankName ?? "", v.iban ?? "", v.createdAt].join(",")
  );
  const csv = [headers.join(","), ...rows].join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=vendors.csv");
  return res.send(csv);
});

// POST /vendors/import
router.post("/vendors/import", async (req, res) => {
  const parsed = ImportVendorsBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const lines = parsed.data.csvData.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return res.json({ imported: 0, errors: [] });
  const errors: string[] = [];
  let imported = 0;
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    const name = cols[1]?.trim();
    if (!name) { errors.push(`Row ${i}: missing company name`); continue; }
    try {
      await db.insert(vendorsTable).values({
        companyName: name,
        contactPerson: cols[2]?.trim() || undefined,
        contactEmail: cols[3]?.trim() || undefined,
        contactPhone: cols[4]?.trim() || undefined,
        bankName: cols[5]?.trim() || undefined,
        iban: cols[6]?.trim() || undefined,
      });
      imported++;
    } catch (e) {
      errors.push(`Row ${i}: failed to import ${name}`);
    }
  }
  return res.json({ imported, errors });
});

// GET /vendors/expiring-documents
router.get("/vendors/expiring-documents", async (req, res) => {
  const today = new Date().toISOString().split("T")[0];
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const docs = await db
    .select({
      docId: vendorDocumentsTable.id,
      vendorId: vendorDocumentsTable.vendorId,
      documentType: vendorDocumentsTable.documentType,
      expiryDate: vendorDocumentsTable.expiryDate,
      companyName: vendorsTable.companyName,
    })
    .from(vendorDocumentsTable)
    .innerJoin(vendorsTable, eq(vendorDocumentsTable.vendorId, vendorsTable.id))
    .where(
      and(
        sql`${vendorDocumentsTable.expiryDate} is not null`,
        sql`${vendorDocumentsTable.expiryDate} >= ${today}`,
        sql`${vendorDocumentsTable.expiryDate} <= ${thirtyDaysFromNow}`
      )
    );
  const result = docs.map((d) => {
    const expiry = new Date(d.expiryDate!);
    const daysUntilExpiry = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return {
      vendorId: d.vendorId,
      vendorName: d.companyName,
      documentType: d.documentType,
      expiryDate: d.expiryDate!,
      daysUntilExpiry,
    };
  });
  return res.json(result);
});

// GET /vendors/:id
router.get("/vendors/:id", async (req, res) => {
  const params = GetVendorParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) return res.status(400).json({ error: "Invalid id" });
  const [vendor] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, params.data.id));
  if (!vendor) return res.status(404).json({ error: "Vendor not found" });
  return res.json(await enrichVendor(vendor));
});

// POST /vendors
router.post("/vendors", async (req, res) => {
  const parsed = CreateVendorBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const { categoryIds, ...vendorData } = parsed.data as any;
  const [vendor] = await db.insert(vendorsTable).values(vendorData).returning();
  if (categoryIds?.length) {
    await db.insert(vendorCategoryLinksTable).values(
      (categoryIds as number[]).map((cid: number) => ({ vendorId: vendor.id, categoryId: cid }))
    );
  }
  return res.status(201).json(await enrichVendor(vendor));
});

// PUT /vendors/:id
router.put("/vendors/:id", async (req, res) => {
  const params = UpdateVendorParams.safeParse({ id: Number(req.params.id) });
  const body = UpdateVendorBody.safeParse(req.body);
  if (!params.success || !body.success) return res.status(400).json({ error: "Invalid input" });
  const { categoryIds, ...vendorData } = body.data as any;
  const [updated] = await db
    .update(vendorsTable)
    .set(vendorData)
    .where(eq(vendorsTable.id, params.data.id))
    .returning();
  if (!updated) return res.status(404).json({ error: "Vendor not found" });
  if (categoryIds !== undefined) {
    await db.delete(vendorCategoryLinksTable).where(eq(vendorCategoryLinksTable.vendorId, params.data.id));
    if ((categoryIds as number[]).length > 0) {
      await db.insert(vendorCategoryLinksTable).values(
        (categoryIds as number[]).map((cid: number) => ({ vendorId: params.data.id, categoryId: cid }))
      );
    }
  }
  return res.json(await enrichVendor(updated));
});

// DELETE /vendors/:id
router.delete("/vendors/:id", async (req, res) => {
  const params = DeleteVendorParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) return res.status(400).json({ error: "Invalid id" });
  await db.delete(vendorCategoryLinksTable).where(eq(vendorCategoryLinksTable.vendorId, params.data.id));
  await db.delete(vendorDocumentsTable).where(eq(vendorDocumentsTable.vendorId, params.data.id));
  await db.delete(vendorsTable).where(eq(vendorsTable.id, params.data.id));
  return res.status(204).send();
});

// GET /vendors/:vendorId/documents
router.get("/vendors/:vendorId/documents", async (req, res) => {
  const params = ListVendorDocumentsParams.safeParse({ vendorId: Number(req.params.vendorId) });
  if (!params.success) return res.status(400).json({ error: "Invalid vendorId" });
  const docs = await db
    .select()
    .from(vendorDocumentsTable)
    .where(eq(vendorDocumentsTable.vendorId, params.data.vendorId))
    .orderBy(vendorDocumentsTable.documentType);
  return res.json(docs);
});

// POST /vendors/:vendorId/documents
router.post("/vendors/:vendorId/documents", async (req, res) => {
  const params = CreateVendorDocumentParams.safeParse({ vendorId: Number(req.params.vendorId) });
  const body = CreateVendorDocumentBody.safeParse(req.body);
  if (!params.success || !body.success) return res.status(400).json({ error: "Invalid input" });
  const docData = {
    vendorId: params.data.vendorId,
    documentType: body.data.documentType,
    documentNumber: body.data.documentNumber ?? undefined,
    expiryDate: body.data.expiryDate ? String(body.data.expiryDate) : undefined,
    fileUrl: body.data.fileUrl ?? undefined,
    notes: body.data.notes ?? undefined,
  };
  const [doc] = await db
    .insert(vendorDocumentsTable)
    .values(docData)
    .returning();
  return res.status(201).json(doc);
});

// PUT /vendors/:vendorId/documents/:docId
router.put("/vendors/:vendorId/documents/:docId", async (req, res) => {
  const params = UpdateVendorDocumentParams.safeParse({
    vendorId: Number(req.params.vendorId),
    docId: Number(req.params.docId),
  });
  const body = UpdateVendorDocumentBody.safeParse(req.body);
  if (!params.success || !body.success) return res.status(400).json({ error: "Invalid input" });
  const updateData = {
    documentType: body.data.documentType ?? undefined,
    documentNumber: body.data.documentNumber ?? undefined,
    expiryDate: body.data.expiryDate ? String(body.data.expiryDate) : undefined,
    fileUrl: body.data.fileUrl ?? undefined,
    notes: body.data.notes ?? undefined,
  };
  const [updated] = await db
    .update(vendorDocumentsTable)
    .set(updateData)
    .where(eq(vendorDocumentsTable.id, params.data.docId))
    .returning();
  if (!updated) return res.status(404).json({ error: "Document not found" });
  return res.json(updated);
});

// DELETE /vendors/:vendorId/documents/:docId
router.delete("/vendors/:vendorId/documents/:docId", async (req, res) => {
  const params = DeleteVendorDocumentParams.safeParse({
    vendorId: Number(req.params.vendorId),
    docId: Number(req.params.docId),
  });
  if (!params.success) return res.status(400).json({ error: "Invalid params" });
  await db.delete(vendorDocumentsTable).where(eq(vendorDocumentsTable.id, params.data.docId));
  return res.status(204).send();
});

export default router;
