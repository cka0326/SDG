SAMPLES = [
    {
        "id": "personal-auto-quote",
        "name": "Personal Auto Insurance Quote",
        "description": "Generate quote requests with fake drivers, vehicles, coverage selections, valid states, policy dates, and positive premiums.",
        "rules": "effectiveDate must be before expirationDate; expirationDate usually one year after effectiveDate. dateOfBirth age 18-80. state valid US code. coverageLimit greater than deductible. VINs, names, phones, emails, and policy numbers must be fake.",
        "schema": {
            "type": "object",
            "required": ["quoteId", "effectiveDate", "expirationDate", "applicant", "vehicles", "coverageLimit", "deductible", "state"],
            "properties": {
                "quoteId": {"type": "string"},
                "state": {"type": "string", "enum": ["CA", "TX", "NY", "FL", "IL", "OH"]},
                "effectiveDate": {"type": "string", "format": "date"},
                "expirationDate": {"type": "string", "format": "date"},
                "applicant": {"type": "object", "required": ["firstName", "lastName", "dateOfBirth", "email"], "properties": {"firstName": {"type": "string"}, "lastName": {"type": "string"}, "dateOfBirth": {"type": "string", "format": "date"}, "email": {"type": "string", "format": "email"}, "phone": {"type": ["string", "null"]}}},
                "vehicles": {"type": "array", "minItems": 1, "maxItems": 3, "items": {"type": "object", "required": ["vin", "year", "make", "model"], "properties": {"vin": {"type": "string"}, "year": {"type": "integer", "minimum": 1995}, "make": {"type": "string"}, "model": {"type": "string"}}}},
                "coverageLimit": {"type": "integer", "minimum": 25000},
                "deductible": {"type": "integer", "enum": [250, 500, 1000, 2500]},
                "premium": {"type": "number", "minimum": 0}
            }
        },
    },
    {
        "id": "homeowners-policy",
        "name": "Homeowners Insurance Policy",
        "description": "Generate fake homeowner policy payloads with property addresses, dwelling limits, deductibles, construction details, and optional mortgagee data.",
        "rules": "effectiveDate before expirationDate. dwellingLimit must be greater than deductible. premium positive. Property address is fake. Optional mortgagee may be omitted or null.",
        "schema": {
            "type": "object",
            "required": ["policyNumber", "effectiveDate", "expirationDate", "insured", "property", "dwellingLimit", "deductible"],
            "properties": {
                "policyNumber": {"type": "string"},
                "effectiveDate": {"type": "string", "format": "date"},
                "expirationDate": {"type": "string", "format": "date"},
                "insured": {"type": "object", "properties": {"name": {"type": "string"}, "email": {"type": "string", "format": "email"}}},
                "property": {"type": "object", "required": ["address", "city", "state", "zip", "constructionType"], "properties": {"address": {"type": "string"}, "city": {"type": "string"}, "state": {"type": "string"}, "zip": {"type": "string"}, "yearBuilt": {"type": "integer", "minimum": 1900}, "constructionType": {"type": "string", "enum": ["frame", "masonry", "brick", "steel"]}}},
                "dwellingLimit": {"type": "integer", "minimum": 100000},
                "deductible": {"type": "integer", "enum": [500, 1000, 2500, 5000]},
                "premium": {"type": "number", "minimum": 0},
                "mortgagee": {"type": ["object", "null"], "properties": {"name": {"type": "string"}, "loanNumber": {"type": "string"}}}
            }
        },
    },
    {
        "id": "cgl-submission",
        "name": "Commercial General Liability Submission",
        "description": "Generate commercial liability submissions with fake business information, class codes, payroll, revenue, limits, and locations.",
        "rules": "Business names and addresses are fake. generalAggregateLimit greater than deductible. annualRevenue and payroll must be positive. Respect entity type and industry enums.",
        "schema": {
            "type": "object",
            "required": ["submissionId", "business", "locations", "annualRevenue", "payroll", "generalAggregateLimit", "deductible"],
            "properties": {
                "submissionId": {"type": "string"},
                "business": {"type": "object", "required": ["legalName", "entityType", "industry"], "properties": {"legalName": {"type": "string"}, "entityType": {"type": "string", "enum": ["LLC", "Corporation", "Partnership", "Sole Proprietor"]}, "industry": {"type": "string", "enum": ["contractor", "retail", "restaurant", "professional_services"]}}},
                "locations": {"type": "array", "minItems": 1, "maxItems": 4, "items": {"type": "object", "properties": {"address": {"type": "string"}, "city": {"type": "string"}, "state": {"type": "string"}, "zip": {"type": "string"}}}},
                "annualRevenue": {"type": "number", "minimum": 10000},
                "payroll": {"type": "number", "minimum": 0},
                "generalAggregateLimit": {"type": "integer", "minimum": 100000},
                "deductible": {"type": "integer", "enum": [0, 500, 1000, 2500, 5000]},
                "premium": {"type": "number", "minimum": 0}
            }
        },
    },
]
