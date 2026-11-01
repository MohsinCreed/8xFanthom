import { z } from "zod";
import { getAdminClient } from "@/lib/supabase/admin";
import type { ActionItem } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Id = z.string().uuid();

const Body = z
  .object({
    completed: z.boolean().optional(),
    assignee_id: z.string().uuid().nullable().optional(),
    priority: z.enum(["low", "medium", "high"]).optional(),
  })
  .strict()
  .refine((b) => Object.keys(b).length > 0, { message: "Empty patch" });

const json = (status: number, error: string, message: string) =>
  Response.json({ error, message }, { status });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Id.safeParse((await params).id);
  if (!id.success) return json(400, "bad_request", "Invalid action item id.");
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json(400, "bad_request", "Invalid request body.");
  const patch = parsed.data;

  try {
    const db = getAdminClient();
    const existing = await db.from("action_items").select("id, meeting_id").eq("id", id.data).maybeSingle();
    if (existing.error) throw new Error(`load item: ${existing.error.message}`);
    if (!existing.data) return json(404, "not_found", "Action item not found.");

    if (patch.assignee_id) {
      const person = await db
        .from("participants")
        .select("id")
        .eq("id", patch.assignee_id)
        .eq("meeting_id", existing.data.meeting_id)
        .maybeSingle();
      if (person.error) throw new Error(`check assignee: ${person.error.message}`);
      if (!person.data) return json(400, "bad_request", "Assignee is not in this meeting.");
    }

    const updated = await db
      .from("action_items")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id.data)
      .select("*")
      .single();
    if (updated.error) throw new Error(`update item: ${updated.error.message}`);

    const row = updated.data as ActionItem;
    // source_time is NUMERIC, which PostgREST returns as a string for some values.
    const item: ActionItem = {
      ...row,
      source_time: row.source_time === null ? null : Number(row.source_time),
    };
    return Response.json({ item });
  } catch (e) {
    console.error("[api/action-items]", e);
    return json(500, "internal", "Something went wrong.");
  }
}
