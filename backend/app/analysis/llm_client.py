import json
import os
import re
from typing import Any

import requests


def _safe_str(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _safe_list(value: Any) -> list:
    return value if isinstance(value, list) else []


def _extract_json(raw: str) -> dict | None:
    if not raw:
        return None

    raw = raw.strip()

    candidates = [
        raw,
        raw.replace("```json", "").replace("```", "").strip(),
    ]

    for candidate in candidates:
        try:
            parsed = json.loads(candidate)
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            pass

    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if match:
        try:
            parsed = json.loads(match.group(0))
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            pass

    return None


def _analysis_fallback(message: str) -> dict:
    return {
        "analysis_overview": {
            "readiness_score": 0,
            "case_assessment": "Analysis generation failed",
            "strengths": [],
            "gaps": [message],
            "key_risks": [message],
        },
        "candidate_profile_summary": "",
        "required_documents": [],
        "criterion_breakdown": [],
        "strategic_next_steps": [],
        "detailed_summary": message,
    }


def _evaluation_fallback(message: str) -> dict:
    return {
        "overall_score": 0,
        "policy_alignment": 0,
        "factual_grounding": 0,
        "completeness": 0,
        "structure_quality": 0,
        "feedback": {
            "strengths": [],
            "issues": [message],
            "missing_points": [],
            "refinement_instructions": [],
            "issue_tags": [],
            "section_scores": {
                "strengths": 0,
                "gaps": 0,
                "required_documents": 0,
                "summary": 0,
                "criteria": 0,
            },
        },
    }


def _normalize_analysis(parsed: dict) -> dict:
    overview = parsed.get("analysis_overview", {})
    if not isinstance(overview, dict):
        overview = {}

    try:
        score = int(overview.get("readiness_score", 0))
    except Exception:
        score = 0

    return {
        "analysis_overview": {
            "readiness_score": max(0, min(100, score)),
            "case_assessment": _safe_str(overview.get("case_assessment")),
            "strengths": [str(x).strip() for x in _safe_list(overview.get("strengths")) if str(x).strip()],
            "gaps": [str(x).strip() for x in _safe_list(overview.get("gaps")) if str(x).strip()],
            "key_risks": [str(x).strip() for x in _safe_list(overview.get("key_risks")) if str(x).strip()],
        },
        "candidate_profile_summary": _safe_str(parsed.get("candidate_profile_summary")),
        "required_documents": parsed.get("required_documents", []) if isinstance(parsed.get("required_documents"), list) else [],
        "criterion_breakdown": parsed.get("criterion_breakdown", []) if isinstance(parsed.get("criterion_breakdown"), list) else [],
        "strategic_next_steps": [str(x).strip() for x in _safe_list(parsed.get("strategic_next_steps")) if str(x).strip()],
        "detailed_summary": _safe_str(parsed.get("detailed_summary")),
    }


def _normalize_patch(parsed: dict) -> dict:
    output = {}

    if "analysis_overview" in parsed and isinstance(parsed["analysis_overview"], dict):
        ao = parsed["analysis_overview"]
        output["analysis_overview"] = {
            "strengths": [str(x).strip() for x in _safe_list(ao.get("strengths")) if str(x).strip()],
            "gaps": [str(x).strip() for x in _safe_list(ao.get("gaps")) if str(x).strip()],
            "key_risks": [str(x).strip() for x in _safe_list(ao.get("key_risks")) if str(x).strip()],
        }

    for key in ["required_documents", "criterion_breakdown", "strategic_next_steps"]:
        if key in parsed and isinstance(parsed[key], list):
            output[key] = parsed[key]

    if "detailed_summary" in parsed and isinstance(parsed["detailed_summary"], str):
        output["detailed_summary"] = parsed["detailed_summary"].strip()

    return output


def _normalize_evaluation(parsed: dict) -> dict:
    feedback = parsed.get("feedback", {})
    if not isinstance(feedback, dict):
        feedback = {}

    section_scores = feedback.get("section_scores", {})
    if not isinstance(section_scores, dict):
        section_scores = {}

    def score_field(name: str) -> float:
        try:
            return max(0.0, min(100.0, float(parsed.get(name, 0))))
        except Exception:
            return 0.0

    def section_score(name: str) -> float:
        try:
            return max(0.0, min(100.0, float(section_scores.get(name, 0))))
        except Exception:
            return 0.0

    return {
        "overall_score": score_field("overall_score"),
        "policy_alignment": score_field("policy_alignment"),
        "factual_grounding": score_field("factual_grounding"),
        "completeness": score_field("completeness"),
        "structure_quality": score_field("structure_quality"),
        "feedback": {
            "strengths": [str(x).strip() for x in _safe_list(feedback.get("strengths")) if str(x).strip()],
            "issues": [str(x).strip() for x in _safe_list(feedback.get("issues")) if str(x).strip()],
            "missing_points": [str(x).strip() for x in _safe_list(feedback.get("missing_points")) if str(x).strip()],
            "refinement_instructions": [str(x).strip() for x in _safe_list(feedback.get("refinement_instructions")) if str(x).strip()],
            "issue_tags": [str(x).strip() for x in _safe_list(feedback.get("issue_tags")) if str(x).strip()],
            "section_scores": {
                "strengths": section_score("strengths"),
                "gaps": section_score("gaps"),
                "required_documents": section_score("required_documents"),
                "summary": section_score("summary"),
                "criteria": section_score("criteria"),
            },
        },
    }


def call_ollama_analysis(prompt: str) -> dict:
    ollama_url = os.getenv("OLLAMA_URL", "http://localhost:11434/api/generate")
    ollama_model = os.getenv("OLLAMA_MODEL", "llama3.2:3b")

    try:
        response = requests.post(
            ollama_url,
            json={
                "model": ollama_model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0,
                    "num_predict": 700,
                    "num_ctx": 1536,
                },
            },
            timeout=150,
        )

        if not response.ok:
            return _analysis_fallback(f"Ollama analysis failed: status={response.status_code}, response={response.text}")

        raw = response.json().get("response", "").strip()
        parsed = _extract_json(raw)

        if not parsed:
            return _analysis_fallback(f"Ollama returned non-JSON output: {raw[:500]}")

        return _normalize_analysis(parsed)

    except Exception as e:
        return _analysis_fallback(f"Ollama analysis failed: {str(e)}")


def call_ollama_patch(prompt: str) -> dict:
    ollama_url = os.getenv("OLLAMA_URL", "http://localhost:11434/api/generate")
    ollama_model = os.getenv("OLLAMA_MODEL", "llama3.2:3b")

    try:
        response = requests.post(
            ollama_url,
            json={
                "model": ollama_model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0,
                    "num_predict": 450,
                    "num_ctx": 1024,
                },
            },
            timeout=120,
        )

        if not response.ok:
            return {}

        raw = response.json().get("response", "").strip()
        parsed = _extract_json(raw)
        if not parsed:
            return {}

        return _normalize_patch(parsed)
    except Exception:
        return {}


def call_gemini_evaluator(prompt: str) -> dict:
    try:
        from google import genai
    except Exception as e:
        return _evaluation_fallback(f"Gemini SDK import failed: {str(e)}")

    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

    if not api_key:
        return _evaluation_fallback("Gemini API key is missing")

    try:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
        )
        raw = (response.text or "").strip()
        parsed = _extract_json(raw)

        if not parsed:
            return _evaluation_fallback("Gemini returned invalid JSON for evaluation")

        return _normalize_evaluation(parsed)
    except Exception as e:
        return _evaluation_fallback(f"Gemini evaluation failed: {str(e)}")