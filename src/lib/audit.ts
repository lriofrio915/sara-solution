/**
 * Audit log helper — LOPDP compliance
 * Writes to the AuditLog Prisma model. Never throws; audit must not break main flow.
 */

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

// ── Types ─────────────────────────────────────────────────────────────────────

export type AuditAction = 'READ' | 'CREATE' | 'UPDATE' | 'DELETE'

interface AuditLogParams {
  userId: string
  patientId?: string
  resource: string
  action: AuditAction
  metadata?: Record<string, unknown>
}

// ── Core function ─────────────────────────────────────────────────────────────

export async function auditLog(params: AuditLogParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        patientId: params.patientId ?? null,
        resource: params.resource,
        action: params.action,
        metadata: (params.metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      },
    })
  } catch (err) {
    // Intentionally swallowed — audit failures must never interrupt main flow
    console.error('auditLog error:', err)
  }
}

// ── Convenience wrapper ───────────────────────────────────────────────────────

export function auditPatientChart(
  userId: string,
  patientId: string,
  action: AuditAction,
  metadata?: Record<string, unknown>,
): Promise<void> {
  return auditLog({ userId, patientId, resource: 'PatientChart', action, metadata })
}
