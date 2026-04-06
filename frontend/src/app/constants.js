export const STORAGE_KEY = "visa_readiness_draft_v5";

export const VISA_TYPES = [
  { value: "H1B / O1 Visa", label: "H1B / O1 Visa" },
];

export const H1B_WAGE_BANDS = [
  { value: "under_60000", label: "Wage 1 — Under $60,000" },
  { value: "60000_90000", label: "Wage 2 — $60,000 – $90,000" },
  { value: "90001_140000", label: "Wage 3 — $90,001 – $140,000" },
  { value: "140001_plus", label: "Wage 4 — $140,001+" },
];

export const evidenceOptions = [
  { key: "has_high_salary", label: "High Salary" },
  { key: "has_leadership_role", label: "Leadership Role" },
  { key: "has_judging_experience", label: "Judging Experience" },
  { key: "has_critical_employment", label: "Critical Employment" },
  {
    key: "has_membership_in_elite_associations",
    label: "Membership in Elite Associations",
  },
  { key: "has_original_contributions", label: "Original Contributions" },
  { key: "has_commercial_success", label: "Commercial Success" },
  { key: "has_media_coverage", label: "Media Coverage" },
];

export const initialFormState = {
  meta: {
    version: "1.0.0",
    schema: "visa_candidate_intake",
    created_at: "",
    updated_at: "",
    source: "frontend_form",
    visa_type: "H1B / O1 Visa",
  },
  candidate: {
    full_name: "",
    email: "",
    current_role: "",
    current_company: "",
    years_of_experience: "",
    country_of_citizenship: "",
    current_location: "",
    linkedin_url: "",
    github_url: "",
    portfolio_url: "",
  },
  education: {
    highest_degree: "",
    field_of_study: "",
    university: "",
    graduation_year: "",
  },
  employer_context: {
    company_name: "",
    company_stage: "",
    offered_role: "",
    offered_salary_usd: "",
    remote_or_onsite: "",
    h1b_wage_band: "",
  },
  achievements: {
    publications_count: "0",
    patents_count: "0",
    awards_count: "0",
    recommendation_letters_count: "0",
    speaking_engagements_count: "0",
    media_mentions_count: "0",
    open_source_projects_count: "0",
    major_projects_count: "0",
    scholarly_articles: "",
    notable_awards: "",
    press_links: "",
    patents_summary: "",
    project_impact_summary: "",
  },
  evidence_flags: {
    has_high_salary: false,
    has_leadership_role: false,
    has_judging_experience: false,
    has_critical_employment: false,
    has_membership_in_elite_associations: false,
    has_original_contributions: false,
    has_commercial_success: false,
    has_media_coverage: false,
  },
  narrative: {
    candidate_summary: "",
    strongest_case_points: "",
    possible_risks_or_gaps: "",
  },
  consent: {
    confirm_information_accuracy: false,
  },
};