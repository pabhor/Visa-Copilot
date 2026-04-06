function numericValue(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function buildSubmissionPayload(form) {
  const now = new Date().toISOString();

  return {
    meta: {
      ...form.meta,
      created_at: form.meta.created_at || now,
      updated_at: now,
    },
    candidate: {
      ...form.candidate,
      years_of_experience: numericValue(form.candidate.years_of_experience),
    },
    education: {
      ...form.education,
      graduation_year: numericValue(form.education.graduation_year),
    },
    employer_context: {
      ...form.employer_context,
      offered_salary_usd: numericValue(form.employer_context.offered_salary_usd),
    },
    achievements: {
      ...form.achievements,
      publications_count: numericValue(form.achievements.publications_count),
      patents_count: numericValue(form.achievements.patents_count),
      awards_count: numericValue(form.achievements.awards_count),
      recommendation_letters_count: numericValue(
        form.achievements.recommendation_letters_count
      ),
      speaking_engagements_count: numericValue(
        form.achievements.speaking_engagements_count
      ),
      media_mentions_count: numericValue(form.achievements.media_mentions_count),
      open_source_projects_count: numericValue(
        form.achievements.open_source_projects_count
      ),
      major_projects_count: numericValue(form.achievements.major_projects_count),
    },
    evidence_flags: {
      ...form.evidence_flags,
    },
    narrative: {
      ...form.narrative,
    },
    consent: {
      ...form.consent,
    },
    ai_input_summary: {
      candidate_name: form.candidate.full_name,
      visa_type: form.meta.visa_type,
      current_role: form.candidate.current_role,
      employer: form.employer_context.company_name,
      h1b_wage_band: form.employer_context.h1b_wage_band,
      evidence_snapshot: {
        publications: numericValue(form.achievements.publications_count),
        patents: numericValue(form.achievements.patents_count),
        awards: numericValue(form.achievements.awards_count),
        recommendation_letters: numericValue(
          form.achievements.recommendation_letters_count
        ),
        media_mentions: numericValue(form.achievements.media_mentions_count),
      },
    },
  };
}