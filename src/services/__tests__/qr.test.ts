import { buildRotatingQrPass, generateQrPayload } from "../qr";

function expectEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label} failed!\nExpected: ${String(expected)}\nActual:   ${String(actual)}`);
  }
}

function expectNotEqual<T>(actual: T, unexpected: T, label: string) {
  if (actual === unexpected) {
    throw new Error(`${label} failed! Expected value to differ from ${String(unexpected)}`);
  }
}

// Must match Django `memberapp/tests/test_qr_attendance.py` byte-for-byte!
const EXPECTED_PYTHON_VECTOR = "GS1:iron-gym:42:58793000:f9075fd4e7e3254c";
const SECRET = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

const payload = generateQrPayload("iron-gym", 42, SECRET, 1763790000);
expectEqual(payload, EXPECTED_PYTHON_VECTOR, "Cross-language Python/TS QR vector");

// Verify clock offset adjustment and countdown math
const pass = buildRotatingQrPass({
  tenantSlug: "iron-gym",
  memberId: 42,
  qrSecret: SECRET,
  clockOffsetSeconds: 10,
  nowMs: (1763790000 - 10) * 1000,
});
expectEqual(pass.payload, EXPECTED_PYTHON_VECTOR, "Clock-offset adjusted QR payload");
expectEqual(pass.window, 58793000, "Window calculation");
expectEqual(pass.secondsRemaining, 30, "Seconds remaining at window start");
expectEqual(pass.progress, 1, "Progress fraction at window start");

const midWindow = buildRotatingQrPass({
  tenantSlug: "iron-gym",
  memberId: 42,
  qrSecret: SECRET,
  clockOffsetSeconds: 0,
  nowMs: (1763790000 + 18) * 1000,
});
expectEqual(midWindow.payload, EXPECTED_PYTHON_VECTOR, "Mid-window payload stays stable");
expectEqual(midWindow.secondsRemaining, 12, "Mid-window countdown");

// 30 seconds later -> new window & new signature
const nextWindow = buildRotatingQrPass({
  tenantSlug: "iron-gym",
  memberId: 42,
  qrSecret: SECRET,
  clockOffsetSeconds: 0,
  nowMs: (1763790000 + 30) * 1000,
});
expectEqual(nextWindow.window, 58793001, "Next window increments");
expectNotEqual(nextWindow.payload, EXPECTED_PYTHON_VECTOR, "Next window changes signature");

console.info("QR cross-language parity & rotation tests passed!");
