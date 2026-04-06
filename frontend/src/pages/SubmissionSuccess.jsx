import { Link, useLocation } from "react-router-dom";

export default function SubmissionSuccess() {
  const location = useLocation();
  const candidateName = location.state?.candidateName || "Candidate";

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.badge}>Submission complete</div>
        <h1 style={styles.title}>Thank you for your response</h1>
        <p style={styles.text}>
          The record for <strong>{candidateName}</strong> has been stored in the backend successfully.
        </p>

        <div style={styles.infoBox}>
          You can now review submitted candidates or return to the intake form.
        </div>

        <div style={styles.actions}>
          <Link to="/" style={styles.secondaryBtn}>
            Back to Form
          </Link>

          <Link to="/saved-candidates" style={styles.primaryBtn}>
            View Saved Records
          </Link>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)",
    padding: 24,
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  card: {
    width: "100%",
    maxWidth: 720,
    background: "rgba(255,255,255,0.92)",
    border: "1px solid #e2e8f0",
    borderRadius: 24,
    padding: 32,
    boxShadow: "0 20px 50px rgba(15, 23, 42, 0.08)",
    textAlign: "center",
  },
  badge: {
    display: "inline-block",
    padding: "6px 12px",
    borderRadius: 999,
    background: "#dcfce7",
    color: "#166534",
    fontWeight: 700,
    fontSize: 13,
    marginBottom: 14,
  },
  title: {
    margin: 0,
    fontSize: 36,
    color: "#0f172a",
  },
  text: {
    marginTop: 14,
    fontSize: 16,
    lineHeight: 1.7,
    color: "#475569",
  },
  infoBox: {
    marginTop: 22,
    padding: 16,
    borderRadius: 16,
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    color: "#334155",
    fontSize: 14,
  },
  actions: {
    marginTop: 24,
    display: "flex",
    gap: 12,
    justifyContent: "center",
    flexWrap: "wrap",
  },
  primaryBtn: {
    textDecoration: "none",
    border: "none",
    background: "linear-gradient(90deg, #2563eb 0%, #4f46e5 100%)",
    color: "#fff",
    borderRadius: 14,
    padding: "12px 18px",
    fontSize: 14,
    fontWeight: 800,
  },
  secondaryBtn: {
    textDecoration: "none",
    border: "1px solid #cbd5e1",
    background: "#fff",
    color: "#0f172a",
    borderRadius: 14,
    padding: "12px 18px",
    fontSize: 14,
    fontWeight: 700,
  },
};