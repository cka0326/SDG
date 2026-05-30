import json
import os
from typing import Any

from openai import OpenAI

SCHEMA_ANALYSIS_PROMPT = """You are an insurance test-data architect. Return strict JSON only, no markdown.
Analyze the supplied schema/example and business rules. Return this object:
{
  "normalized_schema": object,
  "field_level_rules": [{"path": string, "type": string, "format": string|null, "enum": array|null, "required": boolean, "strategy": string}],
  "detected_data_types": object,
  "dependencies": [{"fields": [string], "rule": string}],
  "validation_rules": [string],
  "generation_strategy": string,
  "edge_case_suggestions": [string],
  "warnings": [string]
}
Rules: synthetic data only, no real PII. Respect JSON Schema/OpenAPI constraints, enums, nested arrays/objects, date ordering, premium positivity, state codes, and coverageLimit > deductible.
"""

CODE_GENERATION_PROMPT = """You generate safe Python only, no markdown fences. Create generate_data.py for synthetic insurance test payloads.
Requirements: use faker, jsonschema, pydantic/standard libraries when useful; no network calls; no imports except argparse,csv,json,random,datetime,pathlib,typing,faker,jsonschema,pydantic; no arbitrary code execution; filesystem access only to the requested output path; deterministic helper functions; nested objects/arrays; enums; fake names/addresses/emails/phones/VINs/policy numbers; CLI: python generate_data.py --count 100 --format json --output output.json. Add comments explaining generation logic.
"""


def has_api_key() -> bool:
    return bool(os.getenv("OPENAI_API_KEY"))


def analyze_with_llm(schema: dict[str, Any], rules_text: str) -> dict[str, Any] | None:
    if not has_api_key():
        return None
    try:
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"), base_url=os.getenv("OPENAI_BASE_URL") or None)
        response = client.chat.completions.create(
            model=os.getenv("OPENAI_MODEL", "gpt-4.1-mini"),
            messages=[
                {"role": "system", "content": SCHEMA_ANALYSIS_PROMPT},
                {"role": "user", "content": json.dumps({"schema": schema, "rules": rules_text})},
            ],
            response_format={"type": "json_object"},
            temperature=0.1,
        )
        content = response.choices[0].message.content or "{}"
        return json.loads(content)
    except Exception:
        return None


def sanitize_plan(candidate: dict[str, Any], fallback_plan: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(candidate, dict):
        return fallback_plan
    result = dict(fallback_plan)
    for key in ["normalized_schema", "field_level_rules", "detected_data_types", "dependencies", "validation_rules", "generation_strategy", "edge_case_suggestions", "warnings"]:
        if key in candidate and candidate[key] is not None:
            result[key] = candidate[key]
    if not isinstance(result.get("normalized_schema"), dict):
        result["normalized_schema"] = fallback_plan["normalized_schema"]
    return result
