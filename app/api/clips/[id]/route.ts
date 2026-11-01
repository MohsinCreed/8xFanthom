import { z } from "zod";
import { getAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Id = z.string().uuid();

const json = (status: number, error: string, message: string) =>
  Response.json({ error, message }, { status });

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Id.safeParse((await params).id);
  if (!id.success) return json(400, "bad_request", "Invalid clip id.");

  try {
    const db = getAdminClient();
    const existing = await db.from("clips").select("id").eq("id", id.data).maybeSingle();
    if (existing.error) throw new Error(`load clip: ${existing.error.message}`);
    if (!existing.data) return json(404, "not_found", "Clip not found.");

    const deleted = await db.from("clips").delete().eq("id", id.data);
    if (deleted.error) throw new Error(`delete clip: ${deleted.error.message}`);
    return Response.json({ ok: true });
  } catch (e) {
    console.error("[api/clips]", e);
    return json(500, "internal", "Something went wrong.");
  }
}
