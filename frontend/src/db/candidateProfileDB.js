const API_BASE_URL = "http://127.0.0.1:8000";

async function handleJsonResponse(response) {
  if (!response.ok) {
    let message = "Request failed";

    try {
      const data = await response.json();
      message = data.detail || JSON.stringify(data);
    } catch {
      message = await response.text();
    }

    throw new Error(message || "Request failed");
  }

  return response.json();
}

export async function submitCandidateProfile(payload) {
  const response = await fetch(`${API_BASE_URL}/api/candidate-profiles`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return handleJsonResponse(response);
}

export async function fetchCandidateProfiles() {
  const response = await fetch(`${API_BASE_URL}/api/candidate-profiles`, {
    method: "GET",
  });

  return handleJsonResponse(response);
}

export async function fetchCandidateProfileById(profileId) {
  const response = await fetch(`${API_BASE_URL}/api/candidate-profiles/${profileId}`, {
    method: "GET",
  });

  return handleJsonResponse(response);
}

export async function analyzeCandidateProfile(profileId) {
  const response = await fetch(`${API_BASE_URL}/api/candidate-profiles/${profileId}/analyze`, {
    method: "POST",
  });

  return handleJsonResponse(response);
}