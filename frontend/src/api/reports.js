import { apiFetch } from "./client";

export function sendReportEmail(to, from, toDate) {
  const params = new URLSearchParams({ to, from, to_date: toDate });
  return apiFetch(`/api/reports/send?${params.toString()}`, { method: "POST" });
}
