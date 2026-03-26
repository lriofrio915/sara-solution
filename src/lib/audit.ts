/**
 * Audit log helper — LOPDP compliance (Art. 30 LOPDP, ACESS-2023-0030)
 * Writes to the AuditLog Prisma model. Never throws; audit must not break main flow.
 *
 * NOTE: Apply RLS in Supabase to make this table append-only:
 *   ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
 *   CREATE POLICY audit_insert_only ON "AuditLog" FOR INSERT WITH CHECK (true);
 *   -- No UPDATE/DELETE policies = no one can modify or delete rows
 */

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

// ── Types ─────────────────────────────────────────────────────────────────────

export type AuditAction = 'READ' | 'CREATE' | 'UPDATE' | 'DELETE'

interface AuditLogParams {
  userId: string
  patientId?: string
  resource: string
  action: AuditAction
  metadata?: Record<string, unknown>
}

// ── IP helper ─────────────────────────────────────────────────────────────────

export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
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

// ── Convenience wrappers ──────────────────────────────────────────────────────

export function auditPatientChart(
  userId: string,
  patientId: string,
  action: AuditAction,
  metadata?: Record<string, unknown>,
): Promise<void> {
  return auditLog({ userId, patientId, resource: 'PatientChart', action, metadata })
}

export function auditPrescription(
  userId: string,
  patientId: string,
  action: AuditAction,
  metadata?: Record<string, unknown>,
): Promise<void> {
  return auditLog({ userId, patientId, resource: 'Prescription', action, metadata })
}

export function auditAttention(
  userId: string,
  patientId: string,
  action: AuditAction,
  metadata?: Record<string, unknown>,
): Promise<void> {
  return auditLog({ userId, patientId, resource: 'Attention', action, metadata })
}

export function auditExamOrder(
  userId: string,
  patientId: string,
  action: AuditAction,
  metadata?: Record<string, unknown>,
): Promise<void> {
  return auditLog({ userId, patientId, resource: 'ExamOrder', action, metadata })
}

export function auditCertificate(
  userId: string,
  patientId: string,
  action: AuditAction,
  metadata?: Record<string, unknown>,
): Promise<void> {
  return auditLog({ userId, patientId, resource: 'MedicalCertificate', action, metadata })
}

export function auditPatient(
  userId: string,
  patientId: string,
  action: AuditAction,
  metadata?: Record<string, unknown>,
): Promise<void> {
  return auditLog({ userId, patientId, resource: 'Patient', action, metadata })
}

export function auditDiagnosis(
  userId: string,
  patientId: string,
  action: AuditAction,
  metadata?: Record<string, unknown>,
): Promise<void> {
  return auditLog({ userId, patientId, resource: 'Diagnosis', action, metadata })
}

export function auditConsent(
  userId: string,
  patientId: string,
  action: AuditAction,
  metadata?: Record<string, unknown>,
): Promise<void> {
  return auditLog({ userId, patientId, resource: 'ConsentRecord', action, metadata })
}
