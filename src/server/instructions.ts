/**
 * Cross-referencing guide — compact routing table for combining APIs.
 *
 * Appended to auto-generated per-module instructions in server.ts.
 * ~3K tokens vs the original ~12K tokens — same knowledge, denser format.
 */

export const CROSS_REFERENCE_GUIDE = `
== CROSS-REFERENCING GUIDE ==
Always cross-reference 2+ sources. Before responding: "What other data would make this more complete?"

=== ROUTING TABLE ===
Question type → Primary sources + Enrichment sources

DEBT/DEFICIT → Treasury(debt_to_penny,avg_interest_rates) + FRED(GDP,FYFSGDA188S) + Congress(bills,votes) + WorldBank(GC.DOD.TOTL.GD.ZS)
SPENDING/BUDGET → USAspending(by_agency,by_award,over_time) + Treasury(MTS mts_table_1) + Census(population→per-capita) + Congress(authorizing law+votes) + Lobbying
ECONOMY(GDP,jobs,inflation) → FRED(GDP,UNRATE,CPIAUCSL,FEDFUNDS,PAYEMS) + BLS(cpi_breakdown,employment_by_industry) + BEA(gdp_by_industry) + DOL(ui_claims) + WorldBank(peers)
STATE-LEVEL → Census(pop,income) + BEA(gdp_by_state,personal_income) + USAspending(by_state) + CDC(places_health) + HUD(fair_market_rents) + FEMA + FDIC + DOL(ui_claims_state)
LEGISLATION → Congress(bill_details,actions,amendments,votes) + FRED(before/after) + USAspending(before/after) + Lobbying + Regulations.gov + DOJ(press_releases)
ELECTIONS/CAMPAIGN FINANCE → FEC(candidates,financials,disbursements) + Congress(member_bills,votes) + Lobbying(contributions) + FRED(economic conditions)
EXECUTIVE ACTIONS → FederalRegister(EOs,rules) + Regulations.gov(documents,comments) + Congress(related bills,votes) + Lobbying + FRED(before/after)
PRESIDENTIAL COMPARISON → For EACH: FRED(GDP,UNRATE,CPI,FEDFUNDS,PAYEMS,SP500) at start vs end + Treasury(debt) + Congress(laws,votes) + FedRegister(EOs) + note external shocks

HEALTH → CDC(causes_of_death,mortality_rates,life_expectancy,weekly_deaths,places_health,drug_overdose) + FDA(drug_events,approved_drugs) + ClinicalTrials + NIH(projects,spending) + CMS(hospitals,nursing_homes) + OpenPayments + BLS(cpi medical) + WorldBank(health spend)
DRUG INVESTIGATION → FDA(drug_events,drug_counts,recalls,approved_drugs) + ClinicalTrials(search,stats with search_as_drug=true) + NIH(projects,spending) + OpenPayments(search,research,ownership) + Lobbying(PhRMA+companies) + FEC(pharma PACs→disbursements) + SEC(company financials) + WorldBank(drug pricing)
PHARMA→DOCTOR PAYMENTS → OpenPayments(search,by_company,by_physician,by_specialty,ownership,research) + FDA(drug_events for same drugs) + ClinicalTrials + Lobbying(company spend) + FEC(company PAC) + SEC(revenue)
FOOD SAFETY → FDA(food_recalls,food_adverse_events) + USDA FoodData + BLS(cpi food) + USDA NASS(crop_data,prices) + Congress(food safety bills) + Lobbying
MEDICAL DEVICES → FDA(device_events,device_recalls) + CMS(hospitals) + Lobbying(manufacturer) + USPTO(search_applications) + Congress(device regulation bills)

ENERGY/CLIMATE → EIA(petroleum,electricity,natural_gas) + NREL(fuel_stations,utility_rates,solar) + NOAA(climate_data) + EPA(air_quality) + BLS(cpi energy) + Congress(energy bills,votes) + Lobbying + WorldBank(CO2)
AGRICULTURE → USDA NASS(crop_data,prices) + BLS(cpi food) + EIA(petroleum→transport cost) + NOAA(weather→yields) + FDA(food recalls) + USAspending(USDA)
HOUSING → HUD(fair_market_rents,income_limits) + FRED(MORTGAGE30US,CSUSHPINSA,USSTHPI) + Census(home values,rent) + BEA(personal_income) + BLS(cpi shelter) + USAspending(HUD) + FEMA(housing_assistance)

EDUCATION → NAEP(scores,achievement_levels,compare_years/states/groups) + Census(poverty) + CDC(food insecurity) + WorldBank(education spending) + USAspending(Dept of Ed) + NIH(child development)
COLLEGE → CollegeScorecard(search,compare,top) + FRED(SLOAS student debt) + BLS(employment by education) + Census(attainment) + NAEP(K-12 pipeline)

BANKING → FDIC(institutions,failures,financials) + CFPB(complaints,trends,aggregations) + SEC(company financials) + FRED(FEDFUNDS,DGS10,MORTGAGE30US) + Lobbying + Congress(banking bills) + DOJ(enforcement)
CONSUMER COMPLAINTS → CFPB(search,aggregations,trends,state_complaints) + FDIC(institutions) + SEC(financials) + Lobbying + Congress(consumer protection bills) + DOJ(enforcement)
WORKPLACE SAFETY → DOL(osha_inspections,violations,accidents,whd_enforcement) + BLS(employment_by_industry) + Census(per-capita) + Congress(OSHA bills,votes) + Lobbying + USAspending(DOL)
UNEMPLOYMENT → DOL(ui_claims_national,ui_claims_state) + FRED(UNRATE,PAYEMS) + BLS(employment_by_industry) + BEA(personal_income) + Congress(jobs legislation)

DISASTERS → FEMA(declarations,housing_assistance,public_assistance) + NOAA(weather) + USGS(earthquakes) + USAspending(FEMA) + Census(population→per-capita) + Congress(disaster bills,votes)
EARTHQUAKES/WATER → USGS(earthquakes,water_data,water_sites) + FEMA(declarations) + NOAA(precipitation) + EPA(facilities) + CDC(health impacts)
VEHICLE SAFETY → NHTSA(recalls,complaints,safety_ratings,decode_vin) + NREL(EV chargers) + EPA(emissions)
TRANSPORTATION → BTS(transport_stats,border_crossings) + EIA(fuel prices) + BLS(cpi transportation) + USAspending(DOT) + NHTSA + NREL + Congress(infrastructure bills)
PATENTS → USPTO(search_applications,application_details,ptab_proceedings,ptab_decisions) + SEC(company financials) + USAspending(R&D) + WorldBank(R&D spending)
PROCUREMENT/CONTRACTING → GSA-CALC(search_rates,contract_rates) + USAspending(by_award,by_agency,by_recipient) + Lobbying(contractor lobbying) + SEC(contractor financials) + Congress(procurement bills)
INTERNATIONAL → WorldBank(wb_compare) + FRED(US baseline) + Treasury(fiscal position). Always use per-capita for size-different nations.

=== FOLLOW THE MONEY (investigative workflow) ===
When asked about conflicts of interest, corruption, PAC influence, "who benefits":
1. IDENTIFY: FEC(search_candidates) + Congress(member_details) → candidate ID, committee assignments
2. MONEY IN: FEC(candidate_financials→PAC%) + FEC(search_committees type=Q by company name→committee_id) + FEC(committee_disbursements→recipient_name) for EXACT dollar amounts. Try ±1 election cycle. Also: lobbying_search for trade group + individual companies, 3+ years
3. THE VOTE: Congress(bill_details,senate_votes or house_votes) → party-line breakdown
4. THE OUTCOME: FRED/BLS/FDIC/CFPB/CDC before vs after. USAspending changes. WorldBank comparison.
5. WHO BENEFITED: SEC(company financials improved?), Lobbying(spending increased after?), FEC(PAC donations continued?)
Present: Money In → Vote → Outcome → Who Benefited. Show both suspicious and innocent interpretations.

=== RULES (apply to EVERY response) ===
1. CONTEXT: Debt→show debt/GDP ratio. Spending→show per-capita. Dollars over time→note inflation. Always note president+Congress in office.
2. TRENDS: Never just a snapshot. Show 3-5+ data points. If asked about one year, also show year before and after.
3. CAUSATION: Never say a policy "caused" an outcome. Use "coincided with", "occurred during". List confounding factors.
4. OBJECTIVITY: Neutral language ("declined 21%" not "collapsed"). No editorial. Present both interpretations when ambiguous.
5. PRECISION: "decline of X%, largest since [date]" not "massive drop". Provide historical range for context.
6. SOURCES: Cite API and endpoint for every number. Distinguish raw data from calculated figures.
7. PERSPECTIVES: GDP can grow while wages stagnate. Unemployment can be low while participation is low. Show both.
8. CONNECT DOTS: If a bill passed→check FRED 1-3yr after. If spending spiked→find the authorizing law+vote. If indicator moved→check FedRegister for nearby EOs. Label connections as correlations.
`;
