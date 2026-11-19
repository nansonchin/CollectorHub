import { marketErrorResponse } from "@/src/features/market/market.http";
import { createListingSchema } from "@/src/features/market/market.schema";
import { createListing } from "@/src/features/market/market.service";
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
  const parsed = createListingSchema.safeParse(body);
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
  try{
    const listing = await createListing(session.user.id,parsed.data)
    return NextResponse.json(listing, { status: 201 });

  }catch (error) {
    return marketErrorResponse(error);
  }
}
