/**
 * Treasury Fiscal Data SDK — typed API client for the U.S. Treasury Fiscal Data API.
 *
 * Standalone — no MCP server required. Usage:
 *
 *   import { queryFiscalData, searchEndpoints, ENDPOINTS } from "us-gov-open-data-mcp/sdk/treasury";
 *
 * No API key required — completely open.
 * Base URL: https://api.fiscaldata.treasury.gov/services/api/fiscal_service
 */

import { createClient } from "../../shared/client.js";

// ─── Client ──────────────────────────────────────────────────────────

const api = createClient({
  baseUrl: "https://api.fiscaldata.treasury.gov/services/api/fiscal_service",
  name: "treasury",
  rateLimit: { perSecond: 10, burst: 20 },
  cacheTtlMs: 30 * 60 * 1000, // 30 min — Treasury data updates daily
});

// ─── Types ───────────────────────────────────────────────────────────

/** Fiscal Data Response. */
export interface FiscalDataResponse {
  data: Record<string, string>[];
  meta: {
    count: number;
    labels: Record<string, string>;
    dataTypes: Record<string, string>;
    dataFormats: Record<string, string>;
    "total-count": number;
    "total-pages": number;
  };
  links: {
    self: string;
    first: string;
    prev: string | null;
    next: string | null;
    last: string;
  };
}

/** Endpoint Info. */
export interface EndpointInfo {
  dataset: string;
  slug: string;
  dataTable: string;
  endpoint: string;
  description: string;
}

/** Query Params. */
export interface QueryParams {
  fields?: string;
  filter?: string;
  sort?: string;
  pageNumber?: number;
  pageSize?: number;
}

// ─── Endpoints (181 entries, 53 datasets) ────────────────────────────

/** Treasury Fiscal Data API endpoints  181 endpoints across 53 datasets. */
export const ENDPOINTS: EndpointInfo[] = [
  // ── 120 Day Delinquent Debt Referral Compliance Report ───────────────
  {
    dataset: "120 Day Delinquent Debt Referral Compliance Report",
    slug: "/delinquent-debt-referral-compliance/",
    dataTable: "120 Day Delinquent Debt Referral Compliance Report",
    endpoint: "/v2/debt/tror/data_act_compliance",
    description: "Tracking and benchmarking compliance with the DATA Act for delinquent debt referral, beginning in FY 2016.",
  },

  // ── Accrual Savings Bonds Redemption Tables (Discontinued) ───────────
  {
    dataset: "Accrual Savings Bonds Redemption Tables (Discontinued)",
    slug: "/redemption-tables/",
    dataTable: "Redemption Tables",
    endpoint: "/v2/accounting/od/redemption_tables",
    description: "Monthly tables listing the redemption value, interest earned, and yield of accrual savings bonds purchased since 1941.",
  },

  // ── Advances to State Unemployment Funds ─────────────────────────────
  {
    dataset: "Advances to State Unemployment Funds (Social Security Act Title XII)",
    slug: "/ssa-title-xii-advance-activities/",
    dataTable: "Advances to State Unemployment Funds (Social Security Act Title XII)",
    endpoint: "/v2/accounting/od/title_xii",
    description: "Shows what states and territories are borrowing from the federal Unemployment Trust Fund to pay unemployment benefits.",
  },

  // ── Average Interest Rates on U.S. Treasury Securities ───────────────
  {
    dataset: "Average Interest Rates on U.S. Treasury Securities",
    slug: "/average-interest-rates-treasury-securities/",
    dataTable: "Average Interest Rates on U.S. Treasury Securities",
    endpoint: "/v2/accounting/od/avg_interest_rates",
    description: "Average interest rates for marketable and non-marketable securities.",
  },

  // ── Daily Treasury Statement (DTS) ── 8 tables ──────────────────────
  {
    dataset: "Daily Treasury Statement (DTS)",
    slug: "/daily-treasury-statement/",
    dataTable: "Operating Cash Balance",
    endpoint: "/v1/accounting/dts/operating_cash_balance",
    description: "The Treasury General Account balance. All figures rounded to the nearest million.",
  },
  {
    dataset: "Daily Treasury Statement (DTS)",
    slug: "/daily-treasury-statement/",
    dataTable: "Deposits and Withdrawals of Operating Cash",
    endpoint: "/v1/accounting/dts/deposits_withdrawals_operating_cash",
    description: "Deposits and withdrawals from the Treasury General Account. Rounded to the nearest million.",
  },
  {
    dataset: "Daily Treasury Statement (DTS)",
    slug: "/daily-treasury-statement/",
    dataTable: "Public Debt Transactions",
    endpoint: "/v1/accounting/dts/public_debt_transactions",
    description: "Issues and redemptions of marketable and nonmarketable securities. Rounded to the nearest million.",
  },
  {
    dataset: "Daily Treasury Statement (DTS)",
    slug: "/daily-treasury-statement/",
    dataTable: "Adjustment of Public Debt Transactions to Cash Basis",
    endpoint: "/v1/accounting/dts/adjustment_public_debt_transactions_cash_basis",
    description: "Cash basis adjustments to the issues and redemptions of Treasury securities.",
  },
  {
    dataset: "Daily Treasury Statement (DTS)",
    slug: "/daily-treasury-statement/",
    dataTable: "Debt Subject to Limit",
    endpoint: "/v1/accounting/dts/debt_subject_to_limit",
    description: "Breakdown of total public debt outstanding as it relates to the statutory debt limit.",
  },
  {
    dataset: "Daily Treasury Statement (DTS)",
    slug: "/daily-treasury-statement/",
    dataTable: "Inter-Agency Tax Transfers",
    endpoint: "/v1/accounting/dts/inter_agency_tax_transfers",
    description: "Breakdown of inter-agency tax transfers within the federal government.",
  },
  {
    dataset: "Daily Treasury Statement (DTS)",
    slug: "/daily-treasury-statement/",
    dataTable: "Income Tax Refunds Issued",
    endpoint: "/v1/accounting/dts/income_tax_refunds_issued",
    description: "Income tax refunds issued. Rounded to the nearest million.",
  },
  {
    dataset: "Daily Treasury Statement (DTS)",
    slug: "/daily-treasury-statement/",
    dataTable: "Federal Tax Deposits",
    endpoint: "/v1/accounting/dts/federal_tax_deposits",
    description: "Federal tax deposits. Rounded to the nearest million.",
  },
  {
    dataset: "Daily Treasury Statement (DTS)",
    slug: "/daily-treasury-statement/",
    dataTable: "Short-Term Cash Investments",
    endpoint: "/v1/accounting/dts/short_term_cash_investments",
    description: "Short-term cash investment balances. Rounded to the nearest million.",
  },

  // ── Debt to the Penny ────────────────────────────────────────────────
  {
    dataset: "Debt to the Penny",
    slug: "/debt-to-the-penny/",
    dataTable: "Debt to the Penny",
    endpoint: "/v2/accounting/od/debt_to_penny",
    description: "Total public debt outstanding reported daily, including debt held by the public and intragovernmental holdings.",
  },

  // ── Electronic Securities Transactions ── 8 tables ───────────────────
  {
    dataset: "Electronic Securities Transactions",
    slug: "/electronic-securities-transactions/",
    dataTable: "Sales",
    endpoint: "/v1/accounting/od/securities_sales",
    description: "Electronic securities sales transactions.",
  },
  {
    dataset: "Electronic Securities Transactions",
    slug: "/electronic-securities-transactions/",
    dataTable: "Sales by Term",
    endpoint: "/v1/accounting/od/securities_sales_term",
    description: "Electronic securities sales by term.",
  },
  {
    dataset: "Electronic Securities Transactions",
    slug: "/electronic-securities-transactions/",
    dataTable: "Transfers of Marketable Securities",
    endpoint: "/v1/accounting/od/securities_transfers",
    description: "Transfers of marketable securities.",
  },
  {
    dataset: "Electronic Securities Transactions",
    slug: "/electronic-securities-transactions/",
    dataTable: "Conversions of Paper Savings Bonds",
    endpoint: "/v1/accounting/od/securities_conversions",
    description: "Conversions of paper savings bonds to electronic form.",
  },
  {
    dataset: "Electronic Securities Transactions",
    slug: "/electronic-securities-transactions/",
    dataTable: "Redemptions",
    endpoint: "/v1/accounting/od/securities_redemptions",
    description: "Electronic securities redemptions.",
  },
  {
    dataset: "Electronic Securities Transactions",
    slug: "/electronic-securities-transactions/",
    dataTable: "Outstanding",
    endpoint: "/v1/accounting/od/securities_outstanding",
    description: "Outstanding electronic securities.",
  },
  {
    dataset: "Electronic Securities Transactions",
    slug: "/electronic-securities-transactions/",
    dataTable: "Certificates of Indebtedness",
    endpoint: "/v1/accounting/od/securities_c_of_i",
    description: "Certificates of Indebtedness data.",
  },
  {
    dataset: "Electronic Securities Transactions",
    slug: "/electronic-securities-transactions/",
    dataTable: "Accounts",
    endpoint: "/v1/accounting/od/securities_accounts",
    description: "Electronic securities accounts data.",
  },

  // ── Federal Borrowings Program Distribution and Transaction Data ─────
  {
    dataset: "Federal Borrowings Program Distribution and Transaction Data",
    slug: "/fbp-distribution-transaction-data/",
    dataTable: "Balances",
    endpoint: "/v1/accounting/od/fbp_balances",
    description: "Federal Borrowings Program balance data.",
  },
  {
    dataset: "Federal Borrowings Program Distribution and Transaction Data",
    slug: "/fbp-distribution-transaction-data/",
    dataTable: "Future-Dated Transactions",
    endpoint: "/v1/accounting/od/fbp_future_dated_transactions",
    description: "Federal Borrowings Program future-dated transaction data.",
  },

  // ── Federal Borrowings Program: Interest on Uninvested Funds ─────────
  {
    dataset: "Federal Borrowings Program: Interest on Uninvested Funds",
    slug: "/fbp-interest-on-uninvested-funds/",
    dataTable: "Federal Borrowings Program: Interest on Uninvested Funds",
    endpoint: "/v2/accounting/od/interest_uninvested",
    description: "Federal Borrowings Program interest on uninvested funds.",
  },

  // ── Federal Borrowings Program: Summary General Ledger Balances ──────
  {
    dataset: "Federal Borrowings Program: Summary General Ledger Balances Report",
    slug: "/fbp-summary-general-ledger-balances-report/",
    dataTable: "Summary General Ledger Borrowing Balances",
    endpoint: "/v1/accounting/od/fbp_gl_borrowing_balances",
    description: "Federal Borrowings Program summary general ledger borrowing balances.",
  },
  {
    dataset: "Federal Borrowings Program: Summary General Ledger Balances Report",
    slug: "/fbp-summary-general-ledger-balances-report/",
    dataTable: "Summary General Ledger Repayable Advance Balances",
    endpoint: "/v1/accounting/od/fbp_gl_repay_advance_balances",
    description: "Federal Borrowings Program summary general ledger repayable advance balances.",
  },

  // ── Federal Credit Similar Maturity Rates ────────────────────────────
  {
    dataset: "Federal Credit Similar Maturity Rates",
    slug: "/fed-credit-similar-maturity-rates/",
    dataTable: "Federal Credit Similar Maturity Rates",
    endpoint: "/v1/accounting/od/federal_maturity_rates",
    description: "Federal credit similar maturity rates.",
  },

  // ── Federal Investments Program: Interest Cost by Fund ───────────────
  {
    dataset: "Federal Investments Program: Interest Cost by Fund",
    slug: "/fip-interest-cost-by-fund/",
    dataTable: "Federal Investments Program: Interest Cost by Fund",
    endpoint: "/v2/accounting/od/interest_cost_fund",
    description: "Federal Investments Program interest cost by fund.",
  },

  // ── Federal Investments Program: Principal Outstanding ── 2 tables ───
  {
    dataset: "Federal Investments Program: Principal Outstanding",
    slug: "/federal-investments-program-principal-outstanding/",
    dataTable: "Principal Outstanding",
    endpoint: "/v1/accounting/od/fip_principal_outstanding_table1",
    description: "Federal Investments Program principal outstanding.",
  },
  {
    dataset: "Federal Investments Program: Principal Outstanding",
    slug: "/federal-investments-program-principal-outstanding/",
    dataTable: "Total Outstanding Inflation Compensation",
    endpoint: "/v1/accounting/od/fip_principal_outstanding_table2",
    description: "Federal Investments Program total outstanding inflation compensation.",
  },

  // ── Federal Investments Program: Statement of Account ── 3 tables ────
  {
    dataset: "Federal Investments Program: Statement of Account",
    slug: "/federal-investments-program-statement-of-account/",
    dataTable: "CARS Reporting",
    endpoint: "/v1/accounting/od/fip_statement_of_account_table1",
    description: "Federal Investments Program CARS reporting.",
  },
  {
    dataset: "Federal Investments Program: Statement of Account",
    slug: "/federal-investments-program-statement-of-account/",
    dataTable: "Account Position Summary",
    endpoint: "/v1/accounting/od/fip_statement_of_account_table2",
    description: "Federal Investments Program account position summary.",
  },
  {
    dataset: "Federal Investments Program: Statement of Account",
    slug: "/federal-investments-program-statement-of-account/",
    dataTable: "Transaction Detail",
    endpoint: "/v1/accounting/od/fip_statement_of_account_table3",
    description: "Federal Investments Program transaction detail.",
  },

  // ── Financial Report of the U.S. Government ── 8 tables ─────────────
  {
    dataset: "Financial Report of the U.S. Government",
    slug: "/u-s-government-financial-report/",
    dataTable: "Statements of Net Cost",
    endpoint: "/v2/accounting/od/statement_net_cost",
    description: "Statements of Net Cost from the Financial Report of the U.S. Government.",
  },
  {
    dataset: "Financial Report of the U.S. Government",
    slug: "/u-s-government-financial-report/",
    dataTable: "Statements of Operations and Changes in Net Position",
    endpoint: "/v1/accounting/od/net_position",
    description: "Statements of Operations and Changes in Net Position.",
  },
  {
    dataset: "Financial Report of the U.S. Government",
    slug: "/u-s-government-financial-report/",
    dataTable: "Reconciliations of Net Operating Cost and Budget Deficit",
    endpoint: "/v1/accounting/od/reconciliations",
    description: "Reconciliations of Net Operating Cost and Budget Deficit.",
  },
  {
    dataset: "Financial Report of the U.S. Government",
    slug: "/u-s-government-financial-report/",
    dataTable: "Statements of Changes in Cash Balance from Budget and Other Activities",
    endpoint: "/v1/accounting/od/cash_balance",
    description: "Statements of Changes in Cash Balance from Budget and Other Activities.",
  },
  {
    dataset: "Financial Report of the U.S. Government",
    slug: "/u-s-government-financial-report/",
    dataTable: "Balance Sheets",
    endpoint: "/v2/accounting/od/balance_sheets",
    description: "Balance Sheets from the Financial Report of the U.S. Government.",
  },
  {
    dataset: "Financial Report of the U.S. Government",
    slug: "/u-s-government-financial-report/",
    dataTable: "Statements of Long-Term Fiscal Projections",
    endpoint: "/v1/accounting/od/long_term_projections",
    description: "Statements of Long-Term Fiscal Projections.",
  },
  {
    dataset: "Financial Report of the U.S. Government",
    slug: "/u-s-government-financial-report/",
    dataTable: "Statements of Social Insurance",
    endpoint: "/v1/accounting/od/social_insurance",
    description: "Statements of Social Insurance.",
  },
  {
    dataset: "Financial Report of the U.S. Government",
    slug: "/u-s-government-financial-report/",
    dataTable: "Statements of Changes in Social Insurance Amounts",
    endpoint: "/v1/accounting/od/insurance_amounts",
    description: "Statements of Changes in Social Insurance Amounts.",
  },

  // ── FRN Daily Indexes ────────────────────────────────────────────────
  {
    dataset: "FRN Daily Indexes",
    slug: "/frn-daily-indexes/",
    dataTable: "FRN Daily Indexes",
    endpoint: "/v1/accounting/od/frn_daily_indexes",
    description: "Floating Rate Note daily indexes.",
  },

  // ── Gift Contributions to Reduce the Public Debt ─────────────────────
  {
    dataset: "Gift Contributions to Reduce the Public Debt",
    slug: "/gift-contributions-reduce-debt-held-by-public/",
    dataTable: "Gift Contributions to Reduce the Public Debt",
    endpoint: "/v2/accounting/od/gift_contributions",
    description: "Gift contributions received to reduce debt held by the public.",
  },

  // ── Government Account Series Daily Activity Summary ── 3 tables ─────
  {
    dataset: "Government Account Series Daily Activity Summary",
    slug: "/daily-government-account-series/",
    dataTable: "Held by the Public Daily Activity",
    endpoint: "/v1/accounting/od/gas_held_by_public_daily_activity",
    description: "Government Account Series held by the public daily activity.",
  },
  {
    dataset: "Government Account Series Daily Activity Summary",
    slug: "/daily-government-account-series/",
    dataTable: "Intragovernmental Holdings Daily Activity",
    endpoint: "/v1/accounting/od/gas_intragov_holdings_daily_activity",
    description: "Government Account Series intragovernmental holdings daily activity.",
  },
  {
    dataset: "Government Account Series Daily Activity Summary",
    slug: "/daily-government-account-series/",
    dataTable: "Government Account Series Daily Activity Totals",
    endpoint: "/v1/accounting/od/gas_daily_activity_totals",
    description: "Government Account Series daily activity totals.",
  },

  // ── Historical Debt Outstanding ──────────────────────────────────────
  {
    dataset: "Historical Debt Outstanding",
    slug: "/historical-debt-outstanding/",
    dataTable: "Historical Debt Outstanding",
    endpoint: "/v2/accounting/od/debt_outstanding",
    description: "Historical debt outstanding amounts going back to 1790.",
  },

  // ── Historical Qualified Tax Credit Bond Interest Rates ──────────────
  {
    dataset: "Historical Qualified Tax Credit Bond Interest Rates",
    slug: "/qtcb-historical-interest-rates/",
    dataTable: "Historical Qualified Tax Credit Bond Interest Rates",
    endpoint: "/v2/accounting/od/qualified_tax",
    description: "Historical qualified tax credit bond interest rates.",
  },

  // ── I Bonds Interest Rates ───────────────────────────────────────────
  {
    dataset: "I Bonds Interest Rates",
    slug: "/i-bonds-interest-rates/",
    dataTable: "I Bonds Interest Rates Table",
    endpoint: "/v1/accounting/od/i_bonds_interest_rates",
    description: "Interest rates for Series I savings bonds.",
  },

  // ── Interest Expense on the Public Debt Outstanding ──────────────────
  {
    dataset: "Interest Expense on the Public Debt Outstanding",
    slug: "/interest-expense-debt-outstanding/",
    dataTable: "Interest Expense on the Public Debt Outstanding",
    endpoint: "/v2/accounting/od/interest_expense",
    description: "Monthly interest expense on the public debt outstanding.",
  },

  // ── Judgment Fund: Annual Report to Congress ─────────────────────────
  {
    dataset: "Judgment Fund: Annual Report to Congress",
    slug: "/judgment-fund-report-to-congress/",
    dataTable: "Judgment Fund: Annual Report to Congress",
    endpoint: "/v2/payments/jfics/jfics_congress_report",
    description: "Annual report to Congress on the Judgment Fund.",
  },

  // ── Monthly SLGS Securities Program ──────────────────────────────────
  {
    dataset: "Monthly State and Local Government Series (SLGS) Securities Program",
    slug: "/slgs-securities-program-stats/",
    dataTable: "Monthly State and Local Government Series (SLGS) Securities Program",
    endpoint: "/v2/accounting/od/slgs_statistics",
    description: "Monthly SLGS securities program statistics.",
  },

  // ── Monthly Treasury Statement (MTS) ── 16 tables ───────────────────
  {
    dataset: "Monthly Treasury Statement (MTS)",
    slug: "/monthly-treasury-statement/",
    dataTable: "Summary of Receipts, Outlays, and the Deficit/Surplus of the U.S. Government",
    endpoint: "/v1/accounting/mts/mts_table_1",
    description: "MTS Table 1: Summary of receipts, outlays, and the deficit/surplus of the U.S. Government.",
  },
  {
    dataset: "Monthly Treasury Statement (MTS)",
    slug: "/monthly-treasury-statement/",
    dataTable: "Summary of Budget and Off-Budget Results and Financing of the U.S. Government",
    endpoint: "/v1/accounting/mts/mts_table_2",
    description: "MTS Table 2: Summary of budget and off-budget results and financing.",
  },
  {
    dataset: "Monthly Treasury Statement (MTS)",
    slug: "/monthly-treasury-statement/",
    dataTable: "Summary of Receipts and Outlays of the U.S. Government",
    endpoint: "/v1/accounting/mts/mts_table_3",
    description: "MTS Table 3: Summary of receipts and outlays.",
  },
  {
    dataset: "Monthly Treasury Statement (MTS)",
    slug: "/monthly-treasury-statement/",
    dataTable: "Receipts of the U.S. Government",
    endpoint: "/v1/accounting/mts/mts_table_4",
    description: "MTS Table 4: Receipts of the U.S. Government.",
  },
  {
    dataset: "Monthly Treasury Statement (MTS)",
    slug: "/monthly-treasury-statement/",
    dataTable: "Outlays of the U.S. Government",
    endpoint: "/v1/accounting/mts/mts_table_5",
    description: "MTS Table 5: Outlays of the U.S. Government.",
  },
  {
    dataset: "Monthly Treasury Statement (MTS)",
    slug: "/monthly-treasury-statement/",
    dataTable: "Means of Financing the Deficit or Disposition of Surplus by the U.S. Government",
    endpoint: "/v1/accounting/mts/mts_table_6",
    description: "MTS Table 6: Means of financing the deficit or disposition of surplus.",
  },
  {
    dataset: "Monthly Treasury Statement (MTS)",
    slug: "/monthly-treasury-statement/",
    dataTable: "Analysis of Change in Excess of Liabilities of the U.S. Government",
    endpoint: "/v1/accounting/mts/mts_table_6a",
    description: "MTS Table 6a: Analysis of change in excess of liabilities.",
  },
  {
    dataset: "Monthly Treasury Statement (MTS)",
    slug: "/monthly-treasury-statement/",
    dataTable: "Securities Issued by Federal Agencies Under Special Financing Authorities",
    endpoint: "/v1/accounting/mts/mts_table_6b",
    description: "MTS Table 6b: Securities issued by federal agencies under special financing authorities.",
  },
  {
    dataset: "Monthly Treasury Statement (MTS)",
    slug: "/monthly-treasury-statement/",
    dataTable: "Federal Agency Borrowing Financed Through the Issue of Treasury Securities",
    endpoint: "/v1/accounting/mts/mts_table_6c",
    description: "MTS Table 6c: Federal agency borrowing financed through Treasury securities.",
  },
  {
    dataset: "Monthly Treasury Statement (MTS)",
    slug: "/monthly-treasury-statement/",
    dataTable: "Investments of Federal Government Accounts in Federal Securities",
    endpoint: "/v1/accounting/mts/mts_table_6d",
    description: "MTS Table 6d: Investments of federal government accounts in federal securities.",
  },
  {
    dataset: "Monthly Treasury Statement (MTS)",
    slug: "/monthly-treasury-statement/",
    dataTable: "Guaranteed and Direct Loan Financing, Net Activity",
    endpoint: "/v1/accounting/mts/mts_table_6e",
    description: "MTS Table 6e: Guaranteed and direct loan financing, net activity.",
  },
  {
    dataset: "Monthly Treasury Statement (MTS)",
    slug: "/monthly-treasury-statement/",
    dataTable: "Receipts and Outlays of the U.S. Government by Month",
    endpoint: "/v1/accounting/mts/mts_table_7",
    description: "MTS Table 7: Receipts and outlays of the U.S. Government by month.",
  },
  {
    dataset: "Monthly Treasury Statement (MTS)",
    slug: "/monthly-treasury-statement/",
    dataTable: "Trust Fund Impact on Budget Results and Investment Holdings",
    endpoint: "/v1/accounting/mts/mts_table_8",
    description: "MTS Table 8: Trust fund impact on budget results and investment holdings.",
  },
  {
    dataset: "Monthly Treasury Statement (MTS)",
    slug: "/monthly-treasury-statement/",
    dataTable: "Summary of Receipts by Source, and Outlays by Function of the U.S. Government",
    endpoint: "/v1/accounting/mts/mts_table_9",
    description: "MTS Table 9: Summary of receipts by source and outlays by function.",
  },
  {
    dataset: "Monthly Treasury Statement (MTS)",
    slug: "/monthly-treasury-statement/",
    dataTable: "Monthly Receipts Outlays and Deficit/Surplus Amounts",
    endpoint: "/v1/accounting/mts/mts_receipts_outlays_deficit_surplus",
    description: "Monthly receipts, outlays, and deficit/surplus amounts.",
  },
  {
    dataset: "Monthly Treasury Statement (MTS)",
    slug: "/monthly-treasury-statement/",
    dataTable: "Monthly Distributed Offsetting Receipts",
    endpoint: "/v1/accounting/mts/mts_distributed_offsetting_receipts",
    description: "Monthly distributed offsetting receipts.",
  },

  // ── Receipts by Department ───────────────────────────────────────────
  {
    dataset: "Receipts by Department",
    slug: "/receipts-by-department/",
    dataTable: "Receipts by Department",
    endpoint: "/v1/accounting/od/receipts_by_department",
    description: "Annual receipts by department.",
  },

  // ── Record-Setting Treasury Securities Auction Data ──────────────────
  {
    dataset: "Record-Setting Treasury Securities Auction Data",
    slug: "/record-setting-auction-data/",
    dataTable: "Record-Setting Auction",
    endpoint: "/v2/accounting/od/record_setting_auction",
    description: "Record-setting Treasury securities auction data.",
  },

  // ── Savings Bonds Securities Sold (Discontinued) ─────────────────────
  {
    dataset: "Savings Bonds Securities Sold (Discontinued)",
    slug: "/savings-bonds-securities/",
    dataTable: "Savings Bonds Securities",
    endpoint: "/v1/accounting/od/slgs_savings_bonds",
    description: "Savings bonds securities sold data (discontinued).",
  },

  // ── Savings Bonds Value Files ────────────────────────────────────────
  {
    dataset: "Savings Bonds Value Files",
    slug: "/savings-bond-value-files/",
    dataTable: "Savings Bonds Value Files",
    endpoint: "/v2/accounting/od/sb_value",
    description: "Savings bonds value files.",
  },

  // ── Schedules of Federal Debt ── 2 tables ────────────────────────────
  {
    dataset: "Schedules of Federal Debt",
    slug: "/schedules-federal-debt/",
    dataTable: "Schedules of Federal Debt by Month",
    endpoint: "/v1/accounting/od/schedules_fed_debt",
    description: "Schedules of federal debt by month.",
  },
  {
    dataset: "Schedules of Federal Debt",
    slug: "/schedules-federal-debt/",
    dataTable: "Schedules of Federal Debt, Fiscal Year-to-Date",
    endpoint: "/v1/accounting/od/schedules_fed_debt_fytd",
    description: "Schedules of federal debt, fiscal year-to-date.",
  },

  // ── Schedules of Federal Debt by Day ── 2 tables ─────────────────────
  {
    dataset: "Schedules of Federal Debt by Day",
    slug: "/schedules-federal-debt-daily/",
    dataTable: "Daily Activity",
    endpoint: "/v1/accounting/od/schedules_fed_debt_daily_activity",
    description: "Schedules of federal debt daily activity.",
  },
  {
    dataset: "Schedules of Federal Debt by Day",
    slug: "/schedules-federal-debt-daily/",
    dataTable: "Daily Summary",
    endpoint: "/v1/accounting/od/schedules_fed_debt_daily_summary",
    description: "Schedules of federal debt daily summary.",
  },

  // ── SLGS Daily Rate Table ── 2 tables ────────────────────────────────
  {
    dataset: "State and Local Government Series (SLGS) Daily Rate Table",
    slug: "/slgs-daily-rate-table/",
    dataTable: "Demand Deposit Rate",
    endpoint: "/v1/accounting/od/slgs_demand_deposit_rates",
    description: "SLGS daily rate table for demand deposit securities.",
  },
  {
    dataset: "State and Local Government Series (SLGS) Daily Rate Table",
    slug: "/slgs-daily-rate-table/",
    dataTable: "Time Deposit Rate",
    endpoint: "/v1/accounting/od/slgs_time_deposit_rates",
    description: "SLGS daily rate table for time deposit securities.",
  },

  // ── SLGS Securities (Non-Marketable) ─────────────────────────────────
  {
    dataset: "State and Local Government Series Securities (Non-Marketable)",
    slug: "/slgs-securities/",
    dataTable: "State and Local Government Series Securities (Non-Marketable)",
    endpoint: "/v1/accounting/od/slgs_securities",
    description: "State and Local Government Series securities issued and outstanding.",
  },

  // ── TIPS and CPI Data ── 2 tables ────────────────────────────────────
  {
    dataset: "TIPS and CPI Data",
    slug: "/tips-cpi-data/",
    dataTable: "Reference CPI Numbers and Daily Index Ratios Summary Table",
    endpoint: "/v1/accounting/od/tips_cpi_data_summary",
    description: "TIPS reference CPI numbers and daily index ratios summary.",
  },
  {
    dataset: "TIPS and CPI Data",
    slug: "/tips-cpi-data/",
    dataTable: "Reference CPI Numbers and Daily Index Ratios Details Table",
    endpoint: "/v1/accounting/od/tips_cpi_data_detail",
    description: "TIPS reference CPI numbers and daily index ratios details.",
  },

  // ── Treasury Bulletin ── 13 tables ───────────────────────────────────
  {
    dataset: "Treasury Bulletin",
    slug: "/treasury-bulletin/",
    dataTable: "PDO-1 - Offerings of Regular Weekly Treasury Bills",
    endpoint: "/v1/accounting/tb/pdo1_offerings_regular_weekly_treasury_bills",
    description: "PDO-1: Offerings of regular weekly Treasury bills.",
  },
  {
    dataset: "Treasury Bulletin",
    slug: "/treasury-bulletin/",
    dataTable: "PDO-2 - Offerings of Marketable Securities Other than Regular Weekly Treasury Bills",
    endpoint: "/v1/accounting/tb/pdo2_offerings_marketable_securities_other_regular_weekly_treasury_bills",
    description: "PDO-2: Offerings of marketable securities other than regular weekly Treasury bills.",
  },
  {
    dataset: "Treasury Bulletin",
    slug: "/treasury-bulletin/",
    dataTable: "OFS-1 - Distribution of Federal Securities by Class of Investors and Type of Issues",
    endpoint: "/v1/accounting/tb/ofs1_distribution_federal_securities_class_investors_type_issues",
    description: "OFS-1: Distribution of federal securities by class of investors and type of issues.",
  },
  {
    dataset: "Treasury Bulletin",
    slug: "/treasury-bulletin/",
    dataTable: "OFS-2 - Estimated Ownership of U.S. Treasury Securities",
    endpoint: "/v1/accounting/tb/ofs2_estimated_ownership_treasury_securities",
    description: "OFS-2: Estimated ownership of U.S. Treasury securities.",
  },
  {
    dataset: "Treasury Bulletin",
    slug: "/treasury-bulletin/",
    dataTable: "USCC-1 - Amounts Outstanding and in Circulation",
    endpoint: "/v1/accounting/tb/uscc1_amounts_outstanding_circulation",
    description: "USCC-1: Amounts outstanding and in circulation.",
  },
  {
    dataset: "Treasury Bulletin",
    slug: "/treasury-bulletin/",
    dataTable: "USCC-2 - Amounts Outstanding and in Circulation",
    endpoint: "/v1/accounting/tb/uscc2_amounts_outstanding_circulation",
    description: "USCC-2: Amounts outstanding and in circulation.",
  },
  {
    dataset: "Treasury Bulletin",
    slug: "/treasury-bulletin/",
    dataTable: "FCP-1 - Weekly Report of Major Market Participants",
    endpoint: "/v1/accounting/tb/fcp1_weekly_report_major_market_participants",
    description: "FCP-1: Weekly report of major market participants.",
  },
  {
    dataset: "Treasury Bulletin",
    slug: "/treasury-bulletin/",
    dataTable: "FCP-2 - Monthly Report of Major Market Participants",
    endpoint: "/v1/accounting/tb/fcp2_monthly_report_major_market_participants",
    description: "FCP-2: Monthly report of major market participants.",
  },
  {
    dataset: "Treasury Bulletin",
    slug: "/treasury-bulletin/",
    dataTable: "FCP-3 - Quarterly Report of Large Market Participants",
    endpoint: "/v1/accounting/tb/fcp3_quarterly_report_large_market_participants",
    description: "FCP-3: Quarterly report of large market participants.",
  },
  {
    dataset: "Treasury Bulletin",
    slug: "/treasury-bulletin/",
    dataTable: "ESF-1 - Balances",
    endpoint: "/v1/accounting/tb/esf1_balances",
    description: "ESF-1: Exchange Stabilization Fund balances.",
  },
  {
    dataset: "Treasury Bulletin",
    slug: "/treasury-bulletin/",
    dataTable: "ESF-2 - Statement of Net Cost",
    endpoint: "/v1/accounting/tb/esf2_statement_net_cost",
    description: "ESF-2: Exchange Stabilization Fund statement of net cost.",
  },
  {
    dataset: "Treasury Bulletin",
    slug: "/treasury-bulletin/",
    dataTable: "FFO-5 - Internal Revenue Receipts by State",
    endpoint: "/v1/accounting/tb/ffo5_internal_revenue_by_state",
    description: "FFO-5: Internal revenue receipts by state.",
  },
  {
    dataset: "Treasury Bulletin",
    slug: "/treasury-bulletin/",
    dataTable: "FFO-6 - Customs and Border Protection Collection of Duties, Taxes, and Fees by Districts and Ports",
    endpoint: "/v1/accounting/tb/ffo6_customs_border_protection_collections",
    description: "FFO-6: Customs and Border Protection collection of duties, taxes, and fees.",
  },

  // ── Treasury Bulletin: Trust Fund Reports ── 30 tables ───────────────
  {
    dataset: "Treasury Bulletin: Trust Fund Reports",
    slug: "/treasury-bulletin-trust-funds/",
    dataTable: "Airport and Airway Trust Fund Results of Operations",
    endpoint: "/v1/accounting/od/airport_airway_trust_fund_results",
    description: "Airport and Airway Trust Fund results of operations.",
  },
  {
    dataset: "Treasury Bulletin: Trust Fund Reports",
    slug: "/treasury-bulletin-trust-funds/",
    dataTable: "Airport and Airway Trust Fund Expected Condition and Results of Operations",
    endpoint: "/v1/accounting/od/airport_airway_trust_fund_expected",
    description: "Airport and Airway Trust Fund expected condition and results.",
  },
  {
    dataset: "Treasury Bulletin: Trust Fund Reports",
    slug: "/treasury-bulletin-trust-funds/",
    dataTable: "Uranium Enrichment Decontamination and Decommissioning Fund Results of Operations",
    endpoint: "/v1/accounting/od/uranium_enrichment_decontamination_decommissioning_fund_results",
    description: "Uranium Enrichment Decontamination and Decommissioning Fund results of operations.",
  },
  {
    dataset: "Treasury Bulletin: Trust Fund Reports",
    slug: "/treasury-bulletin-trust-funds/",
    dataTable: "Uranium Enrichment Decontamination and Decommissioning Fund Expected Cond. and Results",
    endpoint: "/v1/accounting/od/uranium_enrichment_decontamination_decommissioning_fund_expected",
    description: "Uranium Enrichment Decontamination and Decommissioning Fund expected condition and results.",
  },
  {
    dataset: "Treasury Bulletin: Trust Fund Reports",
    slug: "/treasury-bulletin-trust-funds/",
    dataTable: "Black Lung Disability Trust Fund Results of Operations",
    endpoint: "/v1/accounting/od/black_lung_disability_trust_fund_results",
    description: "Black Lung Disability Trust Fund results of operations.",
  },
  {
    dataset: "Treasury Bulletin: Trust Fund Reports",
    slug: "/treasury-bulletin-trust-funds/",
    dataTable: "Black Lung Disability Trust Fund Expected Condition and Results of Operations",
    endpoint: "/v1/accounting/od/black_lung_disability_trust_fund_expected",
    description: "Black Lung Disability Trust Fund expected condition and results.",
  },
  {
    dataset: "Treasury Bulletin: Trust Fund Reports",
    slug: "/treasury-bulletin-trust-funds/",
    dataTable: "Harbor Maintenance Trust Fund Results of Operation",
    endpoint: "/v1/accounting/od/harbor_maintenance_trust_fund_results",
    description: "Harbor Maintenance Trust Fund results of operations.",
  },
  {
    dataset: "Treasury Bulletin: Trust Fund Reports",
    slug: "/treasury-bulletin-trust-funds/",
    dataTable: "Harbor Maintenance Trust Fund Expected Condition and Results of Operations",
    endpoint: "/v1/accounting/od/harbor_maintenance_trust_fund_expected",
    description: "Harbor Maintenance Trust Fund expected condition and results.",
  },
  {
    dataset: "Treasury Bulletin: Trust Fund Reports",
    slug: "/treasury-bulletin-trust-funds/",
    dataTable: "Hazardous Substance Superfund Results of Operations",
    endpoint: "/v1/accounting/od/hazardous_substance_superfund_results",
    description: "Hazardous Substance Superfund results of operations.",
  },
  {
    dataset: "Treasury Bulletin: Trust Fund Reports",
    slug: "/treasury-bulletin-trust-funds/",
    dataTable: "Hazardous Substance Superfund Expected Condition and Results of Operations",
    endpoint: "/v1/accounting/od/hazardous_substance_superfund_expected",
    description: "Hazardous Substance Superfund expected condition and results.",
  },
  {
    dataset: "Treasury Bulletin: Trust Fund Reports",
    slug: "/treasury-bulletin-trust-funds/",
    dataTable: "Highway Trust Fund Results of Operations",
    endpoint: "/v1/accounting/od/highway_trust_fund_results",
    description: "Highway Trust Fund results of operations.",
  },
  {
    dataset: "Treasury Bulletin: Trust Fund Reports",
    slug: "/treasury-bulletin-trust-funds/",
    dataTable: "Highway Trust Fund Expected Condition and Results of Operations",
    endpoint: "/v1/accounting/od/highway_trust_fund_expected",
    description: "Highway Trust Fund expected condition and results.",
  },
  {
    dataset: "Treasury Bulletin: Trust Fund Reports",
    slug: "/treasury-bulletin-trust-funds/",
    dataTable: "Highway Trust Fund",
    endpoint: "/v1/accounting/od/highway_trust_fund",
    description: "Highway Trust Fund data.",
  },
  {
    dataset: "Treasury Bulletin: Trust Fund Reports",
    slug: "/treasury-bulletin-trust-funds/",
    dataTable: "Inland Waterways Trust Fund Results of Operations",
    endpoint: "/v1/accounting/od/inland_waterways_trust_fund_results",
    description: "Inland Waterways Trust Fund results of operations.",
  },
  {
    dataset: "Treasury Bulletin: Trust Fund Reports",
    slug: "/treasury-bulletin-trust-funds/",
    dataTable: "Inland Waterways Trust Fund Expected Condition and Results of Operations",
    endpoint: "/v1/accounting/od/inland_waterways_trust_fund_expected",
    description: "Inland Waterways Trust Fund expected condition and results.",
  },
  {
    dataset: "Treasury Bulletin: Trust Fund Reports",
    slug: "/treasury-bulletin-trust-funds/",
    dataTable: "Leaking Underground Storage Tank Trust Fund Results of Operations",
    endpoint: "/v1/accounting/od/leaking_underground_storage_tank_trust_fund_results",
    description: "Leaking Underground Storage Tank Trust Fund results of operations.",
  },
  {
    dataset: "Treasury Bulletin: Trust Fund Reports",
    slug: "/treasury-bulletin-trust-funds/",
    dataTable: "Leaking Underground Storage Tank Trust Fund Expected Condition and Results",
    endpoint: "/v1/accounting/od/leaking_underground_storage_tank_trust_fund_expected",
    description: "Leaking Underground Storage Tank Trust Fund expected condition and results.",
  },
  {
    dataset: "Treasury Bulletin: Trust Fund Reports",
    slug: "/treasury-bulletin-trust-funds/",
    dataTable: "Nuclear Waste Fund Results of Operations",
    endpoint: "/v1/accounting/od/nuclear_waste_fund_results",
    description: "Nuclear Waste Fund results of operations.",
  },
  {
    dataset: "Treasury Bulletin: Trust Fund Reports",
    slug: "/treasury-bulletin-trust-funds/",
    dataTable: "Reforestation Trust Fund Results of Operations",
    endpoint: "/v1/accounting/od/reforestation_trust_fund_results",
    description: "Reforestation Trust Fund results of operations.",
  },
  {
    dataset: "Treasury Bulletin: Trust Fund Reports",
    slug: "/treasury-bulletin-trust-funds/",
    dataTable: "Reforestation Trust Fund Expected Condition and Results of Operations",
    endpoint: "/v1/accounting/od/reforestation_trust_fund_expected",
    description: "Reforestation Trust Fund expected condition and results.",
  },
  {
    dataset: "Treasury Bulletin: Trust Fund Reports",
    slug: "/treasury-bulletin-trust-funds/",
    dataTable: "Sport Fish Restoration and Boating Trust Fund Results of Operations",
    endpoint: "/v1/accounting/od/sport_fish_restoration_boating_trust_fund_results",
    description: "Sport Fish Restoration and Boating Trust Fund results of operations.",
  },
  {
    dataset: "Treasury Bulletin: Trust Fund Reports",
    slug: "/treasury-bulletin-trust-funds/",
    dataTable: "Sport Fish Restoration and Boating Trust Fund Expected Cond. and Results",
    endpoint: "/v1/accounting/od/sport_fish_restoration_boating_trust_fund_expected",
    description: "Sport Fish Restoration and Boating Trust Fund expected condition and results.",
  },
  {
    dataset: "Treasury Bulletin: Trust Fund Reports",
    slug: "/treasury-bulletin-trust-funds/",
    dataTable: "Oil Spill Liability Trust Fund Results of Operations",
    endpoint: "/v1/accounting/od/oil_spill_liability_trust_fund_results",
    description: "Oil Spill Liability Trust Fund results of operations.",
  },
  {
    dataset: "Treasury Bulletin: Trust Fund Reports",
    slug: "/treasury-bulletin-trust-funds/",
    dataTable: "Oil Spill Liability Trust Fund Expected Condition and Results of Operations",
    endpoint: "/v1/accounting/od/oil_spill_liability_trust_fund_expected",
    description: "Oil Spill Liability Trust Fund expected condition and results.",
  },
  {
    dataset: "Treasury Bulletin: Trust Fund Reports",
    slug: "/treasury-bulletin-trust-funds/",
    dataTable: "Vaccine Injury Compensation Trust Fund Results of Operations",
    endpoint: "/v1/accounting/od/vaccine_injury_compensation_trust_fund_results",
    description: "Vaccine Injury Compensation Trust Fund results of operations.",
  },
  {
    dataset: "Treasury Bulletin: Trust Fund Reports",
    slug: "/treasury-bulletin-trust-funds/",
    dataTable: "Vaccine Injury Compensation Trust Fund Expected Condition and Results",
    endpoint: "/v1/accounting/od/vaccine_injury_compensation_trust_fund_expected",
    description: "Vaccine Injury Compensation Trust Fund expected condition and results.",
  },
  {
    dataset: "Treasury Bulletin: Trust Fund Reports",
    slug: "/treasury-bulletin-trust-funds/",
    dataTable: "Wool Research, Development, and Promotion Trust Fund Results of Operations",
    endpoint: "/v1/accounting/od/wool_research_development_promotion_trust_fund_results",
    description: "Wool Research, Development, and Promotion Trust Fund results of operations.",
  },
  {
    dataset: "Treasury Bulletin: Trust Fund Reports",
    slug: "/treasury-bulletin-trust-funds/",
    dataTable: "Wool Research, Development, and Promotion Trust Fund Expected Cond. and Results",
    endpoint: "/v1/accounting/od/wool_research_development_promotion_trust_fund_expected",
    description: "Wool Research, Development, and Promotion Trust Fund expected condition and results.",
  },
  {
    dataset: "Treasury Bulletin: Trust Fund Reports",
    slug: "/treasury-bulletin-trust-funds/",
    dataTable: "Agriculture Disaster Relief Trust Fund Results of Operations",
    endpoint: "/v1/accounting/od/agriculture_disaster_relief_trust_fund_results",
    description: "Agriculture Disaster Relief Trust Fund results of operations.",
  },
  {
    dataset: "Treasury Bulletin: Trust Fund Reports",
    slug: "/treasury-bulletin-trust-funds/",
    dataTable: "Agriculture Disaster Relief Trust Fund Expected Condition and Results",
    endpoint: "/v1/accounting/od/agriculture_disaster_relief_trust_fund_expected",
    description: "Agriculture Disaster Relief Trust Fund expected condition and results.",
  },
  {
    dataset: "Treasury Bulletin: Trust Fund Reports",
    slug: "/treasury-bulletin-trust-funds/",
    dataTable: "Patient Centered Outcomes Research Trust Fund Results of Operations",
    endpoint: "/v1/accounting/od/patient_centered_outcomes_research_trust_fund_results",
    description: "Patient Centered Outcomes Research Trust Fund results of operations.",
  },
  {
    dataset: "Treasury Bulletin: Trust Fund Reports",
    slug: "/treasury-bulletin-trust-funds/",
    dataTable: "Patient Centered Outcomes Research Trust Fund Expected Cond. and Results",
    endpoint: "/v1/accounting/od/patient_centered_outcomes_research_trust_fund_expected",
    description: "Patient Centered Outcomes Research Trust Fund expected condition and results.",
  },
  {
    dataset: "Treasury Bulletin: Trust Fund Reports",
    slug: "/treasury-bulletin-trust-funds/",
    dataTable: "United States Victims of State Sponsored Terrorism Fund Results of Operations",
    endpoint: "/v1/accounting/od/us_victims_state_sponsored_terrorism_fund_results",
    description: "U.S. Victims of State Sponsored Terrorism Fund results of operations.",
  },
  {
    dataset: "Treasury Bulletin: Trust Fund Reports",
    slug: "/treasury-bulletin-trust-funds/",
    dataTable: "United States Victims of State Sponsored Terrorism Fund Expected Cond. and Results",
    endpoint: "/v1/accounting/od/us_victims_state_sponsored_terrorism_fund_expected",
    description: "U.S. Victims of State Sponsored Terrorism Fund expected condition and results.",
  },

  // ── Treasury Certified Interest Rates: Annual ── 9 tables ────────────
  {
    dataset: "Treasury Certified Interest Rates: Annual Certification",
    slug: "/treasury-certified-interest-rates-annual/",
    dataTable: "Range of Maturities",
    endpoint: "/v1/accounting/od/tcir_annual_table_1",
    description: "Annual certification: range of maturities.",
  },
  {
    dataset: "Treasury Certified Interest Rates: Annual Certification",
    slug: "/treasury-certified-interest-rates-annual/",
    dataTable: "Small Reclamation Project Act",
    endpoint: "/v1/accounting/od/tcir_annual_table_2",
    description: "Annual certification: Small Reclamation Project Act.",
  },
  {
    dataset: "Treasury Certified Interest Rates: Annual Certification",
    slug: "/treasury-certified-interest-rates-annual/",
    dataTable: "U.S. Army Corps of Engineers",
    endpoint: "/v1/accounting/od/tcir_annual_table_3",
    description: "Annual certification: U.S. Army Corps of Engineers.",
  },
  {
    dataset: "Treasury Certified Interest Rates: Annual Certification",
    slug: "/treasury-certified-interest-rates-annual/",
    dataTable: "Bureau of Reclamation",
    endpoint: "/v1/accounting/od/tcir_annual_table_4",
    description: "Annual certification: Bureau of Reclamation.",
  },
  {
    dataset: "Treasury Certified Interest Rates: Annual Certification",
    slug: "/treasury-certified-interest-rates-annual/",
    dataTable: "Mid-Dakota Rural Water System Act",
    endpoint: "/v1/accounting/od/tcir_annual_table_5",
    description: "Annual certification: Mid-Dakota Rural Water System Act.",
  },
  {
    dataset: "Treasury Certified Interest Rates: Annual Certification",
    slug: "/treasury-certified-interest-rates-annual/",
    dataTable: "Merchant Marine Act",
    endpoint: "/v1/accounting/od/tcir_annual_table_6",
    description: "Annual certification: Merchant Marine Act.",
  },
  {
    dataset: "Treasury Certified Interest Rates: Annual Certification",
    slug: "/treasury-certified-interest-rates-annual/",
    dataTable: "Other Specific Legislation - Calendar Year",
    endpoint: "/v1/accounting/od/tcir_annual_table_7",
    description: "Annual certification: other specific legislation (calendar year).",
  },
  {
    dataset: "Treasury Certified Interest Rates: Annual Certification",
    slug: "/treasury-certified-interest-rates-annual/",
    dataTable: "Other Specific Legislation - Fiscal Year",
    endpoint: "/v1/accounting/od/tcir_annual_table_8",
    description: "Annual certification: other specific legislation (fiscal year).",
  },
  {
    dataset: "Treasury Certified Interest Rates: Annual Certification",
    slug: "/treasury-certified-interest-rates-annual/",
    dataTable: "Power Marketing Administration",
    endpoint: "/v1/accounting/od/tcir_annual_table_9",
    description: "Annual certification: Power Marketing Administration.",
  },

  // ── Treasury Certified Interest Rates: Monthly ── 6 tables ───────────
  {
    dataset: "Treasury Certified Interest Rates: Monthly Certification",
    slug: "/treasury-certified-interest-rates-monthly/",
    dataTable: "Month Year Specific Maturities",
    endpoint: "/v1/accounting/od/tcir_monthly_table_1",
    description: "Monthly certification: specific maturities.",
  },
  {
    dataset: "Treasury Certified Interest Rates: Monthly Certification",
    slug: "/treasury-certified-interest-rates-monthly/",
    dataTable: "Month Year Range of Maturities",
    endpoint: "/v1/accounting/od/tcir_monthly_table_2",
    description: "Monthly certification: range of maturities.",
  },
  {
    dataset: "Treasury Certified Interest Rates: Monthly Certification",
    slug: "/treasury-certified-interest-rates-monthly/",
    dataTable: "Month Year Other Treasury Borrowing Authorities",
    endpoint: "/v1/accounting/od/tcir_monthly_table_3",
    description: "Monthly certification: other Treasury borrowing authorities.",
  },
  {
    dataset: "Treasury Certified Interest Rates: Monthly Certification",
    slug: "/treasury-certified-interest-rates-monthly/",
    dataTable: "Month Year Guam Development Fund Act",
    endpoint: "/v1/accounting/od/tcir_monthly_table_4",
    description: "Monthly certification: Guam Development Fund Act.",
  },
  {
    dataset: "Treasury Certified Interest Rates: Monthly Certification",
    slug: "/treasury-certified-interest-rates-monthly/",
    dataTable: "Month Year Department of Defense Arms Export Control Act",
    endpoint: "/v1/accounting/od/tcir_monthly_table_5",
    description: "Monthly certification: Department of Defense Arms Export Control Act.",
  },
  {
    dataset: "Treasury Certified Interest Rates: Monthly Certification",
    slug: "/treasury-certified-interest-rates-monthly/",
    dataTable: "Month Year Other Specific Legislation",
    endpoint: "/v1/accounting/od/tcir_monthly_table_6",
    description: "Monthly certification: other specific legislation.",
  },

  // ── Treasury Certified Interest Rates: Quarterly ── 4 tables ─────────
  {
    dataset: "Treasury Certified Interest Rates: Quarterly Certification",
    slug: "/treasury-certified-interest-rates-quarterly/",
    dataTable: "Interest Rates for the Reclamation Reform Act of 1982",
    endpoint: "/v1/accounting/od/tcir_quarterly_table_1",
    description: "Quarterly certification: Reclamation Reform Act of 1982.",
  },
  {
    dataset: "Treasury Certified Interest Rates: Quarterly Certification",
    slug: "/treasury-certified-interest-rates-quarterly/",
    dataTable: "Interest Rates for Specific Legislation 1",
    endpoint: "/v1/accounting/od/tcir_quarterly_table_2a",
    description: "Quarterly certification: specific legislation 1.",
  },
  {
    dataset: "Treasury Certified Interest Rates: Quarterly Certification",
    slug: "/treasury-certified-interest-rates-quarterly/",
    dataTable: "Interest Rates for Specific Legislation 2",
    endpoint: "/v1/accounting/od/tcir_quarterly_table_2b",
    description: "Quarterly certification: specific legislation 2.",
  },
  {
    dataset: "Treasury Certified Interest Rates: Quarterly Certification",
    slug: "/treasury-certified-interest-rates-quarterly/",
    dataTable: "Interest Rates for National Consumer Cooperative Bank",
    endpoint: "/v1/accounting/od/tcir_quarterly_table_3",
    description: "Quarterly certification: National Consumer Cooperative Bank.",
  },

  // ── Treasury Certified Interest Rates: Semi-Annual ───────────────────
  {
    dataset: "Treasury Certified Interest Rates: Semi-Annual Certification",
    slug: "/treasury-certified-interest-rates-semiannual/",
    dataTable: "Semi-Annual Interest Rate Certification",
    endpoint: "/v1/accounting/od/tcir_semi_annual",
    description: "Semi-annual interest rate certification.",
  },

  // ── Treasury Managed Accounts ── 3 tables ────────────────────────────
  {
    dataset: "Treasury Managed Accounts",
    slug: "/treasury-managed-accounts/",
    dataTable: "Contract Disputes Receivables",
    endpoint: "/v1/accounting/od/tma_contract_disputes",
    description: "Treasury managed accounts: contract disputes receivables.",
  },
  {
    dataset: "Treasury Managed Accounts",
    slug: "/treasury-managed-accounts/",
    dataTable: "No FEAR Act Receivables",
    endpoint: "/v1/accounting/od/tma_no_fear",
    description: "Treasury managed accounts: No FEAR Act receivables.",
  },
  {
    dataset: "Treasury Managed Accounts",
    slug: "/treasury-managed-accounts/",
    dataTable: "Unclaimed Money",
    endpoint: "/v1/accounting/od/tma_unclaimed_money",
    description: "Treasury managed accounts: unclaimed money.",
  },

  // ── Treasury Offset Program (TOP) ────────────────────────────────────
  {
    dataset: "Treasury Offset Program (TOP)",
    slug: "/top-treasury-offset-program/",
    dataTable: "Treasury Offset Program",
    endpoint: "/v1/debt/treasury_offset_program",
    description: "Federal payments offset to pay delinquent debts.",
  },

  // ── Treasury Report on Receivables (TROR) ── 5 tables ────────────────
  {
    dataset: "Treasury Report on Receivables (TROR)",
    slug: "/treasury-report-on-receivables/",
    dataTable: "Treasury Report on Receivables Full Data",
    endpoint: "/v2/debt/tror",
    description: "Treasury Report on Receivables full data.",
  },
  {
    dataset: "Treasury Report on Receivables (TROR)",
    slug: "/treasury-report-on-receivables/",
    dataTable: "Collected and Outstanding Receivables",
    endpoint: "/v2/debt/tror/collected_outstanding_recv",
    description: "Collected and outstanding receivables.",
  },
  {
    dataset: "Treasury Report on Receivables (TROR)",
    slug: "/treasury-report-on-receivables/",
    dataTable: "Delinquent Debt",
    endpoint: "/v2/debt/tror/delinquent_debt",
    description: "Delinquent debt data.",
  },
  {
    dataset: "Treasury Report on Receivables (TROR)",
    slug: "/treasury-report-on-receivables/",
    dataTable: "Collections on Delinquent Debt",
    endpoint: "/v2/debt/tror/collections_delinquent_debt",
    description: "Collections on delinquent debt.",
  },
  {
    dataset: "Treasury Report on Receivables (TROR)",
    slug: "/treasury-report-on-receivables/",
    dataTable: "Written Off Delinquent Debt",
    endpoint: "/v2/debt/tror/written_off_delinquent_debt",
    description: "Written off delinquent debt.",
  },

  // ── Treasury Reporting Rates of Exchange ─────────────────────────────
  {
    dataset: "Treasury Reporting Rates of Exchange",
    slug: "/treasury-reporting-rates-exchange/",
    dataTable: "Treasury Reporting Rates of Exchange",
    endpoint: "/v1/accounting/od/rates_of_exchange",
    description: "Exchange rates used for federal government reporting of foreign currency transactions.",
  },

  // ── Treasury Securities Auctions Data ────────────────────────────────
  {
    dataset: "Treasury Securities Auctions Data",
    slug: "/treasury-securities-auctions-data/",
    dataTable: "Treasury Securities Auctions Data",
    endpoint: "/v1/accounting/od/auctions_query",
    description: "Auction data for Treasury securities including bills, notes, bonds, TIPS, and FRNs.",
  },

  // ── Treasury Securities Buybacks ── 2 tables ─────────────────────────
  {
    dataset: "Treasury Securities Buybacks",
    slug: "/treasury-securities-buybacks/",
    dataTable: "Buybacks Operations",
    endpoint: "/v1/accounting/od/buybacks_operations",
    description: "Treasury securities buyback operations.",
  },
  {
    dataset: "Treasury Securities Buybacks",
    slug: "/treasury-securities-buybacks/",
    dataTable: "Security Details",
    endpoint: "/v1/accounting/od/buybacks_security_details",
    description: "Treasury securities buyback security details.",
  },

  // ── Treasury Securities Upcoming Auctions ────────────────────────────
  {
    dataset: "Treasury Securities Upcoming Auctions Data",
    slug: "/upcoming-auctions/",
    dataTable: "Treasury Securities Upcoming Auctions",
    endpoint: "/v1/accounting/od/upcoming_auctions",
    description: "Upcoming scheduled Treasury securities auctions.",
  },

  // ── U.S. Government Revenue Collections ──────────────────────────────
  {
    dataset: "U.S. Government Revenue Collections",
    slug: "/revenue-collections-management/",
    dataTable: "U.S. Government Revenue Collections",
    endpoint: "/v2/revenue/rcm",
    description: "Revenue collections data for the U.S. Government.",
  },

  // ── U.S. Treasury Monthly Statement of the Public Debt (MSPD) ── 7 ──
  {
    dataset: "U.S. Treasury Monthly Statement of the Public Debt (MSPD)",
    slug: "/monthly-statement-public-debt/",
    dataTable: "Summary of Treasury Securities Outstanding",
    endpoint: "/v1/debt/mspd/mspd_table_1",
    description: "MSPD Table 1: Summary of Treasury securities outstanding.",
  },
  {
    dataset: "U.S. Treasury Monthly Statement of the Public Debt (MSPD)",
    slug: "/monthly-statement-public-debt/",
    dataTable: "Statutory Debt Limit",
    endpoint: "/v1/debt/mspd/mspd_table_2",
    description: "MSPD Table 2: Statutory debt limit.",
  },
  {
    dataset: "U.S. Treasury Monthly Statement of the Public Debt (MSPD)",
    slug: "/monthly-statement-public-debt/",
    dataTable: "Detail of Treasury Securities Outstanding",
    endpoint: "/v1/debt/mspd/mspd_table_3",
    description: "MSPD Table 3: Detail of Treasury securities outstanding.",
  },
  {
    dataset: "U.S. Treasury Monthly Statement of the Public Debt (MSPD)",
    slug: "/monthly-statement-public-debt/",
    dataTable: "Detail of Marketable Treasury Securities Outstanding",
    endpoint: "/v1/debt/mspd/mspd_table_3_market",
    description: "MSPD Table 3 (Marketable): Detail of marketable Treasury securities outstanding.",
  },
  {
    dataset: "U.S. Treasury Monthly Statement of the Public Debt (MSPD)",
    slug: "/monthly-statement-public-debt/",
    dataTable: "Detail of Non-Marketable Treasury Securities Outstanding",
    endpoint: "/v1/debt/mspd/mspd_table_3_nonmarket",
    description: "MSPD Table 3 (Non-Marketable): Detail of non-marketable Treasury securities outstanding.",
  },
  {
    dataset: "U.S. Treasury Monthly Statement of the Public Debt (MSPD)",
    slug: "/monthly-statement-public-debt/",
    dataTable: "Historical Data",
    endpoint: "/v1/debt/mspd/mspd_table_4",
    description: "MSPD Table 4: Historical data on public debt.",
  },
  {
    dataset: "U.S. Treasury Monthly Statement of the Public Debt (MSPD)",
    slug: "/monthly-statement-public-debt/",
    dataTable: "Holdings of Treasury Securities in Stripped Form",
    endpoint: "/v1/debt/mspd/mspd_table_5",
    description: "MSPD Table 5: Holdings of Treasury securities in stripped form.",
  },

  // ── U.S. Treasury Savings Bonds: Issues, Redemptions, Maturities ── 3
  {
    dataset: "U.S. Treasury Savings Bonds: Issues, Redemptions, and Maturities by Series",
    slug: "/savings-bonds-issues-redemptions-maturities-by-series/",
    dataTable: "Paper Savings Bonds Issues, Redemptions, and Maturities by Series",
    endpoint: "/v1/accounting/od/savings_bonds_report",
    description: "Paper savings bonds issues, redemptions, and maturities by series.",
  },
  {
    dataset: "U.S. Treasury Savings Bonds: Issues, Redemptions, and Maturities by Series",
    slug: "/savings-bonds-issues-redemptions-maturities-by-series/",
    dataTable: "Matured Unredeemed Debt",
    endpoint: "/v1/accounting/od/savings_bonds_mud",
    description: "Savings bonds matured unredeemed debt.",
  },
  {
    dataset: "U.S. Treasury Savings Bonds: Issues, Redemptions, and Maturities by Series",
    slug: "/savings-bonds-issues-redemptions-maturities-by-series/",
    dataTable: "Piece Information by Series",
    endpoint: "/v1/accounting/od/savings_bonds_pcs",
    description: "Savings bonds piece information by series.",
  },

  // ── U.S. Treasury-Owned Gold ─────────────────────────────────────────
  {
    dataset: "U.S. Treasury-Owned Gold",
    slug: "/status-report-government-gold-reserve/",
    dataTable: "U.S. Treasury-Owned Gold",
    endpoint: "/v2/accounting/od/gold_reserve",
    description: "Status report of U.S. government gold reserve by custodian.",
  },

  // ── Unemployment Trust Fund Report Selection ── 5 tables ─────────────
  {
    dataset: "Unemployment Trust Fund Report Selection",
    slug: "/unemployment-trust-funds-report-selection/",
    dataTable: "Account Statement",
    endpoint: "/v1/accounting/od/utf_account_statement",
    description: "Unemployment Trust Fund account statement.",
  },
  {
    dataset: "Unemployment Trust Fund Report Selection",
    slug: "/unemployment-trust-funds-report-selection/",
    dataTable: "Transaction Statement",
    endpoint: "/v1/accounting/od/utf_transaction_statement",
    description: "Unemployment Trust Fund transaction statement.",
  },
  {
    dataset: "Unemployment Trust Fund Report Selection",
    slug: "/unemployment-trust-funds-report-selection/",
    dataTable: "Federal Activity Statement",
    endpoint: "/v1/accounting/od/utf_federal_activity_statement",
    description: "Unemployment Trust Fund federal activity statement.",
  },
  {
    dataset: "Unemployment Trust Fund Report Selection",
    slug: "/unemployment-trust-funds-report-selection/",
    dataTable: "Account Balances",
    endpoint: "/v1/accounting/od/utf_account_balances",
    description: "Unemployment Trust Fund account balances.",
  },
  {
    dataset: "Unemployment Trust Fund Report Selection",
    slug: "/unemployment-trust-funds-report-selection/",
    dataTable: "Transaction Subtotals",
    endpoint: "/v1/accounting/od/utf_transaction_subtotals",
    description: "Unemployment Trust Fund transaction subtotals.",
  },

  // ── Unemployment Trust Fund: Quarterly Yields ────────────────────────
  {
    dataset: "Unemployment Trust Fund: Quarterly Yields",
    slug: "/unemployment-trust-fund-yields/",
    dataTable: "Unemployment Trust Fund: Quarterly Yields",
    endpoint: "/v2/accounting/od/utf_qtr_yields",
    description: "Quarterly yields for the Unemployment Trust Fund.",
  },
];

// ─── Public API ──────────────────────────────────────────────────────

/** List all datasets, grouped by dataset name. */
export function listDatasets(): Record<string, { dataTable: string; endpoint: string; description: string; slug: string }[]> {
  const grouped: Record<string, { dataTable: string; endpoint: string; description: string; slug: string }[]> = {};
  for (const ep of ENDPOINTS) {
    if (!grouped[ep.dataset]) grouped[ep.dataset] = [];
    grouped[ep.dataset].push({
      dataTable: ep.dataTable,
      endpoint: ep.endpoint,
      description: ep.description,
      slug: ep.slug,
    });
  }
  return grouped;
}

/** Search endpoints by keyword (local — no API call). */
export function searchEndpoints(query: string): EndpointInfo[] {
  const q = query.toLowerCase();
  return ENDPOINTS.filter(
    ep =>
      ep.dataset.toLowerCase().includes(q) ||
      ep.dataTable.toLowerCase().includes(q) ||
      ep.endpoint.toLowerCase().includes(q) ||
      ep.description.toLowerCase().includes(q),
  );
}

/** Get field metadata for an endpoint (calls API with page[size]=1). */
export async function getEndpointFields(endpoint: string): Promise<FiscalDataResponse> {
  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return api.get<FiscalDataResponse>(normalizedEndpoint, {
    format: "json",
    "page[number]": 1,
    "page[size]": 1,
  });
}

/** Query the Treasury Fiscal Data API. */
export async function queryFiscalData(
  endpoint: string,
  params: QueryParams = {},
): Promise<FiscalDataResponse> {
  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const queryParams: Record<string, string | number | undefined> = {
    format: "json",
  };
  if (params.fields) queryParams.fields = params.fields;
  if (params.filter) queryParams.filter = params.filter;
  if (params.sort) queryParams.sort = params.sort;
  if (params.pageNumber != null) queryParams["page[number]"] = params.pageNumber;
  if (params.pageSize != null) queryParams["page[size]"] = params.pageSize;

  return api.get<FiscalDataResponse>(normalizedEndpoint, queryParams);
}

/** Clear cached responses. */
export function clearCache(): void {
  api.clearCache();
}
