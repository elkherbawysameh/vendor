import { Router } from "express";
import { db } from "@workspace/db";
import { vendorCategoriesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateVendorCategoryBody,
  UpdateVendorCategoryBody,
  UpdateVendorCategoryParams,
  GetVendorCategoryParams,
  DeleteVendorCategoryParams,
} from "@workspace/api-zod";

const router = Router();

// GET /vendor-categories
router.get("/vendor-categories", async (req, res) => {
  const categories = await db.select().from(vendorCategoriesTable).orderBy(vendorCategoriesTable.name);
  return res.json(categories);
});

// POST /vendor-categories
router.post("/vendor-categories", async (req, res) => {
  const parsed = CreateVendorCategoryBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const [result] = await db.insert(vendorCategoriesTable).values(parsed.data);
  const [category] = await db
    .select()
    .from(vendorCategoriesTable)
    .where(eq(vendorCategoriesTable.id, result.insertId));
  return res.status(201).json(category);
});

// GET /vendor-categories/:id
router.get("/vendor-categories/:id", async (req, res) => {
  const params = GetVendorCategoryParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) return res.status(400).json({ error: "Invalid id" });
  const [category] = await db.select().from(vendorCategoriesTable).where(eq(vendorCategoriesTable.id, params.data.id));
  if (!category) return res.status(404).json({ error: "Category not found" });
  return res.json(category);
});

// PUT /vendor-categories/:id
router.put("/vendor-categories/:id", async (req, res) => {
  const params = UpdateVendorCategoryParams.safeParse({ id: Number(req.params.id) });
  const body = UpdateVendorCategoryBody.safeParse(req.body);
  if (!params.success || !body.success) return res.status(400).json({ error: "Invalid input" });
  const [existing] = await db.select().from(vendorCategoriesTable).where(eq(vendorCategoriesTable.id, params.data.id));
  if (!existing) return res.status(404).json({ error: "Category not found" });
  await db.update(vendorCategoriesTable).set(body.data).where(eq(vendorCategoriesTable.id, params.data.id));
  const [updated] = await db.select().from(vendorCategoriesTable).where(eq(vendorCategoriesTable.id, params.data.id));
  return res.json(updated);
});

// DELETE /vendor-categories/:id
router.delete("/vendor-categories/:id", async (req, res) => {
  const params = DeleteVendorCategoryParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) return res.status(400).json({ error: "Invalid id" });
  await db.delete(vendorCategoriesTable).where(eq(vendorCategoriesTable.id, params.data.id));
  return res.status(204).send();
});

export default router;
