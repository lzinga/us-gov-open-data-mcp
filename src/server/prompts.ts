/**
 * Cross-cutting analysis prompts — reusable multi-API investigation templates.
 *
 * These prompts span multiple modules and provide step-by-step instructions
 * for common research patterns. Each returns a detailed plan telling the client
 * which tools to call and in what order.
 *
 * Users invoke these from the MCP prompt picker (e.g. "/" menu in VS Code).
 */

import type { InputPrompt } from "fastmcp";

export const analysisPrompts: InputPrompt<any, any>[] = [

  // ─── Economic & Fiscal ─────────────────────────────────────────────

  {
    name: "compare_presidents",
    description: "Compare the economic performance of two or more presidents using identical metrics.",
    arguments: [
      { name: "presidents", description: "Comma-separated names (e.g. 'Obama, Trump, Biden')", required: true },
    ],
    load: async ({ presidents }) =>
      `Compare the economic performance of: ${presidents}\n\n` +
      "For EACH president, pull these FRED series at inauguration month vs departure month:\n" +
      "- GDP (quarterly)\n- UNRATE (unemployment)\n- PAYEMS (jobs)\n- CPIAUCSL (inflation)\n" +
      "- FEDFUNDS (Fed rate)\n- SP500 (S&P 500)\n\n" +
      "Also pull:\n" +
      "- Treasury debt_to_penny at start and end of each term\n" +
      "- congress_recent_laws for major legislation signed by each\n" +
      "- fr_executive_orders count per president\n\n" +
      "Present side-by-side with context on what each inherited, Congressional control, " +
      "and major external shocks. Do NOT declare winners — let the data speak.",
  },

  {
    name: "fiscal_snapshot",
    description: "Current state of U.S. government finances: debt, deficit, revenue, spending, interest costs.",
    load: async () =>
      "Pull a comprehensive fiscal snapshot:\n\n" +
      "1. Treasury query_fiscal_data with debt_to_penny — latest national debt\n" +
      "2. Treasury query_fiscal_data with mts_table_1 — latest Monthly Treasury Statement (revenue vs outlays)\n" +
      "3. Treasury query_fiscal_data with avg_interest_rates — cost of servicing the debt\n" +
      "4. FRED FYFSGDA188S — deficit as % of GDP\n" +
      "5. FRED GDP — current GDP for debt-to-GDP ratio\n" +
      "6. usa_spending_by_agency — top 10 agencies by spending\n" +
      "7. wb_compare (US vs DE, GB, JP) GC.DOD.TOTL.GD.ZS — international debt comparison\n\n" +
      "Calculate: debt-to-GDP ratio, interest-to-revenue ratio, deficit per capita (using Census population). " +
      "Show trends over the last 5 years. Note which president and Congress were in office for each period.",
  },

  {
    name: "cost_of_living",
    description: "Analyze the current cost of living: inflation breakdown, housing, gas, food, medical, and wages.",
    arguments: [
      { name: "state", description: "Optional state to focus on (e.g. 'CA', 'TX')", required: false },
    ],
    load: async ({ state }) =>
      `Analyze current cost of living${state ? ` with focus on ${state}` : ""}:\n\n` +
      "INFLATION BREAKDOWN:\n" +
      "- bls_cpi_breakdown for all components with YoY change\n" +
      "- fred_series_data CPIAUCSL for headline trend (last 3 years)\n\n" +
      "HOUSING:\n" +
      "- fred_series_data MORTGAGE30US for current mortgage rates\n" +
      (state ? `- hud_fair_market_rents for ${state} counties\n` : "") +
      "- fred_series_data CSUSHPINSA for home price index trend\n\n" +
      "ENERGY:\n" +
      "- fred_series_data GASREGW for current gas prices\n" +
      (state ? `- eia_electricity for ${state} electricity prices\n` : "") +
      "- fred_series_data DCOILWTICO for crude oil trend\n\n" +
      "WAGES vs PRICES:\n" +
      "- bls_employment_by_industry for wage data\n" +
      "- fred_series_data LES1252881600Q for real median weekly earnings\n\n" +
      "FOOD:\n" +
      "- bls_cpi_breakdown food component detail\n" +
      (state ? `- cdc_nutrition_obesity for ${state} food access data\n` : "") +
      "\nCompare wage growth to inflation. Are workers keeping up? " +
      "Show which categories are rising fastest and which are easing.",
  },

  // ─── Money in Politics ─────────────────────────────────────────────

  {
    name: "follow_the_money",
    description: "Trace the lobbying and campaign finance pipeline for a specific bill or industry.",
    arguments: [
      { name: "topic", description: "A bill number (e.g. 'S.2155') or industry (e.g. 'pharmaceutical')", required: true },
    ],
    load: async ({ topic }) =>
      `Follow the money for: ${topic}\n\n` +
      "Step 1 — FIND THE LEGISLATION:\n" +
      "- congress_bill_full_profile to get sponsor, cosponsors, actions, committees, summaries, and related bills in one call\n" +
      "- congress_bill_votes to find all roll-call votes with party-line breakdowns\n\n" +
      "Step 2 — TRACE THE MONEY IN:\n" +
      "- fec_candidate_financials for sponsor's PAC dependency\n" +
      "- fec_search_committees (committee_type='Q') to find industry PACs\n" +
      "- fec_committee_disbursements to trace named PAC → candidate payments\n" +
      "- lobbying_search for trade group + individual company lobbying spend (3+ years)\n\n" +
      "Step 3 — MEASURE THE OUTCOME:\n" +
      "- FRED series for economic indicators before/after\n" +
      "- fdic_failures if banking, bls_cpi_breakdown if consumer prices\n" +
      "- wb_compare for international comparison\n\n" +
      "Present the full pipeline: Money In → Vote → Outcome → Who Benefited. " +
      "Show both interpretations. Note correlation ≠ causation.",
  },

  {
    name: "industry_influence",
    description: "Map an industry's full influence: lobbying spend, PAC money to both parties, and policy outcomes.",
    arguments: [
      { name: "industry", description: "Industry name (e.g. 'banking', 'pharmaceutical', 'oil and gas', 'tech')", required: true },
      { name: "trade_group", description: "Primary trade group name (e.g. 'American Bankers Association', 'PhRMA', 'American Petroleum Institute')", required: false },
    ],
    load: async ({ industry, trade_group }) =>
      `Map the influence of the ${industry} industry${trade_group ? ` (trade group: ${trade_group})` : ""}:\n\n` +
      "LOBBYING (3-year trend):\n" +
      `- lobbying_search for ${trade_group || "the main trade group"} — filing_year 2023, 2024, 2025\n` +
      "- lobbying_search for top 3 individual companies in the industry\n" +
      "- Note total spend, issue areas, and year-over-year trend\n\n" +
      "PAC MONEY (to BOTH parties):\n" +
      "- fec_search_committees (committee_type='Q') for industry PACs\n" +
      "- fec_committee_disbursements for each PAC — show recipients from both D and R\n" +
      "- Focus on members of relevant oversight committees\n\n" +
      "POLICY OUTCOMES:\n" +
      "- congress_bill_full_profile for recent legislation affecting this industry\n" +
      "- congress_bill_votes for party-line breakdown on key votes\n" +
      "- Relevant FRED/BLS/World Bank data showing measurable impact\n\n" +
      "DOCTOR PAYMENTS (if pharma/device):\n" +
      "- open_payments_top_doctors to find highest-paid doctors in the space\n" +
      "- open_payments_search for specific company payments\n\n" +
      "Show the bipartisan nature of industry influence. Present both the case that " +
      "this represents corruption and the case that it represents legitimate advocacy.",
  },

  {
    name: "politician_profile",
    description: "Build a complete financial and legislative profile of a politician.",
    arguments: [
      { name: "name", description: "Politician's name (e.g. 'Mike Crapo', 'Cory Booker')", required: true },
      { name: "state", description: "State (e.g. 'ID', 'NJ')", required: false },
    ],
    load: async ({ name: _name, state }) => {
      const name = _name ?? "";
      return `Build a financial and legislative profile of ${name}${state ? ` (${state})` : ""}:\n\n` +
      "IDENTITY:\n" +
      `- congress_member_full_profile to get bio, terms, sponsored legislation, and cosponsored legislation in one call\n\n` +
      "CAMPAIGN FINANCE:\n" +
      `- fec_search_candidates for candidate ID\n` +
      `- fec_candidate_financials for ALL cycles — track PAC dependency over time\n` +
      `- Identify which cycles had highest PAC %, and whether it's trending up or down\n\n` +
      "WHO FUNDS THEM:\n" +
      `- fec_search_committees (committee_type='Q') for PACs in industries their committees oversee\n` +
      `- fec_committee_disbursements from those PACs with recipient_name='${name.split(" ").pop()}'\n\n` +
      "KEY VOTES:\n" +
      `- congress_bill_votes for their most significant legislation — shows party-line breakdowns\n` +
      `- congress_senate_votes or congress_house_votes for specific roll call numbers\n\n` +
      `- lobbying_contributions for lobbyist donations to them\n\n` +
      "PHARMA PAYMENTS (if relevant):\n" +
      "- open_payments_search for payments from pharma/device companies to this member's state\n\n" +
      "Present factually. Show both the 'suspicious' and 'legitimate' interpretations for any patterns.";
    },
  },

  // ─── State & Regional ──────────────────────────────────────────────

  {
    name: "state_deep_dive",
    description: "Comprehensive profile of a U.S. state using 10+ data sources.",
    arguments: [
      { name: "state", description: "State name or abbreviation (e.g. 'California' or 'CA')", required: true },
    ],
    load: async ({ state }) =>
      `Build a comprehensive profile of ${state}:\n\n` +
      "DEMOGRAPHICS: census_population for population and demographics\n" +
      "ECONOMY: bea_gdp_by_state + bea_personal_income for state GDP and income\n" +
      "JOBS: bls_employment_by_industry for employment by sector\n" +
      "FEDERAL $: usa_spending_by_state for federal dollars flowing to the state\n" +
      "HEALTH: cdc_places_health for county-level health indicators\n" +
      "HOUSING: hud_fair_market_rents for rental costs\n" +
      "ENERGY: eia_state_energy or eia_electricity for energy profile\n" +
      "EDUCATION: naep_compare_states for K-12 scores vs national avg\n" +
      "BANKING: cfpb_complaint_aggregations filtered by state\n" +
      "DISASTERS: fema_disaster_declarations for disaster history\n" +
      "SAFETY: dol_osha_inspections for workplace safety in the state\n" +
      "CRIME: fbi_crime_summarized with state param for crime statistics\n\n" +
      "Calculate per-capita figures where possible. " +
      "Present a cohesive narrative with data from all available sources.",
  },

  {
    name: "compare_states",
    description: "Side-by-side comparison of two states across economic, health, education, and quality-of-life metrics.",
    arguments: [
      { name: "state1", description: "First state (e.g. 'TX')", required: true },
      { name: "state2", description: "Second state (e.g. 'CA')", required: true },
    ],
    load: async ({ state1, state2 }) =>
      `Compare ${state1} vs ${state2} side-by-side:\n\n` +
      "For EACH state, pull:\n" +
      "- census_population — population, growth rate\n" +
      "- bea_gdp_by_state — GDP and GDP per capita\n" +
      "- bea_personal_income — median income\n" +
      "- hud_fair_market_rents — housing costs (2BR benchmark)\n" +
      "- cdc_places_health — obesity, diabetes, depression, smoking rates\n" +
      "- naep_compare_states — 4th/8th grade reading and math scores\n" +
      "- fbi_crime_summarized — violent (V) and property (P) crime rates\n" +
      "- eia_electricity — electricity prices\n" +
      "- fema_disaster_declarations — disaster frequency\n" +
      "- usa_spending_by_state — federal dollars received\n\n" +
      "Present in a comparison table. Calculate per-capita for spending and GDP. " +
      "Note where each state excels and where it lags. Be objective — neither state is 'better' overall.",
  },

  // ─── Health & Safety ───────────────────────────────────────────────

  {
    name: "health_dashboard",
    description: "National or state health dashboard: leading causes of death, life expectancy, obesity, drug overdose, healthcare spending.",
    arguments: [
      { name: "state", description: "Optional state focus (e.g. 'Ohio', 'WV'). Omit for national.", required: false },
    ],
    load: async ({ state }) =>
      `Build a health dashboard${state ? ` for ${state}` : " (national)"}:\n\n` +
      "MORTALITY:\n" +
      `- cdc_causes_of_death${state ? ` for ${state}` : ""} — top 10 causes\n` +
      "- cdc_mortality_rates — recent quarterly death rates by cause\n" +
      "- cdc_life_expectancy — life expectancy trends (through 2018)\n" +
      "- cdc_drug_overdose — overdose mortality trends\n\n" +
      "CHRONIC DISEASE:\n" +
      `- cdc_places_health${state ? ` for ${state} counties` : ""} — obesity, diabetes, depression, smoking\n` +
      "- cdc_nutrition_obesity — physical inactivity, fruit/vegetable consumption\n\n" +
      "HEALTHCARE ACCESS:\n" +
      "- bls_cpi_breakdown medical care component — healthcare inflation\n" +
      "- wb_compare (US, DE, GB, JP, CA, AU) SH.XPD.CHEX.PC.CD — spending per capita\n" +
      "- wb_compare same countries SP.DYN.LE00.IN — life expectancy comparison\n\n" +
      "HOSPITAL QUALITY:\n" +
      `- cms_hospitals${state ? ` in ${state}` : ""} — mortality, readmissions, patient experience\n\n` +
      "Tell the story: what are Americans dying of, how does it compare internationally, " +
      "and is the trend getting better or worse?",
  },

  {
    name: "workplace_safety",
    description: "Investigate workplace safety for a company, industry, or state using OSHA data.",
    arguments: [
      { name: "target", description: "Company name, SIC code, or state abbreviation (e.g. 'Amazon', 'TX', 'construction')", required: true },
    ],
    load: async ({ target }) =>
      `Investigate workplace safety for: ${target}\n\n` +
      "INSPECTIONS:\n" +
      `- dol_osha_inspections — search for inspections matching ${target}\n` +
      "- Note inspection type (planned, complaint, accident), open/close dates\n\n" +
      "VIOLATIONS:\n" +
      `- dol_osha_violations — violations found, types (Serious, Willful, Repeat), penalties\n\n` +
      "ACCIDENTS:\n" +
      `- dol_osha_accidents — accident investigations with descriptions\n` +
      `- dol_osha_accident_injuries — injury details, demographics, severity\n\n` +
      "WAGE THEFT:\n" +
      `- dol_whd_enforcement — Fair Labor Standards Act violations, back wages owed\n\n` +
      "CONTEXT:\n" +
      "- bls_employment_by_industry for industry employment levels\n" +
      "- Compare violation rates to industry averages where possible\n\n" +
      "Present the safety record factually. Note both the violations and context " +
      "(industry norms, company size, outcome of contested citations).",
  },

  // ─── Education ─────────────────────────────────────────────────────

  {
    name: "education_report_card",
    description: "Education quality assessment: NAEP scores, achievement gaps, college outcomes, and spending.",
    arguments: [
      { name: "state", description: "Optional state focus. Omit for national.", required: false },
    ],
    load: async ({ state }) =>
      `Education report card${state ? ` for ${state}` : " (national)"}:\n\n` +
      "K-12 PERFORMANCE:\n" +
      `- naep_scores for reading and math, grades 4 and 8${state ? `, jurisdiction ${state}` : ""}\n` +
      "- naep_achievement_levels — % at Below Basic, Basic, Proficient, Advanced\n" +
      "- naep_compare_years for 2019 vs 2022 vs latest — COVID learning loss and recovery\n\n" +
      "ACHIEVEMENT GAPS:\n" +
      "- naep_compare_groups variable SDRACE — racial achievement gaps\n" +
      "- naep_compare_groups variable SLUNCH3 — poverty/lunch eligibility gaps\n" +
      "- naep_compare_groups variable GENDER — gender gaps\n\n" +
      "HIGHER EDUCATION:\n" +
      `- scorecard_search${state ? ` state=${state}` : ""} — top schools by earnings\n` +
      `- scorecard_top earnings${state ? ` in ${state}` : ""} — highest-earning graduates\n` +
      "- fred_series_data SLOAS — total student loan debt outstanding\n\n" +
      "INTERNATIONAL CONTEXT:\n" +
      "- wb_compare (US, DE, FI, KR, JP) SE.XPD.TOTL.GD.ZS — education spending as % of GDP\n\n" +
      "Tell the story: how are students performing, are gaps closing, " +
      "and does spending translate to outcomes?",
  },

  // ─── Consumer & Financial ──────────────────────────────────────────

  {
    name: "company_accountability",
    description: "Investigate a company's consumer complaints, safety record, lobbying activity, and financial health.",
    arguments: [
      { name: "company", description: "Company name (e.g. 'Wells Fargo', 'Amazon', 'Pfizer')", required: true },
    ],
    load: async ({ company }) =>
      `Investigate ${company}:\n\n` +
      "CONSUMER COMPLAINTS:\n" +
      `- cfpb_search_complaints company='${company}' — recent complaints with narratives\n` +
      `- cfpb_complaint_trends for ${company} — is it getting better or worse?\n` +
      `- cfpb_complaint_aggregations by product for ${company} — what are people complaining about?\n\n` +
      "WORKPLACE SAFETY:\n" +
      `- dol_osha_inspections establishment_name='${company}' — OSHA inspections\n` +
      `- dol_whd_enforcement trade_name='${company}' — wage theft violations\n\n` +
      "LOBBYING:\n" +
      `- lobbying_search registrant_name='${company}' — lobbying spend and issues\n` +
      `- lobbying_search for 2023, 2024, 2025 separately to show trend\n\n` +
      "POLITICAL DONATIONS:\n" +
      `- fec_search_committees name='${company}' committee_type='Q' — find their PAC\n` +
      "- fec_committee_disbursements — who do they donate to?\n\n" +
      "FINANCIALS (if public):\n" +
      `- sec_company_search '${company}' — SEC filings\n` +
      `- sec_company_financials — revenue, profit, key XBRL data\n\n` +
      "PRODUCT SAFETY (if pharma/food):\n" +
      `- fda_drug_events or fda_food_recalls for ${company} products\n\n` +
      "Present a balanced picture: where the company has problems AND where it performs well.",
  },

  {
    name: "bank_health_check",
    description: "Assess the health of a bank or the banking system: FDIC data, complaints, failures, interest rate risk.",
    arguments: [
      { name: "bank", description: "Bank name (e.g. 'Silicon Valley Bank', 'JPMorgan') or 'system' for overall", required: true },
    ],
    load: async ({ bank: _bank }) => {
      const bank = _bank ?? "system";
      return `Bank health check: ${bank}\n\n` +
      (bank.toLowerCase() === "system"
        ? "SYSTEM OVERVIEW:\n" +
          "- fdic_failures sort by FAILDATE DESC — recent bank failures and costs\n" +
          "- fdic_summary — aggregate FDIC banking statistics\n" +
          "- fred_series_data FEDFUNDS — current rate environment\n" +
          "- fred_series_data TOTBKCR — total bank credit trend\n" +
          "- cfpb_complaint_aggregations by company — which banks get the most complaints?\n" +
          "- cfpb_complaint_trends — are banking complaints rising or falling?\n\n"
        : `FIND THE BANK:\n` +
          `- fdic_search_institutions filter='INSTNAME:"${bank}"' — get CERT number, assets, charter\n` +
          `- fdic_financials for the bank — assets, deposits, ROA, ROE, capital ratios\n\n` +
          `CONSUMER EXPERIENCE:\n` +
          `- cfpb_search_complaints company='${bank}' — recent complaints\n` +
          `- cfpb_complaint_trends for ${bank} — trend over time\n\n` +
          `LOBBYING:\n` +
          `- lobbying_search registrant_name='${bank}' — what they lobby for\n\n`
      ) +
      "INTEREST RATE CONTEXT:\n" +
      "- fred_series_data FEDFUNDS — rate trajectory (rising rates = bond losses)\n" +
      "- fred_series_data DGS10 — 10-year Treasury (long-duration exposure)\n" +
      "- fred_series_data MORTGAGE30US — mortgage rates affect bank lending\n\n" +
      "Assess: Is the bank (or system) at risk? Compare to pre-2023 conditions " +
      "when SVB, Signature, and First Republic failed.";
    },
  },

  // ─── Energy & Environment ──────────────────────────────────────────

  {
    name: "energy_landscape",
    description: "Current U.S. energy picture: prices, production, renewables, emissions, and policy.",
    arguments: [
      { name: "state", description: "Optional state focus (e.g. 'TX', 'CA')", required: false },
    ],
    load: async ({ state }) =>
      `Energy landscape${state ? ` for ${state}` : " (national)"}:\n\n` +
      "PRICES:\n" +
      "- fred_series_data DCOILWTICO — WTI crude oil price trend\n" +
      "- fred_series_data GASREGW — retail gasoline price\n" +
      (state ? `- eia_electricity state=${state} — electricity prices\n` : "") +
      "- bls_cpi_breakdown — energy component of CPI\n\n" +
      "INFRASTRUCTURE:\n" +
      (state ? `- nrel_fuel_stations state=${state} fuel_type=ELEC — EV charging stations\n` : "") +
      (state ? `- nrel_solar lat/lon for ${state} — solar potential\n` : "") +
      (state ? `- nrel_utility_rates for ${state} — local electricity rates\n` : "") +
      "\nPOLICY:\n" +
      "- lobbying_search registrant_name='American Petroleum Institute' — oil industry lobbying\n" +
      "- congress_bill_details for recent energy legislation\n\n" +
      "ENVIRONMENT:\n" +
      (state ? `- epa_air_quality state=${state} — air quality measures\n` : "") +
      "- wb_compare (US, DE, CN, IN) EN.ATM.CO2E.PC — CO2 emissions per capita\n\n" +
      "Present the tension between energy affordability, energy security, and climate goals.",
  },

  // ─── Disaster & Climate ────────────────────────────────────────────

  {
    name: "disaster_analysis",
    description: "Analyze a specific disaster or a state/region's disaster history: declarations, aid, weather data, and federal response.",
    arguments: [
      { name: "target", description: "Disaster type (e.g. 'Hurricane'), state ('FL'), or specific event ('Hurricane Ian')", required: true },
    ],
    load: async ({ target }) =>
      `Analyze disaster: ${target}\n\n` +
      "DECLARATIONS:\n" +
      `- fema_disaster_declarations — search for ${target}, sort by newest\n` +
      "- Note declaration types: DR (Major Disaster), EM (Emergency), FM (Fire)\n\n" +
      "AID DELIVERED:\n" +
      "- fema_housing_assistance — individual housing assistance amounts\n" +
      "- fema_public_assistance — infrastructure grants and project costs\n\n" +
      "WEATHER CONTEXT:\n" +
      "- noaa_climate_data — temperature, precipitation data for affected area\n" +
      "- noaa_stations — find nearby weather stations\n\n" +
      "FEDERAL SPENDING:\n" +
      "- usa_spending_by_agency — FEMA agency spending trends\n" +
      "- usa_spending_by_state — federal dollars to affected state\n\n" +
      "POLICY:\n" +
      "- congress_bill_details for disaster relief legislation\n" +
      "- congress_senate_votes or congress_house_votes — did disaster aid pass along party lines?\n\n" +
      "Present the full picture: what happened, how much aid was delivered, " +
      "how quickly, and whether funding was politically contentious.",
  },

  // ─── Vehicle & Product Safety ──────────────────────────────────────

  {
    name: "vehicle_investigation",
    description: "Investigate a vehicle make/model for safety recalls, consumer complaints, crash data, and manufacturer lobbying.",
    arguments: [
      { name: "make", description: "Vehicle make (e.g. 'Tesla', 'Toyota', 'Ford')", required: true },
      { name: "model", description: "Vehicle model (e.g. 'Model 3', 'Camry', 'F-150')", required: false },
    ],
    load: async ({ make, model }) =>
      `Investigate vehicle safety: ${make}${model ? ` ${model}` : ""}:\n\n` +
      "RECALLS:\n" +
      `- nhtsa_recalls make='${make}'${model ? ` model='${model}'` : ""} — all safety recalls\n` +
      "- Note recall counts, components affected, and severity\n\n" +
      "CONSUMER COMPLAINTS:\n" +
      `- nhtsa_complaints make='${make}'${model ? ` model='${model}'` : ""} — crash, fire, injury reports\n` +
      "- Summarize most common complaint types\n\n" +
      "VIN DECODE (if specific vehicle):\n" +
      "- nhtsa_decode_vin — full vehicle specs from VIN\n\n" +
      "MANUFACTURER CONTEXT:\n" +
      `- lobbying_search registrant_name='${make}' — lobbying on auto safety regulations\n` +
      `- fec_search_committees name='${make}' committee_type='Q' — manufacturer PAC\n\n` +
      "Present recall and complaint trends. Are problems getting better or worse? " +
      "Compare complaint rates to industry norms where possible.",
  },

  {
    name: "drug_safety",
    description: "Investigate a drug's safety record: adverse events, labels, FDA data, and manufacturer profile.",
    arguments: [
      { name: "drug", description: "Drug name (e.g. 'Ozempic', 'Eliquis', 'Humira')", required: true },
    ],
    load: async ({ drug: _drug }) => {
      const drug = _drug ?? "";
      return `Investigate drug safety: ${drug}\n\n` +
      "FDA APPROVAL STATUS:\n" +
      `- fda_approved_drugs search='openfda.brand_name:"${drug}"' — approval history, active ingredients, marketing status\n\n` +
      "ADVERSE EVENTS:\n" +
      `- fda_drug_events search='patient.drug.openfda.brand_name:${drug} AND serious:1' — serious reports\n` +
      `- fda_drug_counts count_field='patient.reaction.reactionmeddrapt.exact' ` +
      `search='patient.drug.openfda.brand_name:${drug}' — top adverse reactions\n\n` +
      "RECALLS:\n" +
      `- fda_drug_recalls search='openfda.brand_name:${drug}' — any recall enforcement reports\n\n` +
      "CLINICAL TRIALS:\n" +
      `- clinical_trials_stats condition='${drug}' search_as_drug=true — pipeline activity\n` +
      `- clinical_trials_search intervention='${drug}' status=RECRUITING — ongoing trials\n\n` +
      "MANUFACTURER:\n" +
      "- Identify the manufacturer from FDA results\n" +
      "- lobbying_search for the manufacturer — lobbying spend\n" +
      "- lobbying_lobbyists for the manufacturer — who lobbies for them\n" +
      "- lobbying_detail for a filing UUID — specific bills lobbied on\n" +
      "- fec_search_committees for manufacturer PAC\n" +
      "- open_payments_top_doctors — find doctors receiving the most from this manufacturer\n" +
      "- open_payments_search company=manufacturer — payment details\n\n" +
      "HEALTH CONTEXT:\n" +
      "- bls_cpi_breakdown medical care — drug cost inflation\n" +
      "- wb_compare (US vs peer nations) SH.XPD.CHEX.PC.CD — health spending per capita\n\n" +
      "Present the safety profile objectively. Note that high adverse event counts " +
      "often correlate with high prescription volume, not necessarily higher risk.";
    },
  },

  {
    name: "food_recall_tracker",
    description: "Track food safety: recent recalls, contamination patterns, and the companies involved.",
    arguments: [
      { name: "query", description: "Food type, company, or hazard (e.g. 'Listeria', 'ground beef', 'Trader Joe')", required: false },
    ],
    load: async ({ query }) =>
      `Food safety investigation${query ? `: ${query}` : ""}:\n\n` +
      "RECALLS:\n" +
      `- fda_food_recalls${query ? ` search='${query}'` : ""} — recent enforcement reports\n` +
      "- Note classification: Class I (most serious), Class II, Class III\n" +
      "- Track recalling firms, states, and distribution patterns\n\n" +
      "ADVERSE EVENTS:\n" +
      `- fda_food_adverse_events${query ? ` search='${query}'` : ""} — illness/injury reports from CAERS\n` +
      "- Look for: reactions, outcomes, product types (foods vs dietary supplements)\n\n" +
      "NUTRITION CONTEXT:\n" +
      (query ? `- fooddata_search query='${query}' — nutritional data for the food type\n` : "") +
      "- cdc_nutrition_obesity — national obesity and nutrition trends\n" +
      "- cdc_places_health measure FOODINSECU — food insecurity by county\n\n" +
      "Present patterns: which companies have repeat recalls? " +
      "Which food categories are most affected? What are the health risks?",
  },

  // ─── Innovation & Patents ──────────────────────────────────────────

  {
    name: "innovation_landscape",
    description: "Map the innovation landscape for a technology area: patents, R&D spending, key companies, and federal funding.",
    arguments: [
      { name: "technology", description: "Technology area (e.g. 'artificial intelligence', 'quantum computing', 'mRNA vaccine', 'electric vehicle battery')", required: true },
    ],
    load: async ({ technology }) =>
      `Map the innovation landscape for: ${technology}\n\n` +
      "PATENTS:\n" +
      `- uspto_search_applications q='${technology}' — recent patent applications\n` +
      `- For top applicants found above, use uspto_application_details for full data\n` +
      `- uspto_ptab_proceedings — check for inter partes reviews on key patents\n\n` +
      "KEY COMPANIES:\n" +
      "- For top assignees found above:\n" +
      "  - sec_company_search — public company financials (R&D spend)\n" +
      "  - lobbying_search — what they lobby for related to this tech\n\n" +
      "FEDERAL R&D FUNDING:\n" +
      "- usa_spending_by_agency - NSF, DOE, NIH, DARPA spending trends\n" +
      "- usa_spending_by_award keyword search for the technology\n\n" +
      "LABOR MARKET:\n" +
      `- calc_search_rates keyword='${technology}' - GSA ceiling rates for this skill area\n` +
      "- BLS employment and wage data for related occupations\n\n" +
      "POLICY:\n" +
      "- congress_bill_details for legislation related to the technology\n" +
      "- regulations_search_documents for regulatory activity\n\n" +
      "INTERNATIONAL:\n" +
      "- wb_compare (US, CN, DE, KR, JP) GB.XPD.RSDV.GD.ZS — R&D spending as % of GDP\n\n" +
      "Present: who's leading, who's funding it, and what policy is shaping the field.",
  },

  // ─── Housing & Affordability ───────────────────────────────────────

  {
    name: "housing_affordability",
    description: "Analyze housing affordability: rents, home prices, mortgage rates, income, and policy.",
    arguments: [
      { name: "location", description: "State abbreviation or 'national' (e.g. 'CA', 'TX', 'national')", required: true },
    ],
    load: async ({ location: _location }) => {
      const location = _location ?? "national";
      const isNational = location.toLowerCase() === "national";
      return `Housing affordability analysis: ${isNational ? "National" : location}\n\n` +
        "RENTAL COSTS:\n" +
        (!isNational ? `- hud_fair_market_rents for ${location} — FMR by bedroom count\n` : "") +
        (!isNational ? `- hud_income_limits for ${location} — income thresholds for programs\n` : "") +
        "- fred_series_data CSUSHPINSA — Case-Shiller home price index trend\n\n" +
        "MORTGAGE:\n" +
        "- fred_series_data MORTGAGE30US — 30-year fixed rate trend\n" +
        "- fred_series_data HOUST — housing starts (new construction)\n\n" +
        "INCOME:\n" +
        (!isNational ? `- bea_personal_income for ${location} — personal income trends\n` : "") +
        "- fred_series_data MEHOINUSA672N — median household income\n" +
        "- bls_cpi_breakdown shelter — housing cost inflation component\n\n" +
        "DEMOGRAPHICS:\n" +
        (!isNational ? `- census_population for ${location} — population growth driving demand\n` : "") +
        "\nFEDERAL HOUSING AID:\n" +
        "- usa_spending_by_agency for HUD — federal housing spending\n" +
        (!isNational ? `- fema_housing_assistance for ${location} — disaster housing aid\n` : "") +
        "\nPOLICY:\n" +
        "- lobbying_search registrant_name='National Association of Realtors' — real estate lobbying\n" +
        "- fred_series_data FEDFUNDS — Fed rate (drives mortgage rates)\n\n" +
        "Calculate: rent-to-income ratio, mortgage payment on median home vs median income. " +
        "Is housing getting more or less affordable? Show the trend over 5+ years.";
    },
  },

  // ─── Crime & Justice ───────────────────────────────────────────────

  {
    name: "crime_analysis",
    description: "Analyze crime trends: national or state-level crime rates, arrest data, and contextual factors.",
    arguments: [
      { name: "state", description: "State abbreviation (e.g. 'CA', 'TX') or 'national'", required: true },
      { name: "focus", description: "Crime type focus (e.g. 'violent', 'property', 'drug'). Optional.", required: false },
    ],
    load: async ({ state: _state, focus }) => {
      const state = _state ?? "national";
      const isNational = state.toLowerCase() === "national";
      return `Crime analysis: ${isNational ? "National" : state}${focus ? ` — focus on ${focus} crime` : ""}:\n\n` +
        "CRIME DATA:\n" +
        (isNational
          ? "- fbi_crime_summarized offense='V' — national violent crime trends\n" +
            "- fbi_crime_summarized offense='P' — national property crime trends\n"
          : `- fbi_crime_summarized offense='V' state='${state}' — state violent crime\n` +
            `- fbi_crime_summarized offense='P' state='${state}' — state property crime\n`) +
        `- fbi_arrest_data offense='all'${!isNational ? ` state='${state}'` : ""} — arrest breakdowns\n` +
        `- fbi_hate_crime${!isNational ? ` state='${state}'` : ""} — hate crime incidents\n\n` +
        "CONTEXT:\n" +
        (!isNational
          ? `- census_population for ${state} — population (for per-capita rates)\n` +
            `- bea_personal_income for ${state} — income levels (poverty correlates with crime)\n`
          : "- fred_series_data UNRATE — unemployment trend (correlates with property crime)\n") +
        "- fred_series_data GDP — economic conditions\n\n" +
        "JUSTICE SYSTEM:\n" +
        "- congress_bill_details for recent criminal justice legislation\n" +
        "- usa_spending_by_agency for DOJ — federal justice spending\n\n" +
        "HEALTH FACTORS:\n" +
        (!isNational ? `- cdc_drug_overdose for ${state} — drug crisis correlates with drug crime\n` : "") +
        "- cdc_causes_of_death — homicide as cause of death\n\n" +
        "Present crime trends over time. Note that crime statistics have reporting gaps " +
        "and lag 1-2 years. Compare to national averages. Show both the numbers and the context.";
    },
  },

  // ─── Regulation & Rulemaking ───────────────────────────────────────

  {
    name: "regulation_tracker",
    description: "Track a federal regulation from proposal to final rule: public comments, lobbying, and impact.",
    arguments: [
      { name: "topic", description: "Regulation topic or agency (e.g. 'AI regulation', 'EPA methane rule', 'CFPB overdraft')", required: true },
    ],
    load: async ({ topic }) =>
      `Track regulation: ${topic}\n\n` +
      "FIND THE RULE:\n" +
      `- regulations_search_documents query='${topic}' — proposed rules and final rules\n` +
      "- regulations_document_detail for the most relevant document\n" +
      `- regulations_search_dockets query='${topic}' — the docket containing all related docs\n\n` +
      "PUBLIC INPUT:\n" +
      "- regulations_search_comments for the docket — what did the public say?\n" +
      "- Note comment volume, sentiment, and who the biggest commenters are\n\n" +
      "FEDERAL REGISTER:\n" +
      `- fr_search_rules query related to ${topic} — Federal Register entries\n` +
      "- fr_executive_orders — any executive orders driving the regulation\n\n" +
      "WHO'S LOBBYING:\n" +
      `- lobbying_search with issue_code matching ${topic} — who spent money on this?\n` +
      "- Note lobbying spend trends before and after the rule was proposed\n\n" +
      "POTENTIAL IMPACT:\n" +
      "- Relevant FRED/BLS data for the industry affected\n" +
      "- congress_bill_details for related legislation\n\n" +
      "Present the timeline: proposal → comment period → lobbying → final rule. " +
      "Who supported and opposed it? What's the projected impact?",
  },

  // ─── College & Career ──────────────────────────────────────────────

  {
    name: "college_comparison",
    description: "Compare specific colleges on cost, outcomes, debt, and ROI — or find the best schools for a criteria.",
    arguments: [
      { name: "query", description: "School names to compare (e.g. 'MIT, Stanford, Georgia Tech') or criteria (e.g. 'best engineering ROI', 'cheapest in California')", required: true },
    ],
    load: async ({ query }) =>
      `College comparison: ${query}\n\n` +
      "FIND SCHOOLS:\n" +
      `- scorecard_search name or keyword matching '${query}'\n` +
      "- scorecard_top for rankings by earnings, graduation rate, or cost\n\n" +
      "FOR EACH SCHOOL, GET:\n" +
      "- Tuition (in-state and out-of-state)\n" +
      "- Net price (after financial aid)\n" +
      "- Graduation rate (4-year and 6-year)\n" +
      "- Median earnings 10 years after enrollment\n" +
      "- Median debt at graduation\n" +
      "- Admission rate\n\n" +
      "CONTEXT:\n" +
      "- scorecard_compare for side-by-side if comparing specific schools\n" +
      "- fred_series_data SLOAS — total student loan debt outstanding ($1.7T+)\n" +
      "- bls_employment_by_industry — job market for relevant fields\n\n" +
      "CALCULATE ROI:\n" +
      "- 20-year earnings premium vs. high school grad (~$35K/year)\n" +
      "- Minus: net price × 4 years + opportunity cost\n" +
      "- Net ROI = earnings premium - total cost\n\n" +
      "Present clear ROI numbers. Flag any schools where median debt exceeds " +
      "median earnings (debt traps).",
  },

  // ─── Federal Spending ──────────────────────────────────────────────

  {
    name: "where_the_money_goes",
    description: "Trace federal spending: by agency, state, recipient, or keyword. Find who gets taxpayer dollars.",
    arguments: [
      { name: "focus", description: "Agency (e.g. 'DOD'), state ('TX'), keyword ('artificial intelligence'), or recipient ('Lockheed Martin')", required: true },
    ],
    load: async ({ focus }) =>
      `Trace federal spending: ${focus}\n\n` +
      "SPENDING DATA:\n" +
      `- usa_spending_by_award keyword='${focus}' - contracts, grants, loans matching the query\n` +
      `- usa_spending_by_agency - spending by agency (if ${focus} is an agency)\n` +
      `- usa_spending_by_state - geographic distribution of spending\n` +
      `- usa_spending_by_recipient recipient='${focus}' - if searching for a company\n` +
      "- usa_spending_over_time - is spending trending up or down?\n\n" +
      "LABOR RATES (if services contract):\n" +
      `- calc_search_rates keyword='${focus}' - GSA ceiling rates for the service area\n` +
      "- calc_contract_rates - rates for a specific GSA contract number\n\n" +
      "AUTHORIZATION:\n" +
      "- congress_bill_details for the legislation that authorized the spending\n" +
      "- congress_house_votes / congress_senate_votes — how did the vote break down?\n\n" +
      "WHO BENEFITS:\n" +
      "- sec_company_search for top recipients — are they public companies? Financials?\n" +
      "- lobbying_search for top recipients — do they lobby for more spending?\n" +
      "- fec_search_committees for top recipients — do they fund politicians who authorize spending?\n\n" +
      "CONTEXT:\n" +
      "- Treasury query_fiscal_data mts_table_1 — total federal receipts vs outlays\n" +
      "- census_population — per-capita spending calculation\n\n" +
      "Follow the money from taxpayer to recipient. Show the full chain: " +
      "Congress authorizes → Agency spends → Recipient gets paid → Recipient lobbies for more.",
  },

  // ─── Nutrition & Food ──────────────────────────────────────────────

  {
    name: "nutrition_lookup",
    description: "Compare foods nutritionally, check for food safety issues, and see what Americans actually eat.",
    arguments: [
      { name: "foods", description: "Foods to look up or compare (e.g. 'chicken breast vs tofu', 'avocado', 'Big Mac')", required: true },
    ],
    load: async ({ foods }) =>
      `Nutrition analysis: ${foods}\n\n` +
      "NUTRITIONAL DATA:\n" +
      `- fooddata_search query='${foods}' — find matching foods in USDA database\n` +
      "- fooddata_detail for each food — full nutrient breakdown (calories, protein, fat, carbs, vitamins, minerals)\n" +
      "- Use 'Foundation' or 'SR Legacy' data types for generic foods, 'Branded' for specific products\n\n" +
      "FOOD SAFETY:\n" +
      `- fda_food_recalls — any recent recalls related to these foods?\n\n` +
      "NATIONAL CONTEXT:\n" +
      "- cdc_nutrition_obesity — national obesity, physical inactivity rates\n" +
      "- bls_cpi_breakdown food — food price inflation\n\n" +
      "Present a clear nutritional comparison table. Note daily value percentages " +
      "and highlight any notable nutritional strengths or concerns.",
  },

  // ─── International Comparison ──────────────────────────────────────

  {
    name: "us_vs_world",
    description: "Compare the U.S. to other nations on any metric: economy, health, education, environment, military.",
    arguments: [
      { name: "topic", description: "What to compare (e.g. 'healthcare', 'education spending', 'gun violence', 'inequality', 'CO2 emissions')", required: true },
      { name: "countries", description: "Countries to compare (e.g. 'US,DE,GB,JP,CA'). Default: US + G7.", required: false },
    ],
    load: async ({ topic, countries }) => {
      const ctries = countries || "US,GB,DE,FR,JP,CA,AU";
      const topicIndicators: Record<string, string> = {
        healthcare: "SH.XPD.CHEX.PC.CD (spend) + SP.DYN.LE00.IN (life expectancy) + SH.XPD.CHEX.GD.ZS (% GDP)",
        education: "SE.XPD.TOTL.GD.ZS (spending) + SE.TER.CUAT.BA.ZS (degree attainment)",
        inequality: "SI.POV.GINI (Gini) + SI.DST.10TH.10 (top 10% share) + SI.POV.NAHC (poverty rate)",
        emissions: "EN.ATM.CO2E.PC (CO2 per capita) + EG.USE.PCAP.KG.OE (energy per capita)",
        military: "MS.MIL.XPND.GD.ZS (% GDP) + MS.MIL.XPND.CD (total)",
        debt: "GC.DOD.TOTL.GD.ZS (govt debt % GDP)",
        population: "SP.POP.TOTL + SP.DYN.LE00.IN + SP.DYN.TFRT.IN (fertility)",
        gdp: "NY.GDP.MKTP.CD (nominal) + NY.GDP.PCAP.CD (per capita) + NY.GDP.MKTP.KD.ZG (growth)",
      };
      const indicators = topicIndicators[(topic ?? "").toLowerCase()] || `Search wb_search for indicators related to '${topic}'`;
      return `Compare the U.S. to other nations on: ${topic}\n\n` +
        `Countries: ${ctries}\n\n` +
        "WORLD BANK DATA:\n" +
        `- wb_compare countries='${ctries}' for these indicators:\n` +
        `  ${indicators}\n` +
        "- Show the latest 3-5 years of data for trend\n\n" +
        "U.S. DOMESTIC CONTEXT:\n" +
        "- FRED series for the U.S. equivalent (more granular, more recent)\n" +
        "- BLS data if labor/wage related\n" +
        "- CDC data if health related\n\n" +
        "Present a clear comparison table with the U.S. highlighted. " +
        "Note where the U.S. leads and where it lags. Avoid editorializing — " +
        "let the numbers tell the story.";
    },
  },

  // ─── Agriculture ───────────────────────────────────────────────────

  {
    name: "agriculture_report",
    description: "Analyze crop production, farm prices, agricultural trade, and rural economics.",
    arguments: [
      { name: "commodity", description: "Crop or livestock (e.g. 'CORN', 'SOYBEANS', 'CATTLE', 'WHEAT') or 'overview' for national summary", required: true },
      { name: "state", description: "Optional state (e.g. 'IA', 'TX', 'CA')", required: false },
    ],
    load: async ({ commodity: _commodity, state }) => {
      const commodity = _commodity ?? "overview";
      const isOverview = commodity.toLowerCase() === "overview";
      return `Agriculture report: ${isOverview ? "National Overview" : commodity}${state ? ` in ${state}` : ""}:\n\n` +
        "PRODUCTION:\n" +
        (!isOverview
          ? `- usda_crop_data commodity='${commodity.toUpperCase()}'${state ? ` state='${state}'` : ""} — production volume, yield, acres\n` +
            `- usda_prices commodity='${commodity.toUpperCase()}' — farm-gate prices\n`
          : "- usda_crop_data for top 5 crops (CORN, SOYBEANS, WHEAT, COTTON, RICE)\n" +
            "- usda_livestock for CATTLE and HOGS\n") +
        "\nPRICES & INFLATION:\n" +
        "- bls_cpi_breakdown food — consumer food price trends\n" +
        "- fred_series_data for relevant commodity futures if available\n\n" +
        "WEATHER IMPACT:\n" +
        (state ? `- noaa_climate_data for ${state} — temperature and precipitation\n` : "") +
        (state ? `- fema_disaster_declarations for ${state} type=Drought or Flood\n` : "") +
        "\nFEDERAL PROGRAMS:\n" +
        "- usa_spending_by_agency for USDA — farm subsidy and program spending\n" +
        "- lobbying_search registrant_name='American Farm Bureau' — ag lobbying\n\n" +
        "TRADE:\n" +
        "- wb_compare (US, BR, CN, AR) for agricultural export indicators\n\n" +
        "Present production trends, pricing, and the role of federal subsidies. " +
        "Note weather/climate impacts on yields.";
    },
  },

  // ─── Hospital & Nursing Home Quality ───────────────────────────────

  {
    name: "hospital_check",
    description: "Check hospital or nursing home quality: ratings, mortality, infections, patient experience.",
    arguments: [
      { name: "facility", description: "Hospital name, nursing home name, or state for overview (e.g. 'Mayo Clinic', 'FL nursing homes')", required: true },
    ],
    load: async ({ facility }) =>
      `Healthcare facility check: ${facility}\n\n` +
      "HOSPITAL DATA:\n" +
      `- cms_hospitals — search for '${facility}' or filter by state\n` +
      "- Look at: overall rating, mortality, readmission, patient experience, safety\n" +
      "- cms_query dataset='hospital_mortality' for detailed mortality measures\n" +
      "- cms_query dataset='hospital_infections' for HAI data\n\n" +
      "NURSING HOME DATA:\n" +
      `- cms_nursing_homes — search for '${facility}' or filter by state\n` +
      "- Look at: overall rating, health inspection results, staffing, quality measures\n\n" +
      "COMMUNITY HEALTH CONTEXT:\n" +
      "- cdc_places_health for the county where the facility is located\n" +
      "- census_population for demographic context\n\n" +
      "Present ratings clearly. Compare to state and national averages. " +
      "Flag any facilities with below-average mortality or infection rates.",
  },

  // ─── Natural Hazards & Earthquakes ─────────────────────────────────

  {
    name: "earthquake_risk",
    description: "Assess earthquake risk and recent seismic activity for a location or region.",
    arguments: [
      { name: "location", description: "State, city, or region (e.g. 'California', 'Pacific Northwest', 'Oklahoma')", required: true },
    ],
    load: async ({ location }) =>
      `Earthquake and seismic risk assessment: ${location}\n\n` +
      "RECENT ACTIVITY:\n" +
      `- usgs_earthquakes with location-appropriate lat/lon and maxradiuskm — last 30 days of seismic activity\n` +
      `- usgs_significant — notable recent earthquakes worldwide for context\n` +
      `- usgs_earthquake_count for ${location} region over past 1 year, 5 years, 10 years — frequency trends\n\n` +
      "FEDERAL RESPONSE:\n" +
      `- fema_disaster_declarations filtered for Earthquake near ${location}\n` +
      "- fema_housing_assistance + fema_public_assistance for earthquake disaster costs\n" +
      "- usa_spending_by_state for FEMA spending in the state\n\n" +
      "WATER RESOURCES:\n" +
      `- usgs_water_data for monitoring sites near ${location} — check for anomalies\n\n` +
      "INFRASTRUCTURE:\n" +
      "- congress_search_bills for 'earthquake', 'seismic', 'building code' — relevant legislation\n" +
      "- lobbying_search for seismic or earthquake — who lobbied on building standards\n\n" +
      "Present magnitude distribution, frequency trends, and historical damage. " +
      "Compare to other high-risk regions. Note building code legislation and FEMA preparedness.",
  },

  // ─── Drug Pipeline & Clinical Trials ───────────────────────────────

  {
    name: "drug_pipeline",
    description: "Analyze the clinical trial pipeline for a disease or drug company.",
    arguments: [
      { name: "target", description: "Disease name or pharma company (e.g. 'Alzheimer Disease', 'Pfizer', 'lung cancer')", required: true },
    ],
    load: async ({ target }) =>
      `Drug development pipeline analysis: ${target}\n\n` +
      "CLINICAL TRIALS:\n" +
      `- clinical_trials_stats condition='${target}' — pipeline breakdown by status\n` +
      `- clinical_trials_search for '${target}' with status=RECRUITING — active trials\n` +
      `- clinical_trials_search for '${target}' with phase=PHASE3 — late-stage candidates\n` +
      `- clinical_trials_search for '${target}' with status=COMPLETED — recently completed\n\n` +
      "FDA SAFETY DATA:\n" +
      `- fda_drug_events for drugs treating ${target} — adverse event reports\n` +
      `- fda_drug_counts for top drugs in the space\n\n` +
      "DISEASE BURDEN:\n" +
      `- cdc_causes_of_death — is this a leading cause of death?\n` +
      `- cdc_mortality_rates — recent death rate trends\n\n` +
      "INDUSTRY CONTEXT:\n" +
      `- lobbying_search for pharmaceutical companies testing ${target} treatments\n` +
      "- fec_search_committees for pharma PACs (committee_type=Q)\n" +
      "- sec_company_search for major pharma companies in the space\n\n" +
      "GOVERNMENT INVESTMENT:\n" +
      "- usa_spending_by_agency for NIH — federal research funding\n" +
      `- clinical_trials_search sponsor='NIH' condition='${target}' — government-funded trials\n\n` +
      "Compare industry-sponsored vs NIH-sponsored trial counts. " +
      "Show phase distribution and completion rates. Note any terminated trials and reasons.",
  },

  // ─── Transportation Report ─────────────────────────────────────────

  {
    name: "transportation_report",
    description: "Analyze transportation trends: airline delays, border crossings, transit ridership, infrastructure spending.",
    arguments: [
      { name: "focus", description: "Focus area: 'airlines', 'transit', 'border', or a state/city (e.g. 'CA', 'Chicago')", required: true },
    ],
    load: async ({ focus: _focus }) => {
      const focus = _focus ?? "airlines";
      return `Transportation analysis: ${focus}\n\n` +
      "TRANSPORTATION STATISTICS:\n" +
      "- bts_transport_stats — monthly transportation indicators (airline traffic, on-time %, transit ridership, rail freight, fuel prices, safety)\n" +
      "- Use limit=24 for 2 years of trend data\n\n" +
      "BORDER CROSSINGS:\n" +
      "- bts_border_crossings — trucks, vehicles, passengers at ports of entry\n" +
      "- Filter by border ('US-Mexico Border' or 'US-Canada Border'), measure ('Trucks', 'Personal Vehicles', 'Pedestrians')\n\n" +
      "INFRASTRUCTURE SPENDING:\n" +
      "- usa_spending_by_agency for DOT (Dept of Transportation)\n" +
      "- congress_search_bills for 'infrastructure', 'highway', 'FAA' — legislation\n" +
      "- lobbying_search for aviation or transportation — industry lobbying\n\n" +
      "ENERGY & ENVIRONMENT:\n" +
      "- eia_petroleum — fuel price impact on transportation\n" +
      "- nrel_fuel_stations — EV charging and alt-fuel infrastructure\n" +
      "- epa_air_quality — transportation emissions\n\n" +
      "SAFETY:\n" +
      "- nhtsa_recalls — vehicle safety recalls\n" +
      "- nhtsa_complaints — consumer safety complaints\n\n" +
      "Present trends in delays, ridership, infrastructure investment, and safety. " +
      "Compare pre/post pandemic levels where relevant.";
    },
  },

  // ─── Housing Market Analysis ───────────────────────────────────────

  {
    name: "housing_market",
    description: "Comprehensive housing market analysis: prices, rents, affordability, mortgage rates.",
    arguments: [
      { name: "location", description: "State code, metro area, or 'national' (e.g. 'CA', 'Los Angeles', 'national')", required: true },
    ],
    load: async ({ location: _location }) => {
      const location = _location ?? "national";
      const isNational = location.toLowerCase() === "national";
      const isState = location.length === 2;
      return `Housing market analysis: ${location}\n\n` +
        "HOME PRICES:\n" +
        "- fred_series_data CSUSHPINSA — Case-Shiller Home Price Index\n" +
        "- fred_series_data USSTHPI — FHFA House Price Index (national)\n" +
        "- fred_series_data MORTGAGE30US — 30-year fixed mortgage rate\n\n" +
        "RENTS:\n" +
        (isState ? `- hud_fair_market_rents for ${location} counties — Section 8 fair rents\n` : "") +
        (isState ? `- hud_income_limits for ${location} — income thresholds for housing programs\n` : "") +
        "- bls_cpi_breakdown shelter — shelter component of CPI\n\n" +
        "AFFORDABILITY:\n" +
        (isState ? `- bea_personal_income for ${location} — state personal income\n` : "") +
        "- fred_series_data LES1252881600Q — real median weekly earnings\n" +
        "- Census (B25077 home values, B25064 median rent)\n\n" +
        "LENDING:\n" +
        "- fdic_search_institutions — lending institutions in the area\n" +
        "- cfpb_search_complaints product='Mortgage' — mortgage complaints\n\n" +
        "POLICY:\n" +
        "- congress_search_bills for 'housing', 'mortgage', 'Section 8'\n" +
        "- lobbying_search for 'National Association of Realtors'\n" +
        "- usa_spending_by_agency for HUD\n\n" +
        "Calculate affordability: median home price vs median income ratio. " +
        "Show HPI trend over 5+ years. Compare mortgage payment at current rate vs 2019 rate.";
    },
  },
];
