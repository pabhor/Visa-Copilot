export function validateForm(form) {
  const errors = {};

  if (!form.meta.version?.trim()) {
    errors["meta.version"] = "Version is required";
  }

  if (!form.meta.schema?.trim()) {
    errors["meta.schema"] = "Schema is required";
  }

  if (!form.meta.source?.trim()) {
    errors["meta.source"] = "Source is required";
  }

  if (!form.meta.visa_type?.trim()) {
    errors["meta.visa_type"] = "Visa type is required";
  }

  if (!form.candidate.full_name?.trim()) {
    errors["candidate.full_name"] = "Full name is required";
  }

  if (!form.candidate.email?.trim()) {
    errors["candidate.email"] = "Email is required";
  }

  if (!form.candidate.current_role?.trim()) {
    errors["candidate.current_role"] = "Current role is required";
  }

  if (!form.candidate.current_company?.trim()) {
    errors["candidate.current_company"] = "Current company is required";
  }

  if (!form.candidate.years_of_experience?.toString().trim()) {
    errors["candidate.years_of_experience"] = "Years of experience is required";
  }

  if (!form.candidate.country_of_citizenship?.trim()) {
    errors["candidate.country_of_citizenship"] = "Country of citizenship is required";
  }

  if (!form.candidate.current_location?.trim()) {
    errors["candidate.current_location"] = "Current location is required";
  }

  if (!form.education.highest_degree?.trim()) {
    errors["education.highest_degree"] = "Highest degree is required";
  }

  if (!form.education.field_of_study?.trim()) {
    errors["education.field_of_study"] = "Field of study is required";
  }

  if (!form.education.university?.trim()) {
    errors["education.university"] = "University is required";
  }

  if (!form.education.graduation_year?.toString().trim()) {
    errors["education.graduation_year"] = "Graduation year is required";
  }

  if (!form.employer_context.company_name?.trim()) {
    errors["employer_context.company_name"] = "Company name is required";
  }

  if (!form.employer_context.company_stage?.trim()) {
    errors["employer_context.company_stage"] = "Company stage is required";
  }

  if (!form.employer_context.offered_role?.trim()) {
    errors["employer_context.offered_role"] = "Offered role is required";
  }

  if (!form.employer_context.offered_salary_usd?.toString().trim()) {
    errors["employer_context.offered_salary_usd"] = "Offered salary is required";
  }

  if (!form.employer_context.remote_or_onsite?.trim()) {
    errors["employer_context.remote_or_onsite"] = "Remote or onsite is required";
  }

  if (!form.employer_context.h1b_wage_band?.trim()) {
    errors["employer_context.h1b_wage_band"] = "Wage band is required";
  }

  if (!form.consent.confirm_information_accuracy) {
    errors["consent.confirm_information_accuracy"] =
      "You must confirm the information accuracy";
  }

  return errors;
}

export function hasErrors(errors) {
  return Object.keys(errors).length > 0;
}