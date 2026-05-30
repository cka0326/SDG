from typing import Any, Literal
from pydantic import BaseModel, Field

OutputFormat = Literal["json", "jsonl", "csv"]
GenerationMode = Literal["code", "data", "both"]


class AnalyzeRequest(BaseModel):
    schema_text: str = Field(..., min_length=2)
    rules_text: str = ""


class GenerateRequest(AnalyzeRequest):
    count: int = Field(10, ge=1, le=1000)
    output_format: OutputFormat = "json"
    mode: GenerationMode = "both"


class AnalysisResponse(BaseModel):
    plan: dict[str, Any]
    warnings: list[str] = []
    fallback_mode: bool = False
    pii_warnings: list[str] = []


class CodeResponse(AnalysisResponse):
    code: str


class DataResponse(AnalysisResponse):
    code: str
    data_preview: Any
    validation_report: dict[str, Any]
    summary: dict[str, Any]
    zip_filename: str
