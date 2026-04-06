import { useState } from "react";
import { useNavigate } from "react-router-dom";
import FormField from "../components/FormField";
import TextAreaField from "../components/TextAreaField";
import FormSection from "../components/FormSection";
import CheckboxGroup from "../components/CheckboxGroup";
import SubmitBar from "../components/SubmitBar";
import { buildSubmissionPayload } from "../utils/buildPayload";
import { validateForm, hasErrors } from "../utils/validators";
import { submitCandidateProfile } from "../db/candidateProfileDB";
import {
  evidenceOptions,
  initialFormState,
  VISA_TYPES,
  H1B_WAGE_BANDS,
  STORAGE_KEY,
} from "../app/constants";

export default function O1Form() {
  const navigate = useNavigate();

  const [form, setForm] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Ready to submit");

  function updateSection(section, field, value) {
    setForm((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  }

  function handleEvidenceChange(key, checked) {
    setForm((prev) => ({
      ...prev,
      evidence_flags: {
        ...prev.evidence_flags,
        [key]: checked,
      },
    }));
  }

  function handleSaveDraft() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    setStatusMessage("Draft saved locally");
  }

  async function handleSubmit() {
    const validationErrors = validateForm(form);
    setErrors(validationErrors);

    if (hasErrors(validationErrors)) {
      setStatusMessage("Please fix validation errors before submitting");
      return;
    }

    try {
      setSubmitting(true);
      setStatusMessage("Submitting candidate profile...");

      const payload = buildSubmissionPayload(form);
      await submitCandidateProfile(payload);

      setStatusMessage("Submission successful");

      navigate("/submission-success", {
        state: { candidateName: form.candidate.full_name },
      });
    } catch (err) {
      setStatusMessage(err.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  function countFilled(values) {
    return values.filter((value) => {
      if (typeof value === "boolean") return value;
      if (typeof value === "number") return true;
      return Boolean(String(value || "").trim());
    }).length;
  }

  const candidateFields = [
    form.candidate.full_name,
    form.candidate.email,
    form.candidate.current_role,
    form.candidate.current_company,
    form.candidate.years_of_experience,
    form.candidate.country_of_citizenship,
    form.candidate.current_location,
    form.candidate.linkedin_url,
    form.candidate.github_url,
    form.candidate.portfolio_url,
  ];

  const educationFields = [
    form.education.highest_degree,
    form.education.field_of_study,
    form.education.university,
    form.education.graduation_year,
  ];

  const employerFields = [
    form.employer_context.company_name,
    form.employer_context.company_stage,
    form.employer_context.offered_role,
    form.employer_context.offered_salary_usd,
    form.employer_context.remote_or_onsite,
    form.employer_context.h1b_wage_band,
  ];

  const achievementFields = [
    form.achievements.publications_count,
    form.achievements.patents_count,
    form.achievements.awards_count,
    form.achievements.recommendation_letters_count,
    form.achievements.speaking_engagements_count,
    form.achievements.media_mentions_count,
    form.achievements.open_source_projects_count,
    form.achievements.major_projects_count,
    form.achievements.scholarly_articles,
    form.achievements.notable_awards,
    form.achievements.press_links,
    form.achievements.patents_summary,
    form.achievements.project_impact_summary,
  ];

  const evidenceChecked = Object.values(form.evidence_flags || {}).filter(Boolean).length;
  const evidenceTotal = Object.keys(form.evidence_flags || {}).length;

  const narrativeFields = [
    form.narrative.candidate_summary,
    form.narrative.strongest_case_points,
    form.narrative.possible_risks_or_gaps,
  ];

  const sectionStats = [
    {
      label: "Candidate",
      filled: countFilled(candidateFields),
      total: candidateFields.length,
    },
    {
      label: "Education",
      filled: countFilled(educationFields),
      total: educationFields.length,
    },
    {
      label: "Employer",
      filled: countFilled(employerFields),
      total: employerFields.length,
    },
    {
      label: "Achievements",
      filled: countFilled(achievementFields),
      total: achievementFields.length,
    },
    {
      label: "Evidence",
      filled: evidenceChecked,
      total: evidenceTotal,
    },
    {
      label: "Narrative",
      filled: countFilled(narrativeFields),
      total: narrativeFields.length,
    },
  ];

  const totalFilled = sectionStats.reduce((sum, item) => sum + item.filled, 0);
  const totalFields = sectionStats.reduce((sum, item) => sum + item.total, 0);
  const completion = totalFields ? Math.round((totalFilled / totalFields) * 100) : 0;

  const completionTone =
    completion >= 75 ? "Strong progress" : completion >= 40 ? "Good start" : "Getting started";

  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        <section style={styles.heroSection}>
          <div style={styles.heroNav}>
            <div style={styles.brandWrap}>
              <div style={styles.logoMark}>
                <div style={styles.logoOrbit} />
                <div style={styles.logoCore}>V</div>
              </div>
              <div>
                <div style={styles.brandTitle}>VisaCopilot</div>
                <div style={styles.brandTag}>AI for Immigrants. AI for Skills.</div>
              </div>
            </div>

            <div style={styles.heroActions}>
              <button
                type="button"
                onClick={() => navigate("/saved-candidates")}
                style={styles.secondaryButton}
              >
                View Candidates
              </button>

              <a href="#candidate-form" style={styles.primaryLinkButton}>
                Start Candidate Form
              </a>
            </div>
          </div>

          <div style={styles.heroGrid}>
            <div style={styles.heroLeft}>
              <div style={styles.badge}>INTELLIGENT VISA INTAKE WORKFLOW</div>

              <h1 style={styles.heroTitle}>
                Build stronger immigration cases with structured candidate intake.
              </h1>

              <p style={styles.heroSubtitle}>
                VisaCopilot helps teams collect candidate, employer, achievement,
                and evidence details in a consistent format so applications can move
                faster into analysis and review.
              </p>

              <div style={styles.heroBulletGrid}>
                <div style={styles.heroBulletCard}>
                  <div style={styles.heroBulletTitle}>Structured Intake</div>
                  <div style={styles.heroBulletText}>
                    Capture all required candidate details in a guided workflow.
                  </div>
                </div>

                <div style={styles.heroBulletCard}>
                  <div style={styles.heroBulletTitle}>Analysis Ready</div>
                  <div style={styles.heroBulletText}>
                    Organize evidence for downstream O-1 and H-1B assessment.
                  </div>
                </div>

                <div style={styles.heroBulletCard}>
                  <div style={styles.heroBulletTitle}>Work on Existing Profiles</div>
                  <div style={styles.heroBulletText}>
                    Jump directly to saved candidates and continue analysis.
                  </div>
                </div>
              </div>

              <div style={styles.heroCTAGroup}>
                <a href="#candidate-form" style={styles.primaryHeroButton}>
                  Fill Candidate Form
                </a>

                <button
                  type="button"
                  onClick={() => navigate("/saved-candidates")}
                  style={styles.ghostHeroButton}
                >
                  Open Existing Candidates
                </button>
              </div>
            </div>

            <div style={styles.heroRight}>
              <div style={styles.scorePanel}>
                <div style={styles.scorePanelTop}>
                  <div>
                    <div style={styles.scoreEyebrow}>Candidate Readiness Board</div>
                    <div style={styles.scoreTitle}>Form Completion Score</div>
                  </div>

                  <div
                    style={{
                      ...styles.scoreCircle,
                      background: `conic-gradient(#4f46e5 ${completion}%, #dbeafe ${completion}%)`,
                    }}
                  >
                    <div style={styles.scoreCircleInner}>
                      <div style={styles.scoreNumber}>{completion}%</div>
                      <div style={styles.scoreCaption}>{completionTone}</div>
                    </div>
                  </div>
                </div>

                <div style={styles.progressBarTrack}>
                  <div
                    style={{
                      ...styles.progressBarFill,
                      width: `${completion}%`,
                    }}
                  />
                </div>

                <div style={styles.scoreStatsGrid}>
                  {sectionStats.map((item) => (
                    <div key={item.label} style={styles.scoreStatCard}>
                      <div style={styles.scoreStatTop}>
                        <span style={styles.scoreStatLabel}>{item.label}</span>
                        <span style={styles.scoreStatValue}>
                          {item.filled}/{item.total}
                        </span>
                      </div>

                      <div style={styles.miniTrack}>
                        <div
                          style={{
                            ...styles.miniFill,
                            width: `${item.total ? (item.filled / item.total) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div style={styles.scoreFooter}>
                  <div style={styles.scoreFooterText}>
                    Complete more sections to improve intake completeness before analysis.
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate("/saved-candidates")}
                    style={styles.inlineActionButton}
                  >
                    Go to Candidate Applications
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="candidate-form" style={styles.formSection}>
          <div style={styles.formSectionHeader}>
            <div>
              <div style={styles.formEyebrow}>Step 2</div>
              <h2 style={styles.formTitle}>Candidate Intake Form</h2>
              <p style={styles.formSubtitle}>
                Fill a new profile or complete missing details before running analysis.
              </p>
            </div>

            <div style={styles.formHeaderActions}>
              <button
                type="button"
                onClick={() => navigate("/saved-candidates")}
                style={styles.secondaryButton}
              >
                View Candidate Applications
              </button>
            </div>
          </div>

          <div style={styles.container}>
            <div style={styles.heroMini}>
              <div style={styles.heroMiniLeft}>
                <div style={styles.miniPill}>VisaCopilot Intake Workspace</div>
                <div style={styles.miniText}>
                  Structured profile capture for H-1B and O-1 review.
                </div>
              </div>

              <div style={styles.statusPill}>{statusMessage}</div>
            </div>

            <FormSection
              title="Meta Information"
              subtitle="Basic submission metadata and visa selection."
            >
              <label style={styles.fieldWrap}>
                <span style={styles.label}>Visa Type *</span>
                <select
                  value={form.meta.visa_type}
                  onChange={(e) => updateSection("meta", "visa_type", e.target.value)}
                  style={styles.select}
                >
                  {VISA_TYPES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <div />
            </FormSection>

            <FormSection
              title="Candidate Information"
              subtitle="Core personal and professional details."
            >
              <FormField
                label="Full Name"
                value={form.candidate.full_name}
                onChange={(e) => updateSection("candidate", "full_name", e.target.value)}
                required
                error={errors["candidate.full_name"]}
              />
              <FormField
                label="Email"
                value={form.candidate.email}
                onChange={(e) => updateSection("candidate", "email", e.target.value)}
                required
                error={errors["candidate.email"]}
                type="email"
              />
              <FormField
                label="Current Role"
                value={form.candidate.current_role}
                onChange={(e) => updateSection("candidate", "current_role", e.target.value)}
                required
                error={errors["candidate.current_role"]}
              />
              <FormField
                label="Current Company"
                value={form.candidate.current_company}
                onChange={(e) => updateSection("candidate", "current_company", e.target.value)}
                required
                error={errors["candidate.current_company"]}
              />
              <FormField
                label="Years of Experience"
                value={form.candidate.years_of_experience}
                onChange={(e) =>
                  updateSection("candidate", "years_of_experience", e.target.value)
                }
                type="number"
                required
              />
              <FormField
                label="Country of Citizenship"
                value={form.candidate.country_of_citizenship}
                onChange={(e) =>
                  updateSection("candidate", "country_of_citizenship", e.target.value)
                }
                required
                error={errors["candidate.country_of_citizenship"]}
              />
              <FormField
                label="Current Location"
                value={form.candidate.current_location}
                onChange={(e) =>
                  updateSection("candidate", "current_location", e.target.value)
                }
                required
                error={errors["candidate.current_location"]}
              />
              <FormField
                label="LinkedIn URL"
                value={form.candidate.linkedin_url}
                onChange={(e) => updateSection("candidate", "linkedin_url", e.target.value)}
              />
              <FormField
                label="GitHub URL"
                value={form.candidate.github_url}
                onChange={(e) => updateSection("candidate", "github_url", e.target.value)}
              />
              <FormField
                label="Portfolio URL"
                value={form.candidate.portfolio_url}
                onChange={(e) => updateSection("candidate", "portfolio_url", e.target.value)}
              />
            </FormSection>

            <FormSection
              title="Education"
              subtitle="Academic background relevant to immigration assessment."
            >
              <FormField
                label="Highest Degree"
                value={form.education.highest_degree}
                onChange={(e) => updateSection("education", "highest_degree", e.target.value)}
                required
                error={errors["education.highest_degree"]}
              />
              <FormField
                label="Field of Study"
                value={form.education.field_of_study}
                onChange={(e) => updateSection("education", "field_of_study", e.target.value)}
                required
                error={errors["education.field_of_study"]}
              />
              <FormField
                label="University"
                value={form.education.university}
                onChange={(e) => updateSection("education", "university", e.target.value)}
                required
                error={errors["education.university"]}
              />
              <FormField
                label="Graduation Year"
                value={form.education.graduation_year}
                onChange={(e) => updateSection("education", "graduation_year", e.target.value)}
                type="number"
                required
                error={errors["education.graduation_year"]}
              />
            </FormSection>

            <FormSection
              title="Employer Context"
              subtitle="Employer and compensation details."
            >
              <FormField
                label="Company Name"
                value={form.employer_context.company_name}
                onChange={(e) =>
                  updateSection("employer_context", "company_name", e.target.value)
                }
                required
                error={errors["employer_context.company_name"]}
              />
              <FormField
                label="Company Stage"
                value={form.employer_context.company_stage}
                onChange={(e) =>
                  updateSection("employer_context", "company_stage", e.target.value)
                }
                required
                error={errors["employer_context.company_stage"]}
              />
              <FormField
                label="Offered Role"
                value={form.employer_context.offered_role}
                onChange={(e) =>
                  updateSection("employer_context", "offered_role", e.target.value)
                }
                required
                error={errors["employer_context.offered_role"]}
              />
              <FormField
                label="Offered Salary (USD)"
                value={form.employer_context.offered_salary_usd}
                onChange={(e) =>
                  updateSection("employer_context", "offered_salary_usd", e.target.value)
                }
                type="number"
                required
                error={errors["employer_context.offered_salary_usd"]}
              />
              <FormField
                label="Remote or Onsite"
                value={form.employer_context.remote_or_onsite}
                onChange={(e) =>
                  updateSection("employer_context", "remote_or_onsite", e.target.value)
                }
                required
                error={errors["employer_context.remote_or_onsite"]}
              />

              <label style={styles.fieldWrap}>
                <span style={styles.label}>H-1B Wage Band *</span>
                <select
                  value={form.employer_context.h1b_wage_band}
                  onChange={(e) =>
                    updateSection("employer_context", "h1b_wage_band", e.target.value)
                  }
                  style={styles.select}
                >
                  <option value="">Select wage band</option>
                  {H1B_WAGE_BANDS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
                {errors["employer_context.h1b_wage_band"] ? (
                  <span style={styles.errorText}>
                    {errors["employer_context.h1b_wage_band"]}
                  </span>
                ) : null}
              </label>
            </FormSection>

            <FormSection
              title="Achievements"
              subtitle="Quantitative achievements and supporting indicators."
            >
              <FormField
                label="Publications Count"
                value={form.achievements.publications_count}
                onChange={(e) =>
                  updateSection("achievements", "publications_count", e.target.value)
                }
                type="number"
              />
              <FormField
                label="Patents Count"
                value={form.achievements.patents_count}
                onChange={(e) =>
                  updateSection("achievements", "patents_count", e.target.value)
                }
                type="number"
              />
              <FormField
                label="Awards Count"
                value={form.achievements.awards_count}
                onChange={(e) =>
                  updateSection("achievements", "awards_count", e.target.value)
                }
                type="number"
              />
              <FormField
                label="Recommendation Letters Count"
                value={form.achievements.recommendation_letters_count}
                onChange={(e) =>
                  updateSection(
                    "achievements",
                    "recommendation_letters_count",
                    e.target.value
                  )
                }
                type="number"
              />
              <FormField
                label="Speaking Engagements Count"
                value={form.achievements.speaking_engagements_count}
                onChange={(e) =>
                  updateSection(
                    "achievements",
                    "speaking_engagements_count",
                    e.target.value
                  )
                }
                type="number"
              />
              <FormField
                label="Media Mentions Count"
                value={form.achievements.media_mentions_count}
                onChange={(e) =>
                  updateSection("achievements", "media_mentions_count", e.target.value)
                }
                type="number"
              />
              <FormField
                label="Open Source Projects Count"
                value={form.achievements.open_source_projects_count}
                onChange={(e) =>
                  updateSection(
                    "achievements",
                    "open_source_projects_count",
                    e.target.value
                  )
                }
                type="number"
              />
              <FormField
                label="Major Projects Count"
                value={form.achievements.major_projects_count}
                onChange={(e) =>
                  updateSection("achievements", "major_projects_count", e.target.value)
                }
                type="number"
              />
              <TextAreaField
                label="Scholarly Articles"
                value={form.achievements.scholarly_articles}
                onChange={(e) =>
                  updateSection("achievements", "scholarly_articles", e.target.value)
                }
                rows={4}
              />
              <TextAreaField
                label="Notable Awards"
                value={form.achievements.notable_awards}
                onChange={(e) =>
                  updateSection("achievements", "notable_awards", e.target.value)
                }
                rows={4}
              />
              <TextAreaField
                label="Press Links"
                value={form.achievements.press_links}
                onChange={(e) =>
                  updateSection("achievements", "press_links", e.target.value)
                }
                rows={4}
              />
              <TextAreaField
                label="Patents Summary"
                value={form.achievements.patents_summary}
                onChange={(e) =>
                  updateSection("achievements", "patents_summary", e.target.value)
                }
                rows={4}
              />
              <TextAreaField
                label="Project Impact Summary"
                value={form.achievements.project_impact_summary}
                onChange={(e) =>
                  updateSection("achievements", "project_impact_summary", e.target.value)
                }
                rows={4}
              />
            </FormSection>

            <FormSection
              title="Evidence Flags"
              subtitle="Boolean legal strength indicators used by downstream analysis."
            >
              <div style={{ gridColumn: "1 / -1" }}>
                <CheckboxGroup
                  items={evidenceOptions}
                  values={form.evidence_flags}
                  onChange={handleEvidenceChange}
                />
              </div>
            </FormSection>

            <FormSection
              title="Narrative"
              subtitle="Free text case context and judgment areas."
            >
              <TextAreaField
                label="Candidate Summary"
                value={form.narrative.candidate_summary}
                onChange={(e) =>
                  updateSection("narrative", "candidate_summary", e.target.value)
                }
                rows={5}
              />
              <TextAreaField
                label="Strongest Case Points"
                value={form.narrative.strongest_case_points}
                onChange={(e) =>
                  updateSection("narrative", "strongest_case_points", e.target.value)
                }
                rows={5}
              />
              <TextAreaField
                label="Possible Risks or Gaps"
                value={form.narrative.possible_risks_or_gaps}
                onChange={(e) =>
                  updateSection("narrative", "possible_risks_or_gaps", e.target.value)
                }
                rows={5}
              />
              <div />
            </FormSection>

            <FormSection
              title="Consent"
              subtitle="Submission requires explicit approval for information accuracy."
            >
              <label style={styles.checkboxLine}>
                <input
                  type="checkbox"
                  checked={form.consent.confirm_information_accuracy}
                  onChange={(e) =>
                    updateSection(
                      "consent",
                      "confirm_information_accuracy",
                      e.target.checked
                    )
                  }
                />
                <span>I confirm the submitted information is accurate.</span>
              </label>
              {errors["consent.confirm_information_accuracy"] ? (
                <span style={styles.errorText}>
                  {errors["consent.confirm_information_accuracy"]}
                </span>
              ) : null}
              <div />
            </FormSection>

            <SubmitBar
              onSaveDraft={handleSaveDraft}
              onSubmit={handleSubmit}
              statusMessage={statusMessage}
              submitting={submitting}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top left, rgba(79,70,229,0.18) 0%, rgba(79,70,229,0) 30%), linear-gradient(180deg, #f8fafc 0%, #eef2ff 48%, #f8fafc 100%)",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    color: "#0f172a",
  },
  shell: {
    width: "100%",
  },
  heroSection: {
    maxWidth: 1240,
    margin: "0 auto",
    padding: "28px 24px 52px",
  },
  heroNav: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
    marginBottom: 42,
  },
  brandWrap: {
    display: "flex",
    alignItems: "center",
    gap: 14,
  },
  logoMark: {
    width: 52,
    height: 52,
    borderRadius: 18,
    background: "linear-gradient(135deg, #1d4ed8 0%, #4f46e5 55%, #7c3aed 100%)",
    position: "relative",
    display: "grid",
    placeItems: "center",
    boxShadow: "0 14px 35px rgba(79,70,229,0.25)",
    overflow: "hidden",
  },
  logoOrbit: {
    position: "absolute",
    width: 84,
    height: 84,
    borderRadius: "50%",
    border: "1px solid rgba(255,255,255,0.18)",
  },
  logoCore: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: 900,
    zIndex: 1,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: 900,
    letterSpacing: -0.3,
    color: "#0f172a",
  },
  brandTag: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 4,
    fontWeight: 600,
  },
  heroActions: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
  },
  secondaryButton: {
    border: "1px solid #dbe2ea",
    background: "#ffffff",
    color: "#0f172a",
    borderRadius: 14,
    padding: "12px 18px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 6px 20px rgba(15,23,42,0.06)",
  },
  primaryLinkButton: {
    textDecoration: "none",
    border: "none",
    background: "linear-gradient(90deg, #2563eb 0%, #4f46e5 100%)",
    color: "#ffffff",
    borderRadius: 14,
    padding: "12px 18px",
    fontSize: 14,
    fontWeight: 800,
    boxShadow: "0 10px 24px rgba(79,70,229,0.22)",
    display: "inline-flex",
    alignItems: "center",
  },
  heroGrid: {
    display: "grid",
    gridTemplateColumns: "1.08fr 0.92fr",
    gap: 28,
    alignItems: "center",
  },
  heroLeft: {
    minWidth: 0,
  },
  badge: {
    display: "inline-block",
    padding: "8px 14px",
    borderRadius: 999,
    background: "rgba(37,99,235,0.1)",
    color: "#1d4ed8",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 0.4,
    marginBottom: 18,
  },
  heroTitle: {
    margin: 0,
    fontSize: "clamp(40px, 6vw, 68px)",
    lineHeight: 1.04,
    letterSpacing: -1.7,
    fontWeight: 900,
    color: "#0f172a",
    maxWidth: 680,
  },
  heroSubtitle: {
    marginTop: 18,
    marginBottom: 0,
    color: "#475569",
    fontSize: 18,
    lineHeight: 1.85,
    maxWidth: 660,
  },
  heroBulletGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 14,
    marginTop: 28,
  },
  heroBulletCard: {
    background: "rgba(255,255,255,0.72)",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(219,226,234,0.95)",
    borderRadius: 20,
    padding: 18,
    boxShadow: "0 18px 35px rgba(15,23,42,0.06)",
  },
  heroBulletTitle: {
    fontSize: 15,
    fontWeight: 800,
    color: "#0f172a",
    marginBottom: 8,
  },
  heroBulletText: {
    fontSize: 14,
    lineHeight: 1.7,
    color: "#64748b",
  },
  heroCTAGroup: {
    display: "flex",
    gap: 14,
    flexWrap: "wrap",
    marginTop: 28,
  },
  primaryHeroButton: {
    textDecoration: "none",
    border: "none",
    background: "linear-gradient(90deg, #2563eb 0%, #4f46e5 100%)",
    color: "#ffffff",
    borderRadius: 16,
    padding: "14px 20px",
    fontSize: 15,
    fontWeight: 800,
    boxShadow: "0 12px 30px rgba(79,70,229,0.24)",
    display: "inline-flex",
    alignItems: "center",
  },
  ghostHeroButton: {
    border: "1px solid #dbe2ea",
    background: "rgba(255,255,255,0.88)",
    color: "#0f172a",
    borderRadius: 16,
    padding: "14px 20px",
    fontSize: 15,
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 8px 22px rgba(15,23,42,0.06)",
  },
  heroRight: {
    minWidth: 0,
  },
  scorePanel: {
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(248,250,252,0.92) 100%)",
    border: "1px solid rgba(219,226,234,0.95)",
    borderRadius: 28,
    padding: 24,
    boxShadow: "0 28px 50px rgba(15,23,42,0.09)",
    backdropFilter: "blur(12px)",
  },
  scorePanelTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 18,
    marginBottom: 20,
  },
  scoreEyebrow: {
    fontSize: 12,
    fontWeight: 800,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginBottom: 8,
  },
  scoreTitle: {
    fontSize: 24,
    fontWeight: 900,
    color: "#0f172a",
    lineHeight: 1.2,
  },
  scoreCircle: {
    width: 128,
    height: 128,
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
  },
  scoreCircleInner: {
    width: 94,
    height: 94,
    borderRadius: "50%",
    background: "#ffffff",
    display: "grid",
    placeItems: "center",
    textAlign: "center",
    boxShadow: "inset 0 0 0 1px rgba(219,226,234,0.9)",
    padding: 8,
  },
  scoreNumber: {
    fontSize: 28,
    fontWeight: 900,
    color: "#0f172a",
    lineHeight: 1,
  },
  scoreCaption: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: 700,
    color: "#64748b",
  },
  progressBarTrack: {
    width: "100%",
    height: 12,
    borderRadius: 999,
    background: "#e6ecf5",
    overflow: "hidden",
    marginBottom: 18,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 999,
    background: "linear-gradient(90deg, #2563eb 0%, #4f46e5 100%)",
  },
  scoreStatsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12,
  },
  scoreStatCard: {
    background: "#ffffff",
    border: "1px solid #e6ecf5",
    borderRadius: 18,
    padding: 14,
  },
  scoreStatTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  scoreStatLabel: {
    fontSize: 13,
    fontWeight: 700,
    color: "#334155",
  },
  scoreStatValue: {
    fontSize: 13,
    fontWeight: 800,
    color: "#0f172a",
  },
  miniTrack: {
    width: "100%",
    height: 8,
    borderRadius: 999,
    background: "#edf2f7",
    overflow: "hidden",
  },
  miniFill: {
    height: "100%",
    borderRadius: 999,
    background: "linear-gradient(90deg, #22c55e 0%, #3b82f6 100%)",
  },
  scoreFooter: {
    marginTop: 16,
    paddingTop: 16,
    borderTop: "1px solid #e9edf5",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  scoreFooterText: {
    fontSize: 13,
    color: "#64748b",
    lineHeight: 1.6,
    maxWidth: 360,
  },
  inlineActionButton: {
    border: "none",
    background: "#eef2ff",
    color: "#3730a3",
    borderRadius: 12,
    padding: "10px 14px",
    fontSize: 13,
    fontWeight: 800,
    cursor: "pointer",
  },
  formSection: {
    maxWidth: 1240,
    margin: "0 auto",
    padding: "8px 24px 56px",
  },
  formSectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 18,
    flexWrap: "wrap",
    marginBottom: 24,
  },
  formEyebrow: {
    fontSize: 12,
    fontWeight: 800,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  formTitle: {
    margin: 0,
    fontSize: "clamp(30px, 4vw, 44px)",
    fontWeight: 900,
    color: "#0f172a",
    letterSpacing: -0.8,
  },
  formSubtitle: {
    marginTop: 10,
    marginBottom: 0,
    color: "#64748b",
    fontSize: 16,
    lineHeight: 1.8,
    maxWidth: 760,
  },
  formHeaderActions: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
  },
  container: {
    maxWidth: 1100,
    margin: "0 auto",
  },
  heroMini: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 24,
    padding: 18,
    background: "rgba(255,255,255,0.85)",
    border: "1px solid #e5eaf2",
    borderRadius: 20,
    boxShadow: "0 16px 35px rgba(15,23,42,0.05)",
  },
  heroMiniLeft: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  miniPill: {
    display: "inline-flex",
    alignItems: "center",
    width: "fit-content",
    padding: "7px 12px",
    borderRadius: 999,
    background: "#eef2ff",
    color: "#3730a3",
    fontSize: 12,
    fontWeight: 800,
  },
  miniText: {
    fontSize: 14,
    color: "#64748b",
    lineHeight: 1.7,
  },
  statusPill: {
    padding: "10px 14px",
    borderRadius: 999,
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    color: "#334155",
    fontSize: 13,
    fontWeight: 700,
  },
  fieldWrap: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: 700,
    color: "#1e293b",
  },
  select: {
    padding: "13px 14px",
    borderRadius: 16,
    border: "1px solid #dbe2ea",
    background: "#fff",
    fontSize: 14,
    outline: "none",
    boxShadow: "inset 0 1px 2px rgba(15,23,42,0.03)",
    color: "#0f172a",
  },
  checkboxLine: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    color: "#334155",
    fontSize: 14,
    lineHeight: 1.6,
  },
  errorText: {
    color: "#dc2626",
    fontSize: 12,
    fontWeight: 600,
  },
};
