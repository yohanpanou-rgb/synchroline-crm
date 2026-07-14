import { useState } from "react";
import { Link } from "react-router-dom";
import { sendReportEmail } from "../api/reports";
import { useAuth } from "../context/AuthContext";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function weekAgoIso() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
}

export function Reports() {
  const { user } = useAuth();
  const [from, setFrom] = useState(weekAgoIso());
  const [to, setTo] = useState(todayIso());
  const [status, setStatus] = useState(null); // { type: "error" | "success", message }
  const [sending, setSending] = useState(false);

  async function handleSend(e) {
    e.preventDefault();
    setStatus(null);
    setSending(true);
    try {
      await sendReportEmail(user.email, from, to);
      setStatus({ type: "success", message: `Το report στάλθηκε στο ${user.email}.` });
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="page">
      <nav className="navbar">
        <Link to="/">← medi360</Link>
      </nav>
      <h1>Weekly Report — Ραντεβού</h1>
      <p>Το PDF θα σταλεί στο {user?.email}.</p>

      <form className="report-filters" onSubmit={handleSend}>
        <label>
          Από
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} required />
        </label>
        <label>
          Έως
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} required />
        </label>
        <button type="submit" disabled={sending}>
          {sending ? "Αποστολή..." : "Αποστολή Weekly Report"}
        </button>
      </form>

      {status && <p className={status.type === "error" ? "error" : "success"}>{status.message}</p>}
    </div>
  );
}
