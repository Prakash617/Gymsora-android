/**
 * Flow A offline rotating QR pass generator.
 *
 * Produces payloads byte-for-byte identical to Django's
 * `memberapp/qr_utils.py::generate_qr_payload`:
 *
 *   GS1:<tenant_slug>:<member_id>:<window>:<sig16>
 *
 * Runs 100% offline using pure-TypeScript HMAC-SHA256 (@noble/hashes).
 */
import { hmac } from "@noble/hashes/hmac.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";

export const QR_PREFIX = "GS1";
export const QR_STEP_SECONDS = 30;

export interface RotatingQrPass {
  payload: string;
  window: number;
  secondsRemaining: number;
  progress: number; // 0..1 remaining fraction
}

export function currentTimeWindow(unixSeconds: number): number {
  return Math.floor(unixSeconds / QR_STEP_SECONDS);
}

export function computeQrSignature(
  tenantSlug: string,
  memberId: number,
  window: number,
  qrSecret: string,
): string {
  const message = `${tenantSlug}:${memberId}:${window}`;
  const mac = hmac(sha256, utf8ToBytes(qrSecret), utf8ToBytes(message));
  return bytesToHex(mac).slice(0, 16);
}

export function generateQrPayload(
  tenantSlug: string,
  memberId: number,
  qrSecret: string,
  unixSeconds?: number,
): string {
  const nowSec =
    typeof unixSeconds === "number" ? Math.floor(unixSeconds) : Math.floor(Date.now() / 1000);
  const window = currentTimeWindow(nowSec);
  const sig = computeQrSignature(tenantSlug, memberId, window, qrSecret);
  return `${QR_PREFIX}:${tenantSlug}:${memberId}:${window}:${sig}`;
}

export function buildRotatingQrPass(params: {
  tenantSlug: string;
  memberId: number;
  qrSecret: string;
  clockOffsetSeconds: number;
  nowMs?: number;
}): RotatingQrPass {
  const nowSec = Math.floor((params.nowMs ?? Date.now()) / 1000) + Math.round(params.clockOffsetSeconds);
  const window = currentTimeWindow(nowSec);
  const elapsed = ((nowSec % QR_STEP_SECONDS) + QR_STEP_SECONDS) % QR_STEP_SECONDS;
  const secondsRemaining = QR_STEP_SECONDS - elapsed;
  const payload = generateQrPayload(
    params.tenantSlug,
    params.memberId,
    params.qrSecret,
    nowSec,
  );
  return {
    payload,
    window,
    secondsRemaining,
    progress: secondsRemaining / QR_STEP_SECONDS,
  };
}
