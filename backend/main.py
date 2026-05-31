from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
import anthropic
import subprocess
import json
import tempfile
import os
import re
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Datagen – Insurance Data Generator")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

SYSTEM_PROMPT = """You are an expert synthetic data engineer specializing in the insurance industry.
Your task is to write Python 3 code that generates realistic, high-quality synthetic insurance records.

Strict requirements:
- Only import from: faker, random, datetime, timedelta, uuid, json, string, math
- Create a generate_record() function that returns a single complete dict
- Generate exactly the requested number of records into a list called `results`
- Final line must be exactly: print(json.dumps(results, indent=2, default=str))
- Use Faker() with locale='en_US' for names, addresses, emails, phones
- ALL date relationships must be logically correct (effective < expiration, DOB creates real age, etc.)
- Monetary values must be realistic for insurance domain
- Enum values must be drawn from insurance domain reality
- Follow ALL business rules provided without exception
- Ensure field totals and computed fields are mathematically correct

Output ONLY valid Python 3 code. No markdown fences, no explanations, no comments beyond inline."""


class GenerateCodeRequest(BaseModel):
    schema_text: str = Field(alias="schema")
    business_rules: str = ""
    record_count: int = 10

    model_config = {"populate_by_name": True}


class ExecuteRequest(BaseModel):
    code: str


def clean_code(text: str) -> str:
    text = re.sub(r"^```python\s*\n?", "", text, flags=re.MULTILINE)
    text = re.sub(r"^```\s*\n?", "", text, flags=re.MULTILINE)
    return text.strip()


def run_code(code: str, timeout: int = 90) -> list:
    with tempfile.NamedTemporaryFile(suffix=".py", mode="w", delete=False, encoding="utf-8") as f:
        f.write(code)
        tmpfile = f.name

    try:
        result = subprocess.run(
            ["python3", tmpfile],
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        if result.returncode != 0:
            raise HTTPException(
                status_code=400,
                detail=f"Code execution failed:\n{result.stderr[:3000]}",
            )
        output = result.stdout.strip()
        if not output:
            raise HTTPException(status_code=400, detail="Generated code produced no output. Check the schema and try again.")
        return json.loads(output)
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=408, detail="Code execution timed out (90s). Try reducing record count.")
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Output is not valid JSON: {e}")
    finally:
        try:
            os.unlink(tmpfile)
        except OSError:
            pass


@app.get("/api/health")
async def health():
    return {"status": "ok", "api_key_configured": bool(ANTHROPIC_API_KEY)}


@app.post("/api/generate-code")
async def generate_code(req: GenerateCodeRequest):
    if not ANTHROPIC_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="ANTHROPIC_API_KEY is not set. Add it to backend/.env and restart.",
        )
    if not 1 <= req.record_count <= 200:
        raise HTTPException(status_code=400, detail="Record count must be between 1 and 200.")
    if not req.schema_text.strip():
        raise HTTPException(status_code=400, detail="Schema cannot be empty.")

    rules_block = ""
    if req.business_rules.strip():
        rules_block = f"\nBUSINESS RULES AND FIELD DESCRIPTIONS:\n{req.business_rules}\n"

    prompt = f"""Generate Python 3 code to create exactly {req.record_count} realistic synthetic insurance records.

SCHEMA (treat every constraint in this schema as a strict rule — enums, minimum/maximum, pattern, format, required fields, array item schemas, and any other JSON Schema keywords):
{req.schema_text}
{rules_block}
Requirements:
- Generate exactly {req.record_count} records stored in list `results`
- End with: print(json.dumps(results, indent=2, default=str))
- Data must look indistinguishable from real insurance production data
- Honor ALL constraints found in the schema itself (enum values, numeric ranges, string patterns, date formats, required properties, array lengths, etc.)
- Ensure all computed fields (totals, derived dates, percentages) are mathematically correct"""

    try:
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        message = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=8096,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
        )
        code = clean_code(message.content[0].text)
        return {"code": code}
    except anthropic.APIError as e:
        raise HTTPException(status_code=500, detail=f"AI API error: {e}")


@app.post("/api/execute")
async def execute_code(req: ExecuteRequest):
    if not req.code.strip():
        raise HTTPException(status_code=400, detail="Code cannot be empty.")
    data = run_code(req.code)
    return {"data": data}


# Serve the built frontend in production
_frontend_dist = Path(__file__).parent.parent / "frontend" / "dist"
if _frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(_frontend_dist), html=True), name="static")
