import { prisma } from "../config/prisma";
import { AuditAction } from "@prisma/client";

// Central place to write audit log entries so every module logs the same
// shape. Covers the spec's example (price changes) plus the additional
// sensitive actions identified during spec review: admin role changes,
// admin deletion/deactivation, failed admin logins, and manual payment
// status overrides.
export async function writeAuditLog(params: {
  adminId: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  description: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}) {
  await prisma.auditLog.create({
    data: {
      adminId: params.adminId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      description: params.description,
      metadata: params.metadata as any,
      ipAddress: params.ipAddress,
    },
  });
}
