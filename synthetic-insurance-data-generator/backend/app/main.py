import json
import uuid
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from .code_generator import generate_python_code
from .data_runner import run_generated_code
from .llm_service import analyze_with_llm, sanitize_plan
from .models import AnalysisResponse, CodeResponse, GenerateRequest, AnalyzeRequest
from .samples import SAMPLES
from .schema_analyzer import build_rule_based_plan, detect_pii, parse_schema_text

app = FastAPI(title="Synthetic Insurance Data Generator", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
ZIP_CACHE: dict[str, bytes] = {}


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/samples")
def samples() -> list[dict[str, Any]]:
    return SAMPLES


@app.post("/api/analyze-schema", response_model=AnalysisResponse)
def analyze_schema(request: AnalyzeRequest) -> AnalysisResponse:
    schema, warnings = parse_schema_text(request.schema_text)
    pii = detect_pii(request.schema_text + "\n" + request.rules_text)
    fallback_plan = build_rule_based_plan(schema, request.rules_text, warnings, fallback=True)
    llm_plan = analyze_with_llm(schema, request.rules_text)
    fallback = llm_plan is None
    plan = fallback_plan if fallback else sanitize_plan(llm_plan, build_rule_based_plan(schema, request.rules_text, warnings, fallback=False))
    return AnalysisResponse(plan=plan, warnings=warnings + (["AI-assisted rule extraction disabled; using fallback mode."] if fallback else []), fallback_mode=fallback, pii_warnings=pii)


@app.post("/api/generate-code", response_model=CodeResponse)
def generate_code(request: GenerateRequest) -> CodeResponse:
    analysis = analyze_schema(request)
    schema = analysis.plan.get("normalized_schema", {})
    code = generate_python_code(schema, analysis.plan)
    return CodeResponse(plan=analysis.plan, warnings=analysis.warnings, fallback_mode=analysis.fallback_mode, pii_warnings=analysis.pii_warnings, code=code)


@app.post("/api/generate-data")
def generate_data(request: GenerateRequest) -> dict[str, Any]:
    generated = generate_code(request)
    schema = generated.plan.get("normalized_schema", {})
    try:
        preview, validation, summary, zip_bytes = run_generated_code(generated.code, schema, request.count, request.output_format)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    token = f"synthetic_insurance_data_{uuid.uuid4().hex}.zip"
    ZIP_CACHE[token] = zip_bytes
    return {
        "plan": generated.plan,
        "warnings": generated.warnings,
        "fallback_mode": generated.fallback_mode,
        "pii_warnings": generated.pii_warnings,
        "code": generated.code,
        "data_preview": preview,
        "validation_report": validation,
        "summary": summary,
        "zip_filename": token,
        "download_url": f"/api/download/{token}",
    }


@app.get("/api/download/{token}")
def download(token: str) -> Response:
    data = ZIP_CACHE.get(token)
    if data is None:
        raise HTTPException(status_code=404, detail="ZIP not found or expired")
    return Response(content=data, media_type="application/zip", headers={"Content-Disposition": f"attachment; filename={token}"})
