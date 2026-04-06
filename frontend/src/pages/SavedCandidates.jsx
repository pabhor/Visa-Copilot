import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchCandidateProfiles,
  analyzeCandidateProfile,
} from "../db/candidateProfileDB";

export default function SavedCandidates() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzingId, setAnalyzingId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    loadProfiles();
  }, []);

  async function loadProfiles() {
    try {
      setLoading(true);
      setError("");
      const data = await fetchCandidateProfiles();
      setProfiles(Array.isArray(data) ? data : data.items || []);
    } catch (err) {
      setError(err.message || "Failed to load candidate profiles");
    } finally {
      setLoading(false);
    }
  }

  async function handleAnalyze(profileId) {
    try {
      setAnalyzingId(profileId);
      await analyzeCandidateProfile(profileId);
      navigate(`/candidate-analysis/${profileId}`);
    } catch (err) {
      setError(err.message || "Failed to analyze candidate");
    } finally {
      setAnalyzingId(null);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.headerRow}>
          <div>
            <div style={styles.badge}>Saved Records</div>
            <h1 style={styles.title}>Candidate Profiles</h1>
            <p style={styles.subtitle}>Review submitted candidates and launch AI analysis.</p>
          </div>
          <button style={styles.backBtn} onClick={() => navigate("/")}>
            Back to Form
          </button>
        </div>

        {error ? <div style={styles.errorBox}>{error}</div> : null}

        {loading ? (
          <div style={styles.infoCard}>Loading profiles...</div>
        ) : profiles.length === 0 ? (
          <div style={styles.infoCard}>No candidate profiles found yet.</div>
        ) : (
          <div style={styles.grid}>
            {profiles.map((profile) => (
              <div key={profile.id || profile.profile_id} style={styles.card}>
                <h3 style={styles.cardTitle}>
                  {profile?.candidate?.full_name ||
                    profile?.candidate_name ||
                    profile?.ai_input_summary?.candidate_name ||
                    "Unnamed Candidate"}
                </h3>
                <p style={styles.meta}>Profile ID: {profile.id || profile.profile_id}</p>

                <div style={styles.actions}>
                  <button
                    style={styles.primaryBtn}
                    onClick={() => navigate(`/candidate-analysis/${profile.id || profile.profile_id}`)}
                  >
                    View Analysis Page
                  </button>

                  <button
                    style={{
                      ...styles.secondaryBtn,
                      opacity: analyzingId === (profile.id || profile.profile_id) ? 0.7 : 1,
                    }}
                    onClick={() => handleAnalyze(profile.id || profile.profile_id)}
                    disabled={analyzingId === (profile.id || profile.profile_id)}
                  >
                    {analyzingId === (profile.id || profile.profile_id)
                      ? "Analyzing..."
                      : "Run Analysis"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)",
    padding: 24,
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  container: {
    width: "100%",
    maxWidth: 980,
    margin: "0 auto",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    marginBottom: 24,
    flexWrap: "wrap",
  },
  badge: {
    display: "inline-block",
    padding: "6px 12px",
    borderRadius: 999,
    background: "#ede9fe",
    color: "#5b21b6",
    fontWeight: 700,
    fontSize: 13,
    marginBottom: 12,
  },
  title: {
    margin: 0,
    fontSize: 34,
    color: "#0f172a",
  },
  subtitle: {
    marginTop: 10,
    color: "#475569",
    fontSize: 16,
  },
  backBtn: {
    border: "1px solid #cbd5e1",
    background: "#fff",
    color: "#0f172a",
    borderRadius: 14,
    padding: "12px 18px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },
  errorBox: {
    marginBottom: 16,
    padding: 14,
    borderRadius: 12,
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#b91c1c",
  },
  infoCard: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 20,
    padding: 20,
    color: "#334155",
  },
  grid: {
    display: "grid",
    gap: 16,
  },
  card: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 20,
    padding: 20,
    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)",
  },
  cardTitle: {
    margin: "0 0 8px",
    fontSize: 22,
    color: "#0f172a",
  },
  meta: {
    margin: 0,
    color: "#64748b",
    fontSize: 14,
  },
  actions: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    marginTop: 18,
  },
  primaryBtn: {
    border: "none",
    background: "linear-gradient(90deg, #2563eb 0%, #4f46e5 100%)",
    color: "#fff",
    borderRadius: 14,
    padding: "12px 18px",
    fontSize: 14,
    fontWeight: 800,
    cursor: "pointer",
  },
  secondaryBtn: {
    border: "1px solid #cbd5e1",
    background: "#fff",
    color: "#0f172a",
    borderRadius: 14,
    padding: "12px 18px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },
};