import type { WeeklyReportData, RepWeeklyRow } from "./weekly-report";
import { WEEKLY_PHARMACY_VISIT_TARGET } from "@/lib/constants/schedule";

const COLOR_PRIMARY = "#3B3B8F";
const COLOR_PRIMARY_DARK = "#26265C";
const COLOR_SUCCESS = "#2E9E6B";
const COLOR_WARNING = "#E08A2E";
const COLOR_DANGER = "#C4453B";
const COLOR_BG = "#F7F7FB";
const COLOR_TEXT = "#33334D";

function changeBadge(pct: number | null): string {
  if (pct === null) return `<span style="color:#33334D66;">—</span>`;
  const color = pct > 0 ? COLOR_SUCCESS : pct < 0 ? COLOR_DANGER : COLOR_TEXT;
  const sign = pct > 0 ? "+" : "";
  return `<span style="color:${color};font-weight:600;">${sign}${pct}%</span>`;
}

function repRow(r: RepWeeklyRow): string {
  const coverageColor =
    r.coveragePct >= r.targetCoveragePct
      ? COLOR_SUCCESS
      : r.coveragePct >= r.targetCoveragePct * 0.8
        ? COLOR_WARNING
        : COLOR_DANGER;
  return `
    <tr>
      <td style="padding:10px 8px;border-bottom:1px solid #00000010;font-weight:600;">${r.repName}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #00000010;text-align:center;">
        ${r.visitsThisWeek} <span style="color:#33334D66;font-size:12px;">(πριν ${r.visitsLastWeek})</span><br/>
        ${changeBadge(r.visitsPctChange)}
      </td>
      <td style="padding:10px 8px;border-bottom:1px solid #00000010;text-align:center;">
        ${r.pharmacyThisWeek}/${WEEKLY_PHARMACY_VISIT_TARGET} <span style="color:#33334D66;font-size:12px;">(πριν ${r.pharmacyLastWeek})</span><br/>
        ${changeBadge(r.pharmacyPctChange)}
      </td>
      <td style="padding:10px 8px;border-bottom:1px solid #00000010;text-align:center;color:${coverageColor};font-weight:600;">
        ${r.coveragePct.toFixed(0)}% / ${r.targetCoveragePct.toFixed(0)}%
      </td>
    </tr>`;
}

export function renderWeeklyReportHtml(data: WeeklyReportData): string {
  return `
<!DOCTYPE html>
<html lang="el">
<body style="margin:0;padding:0;background-color:${COLOR_BG};font-family:Arial,Helvetica,sans-serif;color:${COLOR_TEXT};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLOR_BG};padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background-color:${COLOR_PRIMARY};padding:20px 28px;">
              <span style="color:#ffffff;font-size:18px;font-weight:700;">Synchroline CRM — Εβδομαδιαία Αναφορά</span>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px 8px;">
              <p style="margin:0 0 4px;font-size:14px;color:#33334D99;">
                ${data.weekStart} — ${data.weekEnd}${data.cycleName ? ` · ${data.cycleName}` : ""}
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
                <tr>
                  <td style="width:50%;padding:12px;background-color:${COLOR_BG};border-radius:12px;">
                    <p style="margin:0;font-size:12px;color:#33334D99;">Επισκέψεις (σύνολο ομάδας)</p>
                    <p style="margin:2px 0 0;font-size:22px;font-weight:700;color:${COLOR_PRIMARY_DARK};">
                      ${data.totals.visitsThisWeek}
                      <span style="font-size:13px;color:#33334D66;font-weight:400;"> (πριν ${data.totals.visitsLastWeek})</span>
                    </p>
                  </td>
                  <td style="width:12px;"></td>
                  <td style="width:50%;padding:12px;background-color:${COLOR_BG};border-radius:12px;">
                    <p style="margin:0;font-size:12px;color:#33334D99;">Επισκέψεις φαρμακείων</p>
                    <p style="margin:2px 0 0;font-size:22px;font-weight:700;color:${COLOR_PRIMARY_DARK};">
                      ${data.totals.pharmacyThisWeek}
                      <span style="font-size:13px;color:#33334D66;font-weight:400;"> (πριν ${data.totals.pharmacyLastWeek})</span>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:16px 28px 8px;">
              <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:${COLOR_PRIMARY_DARK};">Ανά rep</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;">
                <tr>
                  <td style="padding:6px 8px;font-size:11px;color:#33334D99;text-transform:uppercase;">Rep</td>
                  <td style="padding:6px 8px;font-size:11px;color:#33334D99;text-transform:uppercase;text-align:center;">Επισκέψεις</td>
                  <td style="padding:6px 8px;font-size:11px;color:#33334D99;text-transform:uppercase;text-align:center;">Φαρμακεία</td>
                  <td style="padding:6px 8px;font-size:11px;color:#33334D99;text-transform:uppercase;text-align:center;">Κάλυψη / Στόχος</td>
                </tr>
                ${data.reps.map(repRow).join("")}
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:16px 28px 24px;">
              <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:${COLOR_PRIMARY_DARK};">Σημειώσεις</p>
              <ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.6;">
                ${data.flags.map((f) => `<li>${f}</li>`).join("")}
              </ul>
            </td>
          </tr>

          <tr>
            <td style="padding:16px 28px;background-color:${COLOR_BG};">
              <p style="margin:0;font-size:12px;color:#33334D66;">
                Αυτόματη αναφορά από το Synchroline CRM. Για λεπτομέρειες, δες το
                <a href="https://synchroline-crm.vercel.app/dashboard" style="color:${COLOR_PRIMARY};">dashboard</a>.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
