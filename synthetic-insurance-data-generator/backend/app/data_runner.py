import csv
import json
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path
from typing import Any

from .validation import validate_records


def run_generated_code(code: str, schema: dict[str, Any], count: int, output_format: str) -> tuple[Any, dict[str, Any], dict[str, Any], bytes]:
    with tempfile.TemporaryDirectory(prefix="synthetic-insurance-") as tmp:
        root = Path(tmp)
        script = root / "generate_data.py"
        data_file = root / f"generated_data.{output_format}"
        script.write_text(code, encoding="utf-8")
        proc = subprocess.run(
            [sys.executable, str(script), "--count", str(count), "--format", output_format, "--output", str(data_file)],
            cwd=root,
            text=True,
            capture_output=True,
            timeout=20,
            check=False,
        )
        if proc.returncode != 0:
            raise RuntimeError(f"Generated script failed: {proc.stderr or proc.stdout}")
        records = _read_records(data_file, output_format)
        validation = validate_records(records if isinstance(records, list) else [], schema)
        summary = {
            "records_requested": count,
            "records_generated": len(records) if isinstance(records, list) else 0,
            "output_format": output_format,
            "synthetic_only": True,
            "runner": "subprocess with timeout in temporary directory",
        }
        (root / "schema.json").write_text(json.dumps(schema, indent=2), encoding="utf-8")
        (root / "generation_summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
        (root / "validation_report.json").write_text(json.dumps(validation, indent=2), encoding="utf-8")
        zip_path = root / "synthetic_insurance_data.zip"
        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
            for name in [data_file.name, "generate_data.py", "schema.json", "generation_summary.json", "validation_report.json"]:
                zf.write(root / name, arcname=name)
        preview = records[:5] if isinstance(records, list) else records
        return preview, validation, summary, zip_path.read_bytes()


def _read_records(path: Path, output_format: str) -> list[dict[str, Any]]:
    if output_format == "json":
        value = json.loads(path.read_text(encoding="utf-8"))
        return value if isinstance(value, list) else [value]
    if output_format == "jsonl":
        return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))
