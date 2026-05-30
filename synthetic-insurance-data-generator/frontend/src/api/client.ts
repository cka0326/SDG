export type OutputFormat = 'json' | 'jsonl' | 'csv';
export type GenerationMode = 'code' | 'data' | 'both';
export interface Sample { id: string; name: string; description: string; rules: string; schema: unknown }
export interface GenerateRequest { schema_text: string; rules_text: string; count: number; output_format: OutputFormat; mode: GenerationMode }
export interface GenerateResponse { plan: unknown; warnings: string[]; fallback_mode: boolean; pii_warnings: string[]; code: string; data_preview?: unknown; validation_report?: unknown; summary?: unknown; download_url?: string; zip_filename?: string }

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) }, ...init });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
export const api = {
  samples: () => request<Sample[]>('/api/samples'),
  analyze: (body: Pick<GenerateRequest, 'schema_text' | 'rules_text'>) => request<GenerateResponse>('/api/analyze-schema', { method: 'POST', body: JSON.stringify(body) }),
  generateCode: (body: GenerateRequest) => request<GenerateResponse>('/api/generate-code', { method: 'POST', body: JSON.stringify(body) }),
  generateData: (body: GenerateRequest) => request<GenerateResponse>('/api/generate-data', { method: 'POST', body: JSON.stringify(body) }),
};
