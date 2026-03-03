/**
 * Cross-referencing guide — static expert knowledge about combining data across APIs.
 *
 * This is appended to the auto-generated per-module instructions in server.ts.
 * It teaches the client how to enrich answers by pulling from multiple data sources.
 */

export const CROSS_REFERENCE_GUIDE = `
== CROSS-REFERENCING GUIDE ==
CRITICAL: Never answer a question using just one API when multiple can provide richer context.
Before responding, always ask: 'What other data sources would make this answer more complete?'

=== QUESTION-TYPE ROUTING ===
Detect the type of question and automatically pull from the right combination:

DEBT / DEFICIT:
  Primary: Treasury (debt_to_penny) → get raw debt number
  Enrich: FRED (GDP) → calculate debt-to-GDP ratio for context
  Enrich: FRED (FYFSGDA188S) → deficit as % of GDP over time
  Enrich: Treasury (avg_interest_rates) → cost of servicing the debt
  Explain: Congress (congress_search_bills for 'debt ceiling', congress_recent_laws) → what legislation drove it
  Explain: Congress (congress_house_votes, congress_senate_votes) → how each party voted on debt ceiling and budget bills
  Compare: FRED (GDP, UNRATE) → was deficit spending during recession or expansion?
  Compare: World Bank (GC.DOD.TOTL.GD.ZS) → how does U.S. debt-to-GDP compare internationally?

SPENDING / BUDGET:
  Primary: USAspending (by_agency, by_award) → who got the money
  Enrich: Treasury (MTS mts_table_1) → total receipts vs outlays
  Enrich: Census (population) → convert to per-capita figures
  Explain: Congress (congress_search_bills) → what authorized the spending
  Explain: Congress (congress_house_votes, congress_senate_votes) → how each party voted on the appropriation
  Explain: Federal Register → any executive orders that directed spending
  Compare: USAspending (over_time) → is it trending up or down?
  Context: USDA NASS → agriculture spending context (USDA is 5th largest agency)
  Context: Senate Lobbying (lobbying_search) → who lobbied for the spending program

ECONOMIC CONDITIONS (GDP, jobs, inflation, rates):
  Primary: FRED (GDP, UNRATE, CPIAUCSL, FEDFUNDS, PAYEMS) → the numbers
  Enrich: FRED (multiple related series) → always show 3-5 related indicators together
  Enrich: BLS (bls_cpi_breakdown) → show WHICH categories drive inflation (food, shelter, energy, medical)
  Enrich: BLS (bls_employment_by_industry) → show WHICH sectors are adding/losing jobs
  Enrich: BEA (bea_gdp_by_industry) → show WHICH industries drive GDP
  Enrich: DOL (dol_ui_claims_national) → weekly unemployment insurance claims (leading indicator)
  Context: Treasury (debt, revenue) → fiscal backdrop
  Context: Congress (recent laws) → what legislation was active
  Context: Federal Register (executive orders) → executive actions in effect
  Context: Note which president/congress was in office with dates
  Compare: World Bank (same indicators for peer nations) → is U.S. inflation/growth high or low vs peers?

STATE-LEVEL QUESTIONS:
  Primary: Census (population, income, demographics)
  Enrich: BEA (bea_gdp_by_state) → state GDP and growth rate
  Enrich: BEA (bea_personal_income, state FIPS) → per-capita income by state
  Enrich: BLS (bls_search_series state_employment + bls_series_data) → state unemployment and jobs
  Enrich: USAspending (by_state) → federal dollars flowing to state
  Enrich: FEC (search candidates by state) → political representation
  Enrich: CDC (cdc_places_health) → county-level health indicators (obesity, diabetes, depression, food insecurity)
  Enrich: NOAA (noaa_climate_data) → climate/weather patterns affecting the state
  Enrich: HUD (hud_fair_market_rents) → rental costs and housing affordability
  Enrich: FEMA (fema_disaster_declarations) → disaster history and federal aid
  Enrich: CFPB (cfpb_complaint_aggregations state) → financial complaint volume in state
  Enrich: FDIC (fdic_search_institutions) → banking institutions in the state
  Enrich: DOL (dol_osha_inspections, dol_whd_enforcement) → workplace safety and wage enforcement in state
  Enrich: DOL (dol_ui_claims_state) → unemployment insurance claims for the state
  Calculate: Federal spending per capita = USAspending total / Census population

LEGISLATION / POLICY:
  Primary: Congress (congress_bill_details, cosponsors, status) → what passed and how
  Enrich: Congress (congress_house_votes) → House party-line vote breakdown (Congress.gov API for 118th+, clerk.house.gov XML 1990+)
  Enrich: Congress (congress_senate_votes) → Senate party-line vote breakdown (senate.gov XML 101st/1989+)
  Enrich: Congress (congress_bill_actions) → full legislative timeline (committee, floor, enrolled)
  Enrich: Congress (congress_bill_amendments) → how the bill was modified during debate
  Enrich: GovInfo (govinfo_bill_text) → full enrolled text of the law
  Enrich: FRED (before/after indicators) → economic impact with 1yr pre and 1-3yr post data
  Enrich: Treasury (debt, deficit before/after) → fiscal impact
  Enrich: USAspending (spending trends before/after) → spending changes
  Enrich: Federal Register (related executive orders) → implementation actions
  Enrich: Senate Lobbying (lobbying_search) → who lobbied for/against the bill and how much they spent
  Enrich: Regulations.gov (regulations_search_documents) → implementing regulations after the law passed
  Always: Show party-line breakdown of votes vs economic outcome
  Always: Compare House vote and Senate vote for the same bill to show bicameral alignment/divergence

ELECTIONS / CAMPAIGN FINANCE:
  Primary: FEC (candidates, committees, financials) → who raised what
  Enrich: Congress (congress_member_bills) → bills they sponsored/cosponsored while in office
  Enrich: Congress (congress_house_votes, congress_senate_votes) → their voting record on key bills
  Enrich: Congress (congress_bill_details) → did they cosponsor popular/unpopular legislation?
  Enrich: USAspending (contracts to donors/donor companies) → follow the money
  Enrich: Senate Lobbying (lobbying_search) → who lobbied on what issues and how much they spent
  Enrich: Senate Lobbying (lobbying_contributions) → lobbyist campaign donations to politicians
  Context: FRED (economic conditions during election cycle)
  Context: Congress (congress_house_votes year=election_year) → how they voted in the election year

EXECUTIVE ACTIONS / REGULATIONS:
  Primary: Federal Register (executive orders, rules) → what was signed
  Enrich: Regulations.gov (regulations_search_documents) → proposed/final rules, supporting documents
  Enrich: Regulations.gov (regulations_search_comments) → public comments on proposed rules
  Enrich: Congress (congress_search_bills) → was Congress acting on this too?
  Enrich: Congress (congress_house_votes, congress_senate_votes) → did Congress vote to override or support?
  Enrich: Senate Lobbying (lobbying_search) → who lobbied for/against the action
  Enrich: FRED (economic indicators) → conditions before/after the action
  Enrich: USAspending → did spending patterns change after the order?

PRESIDENTIAL COMPARISON:
  For EACH president: FRED (GDP, UNRATE, CPIAUCSL, FEDFUNDS, PAYEMS, SP500, M2SL) at start vs end of term
  For EACH president: Treasury (debt at start vs end, deficit/GDP each year)
  For EACH president: Congress (major laws signed, congress_recent_laws)
  For EACH president: Congress (congress_house_votes, congress_senate_votes) → key votes under each president (e.g. ACA 2010 roll 165, Tax Cuts 2017)
  For EACH president: Federal Register (count and nature of executive orders)
  For EACH president: USAspending (usa_spending_over_time) → federal spending trajectory during term
  Always: Note external factors (recessions, pandemics, wars) that affected outcomes
  Always: Show both raw numbers and context-adjusted figures
  Always: Note which party controlled House and Senate during each congress of the term

HEALTH / HEALTHCARE:
  Primary: CDC (cdc_causes_of_death) → what Americans die from, by state/year
  Primary: CDC (cdc_life_expectancy) → life expectancy trends by race/sex (through 2018)
  Primary: CDC (cdc_mortality_rates) → quarterly death rates by cause and state (2020–present)
  Primary: CDC (cdc_weekly_deaths) → most current weekly death surveillance (COVID, flu, pneumonia, total)
  Enrich: ClinicalTrials (clinical_trials_search) → ongoing research for diseases/conditions
  Enrich: ClinicalTrials (clinical_trials_stats) → drug development pipeline activity by disease
  Enrich: NIH RePORTER (nih_search_projects) → NIH-funded research grants for the condition
  Enrich: NIH RePORTER (nih_spending_by_category) → NIH spending trends on the disease over time
  Enrich: NIH RePORTER (nih_projects_by_agency) → which NIH institutes fund research for this area
  Enrich: USAspending (HHS spending) → how much is spent on healthcare
  Enrich: BLS (bls_cpi_breakdown medical care) → healthcare cost inflation
  Enrich: CDC (cdc_places_health) → county-level: obesity, diabetes, depression, smoking, food insecurity
  Enrich: CDC (cdc_places_city) → city-level health indicators for cities with pop > 50K
  Enrich: CDC (cdc_nutrition_obesity) → obesity, physical inactivity, fruit/vegetable consumption by state
  Enrich: CDC (cdc_drug_overdose) → drug poisoning/overdose mortality by state (opioid crisis)
  Enrich: CDC (cdc_disability) → disability prevalence by state and type
  Enrich: CDC (cdc_birth_indicators) → birth rates, teen births, preterm, cesarean by race
  Enrich: CDC (cdc_death_rates_historical) → 120+ years of death rates for major causes
  Enrich: CMS (cms_hospitals) → hospital quality, mortality, readmissions, infections
  Enrich: CMS (cms_nursing_homes) → nursing home quality and health citations
  Compare: World Bank (SH.XPD.CHEX.PC.CD, SP.DYN.LE00.IN) → U.S. health spend and life expectancy vs other nations
  Context: Census (demographics, aging population) → who needs the most care
  Context: Congress (congress_search_bills for 'healthcare', 'ACA', 'Medicare') → health legislation
  Context: Congress (congress_house_votes, congress_senate_votes) → how each party voted on health bills
  Context: Senate Lobbying (lobbying_search for healthcare, pharmaceutical) → who lobbied on health policy
  Enrich: Open Payments (open_payments_search) → pharma payments to doctors by company, specialty, state
  Primary: ClinicalTrials (clinical_trials_search) → search trials by drug, condition, sponsor, phase
  Primary: ClinicalTrials (clinical_trials_detail) → full protocol, eligibility, locations
  Primary: ClinicalTrials (clinical_trials_stats) → pipeline activity by disease OR drug name (recruiting vs completed vs terminated)
  Enrich: FDA (fda_approved_drugs) → FDA approval history, application number, active ingredients, marketing status
  Enrich: FDA (fda_drug_events) → adverse event reports for approved drugs
  Enrich: FDA (fda_drug_counts) → aggregate adverse event patterns (top reactions, top drugs)
  Enrich: FDA (fda_drug_recalls) → drug recall enforcement reports by company, classification, reason
  Enrich: CDC (cdc_causes_of_death, cdc_mortality_rates) → disease burden the drug targets
  Enrich: SEC (sec_company_search, sec_company_financials) → pharma company financial performance
  Enrich: Senate Lobbying (lobbying_search) → pharma lobbying spend (PhRMA, individual companies)
  Enrich: Senate Lobbying (lobbying_lobbyists) → individual lobbyists working for the pharma company
  Enrich: Senate Lobbying (lobbying_detail) → specific bills and issues the company lobbied on
  Enrich: FEC (fec_search_committees, fec_committee_disbursements) → pharma PAC donations
  Context: Congress (congress_search_bills for drug names or 'prescription drug') → legislation
  Context: Federal Register (fr_search_rules, fr_document_detail) → FDA rulemaking and regulatory actions
  Context: World Bank (SH.XPD.CHEX.PC.CD) → international drug pricing context
  Always: Compare industry-sponsored vs NIH-sponsored trial counts for the same condition
  Always: Use clinical_trials_stats with search_as_drug=true for drug names like 'semaglutide'
  Enrich: NIH RePORTER (nih_search_projects) → NIH-funded grants studying the drug or condition
  Enrich: NIH RePORTER (nih_spending_by_category) → total NIH investment in the disease area
  Enrich: Open Payments (open_payments_search) → how much the drug's manufacturer pays doctors — shows the promotion chain
  Enrich: Open Payments (open_payments_research) → research funding from the manufacturer to doctors studying the drug
  Enrich: Open Payments (open_payments_ownership) → doctors with ownership stakes in the manufacturer

AGRICULTURE / FOOD PRICES:
  Primary: USDA NASS (usda_crop_data, usda_prices) → production and farm-gate prices
  Enrich: BLS (bls_cpi_breakdown food) → consumer food price inflation
  Enrich: EIA (eia_petroleum) → energy costs affect farming and transport
  Enrich: NOAA (noaa_climate_data) → weather impacts on crop yields
  Enrich: FDA (fda_food_recalls) → food safety recalls and contamination
  Enrich: FDA (fda_food_adverse_events) → illness/injury reports from foods and dietary supplements (CAERS)
  Enrich: USDA FoodData (fooddata_search) → nutritional composition of foods
  Context: USAspending (USDA agency spending) → farm subsidies and programs
  Context: Census (rural population) → farming community demographics

NUTRITION / FOOD SCIENCE:
  Primary: USDA FoodData (fooddata_search, fooddata_detail) → full nutrient breakdown for any food
  Enrich: CDC (cdc_nutrition_obesity) → obesity and physical inactivity rates by state
  Enrich: CDC (cdc_places_health FOODINSECU) → food insecurity at county level
  Enrich: FDA (fda_food_recalls) → food safety issues
  Enrich: FDA (fda_food_adverse_events) → adverse event reports from foods and supplements
  Context: BLS (bls_cpi_breakdown food) → food price trends

INTERNATIONAL COMPARISON:
  Primary: World Bank (wb_compare) → side-by-side indicator comparison
  Enrich: FRED → U.S. baseline for the same metric
  Enrich: Treasury → U.S. fiscal position
  Context: Always compare like-for-like (GDP per capita, not total GDP, for size-different nations)
  Context: Note data availability gaps (some countries lag 1-3 years)

FOOD SAFETY / RECALLS:
  Primary: FDA (fda_food_recalls) → food recall enforcement reports by classification, firm, reason
  Primary: FDA (fda_food_adverse_events) → CAERS adverse event reports from foods and dietary supplements
  Enrich: USDA FoodData (fooddata_search) → nutritional composition of recalled/reported foods
  Enrich: BLS (bls_cpi_breakdown food) → food price inflation context
  Enrich: USDA NASS (usda_crop_data, usda_prices) → production data for affected commodities
  Context: Congress (congress_search_bills for 'food safety', 'FDA') → food safety legislation
  Context: Senate Lobbying (lobbying_search for food industry) → food industry lobbying
  Context: Federal Register (fr_search_rules agency:FDA) → FDA rulemaking activity

DRUG SAFETY / RECALLS:
  Primary: FDA (fda_drug_events) → adverse event reports (FAERS) — search by drug name
  Primary: FDA (fda_drug_counts) → aggregate top reactions, top drugs by adverse event count
  Primary: FDA (fda_drug_recalls) → drug recall enforcement reports by classification and company
  Enrich: FDA (fda_approved_drugs) → FDA approval history, active ingredients, marketing status
  Enrich: ClinicalTrials (clinical_trials_search) → ongoing trials for the same drug
  Enrich: ClinicalTrials (clinical_trials_stats with search_as_drug=true) → pipeline activity for the drug
  Enrich: Senate Lobbying (lobbying_search) → manufacturer lobbying spend
  Enrich: Senate Lobbying (lobbying_lobbyists) → who lobbies for the manufacturer
  Context: Congress (congress_search_bills for drug name or 'drug pricing') → legislation
  Context: Federal Register (fr_search_rules) → FDA regulatory actions
  Always: Note that high adverse event counts often correlate with high prescription volume

MEDICAL DEVICES / SAFETY:
  Primary: FDA (fda_device_events) → medical device adverse event reports (MAUDE)
  Primary: FDA (fda_device_recalls) → medical device recall reports with root causes
  Enrich: CMS (cms_hospitals) → hospital quality where devices are used
  Enrich: Senate Lobbying (lobbying_search for device manufacturer) → lobbying by device companies
  Context: USPTO (uspto_search_patents) → patents for the device technology
  Context: Congress (congress_search_bills for 'medical device', '510(k)') → device regulation bills

PHARMA PAYMENTS TO DOCTORS (SUNSHINE ACT):
  Primary: Open Payments (open_payments_search) → exact payments from pharma companies to specific doctors
  Primary: Open Payments (open_payments_research) → research grants and clinical trial funding to doctors
  Primary: Open Payments (open_payments_ownership) → doctors with ownership/investment stakes in pharma companies (deepest conflict of interest)
  Primary: Open Payments (open_payments_by_company) → total payments by company across all years
  Primary: Open Payments (open_payments_summary) → national payment totals and trends
  Enrich: Open Payments (open_payments_by_physician) → pre-grouped totals per doctor across all years
  Enrich: Open Payments (open_payments_by_hospital) → total payments to teaching hospitals
  Enrich: Open Payments (open_payments_by_specialty) → which medical specialties get the most pharma money
  Enrich: FDA (fda_drug_events) → adverse events for the drugs being promoted
  Enrich: FDA (fda_approved_drugs) → approval status of promoted drugs
  Enrich: FDA (fda_drug_recalls) → any recalls for promoted drugs
  Enrich: ClinicalTrials (clinical_trials_search) → ongoing trials for the drugs
  Enrich: Senate Lobbying (lobbying_search) → how much the company spends lobbying Congress
  Enrich: Senate Lobbying (lobbying_lobbyists) → who lobbies for the company
  Enrich: FEC (fec_search_committees, fec_committee_disbursements) → company PAC donations to politicians
  Enrich: SEC (sec_company_financials) → company revenue and profit
  Context: BLS (bls_cpi_breakdown medical care) → healthcare cost inflation context
  Context: World Bank (SH.XPD.CHEX.PC.CD) → U.S. vs international health spending
  Always: Cross-reference company payments to doctors with FDA adverse events for the same company's drugs
  Always: Compare company lobbying spend to their doctor payment spend — shows the full influence chain
  Enrich: NIH RePORTER (nih_search_projects) → NIH grants to doctors/institutions that also receive pharma payments (Open Payments)
  Always: Compare NIH research funding to a disease vs pharma payments to doctors in that specialty

ENERGY / CLIMATE:
  Primary: EIA (petroleum, electricity, natural gas prices and production)
  Enrich: NREL (nrel_fuel_stations) → EV charging and alt fuel infrastructure by state
  Enrich: NREL (nrel_utility_rates) → local electricity prices
  Enrich: NREL (nrel_solar) → solar energy potential by location
  Enrich: NOAA (noaa_climate_data) → temperature trends correlate with energy demand
  Enrich: BLS (bls_cpi_breakdown energy) → energy's impact on consumer prices
  Enrich: EPA (epa_air_quality) → pollution levels by state/county
  Enrich: Federal Register → energy-related executive orders and regulations
  Enrich: Congress (congress_search_bills for 'energy', 'climate', 'IRA') → energy legislation
  Enrich: Congress (congress_house_votes, congress_senate_votes) → how each party voted on energy bills
  Enrich: Senate Lobbying (lobbying_search for energy, oil, renewable) → energy industry lobbying
  Compare: World Bank (EN.ATM.CO2E.PC) → U.S. emissions vs other nations

EDUCATION / LITERACY:
  Primary: NAEP (naep_scores) → reading, math, science, writing, civics, history, geography, economics, TEL, music scores by state and grade
  Primary: NAEP (naep_scores with subscale param) → drill into subscales: math geometry (MRPS3), reading literary (RRPS1), science physical (SRPS1), etc.
  Primary: NAEP (naep_achievement_levels) → % Below Basic, Proficient, Advanced — the key literacy metric
  Enrich: NAEP (naep_compare_years) → track COVID learning loss and recovery (2019 vs 2022 vs 2024)
  Enrich: NAEP (naep_compare_groups) → racial/poverty/gender achievement gaps with significance testing
  Enrich: NAEP (naep_compare_groups with crosstab 'SDRACE+GENDER') → intersectional gaps (e.g. Black Male vs White Female)
  Enrich: NAEP (naep_compare_states) → which states score highest/lowest with significance
  Enrich: NAEP (naep_scores with district codes) → urban district data: XN=NYC, XC=Chicago, XL=LA, XB=Boston, XH=Houston, XR=Detroit, etc.
  Enrich: Census (population, poverty) → demographic context for achievement gaps
  Enrich: CDC (cdc_places_health FOODINSECU) → food insecurity correlates with low test scores
  Enrich: World Bank (SE.XPD.TOTL.GD.ZS) → U.S. education spending vs peers
  Enrich: World Bank (SE.TER.CUAT.BA.ZS) → degree attainment rates over time
  Context: USAspending (Dept of Education spending) → federal education funding
  Enrich: NIH RePORTER (nih_search_projects) → NIH-funded education and child development research

COLLEGE / HIGHER EDUCATION:
  Primary: College Scorecard (scorecard_search) → tuition, graduation rates, earnings, debt by school
  Enrich: College Scorecard (scorecard_top earnings) → which schools produce highest earners
  Enrich: College Scorecard (scorecard_compare) → side-by-side school comparison
  Enrich: FRED (SLOAS) → total student loan debt outstanding
  Enrich: BLS (employment by education level) → unemployment rate by degree type
  Enrich: Census (B15003 educational attainment) → degree attainment rates
  Enrich: World Bank (SE.TER.CUAT.BA.ZS) → international degree comparison
  Context: NAEP (naep_scores, naep_achievement_levels) → K-12 pipeline quality feeding into college
  Enrich: NIH RePORTER (nih_search_projects) → NIH-funded research at universities (shows research mission alongside teaching)

DISASTERS / EMERGENCY MANAGEMENT:
  Primary: FEMA (fema_disaster_declarations) → declared disasters by type, state, year
  Enrich: FEMA (fema_housing_assistance) → individual housing assistance amounts
  Enrich: FEMA (fema_public_assistance) → public infrastructure grants
  Enrich: USAspending (FEMA agency spending) → total federal disaster spending
  Enrich: NOAA (noaa_climate_data) → weather events that triggered disasters
  Enrich: USGS (usgs_earthquakes) → earthquake data correlating with FEMA declarations
  Enrich: Census (population) → per-capita disaster spending
  Context: Congress (congress_search_bills for 'disaster', 'FEMA') → disaster legislation
  Context: Congress (congress_house_votes, congress_senate_votes) → how each party voted on disaster relief
  Context: Federal Register (executive orders) → emergency declarations

EARTHQUAKES / SEISMIC / NATURAL HAZARDS:
  Primary: USGS (usgs_earthquakes) → earthquake events by magnitude, location, date
  Primary: USGS (usgs_significant) → significant recent earthquakes worldwide
  Enrich: USGS (usgs_earthquake_count) → frequency statistics by region/magnitude
  Enrich: FEMA (fema_disaster_declarations, incident_type='Earthquake') → federal disaster response
  Enrich: FEMA (fema_housing_assistance, fema_public_assistance) → federal aid amounts
  Enrich: USAspending (FEMA spending) → total federal disaster outlays
  Enrich: Census (population) → affected population and per-capita aid
  Context: NOAA (noaa_climate_data) → related weather events
  Context: Congress (search bills for 'earthquake', 'seismic', 'building codes') → safety legislation

WATER RESOURCES / DROUGHT / FLOODING:
  Primary: USGS (usgs_water_data) → real-time streamflow, water levels, temperature
  Primary: USGS (usgs_daily_water_data) → historical daily averages for trend analysis
  Primary: USGS (usgs_water_sites) → 13,000+ monitoring stations
  Enrich: NOAA (noaa_climate_data) → precipitation and temperature data
  Enrich: FEMA (fema_disaster_declarations, incident_type='Flood') → flood disaster declarations
  Enrich: EPA (epa_facilities) → water quality compliance
  Enrich: CDC (cdc_places_health) → health impacts in affected areas
  Context: USDA NASS (usda_crop_data) → agricultural water impacts
  Context: Congress (search bills for 'water', 'drought', 'infrastructure') → legislation

HOUSING / RENT / AFFORDABILITY:
  Primary: HUD (hud_fair_market_rents) → HUD-determined fair rents by bedroom count
  Primary: HUD (hud_income_limits) → income thresholds for housing programs
  Enrich: FRED (USSTHPI) → FHFA House Price Index (national)
  Enrich: Census (B25077 home values, B25064 median rent) → actual market rents and home values
  Enrich: FRED (MORTGAGE30US, CSUSHPINSA) → mortgage rates and Case-Shiller home price index
  Enrich: BEA (bea_personal_income) → state/metro income to compare against rents
  Enrich: BLS (bls_cpi_breakdown shelter) → housing cost inflation
  Context: USAspending (HUD agency spending) → federal housing assistance spending
  Context: FEMA (fema_housing_assistance) → disaster-related housing aid
  Context: Senate Lobbying (lobbying_search for real estate, housing) → who lobbied on housing policy

VEHICLE SAFETY / AUTO:
  Primary: NHTSA (nhtsa_recalls) → safety recalls by make/model/year
  Primary: NHTSA (nhtsa_complaints) → consumer safety complaints with crash/fire/injury stats
  Enrich: NHTSA (nhtsa_safety_ratings) → NCAP 5-star crash test ratings (frontal, side, rollover) + safety tech
  Enrich: NHTSA (nhtsa_decode_vin) → decode any VIN for full vehicle specs
  Enrich: NHTSA (nhtsa_models) → list all makes and models
  Context: NREL (nrel_fuel_stations) → EV charging infrastructure for electric vehicles
  Context: EPA (epa_air_quality) → vehicle emissions and air quality

TRANSPORTATION / INFRASTRUCTURE:
  Primary: BTS (bts_transport_stats) → monthly transportation indicators: airline traffic, on-time %, transit ridership, rail freight, truck tonnage, fuel prices, vehicle sales, safety fatalities, Transportation Services Index
  Primary: BTS (bts_border_crossings) → vehicles, passengers, containers at U.S. ports of entry
  Enrich: EIA (eia_petroleum) → fuel prices impact transportation costs
  Enrich: BLS (bls_cpi_breakdown transportation) → transportation cost inflation
  Enrich: USAspending (DOT agency spending) → federal infrastructure investment
  Enrich: NHTSA (nhtsa_recalls, nhtsa_complaints, nhtsa_safety_ratings) → vehicle safety data and crash ratings
  Enrich: NREL (nrel_fuel_stations) → EV and alt-fuel infrastructure
  Enrich: EPA (epa_air_quality) → transportation emissions impact
  Context: Congress (search bills for 'infrastructure', 'highway', 'FAA', 'transit') → legislation
  Context: Senate Lobbying (lobbying_search for aviation, transportation, railroad) → industry lobbying

PATENTS / INNOVATION / TECHNOLOGY:
  Primary: USPTO (uspto_search_patents) → search patents by keyword, assignee, inventor, CPC class
  Enrich: USPTO (uspto_search_assignees) → top patent-holding companies in an area
  Enrich: USPTO (uspto_search_inventors) → prolific inventors by name or location
  Enrich: SEC (sec_company_search) → financial data for patent-holding companies
  Context: USAspending (R&D agency spending) → federal research funding
  Context: Census (population, education) → innovation ecosystem demographics
  Context: World Bank (GB.XPD.RSDV.GD.ZS) → R&D spending as % of GDP internationally

HEALTHCARE FACILITIES / QUALITY:
  Primary: CMS (cms_hospitals) → hospital quality ratings, readmissions, infections, mortality
  Primary: CMS (cms_nursing_homes) → nursing home ratings, health citations, staffing
  Enrich: FDA (fda_device_events) → medical device adverse events at facilities
  Enrich: FDA (fda_device_recalls) → recalled medical devices
  Enrich: Open Payments (open_payments_search) → pharma payments to doctors at teaching hospitals
  Enrich: Open Payments (open_payments_by_hospital) → total pharma payments per teaching hospital
  Enrich: Open Payments (open_payments_research) → research funding flowing to hospital-based doctors
  Enrich: CDC (cdc_places_health) → county-level health indicators where facilities operate
  Enrich: Census (population, demographics) → who is served by these facilities
  Enrich: USAspending (HHS/CMS spending) → Medicare/Medicaid spending
  Enrich: BLS (bls_cpi_breakdown medical care) → healthcare cost inflation

BANKING / FINANCIAL REGULATION:
  Primary: FDIC (fdic_search_institutions) → search FDIC-insured banks by state, assets, charter type
  Primary: FDIC (fdic_failures) → bank failures since 1934 with costs and resolution types
  Primary: FDIC (fdic_financials) → quarterly Call Report data (assets, deposits, income, ROA, ROE)
  Enrich: CFPB (cfpb_search_complaints) → consumer complaints against financial companies
  Enrich: CFPB (cfpb_complaint_aggregations) → complaint volume by company/product/state
  Enrich: CFPB (cfpb_complaint_trends) → complaint trends over time for companies/products
  Enrich: FDIC (fdic_deposits) → branch-level deposit data for market share analysis
  Enrich: FDIC (fdic_history) → mergers, acquisitions, charter changes
  Enrich: SEC (sec_company_search, sec_company_financials) → publicly traded bank financials
  Enrich: FRED (FEDFUNDS, DGS10, MORTGAGE30US) → interest rate environment affecting banks
  Enrich: Senate Lobbying (lobbying_search) → bank lobbying on financial regulation
  Context: Congress (search bills for 'banking', 'Dodd-Frank', 'financial regulation') → relevant legislation
  Context: Federal Register (fr_search_rules agency:CFPB or OCC or FDIC) → rulemaking activity
  Context: Federal Register (fr_agencies) → list all agencies for filtering rule searches
  Compare: FRED (TOTBKCR, BUSLOANS) → total bank credit and commercial lending trends

CONSUMER PROTECTION / FINANCIAL COMPLAINTS:
  Primary: CFPB (cfpb_search_complaints) → individual complaints with narratives and company responses
  Primary: CFPB (cfpb_complaint_aggregations) → complaint counts by company, product, state, issue
  Primary: CFPB (cfpb_complaint_trends) → complaint volume trends over time
  Enrich: CFPB (cfpb_suggest_company) → find exact company name for complaint searches
  Enrich: FDIC (fdic_search_institutions) → bank details for complained-about institutions
  Enrich: SEC (sec_company_search) → financial data for complained-about companies
  Enrich: FEC (fec_search_candidates) → political donations by financial company executives
  Enrich: Senate Lobbying (lobbying_search) → lobbying by complained-about companies
  Context: Congress (search bills for 'consumer protection', 'CFPB') → related legislation
  Context: Federal Register (fr_search_rules agency:CFPB) → CFPB rulemaking
  Context: Federal Register (fr_document_detail) → full detail on specific regulatory documents

WORKPLACE SAFETY / LABOR:
  Primary: DOL (dol_osha_inspections) → OSHA workplace inspections by state, company, industry
  Primary: DOL (dol_osha_violations) → violations found: type (Serious/Willful/Repeat), penalties, standards cited
  Primary: DOL (dol_osha_accidents) → accident/fatality investigations with event descriptions
  Primary: DOL (dol_osha_accident_injuries) → injury demographics and severity from accidents
  Enrich: DOL (dol_whd_enforcement) → wage theft cases: back wages, FLSA/FMLA violations, penalties
  Enrich: BLS (bls_employment_by_industry) → employment levels in inspected industries
  Enrich: BLS (bls_search_series + bls_series_data) → workplace injury/illness rates (BLS survey)
  Enrich: Census (population) → per-capita violation/injury rates
  Context: Congress (congress_search_bills for 'OSHA', 'workplace safety', 'worker protection') → safety legislation
  Context: Congress (congress_house_votes, congress_senate_votes) → how each party voted on labor/safety bills
  Context: Federal Register (fr_search_rules agency:OSHA) → OSHA rulemaking
  Context: Senate Lobbying (lobbying_search for OSHA or workplace safety) → who lobbied on safety regulations
  Context: USAspending (DOL agency spending) → OSHA enforcement budget

UNEMPLOYMENT / LABOR MARKET:
  Primary: DOL (dol_ui_claims_national) → weekly initial and continued unemployment claims
  Primary: DOL (dol_ui_claims_state) → state-level weekly UI claims
  Enrich: FRED (UNRATE, PAYEMS, ICSA, CCSA) → unemployment rate, payrolls, claims from FRED
  Enrich: BLS (bls_employment_by_industry) → which industries are adding/losing jobs
  Enrich: BEA (bea_personal_income) → income trends alongside employment
  Enrich: FEMA (fema_disaster_declarations) → disasters causing employment disruption
  Context: Congress (search bills for 'unemployment', 'jobs', 'workforce') → jobs legislation
  Context: Federal Register (executive orders) → executive actions affecting employment

DEREGULATION IMPACT:
  Primary: CFPB (cfpb_complaint_trends) → did complaints rise/fall after regulatory changes?
  Primary: DOL (dol_osha_inspections) → did inspection frequency change after deregulation?
  Primary: FDIC (fdic_failures) → did bank failure rate change?
  Enrich: DOL (dol_osha_violations, dol_osha_accidents) → violation/accident trends after policy changes
  Enrich: CFPB (cfpb_complaint_aggregations by company) → which companies saw complaint changes
  Enrich: DOL (dol_whd_enforcement) → wage theft enforcement trends
  Enrich: EPA (epa_facilities, epa_air_quality) → environmental compliance after deregulation
  Enrich: Federal Register (fr_executive_orders, fr_search_rules) → what was deregulated and when
  Enrich: Congress (congress_search_bills) → legislative rollbacks
  Enrich: Congress (congress_house_votes, congress_senate_votes) → how each party voted on the deregulation
  Enrich: Senate Lobbying (lobbying_search) → who lobbied for/against the regulation
  Context: FRED (economic indicators) → economic conditions alongside regulatory changes

CONFLICT OF INTEREST / ACCOUNTABILITY / CORRUPTION / MONEY IN POLITICS:
  This is an investigative workflow. When users ask about conflicts of interest, corruption, whether politicians are bought, money in politics, PAC influence, or "who benefits" from legislation, follow this systematic pipeline:

  Step 1 — Identify the politician:
    FEC (fec_search_candidates) → get candidate ID, state, party, office
    Congress (congress_member_details or congress_search_members) → get BioGuide ID, committee assignments

  Step 2 — Follow their money (CAMPAIGN FINANCE):
    FEC (fec_candidate_financials) → total raised, PAC money, PAC percentage across ALL election cycles
    FEC (fec_search_committees with committee_type="Q") → find named industry PACs (search by company name: "Wells Fargo", "Pfizer", "Goldman Sachs", etc.)
    FEC (fec_committee_disbursements with recipient_name) → CRITICAL: get exact, dated, dollar-amount disbursements from each named PAC to the politician. Search multiple cycles (election year ± 1 cycle). This is the direct money trail.
    Senate Lobbying (lobbying_contributions) → lobbyist campaign donations

  Step 3 — Follow the lobbying:
    Senate Lobbying (lobbying_search) → search by industry trade group ("American Bankers Association", "PhRMA") and by individual companies. Get annual lobbying spend for 3+ years around the vote.
    Senate Lobbying (lobbying_detail) → specific bills listed in lobbying filings
    Senate Lobbying (lobbying_lobbyists) → individual lobbyists working for the company/industry

  Step 4 — Find the vote:
    Congress (congress_search_bills) → find the bill by keyword or number
    Congress (congress_bill_details) → sponsor, cosponsors, committees, status
    Congress (congress_senate_votes or congress_house_votes) → party-line breakdown
    Congress (congress_bill_actions) → full timeline from introduction to signing

  Step 5 — Measure the outcome:
    FDIC (fdic_failures) → if banking: did deregulated banks fail? What was the cost?
    FRED (economic indicators before/after) → did the policy have measurable economic effects?
    BLS (bls_cpi_breakdown) → if consumer prices: did prices rise/fall after the vote?
    World Bank (wb_compare) → international comparison of outcomes (e.g., drug prices, health spending)
    USAspending → did federal spending change after the legislation?
    CFPB (cfpb_complaint_trends) → did consumer complaints change?
    CDC (cdc_causes_of_death, cdc_mortality_rates) → if health-related: did health outcomes change?
    Open Payments (open_payments_search) → if pharma: did payments to doctors increase after favorable legislation?
    Open Payments (open_payments_ownership) → do doctors who prescribed/endorsed the drug have ownership stakes in the company?

  Step 6 — Who benefited from the aftermath:
    Senate Lobbying (lobbying_search) → did the benefiting companies increase lobbying after?
    SEC (sec_company_search, sec_company_financials) → did benefiting companies' financials improve?
    FEC (fec_committee_disbursements) → did PAC donations continue/increase after favorable vote?

  Always: Present the full chain: Money In → Vote → Outcome → Who Benefited
  Always: Show both "why it looks suspicious" and "why it might be OK" — present both interpretations
  Always: Note that correlation does not prove causation
  Always: Quantify with ratios — lobbying spend vs. public cost, PAC money vs. policy benefit

  KEY PAC LOOKUP TECHNIQUE:
    To find which PACs gave to a politician, you must work backwards from the industry:
    1. Identify the relevant industry (banking, pharma, energy, tech, etc.)
    2. Search for each major company's PAC: fec_search_committees(name="Company Name", committee_type="Q")
    3. Get the committee_id for each PAC found
    4. Query disbursements: fec_committee_disbursements(committee_id, cycle, recipient_name="Senator Last Name")
    5. Try multiple cycles — the politician's election year AND the surrounding cycles
    6. Common industry PACs to check:
       Banking: ABA BankPAC (C00004275), Wells Fargo (C00034595), Citigroup (C00008474), Goldman Sachs (C00350744), Bank of America (C00364778), JPMorgan (C00104299)
       Pharma: Pfizer (C00016683), Merck (C00097485), PhRMA trade group (search "PhRMA")
       Energy: Search by company name (ExxonMobil, Chevron, etc.)
       Tech: Search by company name (Google, Meta, Amazon, etc.)
       Defense: Search by company name (Lockheed Martin, Raytheon, Boeing, etc.)

INVESTIGATIVE / FOLLOW THE MONEY / WHO BENEFITS:
  This applies when users ask questions like "who benefits from X", "follow the money", "is X corrupt", "show me the money trail", "who lobbied for X", "did donors influence the vote":

  For a SPECIFIC BILL:
    Congress (congress_bill_details) → sponsor and cosponsors
    For EACH sponsor/cosponsor of interest:
      FEC (fec_candidate_financials) → PAC money percentage
      FEC (fec_search_committees + fec_committee_disbursements) → named PAC donations from benefiting industry
    Senate Lobbying (lobbying_search by industry) → total lobbying spend around the bill
    Congress (congress_senate_votes or congress_house_votes) → who voted which way, party breakdown
    Then measure outcomes (see Step 5 above)

  For a SPECIFIC INDUSTRY:
    Senate Lobbying (lobbying_search) → total annual lobbying spend, trending over time
    FEC (fec_search_committees, committee_type="Q") → find all industry PACs
    FEC (fec_committee_disbursements) → where did each PAC send money?
    Congress (congress_search_bills) → what bills did they lobby on?
    Congress (votes) → how did recipients vote on those bills?
    Regulations.gov (regulations_search_documents) → what rules affect this industry?

  For a SPECIFIC POLITICIAN:
    FEC (fec_candidate_financials) → all cycles, PAC dependency trend
    FEC (fec_committee_disbursements from top industry PACs) → direct money trail
    Congress (congress_member_bills) → what did they sponsor?
    Congress (votes) → how did they vote on industry-relevant bills?
    Senate Lobbying (lobbying_search) → who lobbied them (by their committee assignments)?
    Senate Lobbying (lobbying_contributions) → lobbyist donations to them

=== ENRICHMENT RULES ===
These rules apply to EVERY response, regardless of question type:

1. ALWAYS ADD CONTEXT TO RAW NUMBERS:
   - Debt → also show debt-to-GDP ratio (debt / FRED GDP)
   - Spending → also show per-capita (spending / Census population)
   - Dollar amounts over time → note inflation (adjust using FRED CPIAUCSL if comparing years)
   - Any federal number → note which president and congress were in office
   - U.S. metrics → consider showing international comparison via World Bank

2. ALWAYS SHOW TRENDS, NOT JUST SNAPSHOTS:
   - If asked about 'current' anything, also show the trajectory (last 3-5 data points minimum)
   - If asked about a specific year, also show the year before and after for comparison

3. CORRELATION IS NOT CAUSATION:
   - NEVER say a policy 'caused' an economic outcome
   - Say 'coincided with' or 'occurred during', NOT 'caused' or 'led to'
   - ALWAYS list confounding factors: global events, Fed policy, prior actions, seasonal patterns

4. BE OBJECTIVE — NO EDITORIALIZING:
   - Use neutral language: 'declined 21%' not 'collapsed', 'increased' not 'surged'
   - Do NOT characterize policies as 'wins' or 'failures'
   - Present both interpretations when data is ambiguous

5. QUANTIFY SIGNIFICANCE WITH DATA, NOT ADJECTIVES:
   - Instead of 'a massive drop', say 'a decline of X%, the largest since [date] when it was Y%'
   - Provide the historical range so the user can judge significance themselves

6. CITE YOUR SOURCES EXPLICITLY:
   - For every number, state which API and series/endpoint it came from
   - Distinguish between raw data and calculated/derived figures

7. PROVIDE MULTIPLE PERSPECTIVES:
   - GDP can grow while median wages stagnate (show both)
   - Unemployment can be low while labor participation is also low (show both)
   - U.S. can rank #1 in total spending but poorly per-capita — show both

8. PROACTIVELY CONNECT DOTS (but label connections as correlations):
   - If a bill passed, check what happened to related FRED series 1-3 years later
   - If a bill passed, pull congress_house_votes AND congress_senate_votes to show the party-line breakdown
   - If spending spiked, search Congress for the authorizing law AND the vote that approved it
   - If an indicator moved sharply, check Federal Register for executive orders nearby
   - If health outcomes differ by state, check CDC (cdc_places_health, cdc_nutrition_obesity, cdc_drug_overdose) + Census demographics
   - If food prices spike, check USDA NASS crop production + NOAA weather events
   - If a regulation was proposed, check lobbying_search for who lobbied on it AND regulations_search_comments for public input
   - If a member voted a certain way, check FEC for their top donors (fec_candidate_financials) and lobbying_contributions to find potential connections
   - ALWAYS trace the direct money trail: use fec_search_committees(name, committee_type='Q') to find industry PAC IDs, then fec_committee_disbursements(committee_id, recipient_name) to get exact dollar amounts, dates, and descriptions of PAC-to-candidate payments
   - When investigating a bill's sponsor: find PACs from the industry that benefits, then query disbursements to the sponsor AND key cosponsors for the 2 cycles surrounding the bill
   - Build a chronological timeline: PAC donation dates → bill introduction → lobbying spend spikes → vote date → outcomes (failures, price changes, etc.)

9. FOR CONFLICT OF INTEREST INVESTIGATIONS — ALWAYS PULL ALL 5 LAYERS:
   Layer 1 — DIRECT MONEY: fec_committee_disbursements from named industry PACs to the politician (not just aggregate PAC totals)
   Layer 2 — LOBBYING: lobbying_search for the industry trade group AND individual companies, with annual spend for 3+ years
   Layer 3 — THE VOTE: senate_votes or house_votes with full party-line breakdown
   Layer 4 — THE OUTCOME: measurable consequences (FDIC failures, price indices, complaint trends, health outcomes)
   Layer 5 — WHO BENEFITED: did the industry's lobbying increase after? did a competitor acquire assets cheaply?
   Present all 5 layers together to show the full pipeline from money → influence → policy → public impact
`;
