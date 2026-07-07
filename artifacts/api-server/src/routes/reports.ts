import { Router } from "express";
import { db } from "@workspace/db";
import { purchaseRequestsTable, vendorsTable } from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";

const router = Router();

// GET /reports/purchase-requests
router.get("/reports/purchase-requests", async (req, res) => {
  const { vendorId, month, type = "detailed" } = req.query as {
    vendorId?: string;
    month?: string;
    type?: string;
  };

  let rows = await db
    .select()
    .from(purchaseRequestsTable)
    .orderBy(sql`${purchaseRequestsTable.createdAt} desc`);

  if (vendorId) {
    rows = rows.filter((r) => r.vendorId === Number(vendorId));
  }

  if (month) {
    rows = rows.filter((r) => {
      const d = new Date(r.createdAt);
      const rowMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return rowMonth === month;
    });
  }

  const totalAmount = rows.reduce((sum, r) => sum + (r.finalAmount ?? r.estimatedAmount ?? 0), 0);

  // For summary type, collapse by vendor
  let reportRows: any[] = rows;
  if (type === "summary") {
    const vendorMap = new Map<number, any>();
    for (const r of rows) {
      if (!vendorMap.has(r.vendorId)) {
        vendorMap.set(r.vendorId, { ...r, vendor: null, _count: 1 });
      } else {
        const existing = vendorMap.get(r.vendorId);
        existing.finalAmount = (existing.finalAmount ?? 0) + (r.finalAmount ?? 0);
        existing._count += 1;
      }
    }
    reportRows = Array.from(vendorMap.values());
  }

  return res.json({
    requests: reportRows.map((r) => ({ ...r, vendor: null })),
    totalAmount,
    generatedAt: new Date().toISOString(),
    filters: {
      vendorId: vendorId ? Number(vendorId) : null,
      month: month ?? null,
      type,
    },
  });
});

export default router;
