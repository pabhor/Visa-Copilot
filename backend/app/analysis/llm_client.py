import json
import re
import requests

OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "llama3.2:3b"


def _fallback_response(summary_text: str, gap: str, next_steps: list[str]) -> dict:
    return {
        "analysis_overview": {
            "readiness_score": 0,
            "strengths": [],
            "gaps": [gap],
        },
        "required_documents": next_steps,
        "detailed_summary": summary_text,
    }


def _normalize_analysis(parsed: dict) -> dict:
    overview = parsed.get("analysis_overview", {})
    if not isinstance(overview, dict):
        overview = {}

    required_documents = parsed.get("required_documents", [])
    if not isinstance(required_documents, list):
        required_documents = []

    detailed_summary = parsed.get("detailed_summary", "")
    if not isinstance(detailed_summary, str):
        detailed_summary = str(detailed_summary)

    return {
        "analysis_overview": {
            "readiness_score": int(overview.get("readiness_score", 0) or 0),
            "strengths": overview.get("strengths", [])
            if isinstance(overview.get("strengths", []), list)
            else [],
            "gaps": overview.get("gaps", [])
            if isinstance(overview.get("gaps", []), list)
            else [],
        },
        "required_documents": required_documents,
        "detailed_summary": detailed_summary,
    }


def _try_parse_json(raw: str) -> dict | None:
    raw = raw.strip()

    try:
        parsed = json.loads(raw)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass

    fenced = raw.replace("```json", "").replace("```", "").strip()
    try:
        parsed = json.loads(fenced)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass

    match = re.search(r"\{.*\}", fenced, re.DOTALL)
    if match:
        candidate = match.group(0).strip()
        try:
            parsed = json.loads(candidate)
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            pass

    if fenced.startswith("{"):
        open_braces = fenced.count("{")
        close_braces = fenced.count("}")
        if open_braces > close_braces:
            repaired = fenced + ("}" * (open_braces - close_braces))
            try:
                parsed = json.loads(repaired)
                if isinstance(parsed, dict):
                    return parsed
            except json.JSONDecodeError:
                pass

    start = fenced.find("{")
    end = fenced.rfind("}")
    if start != -1 and end != -1 and end > start:
        candidate = fenced[start : end + 1]
        try:
            parsed = json.loads(candidate)
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            pass

    return None


def call_ollama(prompt: str) -> dict:
    try:
        response = requests.post(
            OLLAMA_URL,
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
                "format": "json",
                "options": {
                    "temperature": 0,
                    "num_predict": 700,
                },
            },
            timeout=300,
        )
        response.raise_for_status()

        raw = response.json().get("response", "").strip()
        parsed = _try_parse_json(raw)

        if parsed is not None:
            return _normalize_analysis(parsed)

        return _fallback_response(
            raw,
            "Model returned non-JSON output",
            [
                "Prepare a detailed evidence checklist for each O-1 criterion claimed",
                "Review the candidate profile and align supporting documents to USCIS O-1 standards , List the documents in a clear, organized manner",
                "Retry analysis after reducing context size if needed",
            ],
        )

    except requests.exceptions.ConnectionError:
        return _fallback_response(
            "Ollama connection failed.",
            "Could not connect to Ollama server",
            [
                "Make sure Ollama is running locally",
                "Run: ollama list",
                f"Confirm model '{OLLAMA_MODEL}' is installed",
            ],
        )

    except requests.exceptions.Timeout:
        return _fallback_response(
            "Ollama request timed out.",
            "Ollama request timed out",
            [
                "Try a smaller model like llama3.2:3b",
                "Reduce retrieved context size",
                "Increase timeout further if needed",
            ],
        )

    except requests.exceptions.RequestException as e:
        return _fallback_response(
            "Ollama request failed.",
            f"Ollama request failed: {str(e)}",
            ["Check Ollama logs and request payload"],
        )