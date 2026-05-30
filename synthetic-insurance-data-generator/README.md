# Synthetic Insurance Data Generator

A runnable full-stack POC for AI-assisted synthetic insurance API test-data generation. Users paste a JSON Schema, OpenAPI request schema, or example JSON payload; describe insurance field meanings and rules; then generate either a safe Python generator script, a ZIP of generated payload data, or both.

> Privacy guardrail: this app is for synthetic test data only. Do not paste real policyholder, claimant, driver, homeowner, business, or production records.

## Features

- React + TypeScript + Vite single-page UI.
- FastAPI backend with OpenAI API-compatible schema analysis via `OPENAI_API_KEY`.
- Rule-based fallback mode when no API key is configured.
- Synthetic Python generator using `faker`, `jsonschema`, and standard libraries.
- JSON, JSONL, and CSV output formats.
- ZIP packaging with:
  - `generated_data.json`, `generated_data.jsonl`, or `generated_data.csv`
  - `generate_data.py`
  - `schema.json`
  - `generation_summary.json`
  - `validation_report.json`
- Built-in samples:
  - Personal Auto Insurance Quote
  - Homeowners Insurance Policy
  - Commercial General Liability Submission
- PII input warnings for obvious emails, phone numbers, and SSNs.

## Project structure

```text
synthetic-insurance-data-generator/
  frontend/
    src/
      components/
      pages/
      api/
      App.tsx
      main.tsx
    package.json
    vite.config.ts
  backend/
    app/
      main.py
      models.py
      llm_service.py
      schema_analyzer.py
      code_generator.py
      data_runner.py
      validation.py
      samples.py
    requirements.txt
    Dockerfile
  docker-compose.yml
  README.md
  .env.example
```

## Environment variables

Copy `.env.example` to `.env` for Docker Compose or export variables locally.

| Variable | Required | Description |
| --- | --- | --- |
| `OPENAI_API_KEY` | No | Enables AI-assisted schema understanding. If omitted, fallback mode is used. |
| `OPENAI_BASE_URL` | No | Optional OpenAI-compatible API base URL. |
| `OPENAI_MODEL` | No | Model for schema analysis. Defaults to `gpt-4.1-mini`. |

## Run with Docker Compose

```bash
cd synthetic-insurance-data-generator
cp .env.example .env
# optionally edit .env to add OPENAI_API_KEY
docker compose up --build
```

Open <http://localhost:5173>. The backend is available at <http://localhost:8000/api/health>.

## Run locally without Docker

Backend:

```bash
cd synthetic-insurance-data-generator/backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Frontend:

```bash
cd synthetic-insurance-data-generator/frontend
npm install
npm run dev
```

Open <http://localhost:5173>.

## Example usage

1. Start the frontend and backend.
2. Select **Personal Auto Insurance Quote** from the sample selector.
3. Review or edit the schema and business rules.
4. Set record count to `25` and output format to `JSON`.
5. Click **Generate Both**.
6. Review the code, data preview, generation plan, and validation report tabs.
7. Download `generate_data.py` or the ZIP package.

The generated Python script can also be run directly:

```bash
python generate_data.py --count 100 --format json --output output.json
python generate_data.py --count 100 --format jsonl --output output.jsonl
python generate_data.py --count 100 --format csv --output output.csv
```

## API endpoints

- `GET /api/health`
- `GET /api/samples`
- `POST /api/analyze-schema`
- `POST /api/generate-code`
- `POST /api/generate-data`
- `GET /api/download/{token}`

## Safety design

- The UI displays a visible synthetic-only disclaimer.
- The backend warns if pasted text appears to include common PII patterns.
- Generated scripts use Faker and deterministic helper functions.
- Generated scripts avoid network calls and do not execute arbitrary user input.
- Data generation runs in a temporary backend directory with a timeout.
- Records are validated with `jsonschema` when a usable JSON Schema is available.

## Known POC limitations

- LLM-generated schema plans are sanitized and supplemented, but only rule-based code generation is used for deterministic safety in this POC.
- Complex JSON Schema features such as `$ref`, `oneOf`, `anyOf`, `allOf`, and conditional schemas are reported as warnings and may be partially supported.
- CSV output flattens nested objects and JSON-serializes arrays.
- The subprocess runner is intentionally simple and should be hardened with container isolation before production use.
- ZIP downloads are stored in in-memory cache and expire when the backend process restarts.
- PII detection is heuristic and is not a substitute for data-loss-prevention tooling.

## Future enhancements

- Sandboxed container execution for generated scripts.
- Rich schema tree editor with field-level rule overrides.
- More insurance lines of business and edge-case libraries.
- Persistent project/session storage.
- Advanced validation of OpenAPI `$ref` and composed schemas.
- Test scenario balancing, boundary-case generation, and negative test generation.
