import { createPaymentSchema } from "@/src/features/payments/payments.schema";
import { createPayment, PaymentError } from "@/src/features/payments/payments.service";
import { getSession } from "@/src/lib/session";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const parsed = createPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "INVALID_BODY",
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  try {
    const { payment, replayed, balance } = await createPayment(
      session.user.id,
      parsed.data,
    );

    return NextResponse.json(
      {
        payment: {
          id: payment.id,
          status: payment.status,
          transactionId: payment.providerTransactionId,
          gold: payment.gold,
          amountCents: payment.amountCents,
          failureReason: payment.failureReason,
        },
        balance,
      },
      { headers: replayed ? { "Idempotent-Replayed": "true" } : undefined },
    );
  } catch (error) {
    if (error instanceof PaymentError) {
      return NextResponse.json({ error: error.code }, { status: 409 });
    }
    console.error("POST /api/payments failed:", error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}