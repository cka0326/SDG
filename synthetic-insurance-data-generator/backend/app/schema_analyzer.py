import json
import re
from copy import deepcopy
from typing import Any

PII_PATTERNS = [
    ("ssn", re.compile(r"\b\d{3}-\d{2}-\d{4}\b")),
    ("email", re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")),
    ("phone", re.compile(r"\b(?:\+?1[-. ]?)?\(?\d{3}\)?[-. ]?\d{3}[-. ]?\d{4}\b")),
]


def detect_pii(text: str) -> list[str]:
    warnings = []
    for label, pattern in PII_PATTERNS:
        if pattern.search(text):
            warnings.append(f"Possible real {label} detected. Use schemas/examples only; do not paste production data.")
    return warnings


def parse_schema_text(schema_text: str) -> tuple[dict[str, Any], list[str]]:
    warnings: list[str] = []
    try:
        parsed = json.loads(schema_text)
    except json.JSONDecodeError as exc:
        warnings.append(f"Input is not valid JSON; using a permissive object schema. Parse error: {exc}")
        return {"type": "object", "properties": {}, "additionalProperties": True}, warnings

    if isinstance(parsed, dict) and "openapi" in parsed:
        warnings.append("OpenAPI document detected; using the first JSON requestBody schema found.")
        found = _first_request_schema(parsed)
        if found:
            return found, warnings
    if isinstance(parsed, dict) and "type" in parsed or isinstance(parsed, dict) and "properties" in parsed:
        return _normalize_json_schema(parsed), warnings
    return _schema_from_example(parsed), warnings + ["Example JSON detected; inferred a JSON Schema."]


def _first_request_schema(doc: dict[str, Any]) -> dict[str, Any] | None:
    for path in doc.get("paths", {}).values():
        for op in path.values():
            content = op.get("requestBody", {}).get("content", {}) if isinstance(op, dict) else {}
            for media in ("application/json", "application/*+json"):
                schema = content.get(media, {}).get("schema")
                if schema:
                    return _normalize_json_schema(schema)
            for item in content.values():
                if isinstance(item, dict) and item.get("schema"):
                    return _normalize_json_schema(item["schema"])
    return None


def _schema_from_example(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return {
            "type": "object",
            "properties": {k: _schema_from_example(v) for k, v in value.items()},
            "required": list(value.keys()),
        }
    if isinstance(value, list):
        item = value[0] if value else ""
        return {"type": "array", "items": _schema_from_example(item), "minItems": 1, "maxItems": max(1, min(len(value), 3))}
    if isinstance(value, bool):
        return {"type": "boolean"}
    if isinstance(value, int) and not isinstance(value, bool):
        return {"type": "integer"}
    if isinstance(value, float):
        return {"type": "number"}
    if value is None:
        return {"type": ["string", "null"]}
    return {"type": "string"}


def _normalize_json_schema(schema: dict[str, Any]) -> dict[str, Any]:
    normalized = deepcopy(schema)
    if "$schema" not in normalized:
        normalized["$schema"] = "https://json-schema.org/draft/2020-12/schema"
    if "type" not in normalized and "properties" in normalized:
        normalized["type"] = "object"
    return normalized


def build_rule_based_plan(schema: dict[str, Any], rules_text: str, warnings: list[str], fallback: bool) -> dict[str, Any]:
    fields = []
    dependencies = []
    for path, node in walk_schema(schema):
        if path:
            fields.append({
                "path": path,
                "type": node.get("type", "any"),
                "format": node.get("format"),
                "enum": node.get("enum"),
                "required": _is_required(schema, path),
                "strategy": infer_strategy(path, node),
            })
    lowered = rules_text.lower()
    if "effectivedate" in lowered and "expirationdate" in lowered:
        dependencies.append({"fields": ["effectiveDate", "expirationDate"], "rule": "expirationDate after effectiveDate; usually one year later"})
    if "coveragelimit" in lowered and "deductible" in lowered:
        dependencies.append({"fields": ["coverageLimit", "deductible"], "rule": "coverageLimit greater than deductible"})
    return {
        "normalized_schema": schema,
        "field_level_rules": fields,
        "detected_data_types": {f["path"]: f["type"] for f in fields},
        "dependencies": dependencies,
        "validation_rules": ["Validate with jsonschema when a JSON Schema is available."],
        "generation_strategy": "AI-assisted plan" if not fallback else "Rule-based fallback plan; OPENAI_API_KEY not configured or LLM unavailable.",
        "edge_case_suggestions": ["Include boundary deductibles and coverage limits", "Include optional null/omitted fields", "Vary states, ages, and policy terms"],
        "warnings": warnings,
    }


def walk_schema(schema: dict[str, Any], prefix: str = ""):
    typ = schema.get("type")
    if isinstance(typ, list):
        typ = next((t for t in typ if t != "null"), typ[0] if typ else None)
    if typ == "object" or "properties" in schema:
        for name, child in schema.get("properties", {}).items():
            path = f"{prefix}.{name}" if prefix else name
            yield path, child
            yield from walk_schema(child, path)
    elif typ == "array":
        yield from walk_schema(schema.get("items", {}), f"{prefix}[]")


def _is_required(root: dict[str, Any], dotted_path: str) -> bool:
    parts = [p.replace("[]", "") for p in dotted_path.split(".")]
    node = root
    for part in parts[:-1]:
        node = node.get("properties", {}).get(part, {}).get("items", node.get("properties", {}).get(part, {}))
    return parts[-1] in node.get("required", [])


def infer_strategy(path: str, node: dict[str, Any]) -> str:
    name = path.lower()
    if node.get("enum"):
        return "choose from enum"
    if "dateofbirth" in name or "birth" in name:
        return "fake date of birth for allowed adult age range"
    if "effectivedate" in name:
        return "recent/future effective date"
    if "expirationdate" in name:
        return "effective date plus one year when possible"
    if "state" in name:
        return "valid US state abbreviation"
    if any(k in name for k in ["premium", "limit", "deductible", "amount", "value"]):
        return "positive insurance numeric amount"
    if any(k in name for k in ["name", "address", "email", "phone", "vin", "policy", "claim"]):
        return "fake Faker-generated identifier/contact data"
    return "schema-driven fake value"
