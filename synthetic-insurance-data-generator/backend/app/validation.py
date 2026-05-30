from typing import Any
from jsonschema import Draft202012Validator, ValidationError

UNSUPPORTED = ["oneOf", "anyOf", "allOf", "not", "if", "then", "else", "$ref"]


def validate_records(records: list[dict[str, Any]], schema: dict[str, Any]) -> dict[str, Any]:
    warnings = []
    for key in UNSUPPORTED:
        if _contains_key(schema, key):
            warnings.append(f"Schema feature '{key}' may be only partially supported by generator.")
    valid = 0
    errors = []
    try:
        validator = Draft202012Validator(schema)
        for idx, record in enumerate(records):
            record_errors = list(validator.iter_errors(record))
            if not record_errors:
                valid += 1
            elif len(errors) < 10:
                errors.extend({"record_index": idx, "path": ".".join(map(str, e.path)), "message": e.message} for e in record_errors[:3])
    except Exception as exc:
        warnings.append(f"Validation could not be completed: {exc}")
    return {
        "total_records": len(records),
        "valid_records": valid,
        "invalid_records": len(records) - valid,
        "sample_validation_errors": errors[:10],
        "warnings": warnings,
    }


def _contains_key(value: Any, key: str) -> bool:
    if isinstance(value, dict):
        return key in value or any(_contains_key(v, key) for v in value.values())
    if isinstance(value, list):
        return any(_contains_key(v, key) for v in value)
    return False
