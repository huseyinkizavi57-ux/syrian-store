import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../utils/asyncHandler";
import { validate } from "../../middleware/validate";
import { requireAdmin } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";
import { writeAuditLog } from "../../utils/audit";
import * as service from "./products.service";
import { createProductSchema, listProductsQuerySchema } from "./products.schema";

const router = Router();

router.get("/", validate(listProductsQuerySchema), asyncHandler(async (req, res) => {
  const result = await service.listProducts(req.query as any);
  res.json({ data: result.items, meta: { total: result.total, page: result.page, pageSize: result.pageSize } });
}));

router.get("/:slug", asyncHandler(async (req, res) => {
  const product = await service.getProductBySlug(req.params.slug);
  res.json({ data: product });
}));

router.post(
  "/",
  requireAdmin,
  requirePermission("products:write"),
  validate(createProductSchema),
  asyncHandler(async (req, res) => {
    const product = await service.createProduct(req.body, req.admin!.id);
    await writeAuditLog({ adminId: req.admin!.id, action: "CREATE", entityType: "Product", entityId: product.id, description: `تم إنشاء منتج: ${product.name}` });
    res.status(201).json({ data: product });
  })
);

router.patch(
  "/:id",
  requireAdmin,
  requirePermission("products:write"),
  asyncHandler(async (req, res) => {
    const { price, ...rest } = req.body;
    let product;
    if (price !== undefined) {
      product = await service.updateProductPrice(req.params.id, price, req.admin!.id);
    }
    if (Object.keys(rest).length > 0) {
      product = await service.updateProduct(req.params.id, rest);
    }
    await writeAuditLog({ adminId: req.admin!.id, action: "UPDATE", entityType: "Product", entityId: req.params.id, description: `تم تعديل منتج`, metadata: { changes: req.body } });
    res.json({ data: product });
  })
);

router.post(
  "/:id/status",
  requireAdmin,
  requirePermission("products:write"),
  validate(z.object({ body: z.object({ status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]) }), query: z.object({}).optional(), params: z.object({}).optional() })),
  asyncHandler(async (req, res) => {
    const product = await service.setProductStatus(req.params.id, req.body.status);
    await writeAuditLog({ adminId: req.admin!.id, action: "STATUS_CHANGE", entityType: "Product", entityId: product.id, description: `تغيرت حالة المنتج إلى ${req.body.status}` });
    res.json({ data: product });
  })
);

router.delete(
  "/:id",
  requireAdmin,
  requirePermission("products:write"),
  asyncHandler(async (req, res) => {
    await service.deleteProduct(req.params.id);
    await writeAuditLog({ adminId: req.admin!.id, action: "DELETE", entityType: "Product", entityId: req.params.id, description: `تم حذف/أرشفة منتج` });
    res.status(204).send();
  })
);

export default router;
