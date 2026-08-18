import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, AuditAction } from "@/lib/types/database.types";

type Client = SupabaseClient<Database>;

export interface AuditEntry {
  id: string;
  action: AuditAction;
  changedAt: string;
  changedByName: string | null;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
}

/**
 * Ιστορικό αλλαγών για μία γραμμή. Επιστρέφει άδειο array (όχι σφάλμα) αν ο
 * τρέχων χρήστης δεν έχει πρόσβαση (RLS: μόνο manager/admin διαβάζουν) —
 * το UI που το καλεί κρύβεται ήδη πίσω από isManagerOrAdmin, οπότε αυτό
 * είναι απλώς defense-in-depth.
 */
export async function getRecordHistory(
  supabase: Client,
  tableName: string,
  recordId: string,
): Promise<AuditEntry[]> {
  const { data } = await supabase
    .from("activity_audit_log")
    .select("id, action, changed_at, old_data, new_data, changed_by:profiles(full_name)")
    .eq("table_name", tableName)
    .eq("record_id", recordId)
    .order("changed_at", { ascending: false })
    .limit(50);

  return (data ?? []).map((row) => ({
    id: row.id,
    action: row.action,
    changedAt: row.changed_at,
    changedByName: (row.changed_by as { full_name: string } | null)?.full_name ?? null,
    oldData: row.old_data as Record<string, unknown> | null,
    newData: row.new_data as Record<string, unknown> | null,
  }));
}
