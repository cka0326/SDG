export interface SampleSchema {
  id: string
  name: string
  icon: string
  description: string
  schema: string
  businessRules: string
}

export const sampleSchemas: SampleSchema[] = [
  {
    id: 'auto-policy',
    name: 'Personal Auto',
    icon: '🚗',
    description: 'Personal auto insurance policy with driver, vehicle, coverages, and premium',
    schema: `{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Personal Auto Insurance Policy",
  "type": "object",
  "properties": {
    "policy_number":       { "type": "string" },
    "status":              { "type": "string", "enum": ["Active","Cancelled","Expired","Pending"] },
    "effective_date":      { "type": "string", "format": "date" },
    "expiration_date":     { "type": "string", "format": "date" },
    "insured": {
      "type": "object",
      "properties": {
        "first_name":      { "type": "string" },
        "last_name":       { "type": "string" },
        "date_of_birth":   { "type": "string", "format": "date" },
        "email":           { "type": "string" },
        "phone":           { "type": "string" },
        "address": {
          "type": "object",
          "properties": {
            "street":      { "type": "string" },
            "city":        { "type": "string" },
            "state":       { "type": "string" },
            "zip":         { "type": "string" }
          }
        },
        "license_number":  { "type": "string" },
        "years_licensed":  { "type": "integer" }
      }
    },
    "vehicle": {
      "type": "object",
      "properties": {
        "year":            { "type": "integer" },
        "make":            { "type": "string" },
        "model":           { "type": "string" },
        "vin":             { "type": "string" },
        "usage":           { "type": "string", "enum": ["Personal","Commute","Business"] },
        "annual_mileage":  { "type": "integer" }
      }
    },
    "coverages": {
      "type": "object",
      "properties": {
        "bodily_injury_limits":        { "type": "string" },
        "property_damage_limit":       { "type": "integer" },
        "collision_deductible":        { "type": "integer" },
        "comprehensive_deductible":    { "type": "integer" },
        "uninsured_motorist":          { "type": "boolean" },
        "roadside_assistance":         { "type": "boolean" },
        "rental_reimbursement":        { "type": "boolean" }
      }
    },
    "premium": {
      "type": "object",
      "properties": {
        "six_month_premium":  { "type": "number" },
        "monthly_payment":    { "type": "number" },
        "payment_plan":       { "type": "string", "enum": ["Full Pay","Monthly","Quarterly"] },
        "discounts_applied":  { "type": "array", "items": { "type": "string" } }
      }
    }
  }
}`,
    businessRules: `Policies run for 6-month terms: expiration_date = effective_date + exactly 6 months.
monthly_payment = round(six_month_premium / 6, 2).
Drivers must be 16–85 years old; years_licensed <= (driver's age - 16).
Vehicle years: 1990–2025. Common makes: Toyota, Honda, Ford, Chevrolet, BMW, Subaru, Hyundai, Nissan, Kia, Volkswagen.
bodily_injury_limits options (thousands): "25/50", "50/100", "100/300", "250/500".
property_damage_limit: 25000, 50000, or 100000.
collision_deductible: 250, 500, 1000, or 2000.
comprehensive_deductible: 100, 250, 500, or 1000.
six_month_premium: $450–$1,800 (higher for young drivers and low deductibles).
Apply 2–4 realistic discounts per policy: "Multi-Car", "Good Driver", "Homeowner", "Paid in Full", "Good Student", "Low Mileage", "Anti-Theft Device", "Loyalty".
annual_mileage: 5,000–20,000.
policy_number format: "PA-" + 8 random digits (e.g., "PA-20483712").
VIN: exactly 17 uppercase alphanumeric characters (no I, O, Q).`,
  },

  {
    id: 'homeowners',
    name: 'Homeowners',
    icon: '🏠',
    description: 'Homeowners insurance policy with property details, coverages, and mortgage info',
    schema: `{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Homeowners Insurance Policy",
  "type": "object",
  "properties": {
    "policy_number":   { "type": "string" },
    "status":          { "type": "string", "enum": ["Active","Cancelled","Non-Renewed","Pending"] },
    "effective_date":  { "type": "string", "format": "date" },
    "expiration_date": { "type": "string", "format": "date" },
    "insured": {
      "type": "object",
      "properties": {
        "first_name":          { "type": "string" },
        "last_name":           { "type": "string" },
        "email":               { "type": "string" },
        "phone":               { "type": "string" },
        "occupancy":           { "type": "string", "enum": ["Owner Occupied","Rental","Seasonal","Vacant"] },
        "years_at_residence":  { "type": "integer" }
      }
    },
    "property": {
      "type": "object",
      "properties": {
        "address": {
          "type": "object",
          "properties": {
            "street":  { "type": "string" },
            "city":    { "type": "string" },
            "state":   { "type": "string" },
            "zip":     { "type": "string" }
          }
        },
        "year_built":         { "type": "integer" },
        "square_footage":     { "type": "integer" },
        "stories":            { "type": "integer" },
        "construction_type":  { "type": "string", "enum": ["Frame","Masonry","Log","Mixed"] },
        "roof_type":          { "type": "string", "enum": ["Asphalt Shingle","Metal","Tile","Wood Shake"] },
        "roof_year":          { "type": "integer" },
        "has_pool":           { "type": "boolean" },
        "has_security_alarm": { "type": "boolean" },
        "has_fireplace":      { "type": "boolean" }
      }
    },
    "coverage": {
      "type": "object",
      "properties": {
        "dwelling_amount":     { "type": "number" },
        "other_structures":    { "type": "number" },
        "personal_property":   { "type": "number" },
        "loss_of_use":         { "type": "number" },
        "liability_limit":     { "type": "number" },
        "medical_payments":    { "type": "number" },
        "deductible":          { "type": "number" },
        "annual_premium":      { "type": "number" }
      }
    },
    "mortgage": {
      "type": "object",
      "properties": {
        "has_mortgage":    { "type": "boolean" },
        "lender_name":     { "type": "string" },
        "loan_number":     { "type": "string" },
        "escrow_premium":  { "type": "boolean" }
      }
    }
  }
}`,
    businessRules: `Policies run for exactly 1 year: expiration_date = effective_date + 365 days.
other_structures = round(dwelling_amount * 0.10, 2).
personal_property = round(dwelling_amount * 0.50, 2).
loss_of_use = round(dwelling_amount * 0.20, 2).
dwelling_amount: $150,000–$1,500,000 (realistic home replacement costs).
liability_limit options: 100000, 300000, or 500000.
medical_payments options: 1000, 2000, or 5000.
deductible options: 500, 1000, 2500, or 5000.
annual_premium = round(dwelling_amount * random between 0.005 and 0.012, 2).
year_built: 1940–2022. roof_year >= year_built and <= current year.
square_footage: 800–5,000. stories: 1 or 2 (rarely 3).
75% of policies have a mortgage; common lenders: Wells Fargo, Bank of America, JPMorgan Chase, US Bank, Quicken Loans/Rocket Mortgage.
policy_number format: "HO-" + 8 random digits.`,
  },

  {
    id: 'workers-comp',
    name: 'Workers Comp',
    icon: '🦺',
    description: 'Workers compensation claim with injury, claimant, employer, and financials',
    schema: `{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Workers Compensation Claim",
  "type": "object",
  "properties": {
    "claim_number":        { "type": "string" },
    "date_of_loss":        { "type": "string", "format": "date" },
    "date_reported":       { "type": "string", "format": "date" },
    "date_opened":         { "type": "string", "format": "date" },
    "status":              { "type": "string", "enum": ["Open","Closed","Reopened","Denied","Settled"] },
    "claimant": {
      "type": "object",
      "properties": {
        "first_name":        { "type": "string" },
        "last_name":         { "type": "string" },
        "employee_id":       { "type": "string" },
        "date_of_birth":     { "type": "string", "format": "date" },
        "hire_date":         { "type": "string", "format": "date" },
        "job_title":         { "type": "string" },
        "department":        { "type": "string" },
        "weekly_wage":       { "type": "number" },
        "employment_type":   { "type": "string", "enum": ["Full-Time","Part-Time","Seasonal","Contract"] }
      }
    },
    "employer": {
      "type": "object",
      "properties": {
        "name":            { "type": "string" },
        "policy_number":   { "type": "string" },
        "industry":        { "type": "string" },
        "state":           { "type": "string" }
      }
    },
    "injury": {
      "type": "object",
      "properties": {
        "body_part":              { "type": "string" },
        "injury_type":            { "type": "string" },
        "cause":                  { "type": "string" },
        "description":            { "type": "string" },
        "is_occupational_disease":{ "type": "boolean" },
        "days_lost_from_work":    { "type": "integer" },
        "return_to_work_date":    { "type": "string", "format": "date" }
      }
    },
    "treatment": {
      "type": "object",
      "properties": {
        "treating_physician":     { "type": "string" },
        "hospital":               { "type": "string" },
        "surgeries_required":     { "type": "boolean" },
        "physical_therapy":       { "type": "boolean" }
      }
    },
    "financials": {
      "type": "object",
      "properties": {
        "medical_paid":       { "type": "number" },
        "medical_reserves":   { "type": "number" },
        "indemnity_paid":     { "type": "number" },
        "indemnity_reserves": { "type": "number" },
        "total_incurred":     { "type": "number" }
      }
    },
    "adjuster": {
      "type": "object",
      "properties": {
        "name":   { "type": "string" },
        "id":     { "type": "string" },
        "phone":  { "type": "string" },
        "email":  { "type": "string" }
      }
    }
  }
}`,
    businessRules: `date_reported is within 1–30 days after date_of_loss.
date_opened is 0–3 days after date_reported.
claimant hire_date must be before date_of_loss; claimant must be 18–70 years old.
weekly_wage: $450–$1,800 (varies by industry and job title).
indemnity weekly benefit = round(weekly_wage * 0.6667, 2).
indemnity_paid = days_lost_from_work / 7 * indemnity_weekly_benefit.
return_to_work_date = date_of_loss + days_lost_from_work days (days_lost: 0–365).
total_incurred = medical_paid + medical_reserves + indemnity_paid + indemnity_reserves.
Claim status distribution: 50% Open, 35% Closed, 8% Settled, 5% Denied, 2% Reopened.
Common body parts: Lower Back, Knee, Shoulder, Finger/Hand, Wrist, Ankle, Neck, Eye.
Common injury types: Sprain/Strain, Laceration, Fracture, Contusion, Cumulative Trauma.
Common causes: Overexertion, Slip/Fall, Struck By Object, Repetitive Motion, Motor Vehicle.
Industries: Manufacturing, Construction, Healthcare, Retail, Transportation, Food Service.
claim_number format: "WC-" + 4-digit year + "-" + 6 digits (e.g., "WC-2024-038421").`,
  },

  {
    id: 'commercial-gl',
    name: 'Commercial GL',
    icon: '🏢',
    description: 'Commercial general liability policy for businesses with locations and coverages',
    schema: `{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Commercial General Liability Policy",
  "type": "object",
  "properties": {
    "policy_number":   { "type": "string" },
    "status":          { "type": "string", "enum": ["Active","Cancelled","Non-Renewed","Pending"] },
    "effective_date":  { "type": "string", "format": "date" },
    "expiration_date": { "type": "string", "format": "date" },
    "named_insured": {
      "type": "object",
      "properties": {
        "business_name":      { "type": "string" },
        "dba":                { "type": "string" },
        "entity_type":        { "type": "string", "enum": ["Corporation","LLC","Partnership","Sole Proprietor"] },
        "fein":               { "type": "string" },
        "sic_code":           { "type": "string" },
        "industry":           { "type": "string" },
        "years_in_business":  { "type": "integer" },
        "address": {
          "type": "object",
          "properties": {
            "street":  { "type": "string" },
            "city":    { "type": "string" },
            "state":   { "type": "string" },
            "zip":     { "type": "string" }
          }
        },
        "annual_revenue":   { "type": "number" },
        "annual_payroll":   { "type": "number" },
        "employee_count":   { "type": "integer" }
      }
    },
    "coverage": {
      "type": "object",
      "properties": {
        "occurrence_limit":                    { "type": "number" },
        "general_aggregate":                   { "type": "number" },
        "products_completed_ops_aggregate":    { "type": "number" },
        "personal_advertising_injury":         { "type": "number" },
        "damage_to_rented_premises":           { "type": "number" },
        "medical_expenses_per_person":         { "type": "number" },
        "deductible":                          { "type": "number" },
        "annual_premium":                      { "type": "number" }
      }
    },
    "locations": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "location_number":  { "type": "integer" },
          "address": {
            "type": "object",
            "properties": {
              "street": { "type": "string" },
              "city":   { "type": "string" },
              "state":  { "type": "string" },
              "zip":    { "type": "string" }
            }
          },
          "square_footage":   { "type": "integer" },
          "is_primary":       { "type": "boolean" }
        }
      }
    },
    "additional_insureds": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name":         { "type": "string" },
          "relationship": { "type": "string" }
        }
      }
    }
  }
}`,
    businessRules: `Policies run for exactly 1 year: expiration_date = effective_date + 365 days.
general_aggregate = occurrence_limit * 2.
products_completed_ops_aggregate = general_aggregate.
personal_advertising_injury = occurrence_limit.
occurrence_limit options: 500000, 1000000, or 2000000.
damage_to_rented_premises: $50,000–$300,000.
medical_expenses_per_person: $5,000–$25,000.
deductible: 0, 500, 1000, or 2500.
annual_premium: $1,500–$20,000 (scales with payroll and revenue).
annual_payroll: 20–40% of annual_revenue.
FEIN format: "XX-XXXXXXX" (e.g., "47-3821049").
Include 1–3 locations; first location matches named_insured address and has is_primary = true.
Include 0–3 additional_insureds with relationships like: "Landlord", "General Contractor", "Certificate Holder", "Franchisor".
SIC codes: 5411 (Grocery), 7011 (Hotels), 1521 (General Construction), 8011 (Medical Offices), 5812 (Restaurants), 7372 (Software), 8742 (Consulting).
policy_number format: "CGL-" + 8 random digits.`,
  },

  {
    id: 'health-claim',
    name: 'Health Claim',
    icon: '⚕️',
    description: 'Health insurance claim with member, provider, diagnosis codes, and EOB',
    schema: `{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Health Insurance Claim",
  "type": "object",
  "properties": {
    "claim_number":     { "type": "string" },
    "claim_type":       { "type": "string", "enum": ["Medical","Dental","Vision","Pharmacy","Mental Health"] },
    "date_of_service":  { "type": "string", "format": "date" },
    "date_received":    { "type": "string", "format": "date" },
    "date_processed":   { "type": "string", "format": "date" },
    "status":           { "type": "string", "enum": ["Paid","Denied","Pending","Partially Paid","Appealed"] },
    "member": {
      "type": "object",
      "properties": {
        "member_id":                { "type": "string" },
        "first_name":               { "type": "string" },
        "last_name":                { "type": "string" },
        "date_of_birth":            { "type": "string", "format": "date" },
        "group_number":             { "type": "string" },
        "plan_type":                { "type": "string", "enum": ["HMO","PPO","EPO","HDHP"] },
        "subscriber_relationship":  { "type": "string", "enum": ["Self","Spouse","Child","Dependent"] }
      }
    },
    "provider": {
      "type": "object",
      "properties": {
        "npi":         { "type": "string" },
        "name":        { "type": "string" },
        "specialty":   { "type": "string" },
        "in_network":  { "type": "boolean" },
        "tin":         { "type": "string" }
      }
    },
    "diagnosis": {
      "type": "object",
      "properties": {
        "primary_icd10":       { "type": "string" },
        "primary_description": { "type": "string" },
        "secondary_icd10":     { "type": "string" }
      }
    },
    "service_lines": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "cpt_code":               { "type": "string" },
          "description":            { "type": "string" },
          "units":                  { "type": "integer" },
          "billed_amount":          { "type": "number" },
          "allowed_amount":         { "type": "number" },
          "plan_paid":              { "type": "number" },
          "patient_responsibility": { "type": "number" }
        }
      }
    },
    "claim_totals": {
      "type": "object",
      "properties": {
        "total_billed":               { "type": "number" },
        "total_allowed":              { "type": "number" },
        "total_plan_paid":            { "type": "number" },
        "deductible_applied":         { "type": "number" },
        "coinsurance_amount":         { "type": "number" },
        "copay_amount":               { "type": "number" },
        "total_patient_responsibility":{ "type": "number" }
      }
    },
    "explanation_of_benefits": {
      "type": "object",
      "properties": {
        "eob_number":      { "type": "string" },
        "denial_reason":   { "type": "string" },
        "appeal_deadline": { "type": "string", "format": "date" }
      }
    }
  }
}`,
    businessRules: `date_received is 1–5 days after date_of_service.
date_processed is 7–30 days after date_received.
allowed_amount < billed_amount (insurers discount 25–55% from billed).
For PPO/EPO in-network: plan_paid = allowed_amount * 0.80 (after deductible/copay).
For HMO: plan_paid = allowed_amount - copay_amount (flat copay model).
patient_responsibility = allowed_amount - plan_paid.
claim_totals must sum correctly from service_lines.
appeal_deadline = date_processed + 60 days.
1–4 service lines per claim.
Common CPT codes: 99213 (Office Visit, Established), 99214 (Complex Office Visit), 93000 (EKG), 71046 (Chest X-Ray), 85025 (CBC Blood Panel), 99283 (Emergency Dept Visit), 90837 (Psychotherapy 60 min).
Common ICD-10 codes: J06.9 (URI), M54.5 (Low Back Pain), Z00.00 (Annual Exam), I10 (Hypertension), E11.9 (Type 2 Diabetes), J45.20 (Mild Persistent Asthma).
NPI: exactly 10 digits. TIN format: "XX-XXXXXXX".
Claim status: 65% Paid, 15% Partially Paid, 12% Denied, 5% Pending, 3% Appealed.
claim_number format: "HC-" + year + "-" + 8 digits. eob_number: "EOB-" + year + "-" + 8 digits.
Member ages: 1–89. member_id: "M" + 9 digits. group_number: "G" + 7 digits.`,
  },
]
