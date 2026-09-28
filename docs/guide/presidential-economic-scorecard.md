---
title: "Presidential Economic Scorecard"
---

# Presidential Economic Scorecard: Clinton Through Trump II

> All data pulled live from federal government APIs on February 26, 2026 using the US Government Open Data MCP server.

### Data Sources Used

| Source | Series / Endpoints | What It Provided |
|--------|-------------------|-----------------|
| **FRED** | GDP, UNRATE, PAYEMS, CPIAUCSL, FEDFUNDS, SP500, FYFSGDA188S, GFDEBTN, MEHOINUSA672N, MSPUS, CIVPART, OPHNFB, A091RC1Q027SBEA, BOPGSTB | GDP, unemployment, nonfarm payrolls, CPI, fed funds rate, S&P 500, deficit/GDP ratio, national debt (pre-2001), real median household income, median home price, labor force participation, productivity, interest payments, trade balance |
| **Treasury Fiscal Data** | debt_to_penny, avg_interest_rates | National debt at each inauguration, average interest rates on marketable debt |
| **Congress.gov** | Senate votes, House votes, recent laws | Key vote breakdowns (TCJA, ARRA, ACA, CARES Act), laws enacted per Congress |
| **Federal Register** | Executive orders by president | EO counts for Clinton, Bush, Obama, Trump, Biden |
| **USAspending** | Spending by agency | Federal spending shifts FY 2017 vs FY 2025 |
| **BLS** | Employment by industry, CPI breakdown | National employment trends, inflation components |

<!-- Table of contents added separately for navigation -->

---

## Table of Contents

- [How to Read This](#how-to-read-this)
- [The Scorecard at a Glance](#the-scorecard-at-a-glance)
- [President by President](#president-by-president)
  - [Bill Clinton (D) — 1993–2001](#bill-clinton-d--january-1993-to-january-2001)
  - [George W. Bush (R) — 2001–2009](#george-w-bush-r--january-2001-to-january-2009)
  - [Barack Obama (D) — 2009–2017](#barack-obama-d--january-2009-to-january-2017)
  - [Donald Trump, First Term (R) — 2017–2021](#donald-trump-first-term-r--january-2017-to-january-2021)
  - [Joe Biden (D) — 2021–2025](#joe-biden-d--january-2021-to-january-2025)
  - [Donald Trump, Second Term (R) — 2025–Present](#donald-trump-second-term-r--january-2025-to-present)
    - [The Trade Deficit and the Tariff Paradox](#the-trade-deficit-and-the-tariff-paradox)
- [The Big Picture: 32 Years of Data](#the-big-picture-32-years-of-data)
- [The Presidential Scorecard: Grading the Numbers](#the-presidential-scorecard-grading-the-numbers)
- [Additional Metrics & Correlations](#additional-metrics--correlations)
  - [Real Median Household Income](#real-median-household-income-inflation-adjusted)
  - [Housing Affordability](#housing-affordability-median-home-sale-price)
  - [Labor Force Participation](#labor-force-participation-rate)
  - [Federal Debt Interest Costs](#federal-debt-interest-costs)
  - [Deficit Trajectory Year by Year](#deficit-trajectory-year-by-year--of-gdp)
- [Cross-Cutting Correlations](#cross-cutting-correlations)
- [Deep Dive: What Congress Actually Did](#deep-dive-what-congress-actually-did)
  - [The Landmark Votes](#the-landmark-votes-that-shaped-each-presidency)
  - [Federal Spending by Agency](#how-federal-spending-shifted)
  - [The Productivity Paradox](#the-productivity-paradox)
- [What Was Congress Doing?](#what-was-congress-doing)
- [The Honest Assessment](#the-honest-assessment)

---

## How to Read This

Every president inherits an economy they didn't build, faces crises they didn't cause, and works with (or against) a Congress they don't fully control. This analysis presents the raw numbers — what actually happened to the economy during each presidency — and then adds the context needed to understand *why* it happened.

**No president "controls" the economy.** The Federal Reserve sets interest rates. Congress passes budgets. Global events (wars, pandemics, oil shocks) strike without regard for who's in office. What a president *can* do is sign legislation, issue executive orders, appoint Fed chairs, and set the tone for business confidence. This scorecard measures the outcomes — not blame or credit.

**The numbers below are all from the same federal data sources**, measured the same way for every president, at the same point in their terms (inauguration month). This makes the comparison as apples-to-apples as government data allows.

---

## The Scorecard at a Glance

| Metric | Clinton (D) | Bush (R) | Obama (D) | Trump I (R) | Biden (D) | Trump II (R)* |
|--------|------------|----------|-----------|-------------|-----------|---------------|
| **Term** | 1993–2001 | 2001–2009 | 2009–2017 | 2017–2021 | 2021–2025 | 2025–present |
| **GDP start** | $6.73T | $10.47T | $14.43T | $19.09T | $22.09T | $29.83T |
| **GDP end** | $10.47T | $14.43T | $19.09T | $22.09T | $29.83T | $31.49T** |
| **GDP growth** | **+55.6%** | +37.8% | +32.3% | +15.7% | +35.0% | +5.6%** |
| **Unemployment start** | 7.3% | 4.2% | 7.8% | 4.7% | 6.4% | 4.2% |
| **Unemployment end** | 4.2% | 7.8% | 4.7% | 6.4% | 4.2% | 4.3%** |
| **Unemployment Δ** | **-3.1pp** | +3.6pp | **-3.1pp** | +1.7pp | **-2.2pp** | +0.1pp** |
| **Jobs start (M)** | 110.0 | 132.8 | 133.3 | 145.8 | 143.4 | 158.3 |
| **Jobs end (M)** | 132.8 | 133.3 | 145.8 | 143.4 | 158.3 | 158.6** |
| **Jobs added (M)** | **+22.7** | +0.5 | +12.5 | -2.5 | +14.9 | +0.3** |
| **Nat'l debt start** | $4.35T | $5.73T | $10.63T | $19.94T | $27.78T | $36.22T |
| **Nat'l debt end** | $5.73T | $10.63T | $19.94T | $27.78T | $36.22T | $38.76T** |
| **Debt added** | **+$1.38T** | +$4.90T | +$9.31T | +$7.85T | +$8.43T | +$2.55T** |
| **CPI start** | 143.1 | 176.0 | 212.7 | 244.0 | 263.6 | 319.7 |
| **CPI end** | 176.0 | 212.7 | 244.0 | 263.6 | 319.7 | 325.3** |
| **Cum. inflation** | **+23.0%** | +20.9% | +14.7% | +8.0% | +21.3% | +1.7%** |
| **Fed funds start** | 3.03% | 5.49% | 0.22% | 0.66% | 0.08% | 4.33% |
| **Fed funds end** | 5.49% | 0.22% | 0.66% | 0.08% | 4.33% | 4.33%** |
| **S&P 500 start** | ~435 | ~1,342 | ~865 | 2,280 | 3,774 | 6,041 |
| **S&P 500 end** | ~1,342 | ~865 | 2,280 | 3,774 | 6,041 | 6,946** |
| **S&P 500 return** | **+208%** | -36% | **+164%** | +66% | +60% | +15%** |

\* Trump II data as of Feb 2026 — only 13 months into a 48-month term.

\** Partial-term figures. Not comparable to full-term presidents.

*Sources: FRED (GDP, UNRATE, PAYEMS, CPIAUCSL, FEDFUNDS, SP500), Treasury Fiscal Data (debt_to_penny), FRED (GFDEBTN for Clinton-era debt)*

---

## President by President

---

# Bill Clinton (D) — January 1993 to January 2001

## What He Inherited

Clinton took office during a sluggish recovery from the 1990–91 recession. Unemployment was 7.3% — the highest of any incoming president in this analysis. The national debt was $4.35 trillion. The federal budget deficit was 3.7% of GDP. The Cold War had just ended, and the "peace dividend" — reduced military spending — was a real fiscal opportunity.

## What Happened to the Economy

Clinton's presidency coincided with the greatest peacetime economic expansion in American history:

- **GDP grew 55.6%** — from $6.73T to $10.47T — the largest growth of any president in this analysis
- **22.7 million jobs were added** — more than any president before or since
- **Unemployment fell from 7.3% to 4.2%** — the lowest rate in 30 years at the time
- **The budget went from deficit to surplus** — deficit shrank from -3.7% of GDP (1993) to a **+2.3% surplus** by 2000. This was the first surplus since 1969.
- The **S&P 500 tripled** (+208%), driven by the dot-com boom

## The Debt Story

Clinton added $1.38T to the debt — the smallest absolute increase of any president in this analysis. In his final years, the government was actually *paying down* debt. The debt-to-GDP ratio fell significantly.

## Congress

| Years | House | Senate |
|-------|-------|--------|
| 1993–1995 (103rd) | Dem | Dem |
| 1995–2001 (104th–106th) | **GOP** | **GOP** |

Clinton had a Democratic Congress for only his first 2 years. The "Republican Revolution" of 1994 gave Newt Gingrich the House, leading to divided government for 6 of 8 years. The balanced budgets of the late 1990s were negotiated between Clinton and the Republican Congress.

## Key Legislation & Actions

- **Omnibus Budget Reconciliation Act of 1993** — raised top income tax rate to 39.6%, expanded EITC. Passed without a single Republican vote.
- **NAFTA** (1993) — free trade with Canada and Mexico. Bipartisan but controversial within Clinton's own party.
- **Welfare Reform** (1996) — signed with Republican Congress
- **Balanced Budget Act** (1997) — bipartisan
- **Gramm-Leach-Bliley Act** (1999) — repealed Glass-Steagall bank separation. Bipartisan. Later blamed for contributing to the 2008 financial crisis.

## Context & Caveats

The dot-com bubble (internet stock mania) inflated asset prices and generated massive capital gains tax revenue that made the surplus partly artificial. When the bubble burst in 2000–2001, revenue cratered. Clinton left office with the economy at the peak of a bubble — great numbers, fragile foundation. The Fed under Greenspan kept rates relatively accommodative through much of this period, fueling the boom.

---

# George W. Bush (R) — January 2001 to January 2009

## What He Inherited

Bush inherited an economy in freefall. The dot-com bubble was bursting. The S&P 500 had already begun declining. The economy was entering recession just as he took office (the recession officially started March 2001). Unemployment was 4.2% but rising. The budget surplus was evaporating. He inherited the strongest fiscal position of any president here — but the trend lines were already turning down.

## What Happened to the Economy

Bush's presidency was bookended by two crises — 9/11 at the start and the Great Financial Crisis at the end:

- **GDP grew 37.8%** — from $10.47T to $14.43T — solid but much of it was housing-bubble-driven
- **Only 500,000 jobs were added** — the worst job creation of any full-term president in this analysis
- **Unemployment rose from 4.2% to 7.8%** — it was much worse by the time Obama took over (and continued rising)
- The **S&P 500 lost 36%** of its value — the worst market performance by far
- The budget went from **+2.3% surplus to -9.8% deficit** by his last fiscal year (FY2009)

## The Debt Story

Bush added $4.90 trillion to the national debt — nearly quadrupling the Clinton-era increase. Drivers:

1. **Two wars** (Afghanistan 2001, Iraq 2003) — trillions in military spending
2. **Tax cuts** (2001 and 2003) — reduced revenue
3. **TARP bailout** (2008) — $700B emergency financial rescue
4. **Medicare Part D** (2003) — new prescription drug benefit, unfunded

## Congress

| Years | House | Senate |
|-------|-------|--------|
| 2001–2007 (107th–109th) | **GOP** | **GOP** (mostly) |
| 2007–2009 (110th) | Dem | Dem |

Bush had unified Republican control for most of his presidency. The 2006 midterms flipped both chambers to Democrats.

## Key Legislation & Actions

- **Economic Growth and Tax Relief Reconciliation Act** (2001) — Bush tax cuts
- **Authorization for Use of Military Force** (2001) — Afghanistan
- **Iraq War Authorization** (2002)
- **Medicare Modernization Act** (2003) — Part D prescription drugs
- **TARP / Emergency Economic Stabilization Act** (2008) — bank bailout

## Context & Caveats

Bush faced 9/11 — the most devastating attack on U.S. soil since Pearl Harbor — just 8 months into his presidency. This fundamentally reshaped spending priorities toward defense and homeland security. The housing bubble that formed during his presidency was fueled by low Fed interest rates (which dropped from 5.49% to 0.22%), lax lending standards, and financial deregulation. The crisis that erupted in 2008 was the worst economic meltdown since the Great Depression. Bush's final economic numbers are heavily colored by events that were decades in the making.

---

# Barack Obama (D) — January 2009 to January 2017

## What He Inherited

Obama inherited the worst economy since FDR. The financial system was in collapse. Lehman Brothers had failed. AIG had been bailed out. The auto industry was on the verge of bankruptcy. The economy was losing 800,000 jobs per month. Unemployment was 7.8% and accelerating toward 10%. The stock market had lost half its value. The deficit was nearly 10% of GDP. This was not a normal transition — it was a national emergency.

## What Happened to the Economy

Obama's presidency was a long, slow recovery from the Great Recession:

- **GDP grew 32.3%** — from $14.43T to $19.09T — steady but unspectacular
- **12.5 million jobs were added** — all in the recovery phase after the initial hemorrhaging stopped
- **Unemployment fell from 7.8% to 4.7%** — matching Clinton's 3.1 percentage point improvement
- The **S&P 500 gained 164%** — one of the best stock market runs in history, driven by Fed stimulus and recovery
- The deficit shrank from **-9.8% of GDP (2009) to -3.1% (2016)** — cut by two-thirds

## The Debt Story

Obama added $9.31 trillion to the national debt — the largest absolute increase of any president. But context matters enormously:

- He inherited a $1.4T annual deficit from the financial crisis
- The stimulus (ARRA, $800B) was frontloaded in 2009–2010
- Automatic stabilizers (unemployment insurance, food stamps) ballooned during the recession
- By 2016, the deficit had been cut from 9.8% to 3.1% of GDP
- Much of the debt increase was "baked in" before he signed a single bill

## Congress

| Years | House | Senate |
|-------|-------|--------|
| 2009–2011 (111th) | Dem | Dem (60 seats briefly) |
| 2011–2015 (112th–113th) | **GOP** | Dem |
| 2015–2017 (114th) | **GOP** | **GOP** |

Obama had full Democratic control for only 2 years. The 2010 Tea Party wave gave Republicans the House, creating gridlock for his final 6 years. Major legislation essentially stopped after 2010.

## Key Legislation & Actions

- **American Recovery and Reinvestment Act** (2009) — $831B stimulus
- **Affordable Care Act** (2010) — "Obamacare" — healthcare reform, no Republican votes
- **Dodd-Frank Wall Street Reform** (2010) — financial regulation
- **Budget Control Act** (2011) — sequestration, spending caps (negotiated with GOP)
- **Auto industry bailout** (continuation of Bush-era TARP)
- Fed under Bernanke/Yellen kept rates at 0% for most of his presidency (quantitative easing)

## Context & Caveats

Obama's numbers are a study in "where you start matters." He inherited the worst starting position of any modern president. The recovery, while real, was the slowest post-recession recovery since WWII — criticized as inadequate from the left and over-regulated from the right. The near-zero interest rate environment inflated asset prices, benefiting stock and homeowners while wage growth for workers lagged. The debt increase looks enormous in absolute terms but much of it was unavoidable crisis spending.

---

# Donald Trump, First Term (R) — January 2017 to January 2021

## What He Inherited

Trump inherited a mature economic expansion. Unemployment was 4.7% and falling. GDP growth was steady at 2–3%. The stock market was at all-time highs. The deficit was manageable at 3.4% of GDP. The Fed had just begun raising rates from zero. By conventional measures, this was a good economy to inherit — but it was late-cycle, meaning there was less room to improve and more risk of a downturn.

## What Happened to the Economy

Trump's first term was a tale of two halves: a strong 2017–2019 followed by the COVID-19 catastrophe:

- **GDP grew 15.7%** — from $19.09T to $22.09T — the slowest full-term growth rate (but 4 years vs Clinton/Bush's 8)
- **2.5 million jobs were lost** — entirely due to COVID. Before COVID (Feb 2020), the economy had added ~6.4M jobs.
- **Unemployment went from 4.7% to 6.4%** — it had fallen to 3.5% (50-year low) before COVID hit
- The **S&P 500 gained 66%** — strong, driven by tax cuts and then unprecedented Fed/fiscal stimulus
- Cumulative inflation was only **8.0%** — the lowest of any president here (partly due to COVID deflation)

### The Pre-COVID vs Post-COVID Split

This is important. Through February 2020, Trump's economic numbers were:
- Unemployment: 3.5% (lowest since 1969)
- Jobs added: ~6.4 million
- GDP growth: ~15% in 3 years
- S&P 500: up ~40%

Then COVID-19 hit. In two months (March–April 2020), the economy lost 22 million jobs. GDP fell 31% annualized in Q2 2020. It was the sharpest contraction in recorded history — caused by a global pandemic, not policy failure.

## The Debt Story

Trump added $7.85 trillion to the national debt in just 4 years:

- **Tax Cuts and Jobs Act** (2017) — reduced federal revenue by an estimated $1.9T over 10 years
- **COVID relief** — CARES Act ($2.2T), additional stimulus packages
- The deficit went from -3.4% of GDP (2017) to **-14.7% (2020)** — the largest peacetime deficit in American history

## Congress

| Years | House | Senate |
|-------|-------|--------|
| 2017–2019 (115th) | **GOP** | **GOP** |
| 2019–2021 (116th) | Dem | **GOP** |

Trump had unified Republican control for 2 years, during which the tax cuts passed. Democrats took the House in 2018.

## Key Legislation & Actions

- **Tax Cuts and Jobs Act** (2017) — corporate rate 35% → 21%, individual cuts
- **First Step Act** (2018) — bipartisan criminal justice reform
- **USMCA** (2020) — renegotiated NAFTA
- **CARES Act** (2020) — $2.2 trillion COVID relief
- Trade war with China — tariffs on ~$350B in goods
- 220 executive orders (per Federal Register)

## Context & Caveats

COVID-19 makes Trump's first term impossible to evaluate on economic numbers alone. The pre-COVID economy was genuinely strong — low unemployment, solid growth, contained inflation. The pandemic was a once-in-a-century exogenous shock that hit every country on Earth. The massive fiscal response (bipartisan) prevented a depression but planted the seeds of the inflation that would define Biden's presidency. Trump's fiscal legacy was significantly expansionary — both through tax cuts (reducing revenue) and COVID spending (increasing outlays).

---

# Joe Biden (D) — January 2021 to January 2025

## What He Inherited

Biden inherited a COVID-ravaged economy in the early stages of recovery. Unemployment was 6.4%. The economy had regained about two-thirds of lost jobs but was still 10 million below pre-COVID levels. Vaccines were just becoming available. The Fed funds rate was 0.08% — essentially zero. The deficit was 11.7% of GDP. The national debt was $27.78 trillion. Supply chains were broken worldwide.

## What Happened to the Economy

Biden's presidency saw the fastest recovery in modern history — followed by the worst inflation in 40 years:

- **GDP grew 35.0%** — from $22.09T to $29.83T — strong, boosted by reopening and inflation
- **14.9 million jobs were added** — second only to Clinton, largely recovering COVID losses
- **Unemployment fell from 6.4% to 4.2%** — a full COVID recovery
- The **S&P 500 gained 60%** — powered by tech/AI boom
- But **cumulative inflation was 21.3%** — the highest since the Carter era
- Inflation peaked at **9.1% year-over-year in June 2022** — a 40-year high

### The Inflation Problem

This was the defining economic story of Biden's presidency. Core CPI components:

| Category | Cumulative increase (2021–2025) |
|----------|-------------------------------|
| Overall | +21.3% |
| Shelter/Housing | ~+25% |
| Food | ~+25% |
| Energy | Volatile (spiked then fell) |
| Used cars | +30%+ |

Causes were a mix of: (1) too much fiscal stimulus too late (American Rescue Plan, $1.9T, March 2021 — when the economy was already recovering), (2) broken supply chains from COVID, (3) Russia's invasion of Ukraine (energy/food price spike), and (4) years of near-zero interest rates that weren't raised fast enough.

The Fed raised rates from 0.08% to 5.33% — the most aggressive tightening cycle since the 1980s — and inflation came down from 9.1% to ~2.4% without causing a recession (the "soft landing").

## The Debt Story

Biden added $8.43 trillion to the national debt:

- **American Rescue Plan** (2021) — $1.9T COVID stimulus
- **Infrastructure Investment and Jobs Act** (2021) — $1.2T (bipartisan)
- **Inflation Reduction Act** (2022) — $400B+ in clean energy/health spending
- **CHIPS and Science Act** (2022) — $280B for semiconductor manufacturing
- Continued high interest costs on existing debt
- Deficit shrank from -11.7% of GDP (2021) to -5.8% (2025), but levels remained historically high

## Congress

| Years | House | Senate |
|-------|-------|--------|
| 2021–2023 (117th) | Dem | Dem (50-50 + VP) |
| 2023–2025 (118th) | **GOP** | Dem |

Biden had the slimmest possible Democratic majority for 2 years. The 118th Congress under Republican House Speaker was marked by gridlock, government shutdown threats, and a historically narrow GOP majority.

## Key Legislation & Actions

- **American Rescue Plan** (2021) — $1.9T, no Republican votes
- **Infrastructure Investment and Jobs Act** (2021) — $1.2T, bipartisan
- **CHIPS and Science Act** (2022) — bipartisan
- **Inflation Reduction Act** (2022) — no Republican votes, Manchin-Schumer deal
- Student loan forgiveness attempts (mostly blocked by courts)
- ~140+ executive orders

## Context & Caveats

Biden's economic story was "strong but didn't feel strong." GDP grew, jobs recovered, unemployment hit 50-year lows, and the stock market boomed. But inflation eroded real purchasing power — grocery prices, rent, and gas hit levels that made everyday Americans feel poorer even as headline numbers improved. Real wages only began outpacing inflation in 2023. The perception gap between economic data and economic *vibes* was the defining political challenge, and it contributed to his political difficulties.

---

# Donald Trump, Second Term (R) — January 2025 to Present

## What He Inherited

Trump returned to office with a strong economy: 4.2% unemployment, 6,041 on the S&P 500, GDP at $29.83T, and inflation back near target at 2.4%. The Fed funds rate was 4.33% — much higher than the near-zero he left in 2021. The national debt was $36.22 trillion. The economy was in a "soft landing" — inflation tamed without recession.

## 13 Months In (as of Feb 2026)

- GDP: $31.49T (+5.6% in ~13 months)
- Unemployment: 4.3% (essentially flat)
- S&P 500: 6,946 (+15%)
- National debt: $38.76T (+$2.55T in 13 months)
- CPI: 325.3 (+1.7% cumulative, ~2.4% annualized)
- Fed funds: 4.33% (unchanged)
- Jobs added: ~300K

## The Trade Deficit and the Tariff Paradox

The most dramatic economic story of Trump's second term so far isn't GDP or jobs — it's the trade balance. Trump campaigned heavily on tariffs as a tool to reduce the trade deficit, bring manufacturing home, and punish countries with unfair trade practices. The data from the first 13 months tells a more complicated story.

### Monthly Trade Balance (Goods & Services, Millions $)

| Month | Trade Balance | Context |
|-------|-------------|---------|
| Dec 2024 (pre-inauguration) | −$96,948M | Biden's final month |
| **Jan 2025** | **−$128,344M** | Trump takes office; tariff announcements begin |
| **Feb 2025** | **−$119,822M** | Front-running accelerates |
| **Mar 2025** | **−$135,963M** | **Worst single month in history** |
| Apr 2025 | −$60,117M | Tariffs take effect; imports collapse |
| May 2025 | −$70,595M | Partial normalization |
| Jun 2025 | −$57,728M | Improvement |
| Jul 2025 | −$73,942M | Volatile |
| Aug 2025 | −$55,173M | Improved |
| Sep 2025 | −$47,681M | **Lowest since 2020** |
| Oct 2025 | −$28,749M | Sharp narrowing |
| Nov 2025 | −$53,044M | Rebound |
| Dec 2025 | −$70,311M | Widening again |

### What Happened (In Plain English)

**Phase 1 — The Front-Run (Jan–Mar 2025):** When Trump announced sweeping tariffs in January 2025, American businesses panicked and rushed to import as much as possible *before* the tariffs hit. This is called "front-running" — it's rational behavior by individual companies but it makes the trade deficit temporarily *worse*, not better. January through March 2025 saw the three worst trade deficit months in American history, peaking at −$136 billion in March.

**Phase 2 — The Correction (Apr–Oct 2025):** Once tariffs took effect, imports dropped sharply. The trade deficit narrowed dramatically — falling to −$28.7 billion in October, the narrowest since the COVID lockdowns of 2020. On the surface, this looks like the tariffs "worked."

**Phase 3 — The Rebound (Nov–Dec 2025):** The deficit began widening again, reaching −$70.3 billion in December. This suggests the initial narrowing was partly temporary — supply chains rerouted, businesses adjusted, and trade patterns began normalizing at new, higher tariff levels.

### The Historical Comparison

| President | Monthly Trade Deficit (at inauguration) | Monthly Trade Deficit (at exit/latest) | Change |
|-----------|---------------------------------------|--------------------------------------|--------|
| Clinton (Feb 1993) | −$3.9B | −$33.1B (Jan 2001) | **Worsened 8.5x** |
| Bush (Feb 2001) | −$33.1B | −$36.1B (Jan 2009) | Worsened 9% |
| Obama (Feb 2009) | −$36.1B | −$43.7B (Jan 2017) | Worsened 21% |
| **Trump I (Feb 2017)** | **−$39.8B** | **−$65.6B (Jan 2021)** | **Worsened 65%** |
| Biden (Feb 2021) | −$65.6B | −$96.9B (Dec 2024) | Worsened 48% |
| Trump II (Jan 2025) | −$128.3B | −$70.3B (Dec 2025) | Narrowed 45%** |

\** The Jan 2025 starting figure is heavily distorted by front-running. If measured from the pre-tariff-announcement baseline (~$80–97B monthly average in late 2024), the improvement is more modest.

### The Uncomfortable Truth About Tariffs and Trade Deficits

The data reveals a pattern that contradicts simple narratives from both parties:

1. **The trade deficit has worsened under every president since Clinton** — regardless of party, trade policy, or tariff levels. It grew from $3.9B/month in 1993 to ~$70–100B/month by the mid-2020s.

2. **Trump's first-term tariffs (2018–2020) did not reduce the overall trade deficit.** It went from −$39.8B/month to −$65.6B/month — a 65% increase. The China-specific deficit narrowed, but trade rerouted through Vietnam, Mexico, and other countries. The *total* deficit still grew.

3. **Trump's second-term tariffs (2025) show a different pattern** — much broader (applying to more countries), much higher (some rates 25–60%), and they did physically reduce imports. The deficit narrowed to historic lows in October 2025. But it's already widening again, and the long-term cost (higher consumer prices, supply chain disruption, retaliatory tariffs from trading partners) is not yet reflected in the data.

4. **A smaller trade deficit isn't automatically good.** The deficit reflects the fact that Americans consume more than they produce — which is partly because the US economy is services-oriented, the dollar is the world's reserve currency (creating natural demand for dollars that flows back as imports), and American consumers are wealthy enough to buy foreign goods. Reducing the deficit by making imports more expensive doesn't make Americans richer — it makes the things they buy more expensive.

5. **The front-running effect shows that trade policy announcements move markets before they take effect.** January–March 2025 was the worst-ever trade deficit quarter — entirely caused by the *anticipation* of tariffs, not by any foreign trade practice.

*Source: FRED BOPGSTB (U.S. Trade Balance on Goods and Services, BEA/Census, millions of dollars, seasonally adjusted)*

**Too early to give a final verdict.** The tariff regime is still being implemented, retaliatory measures are still being negotiated, and supply chains take 2–3 years to fully adjust. The data so far shows dramatic short-term volatility but no clear structural improvement to the underlying trade position.

---

## The Big Picture: 32 Years of Data

### Who Created the Most Jobs?

| President | Jobs Added | Term Length | Jobs/Year |
|-----------|-----------|-------------|-----------|
| **Clinton** | **+22.7M** | 8 years | **+2.84M/yr** |
| Obama | +12.5M | 8 years | +1.56M/yr |
| Biden | +14.9M | 4 years | +3.73M/yr* |
| Bush | +0.5M | 8 years | +0.06M/yr |
| Trump I | -2.5M | 4 years | -0.63M/yr** |

\* Biden's jobs number includes COVID recovery — much of it was "re-hiring" rather than new job creation.

\** Trump's number includes COVID losses — an exogenous shock, not policy failure.

### Who Grew GDP the Most?

| President | GDP Growth | Annualized |
|-----------|-----------|------------|
| **Clinton** | **+55.6%** | **+5.6%/yr** |
| Bush | +37.8% | +4.1%/yr |
| Biden | +35.0% | +7.8%/yr* |
| Obama | +32.3% | +3.6%/yr |
| Trump I | +15.7% | +3.7%/yr |

\* Biden's GDP growth is heavily influenced by inflation and post-COVID reopening. Real (inflation-adjusted) growth was lower.

### Who Added the Most Debt?

| President | Debt Added | As % of Starting Debt |
|-----------|-----------|----------------------|
| Obama | +$9.31T | +87.6% |
| Biden | +$8.43T | +30.4% |
| Trump I | +$7.85T | +39.4% |
| Bush | +$4.90T | +85.5% |
| **Clinton** | **+$1.38T** | **+31.7%** |

Clinton added the least debt both in absolute terms and as a percentage of starting debt.

### Who Had the Best/Worst Deficit Trajectory?

| President | Deficit Start (% GDP) | Deficit End (% GDP) | Improved? |
|-----------|----------------------|--------------------|---------------------------------|
| **Clinton** | **-3.7%** | **+2.3%** | **Yes — achieved surplus** |
| Obama | -9.8% | -3.1% | Yes — cut deficit by 2/3 |
| Trump I | -3.4% | -14.7% | No — exploded (COVID) |
| Biden | -11.7% | -5.8% | Yes — cut in half |
| Bush | +2.3% | -9.8% | No — surplus → deep deficit |

### Who Had the Best Stock Market?

| President | S&P 500 Return |
|-----------|---------------|
| **Clinton** | **+208%** |
| Obama | +164% |
| Trump I | +66% |
| Biden | +60% |
| Bush | -36% |

---

## The Presidential Scorecard: Grading the Numbers

Numbers alone don't tell you who "won." A president who inherits a crisis and cleans it up deserves credit for the recovery even if their end-state looks worse than a president who inherited smooth sailing. So this scoring system accounts for **both raw results and the hand they were dealt.**

### Methodology

Each president is scored on 8 metrics, each worth 0–10 points:

1. **Job Creation** (annualized, to account for 4 vs 8 year terms)
2. **Unemployment Change** (start → end)
3. **GDP Growth** (annualized %)
4. **Deficit Trajectory** (did they improve or worsen fiscal position?)
5. **Debt Restraint** (debt added as % of starting debt, lower is better)
6. **Real Income Growth** (median household, inflation-adjusted)
7. **Stock Market Return** (annualized S&P 500)
8. **Inflation Control** (lower cumulative CPI = better, penalized for >5% annual average)

**Context modifier** (−3 to +3): Adjusts for the hand they were dealt. Inheriting a crisis gets up to +3 bonus points. Inheriting a booming economy gets 0 (you don't get credit for coasting).

### The Scores

| Category (0–10 each) | Clinton | Bush | Obama | Trump I | Biden | Trump II† |
|-----------------------|---------|------|-------|---------|-------|----------|
| **Job Creation** | 10 | 1 | 6 | 3* | 8* | 4 |
| **Unemployment Δ** | 10 | 0 | 10 | 2* | 9 | 5 |
| **GDP Growth** | 10 | 6 | 5 | 5 | 7* | 6 |
| **Deficit Trajectory** | 10 | 0 | 8 | 0* | 6 | 3 |
| **Debt Restraint** | 10 | 2 | 1 | 2 | 3 | 2 |
| **Real Income Growth** | 9 | 1 | 7 | 6 | 4 | 5† |
| **Stock Market** | 10 | 0 | 9 | 7 | 7 | 8 |
| **Inflation Control** | 6 | 7 | 8 | 9 | 2 | 7 |
| **Subtotal** | **75** | **17** | **54** | **34** | **46** | **40** |
| **Context Modifier** | +1 | +2 | +3 | −1* | +2 | 0 |
| **FINAL SCORE** | **76/80** | **19/80** | **57/80** | **33/80** | **48/80** | **40/80†** |
| **Letter Grade** | **A** | **F** | **B+** | **D+** | **C+** | **C−†** |

\* Asterisked scores include COVID adjustment for Trump I (pandemic was exogenous) and reopening adjustment for Biden (jobs/GDP were partly recovery, not creation). Trump I's context modifier is −1 because he inherited a strong economy and the deficit was already deteriorating pre-COVID.

† Trump II scores are **provisional** — based on only 13 of 48 months. His real income score uses January 2026 CPI data extrapolated (no full-year MEHOINUSA672N yet). Context modifier is 0: he inherited a healthy economy (no crisis bonus) but also hasn't had time to cause or face one. These scores will change dramatically over the remaining 35 months.

### What the Grades Mean

**A — Bill Clinton (76/80):** The numbers are almost uniformly excellent. The caveats are real — the dot-com bubble inflated everything and the Gramm-Leach-Bliley deregulation he signed contributed to the 2008 crisis. But measured by outcomes during his presidency, no one else is close. He's the only president to achieve a surplus, the only one to see labor force participation rise, the biggest job creator, and the biggest stock market run. The Republican Congress that forced spending discipline on him deserves significant credit — this was a shared achievement.

**B+ — Barack Obama (57/80):** Remarkable given what he started with. Inherited the worst economy since the 1930s and left it in genuinely good shape — 4.7% unemployment, rising wages, falling deficit. The knock is the massive debt increase (even though most was inherited/unavoidable) and the slow pace of recovery. Wage growth didn't accelerate until late in his term. The near-zero-interest-rate environment inflated assets while Main Street struggled.

**C+ — Joe Biden (48/80):** A tale of two stories. The recovery was real — 14.9M jobs, unemployment back to 4.2%, soft landing achieved. But inflation devastated his score. A 21.3% cumulative CPI increase meant that even though GDP and jobs looked great, Americans felt poorer. Real wages didn't outpace inflation until 2023. The infrastructure and CHIPS bills were genuine long-term investments, but their benefits won't be measurable for years.

**D+ — Donald Trump I (33/80):** Impossible to grade fairly. Pre-COVID (Jan 2017–Feb 2020), he'd score roughly 50–55/80 — solid B. The tax cuts boosted corporate earnings and the stock market. Unemployment hit a 50-year low. But the deficit was already rising (from -3.4% to -4.6% of GDP) before COVID hit, the tax cuts added trillions to the debt without generating enough growth to pay for themselves, and then COVID erased everything. The massive bipartisan fiscal response prevented a depression but seeded the inflation that followed.

**F — George W. Bush (19/80):** The numbers are brutal, but context matters enormously. Bush was the only president in this analysis hit by two existential crises — 9/11 reshaped national security spending overnight, and the Great Financial Crisis destroyed the economy in his final year. Almost no job creation in 8 years. The stock market lost 36%. The surplus became the biggest deficit in history. But many of the seeds — lax financial regulation, the housing bubble, Greenspan's low rates — were planted before his presidency or by institutions outside his control. The Iraq War, however, was a choice, and its cost (~$2T) was an enormous fiscal drain with no economic return.

**C− (Provisional) — Donald Trump II (40/80):** Thirteen months in, the numbers are mixed. The S&P 500 is up 15% — the strongest early showing for any category so far, earning an 8. GDP growth is running at roughly 5.6% annualized — solid (6). Inflation is contained at ~2.4% (7). But job creation has been modest (~300K), unemployment ticked up slightly from 4.2% to 4.3%, and the national debt grew by $2.55 trillion in 13 months — a $2.35T annualized pace that would be the fastest debt accumulation of any president if sustained. The deficit hasn't improved from Biden's exit level. Labor force participation is flat at 62.5%. He inherited a healthy economy with no crisis — which means there's no "recovery bounce" inflating the numbers but also no excuse for deterioration. The context modifier is 0 — he starts from neutral.

**Why this grade could change dramatically:**
- If the economy stays on this track for 4 years, the stock market gains alone could push him to a B−.
- If a recession hits (which is always possible), the numbers would deteriorate quickly from this starting position.
- The tariff policies and government restructuring currently underway are wildcards — their economic effects haven't fully materialized in the data yet.
- The debt trajectory is the biggest risk to his score — at $2.35T/year, he'd add $9.4T over a full term, the most of any president.

### Important Disclaimers About These Scores

1. **Presidents don't control the economy.** The Fed, Congress, global events, and the business cycle all matter more than executive action in most cases.
2. **4-year vs 8-year terms aren't comparable.** Clinton and Bush had 8 years; Trump I and Biden had 4. More time means more opportunity for both recovery and crisis.
3. **COVID makes Trump I and Biden almost impossible to score against the others.** Both were hit by a 100-year pandemic that no policy could have prevented.
4. **These scores are based on outcomes, not intentions.** A president who made all the right decisions but got hit by bad luck scores worse than one who made mediocre decisions during a boom.
5. **Trump II's grade is provisional** — 13 months is not enough for a definitive evaluation. The grade will be updated as more data becomes available.

---

## Deep Dive: What Congress Actually Did

Presidents get the headlines, but Congress writes the laws, passes the budgets, and controls the purse strings. Many of the most consequential economic decisions of the past 32 years were driven by Congress — sometimes in collaboration with the president, sometimes in opposition.

### The Landmark Votes That Shaped Each Presidency

These are the votes that, more than any executive order or presidential speech, determined the economic trajectory of each era.

---

#### Clinton Era: The 1993 Budget Vote That Changed Everything

**The Bill:** Omnibus Budget Reconciliation Act of 1993 (H.R. 2264)

**What it did:** Raised the top income tax rate from 31% to 39.6%, increased the corporate tax rate, expanded the Earned Income Tax Credit for low-income workers, and set spending caps. It was the single biggest deficit-reduction package since World War II.

**The Vote:**

| Chamber | Yea | Nay | Margin | Republican Yeas |
|---------|-----|-----|--------|----------------|
| House | 218 | 216 | **2 votes** | **0** |
| Senate | 51 | 50 | **VP tiebreaker** | **0** |

Not a single Republican voted for this bill. Vice President Al Gore cast the tiebreaking vote in the Senate. The House passed it by 2 votes. Every Republican predicted it would destroy the economy.

**What actually happened:** The economy boomed. GDP grew 55.6%, 22.7 million jobs were created, and the budget went from deficit to surplus. Whether the tax increase *caused* the boom or merely coincided with the dot-com revolution is the subject of endless debate. But the predictions of economic catastrophe were definitively wrong.

**The lesson:** The most consequential fiscal bill of the Clinton era passed by the smallest possible margins with zero bipartisan support — and the economy thrived.

---

#### Bush Era: Tax Cuts of 2001 and 2003

**The 2001 Bill:** Economic Growth and Tax Relief Reconciliation Act (EGTRRA)

**What it did:** Cut income tax rates across all brackets, doubled the child tax credit, reduced the estate tax, and created new retirement savings incentives. Estimated 10-year cost: $1.35 trillion.

**The 2003 Bill:** Jobs and Growth Tax Relief Reconciliation Act (JGTRRA)

**What it did:** Accelerated the 2001 cuts, reduced capital gains and dividend tax rates to 15%.

Both passed via **budget reconciliation** (only 51 votes needed in the Senate), the same procedural tool later used for the ACA and the 2017 Tax Cuts.

**What actually happened:** Revenue fell sharply (as a % of GDP) while spending increased. The surplus vanished by 2002. The deficit grew every year through 2004. The economy eventually recovered from the 2001 recession, but job creation was the weakest of any modern expansion — earning it the nickname "the jobless recovery."

**The other shoe:** When combined with two wars and Medicare Part D (all unpaid-for), Bush-era fiscal policy added roughly $5 trillion to the debt. Revenue as a share of GDP fell from 19.8% (2000) to 16.1% (2004) — the largest revenue decline in modern history outside of recessions.

---

#### Obama Era: The Stimulus Fight and the Gridlock That Followed

**The Bill:** American Recovery and Reinvestment Act of 2009 (ARRA)

**What it did:** $831 billion in tax cuts ($288B), spending on infrastructure/energy/education ($499B), and aid to states ($44B). It was the largest fiscal stimulus in American history at the time.

**The Votes:**

| Chamber | Yea | Nay | Republican Yeas |
|---------|-----|-----|----------------|
| **House** | 244 | 188 | **0** |
| **Senate** | 60 | 38 | **3** (Collins, Snowe, Specter) |

Zero Republicans voted for it in the House. Only 3 Senate Republicans crossed over (and Arlen Specter later switched parties entirely).

**The ACA Fight:** The Affordable Care Act passed in March 2010 with:

| Chamber | Yea | Nay | Republican Yeas |
|---------|-----|-----|----------------|
| **House** | 219 | 212 | **0** |
| **Senate** | 60 | 39 | **0** |

Again, zero Republican votes in either chamber. The ACA was the most consequential healthcare legislation since Medicare (1965) and it passed on pure party-line votes.

**Then came gridlock.** After Republicans won the House in 2010, Obama's legislative agenda effectively ended. The next 6 years produced:
- The 2011 debt ceiling crisis (nearly caused a default)
- Sequestration (automatic spending cuts neither party wanted)
- Multiple government shutdown threats
- Zero major economic legislation

**The lesson:** Obama's legislative window was exactly 2 years. Everything consequential happened in 2009–2010. The remaining 6 years were governance by executive order and Fed policy.

*Sources: Congress.gov (House Vote #46, 111th-1 — ARRA House; Senate Vote #64, 111th-1 — ARRA Senate; House Vote #165, 111th-2 — ACA House; Senate Vote #396, 111th-1 — ACA Senate)*

---

#### Trump I Era: The Tax Cuts — Passed Exclusively by Republicans

**The Bill:** Tax Cuts and Jobs Act of 2017 (H.R. 1)

**What it did:** Cut the corporate tax rate from 35% to 21% (permanent), cut individual rates (temporary, expire 2025), doubled the standard deduction, capped state and local tax (SALT) deductions at $10,000, and repealed the ACA individual mandate.

**The Votes:**

| Chamber | Yea | Nay | Crossover |
|---------|-----|-----|-----------|
| **House** | 224 | 201 | **0 Democrats Yes, 12 Republicans No** |
| **Senate** | 51 | 48 | **0 Democrats Yes, 0 Republicans No** |

Perfectly party-line in the Senate. A few Republicans in high-tax states (NY, NJ, CA) voted no in the House due to the SALT cap.

**The CARES Act was different.** When COVID hit, Congress passed the $2.2 trillion CARES Act with overwhelming bipartisan support:

| Chamber | Yea | Nay | Bipartisan? |
|---------|-----|-----|-------------|
| **House** | 363 | 40 | **Yes — 223 D, 140 R** |
| **Senate** | 96 | 0 | **Unanimous** |

This was the most bipartisan major legislation since 9/11. When the crisis was existential enough, both parties cooperated. The contrast with the tax cut vote (zero crossover) illustrates a pattern: **fiscal expansion for crisis gets bipartisan support, fiscal expansion by choice does not.**

*Sources: Congress.gov (House Vote #699, 115th-1 — TCJA House; Senate Vote #323, 115th-1 — TCJA Senate; House Vote #102, 116th-2 — CARES House; Senate Vote #80, 116th-2 — CARES Senate)*

---

#### Biden Era: The Narrowest of Majorities

Biden's Congress was the most narrowly divided in modern history. His entire legislative agenda depended on a 50-50 Senate where VP Harris provided the tiebreaking vote — meaning a single Democratic senator (Joe Manchin of West Virginia or Kyrsten Sinema of Arizona) could kill any bill.

**What passed (and how):**

| Law | Year | Senate Vote | House Vote | Bipartisan? |
|-----|------|------------|------------|-------------|
| American Rescue Plan ($1.9T) | 2021 | 50-49 | 220-211 | **No** — zero R votes |
| Infrastructure Investment & Jobs Act ($1.2T) | 2021 | 69-30 | 228-206 | **Yes** — 19 R senators |
| CHIPS and Science Act ($280B) | 2022 | 64-33 | 243-187 | **Yes** — 17 R senators |
| Inflation Reduction Act ($400B+) | 2022 | 51-50 (VP) | 220-207 | **No** — zero R votes |
| Respect for Marriage Act | 2022 | 61-36 | 258-169 | **Yes** — 12 R senators |

**The pattern:** Biden's most expensive bills (ARP, IRA) passed on pure party-line votes. His infrastructure and manufacturing bills got genuine Republican support. This mirrors the Clinton/Obama pattern — fiscal policy (taxes and spending) is partisan, but physical investment can be bipartisan.

**The Manchin Factor:** Joe Manchin single-handedly killed Build Back Better ($3.5T → $0), then negotiated it down to the Inflation Reduction Act ($400B) on his own terms. One senator from a state of 1.8 million people shaped the entire fiscal agenda of a presidency. This is the power of narrow majorities.

---

### How Federal Spending Shifted

Where the government actually spends money changed dramatically across these presidencies:

| Agency | FY 2017 (Trump start) | FY 2025 (Trump II start) | Change |
|--------|----------------------|-------------------------|--------|
| **Health & Human Services** | $1.21T | $2.02T | **+67%** |
| **Social Security** | $991B | $1.63T | **+65%** |
| **Defense** | $328B | $501B | +53% |
| **Veterans Affairs** | $203B | $288B | +42% |
| **Agriculture** | $124B | $185B | +50% |
| **Transportation** | $68B | $135B | **+98%** |
| **Energy** | $32B | $81B | **+153%** |
| **Homeland Security** | $29B | $73B | **+152%** |

HHS and Social Security account for over **$3.6 trillion** of the ~$5.3 trillion in agency-level spending shown here. These programs — Medicare, Medicaid, ACA subsidies, Social Security — are driven primarily by demographics (aging population) and healthcare costs, not by any single president's policy choices.

Transportation and Energy spending roughly doubled — reflecting the bipartisan Infrastructure Act and Biden's clean energy investments through the IRA and CHIPS Act.

*Source: USAspending.gov spending by agency, FY 2017 vs FY 2025*

---

### The Productivity Paradox

Worker productivity — how much economic output each worker generates per hour — is ultimately what determines long-term living standards. It's the one metric that transcends presidential terms.

| Period | Productivity Index (OPHNFB) | Annualized Growth |
|--------|---------------------------|-------------------|
| Q1 1993 (Clinton start) | 61.9 | — |
| Q1 2001 (Clinton end) | 72.9 | **+2.1%/yr** |
| Q1 2009 (Bush end) | ~85.0 (est.) | +1.9%/yr |
| Q1 2017 (Obama end) | ~95.0 (est.) | +1.4%/yr |
| Q1 2021 (Trump I end) | ~105.0 (est.) | +2.5%/yr |
| Q3 2025 (latest) | 118.0 | +2.9%/yr |

**Key insight:** Productivity growth was strongest in the late 1990s (Clinton, dot-com revolution), slowed during Obama's recovery (lots of jobs being added, but lower-productivity jobs), and accelerated sharply after COVID. The post-COVID productivity surge is one of the most underreported economic stories of the 2020s — driven by remote work efficiencies, AI adoption, and the elimination of low-productivity businesses that didn't survive the pandemic.

If this trend holds, it has the potential to outweigh all the fiscal problems (debt, deficits, aging population) documented above — because higher productivity means more output per worker means more tax revenue per worker means the debt becomes more manageable.

*Source: FRED OPHNFB (Nonfarm Business Sector: Output Per Hour of All Persons, BLS)*

---

## Additional Metrics & Correlations

The headline numbers (GDP, jobs, unemployment) only tell part of the story. These additional metrics reveal how the economy *felt* to ordinary Americans under each president.

### Real Median Household Income (Inflation-Adjusted)

This is arguably the most important number — it measures what the *typical* American family actually earned, adjusted for inflation.

| President | Start | End | Change |
|-----------|-------|-----|--------|
| **Clinton** | $62,700 (1993) | $70,610 (2001) | **+$7,910 (+12.6%)** |
| Bush | $70,610 (2001) | $70,070 (2009) | -$540 (-0.8%) |
| Obama | $70,070 (2009) | $76,710 (2017) | +$6,640 (+9.5%) |
| Trump I | $76,710 (2017) | $81,270 (2021) | +$4,560 (+5.9%) |
| Biden | $81,270 (2021) | $83,730 (2024) | +$2,460 (+3.0%)* |

\* Biden's figure uses 2024 data (latest available). Note that real income *fell* in 2022 ($79,500) due to inflation before recovering.

**Key insight:** Clinton and Obama delivered the largest real income gains. Bush's 8 years produced essentially zero real income growth. Trump I saw gains, but much was pre-COVID. Biden's term saw real income fall then recover — ending slightly above where it started, but the *experience* of losing purchasing power in 2021–2022 dominated public perception.

*Source: FRED MEHOINUSA672N (Real Median Household Income, 2024 CPI-U-RS adjusted dollars)*

---

### Housing Affordability (Median Home Sale Price)

| President | Start | End | Change |
|-----------|-------|-----|--------|
| Clinton | $125,000 (Q1 1993) | $169,800 (Q1 2001) | +$44,800 (+35.8%) |
| Bush | $169,800 (Q1 2001) | $220,900 (Q1 2009) | +$51,100 (+30.1%)* |
| Obama | $220,900 (Q1 2009) | $318,200 (Q1 2017) | +$97,300 (+44.0%) |
| Trump I | $318,200 (Q1 2017) | $367,800 (Q1 2021) | +$49,600 (+15.6%) |
| Biden | $367,800 (Q1 2021) | $423,100 (Q1 2025) | +$55,300 (+15.0%) |

\* Bush-era prices peaked at $329,200 (Q2 2007) before the bubble burst. The $220,900 figure reflects the post-crash price.

**Key insight:** Home prices have risen under every president, but the acceleration under Obama and Biden was particularly steep. When combined with rising mortgage rates (from ~3% in 2021 to ~7% in 2023–2025), housing affordability deteriorated dramatically under Biden even though the price increase was comparable to Trump I's in percentage terms.

*Source: FRED MSPUS (Median Sales Price of Houses Sold, Census Bureau/HUD)*

---

### Labor Force Participation Rate

This measures what percentage of working-age Americans are either employed or actively looking for work. A declining rate means people are *leaving* the workforce — retiring, going on disability, becoming discouraged, or choosing not to work.

| President | Start | End | Change |
|-----------|-------|-----|--------|
| **Clinton** | 66.2% | **67.1%** | **+0.9pp** |
| Bush | 67.1% | 65.8% | -1.3pp |
| Obama | 65.8% | 62.9% | -2.9pp |
| Trump I | 62.9% | 61.4% | -1.5pp |
| Biden | 61.4% | 62.5% | +1.1pp |
| Trump II* | 62.5% | 62.5% | 0.0pp |

**Key insight:** Clinton was the only president to see participation *rise*. It has declined nearly 5 percentage points since its peak (67.3% in 2000). This is the hidden story behind low unemployment numbers — if those people were still looking for jobs, the unemployment rate would be significantly higher. Obama's large decline partially reflects baby boomer retirements beginning in earnest. Biden partially reversed the COVID-era decline but not fully.

*Source: FRED CIVPART (Civilian Labor Force Participation Rate, BLS)*

---

### Federal Debt Interest Costs

How much taxpayers pay just to service the national debt — money that buys no services, builds no roads, and funds no programs.

| Period | Quarterly Interest (Billions) | Annual Rate |
|--------|-------------------------------|-------------|
| Q1 1993 (Clinton start) | $310.8B annualized | — |
| Q1 2001 (Bush start) | $345.5B annualized | — |
| Q1 2009 (Obama start) | $326.8B annualized | — |
| Q1 2017 (Trump I start) | $362.2B annualized | — |
| Q1 2021 (Biden start) | ~$350B annualized | — |
| **2025** | **~$1.1T+ annualized** | **3.35%** |

**Key insight:** Interest costs on the debt have *tripled* since 2021, driven by the combination of (1) much higher debt levels ($36T+ vs $28T) and (2) much higher interest rates (4.33% fed funds vs 0.08%). The average interest rate on marketable Treasury debt is now 3.35%. At $38.8T in total debt, interest costs now exceed defense spending. This is the fiscal time bomb that every future president inherits.

*Sources: FRED A091RC1Q027SBEA (Federal Government Interest Payments, BEA), Treasury avg_interest_rates*

---

### Deficit Trajectory Year by Year (% of GDP)

This is the most comprehensive single measure of fiscal responsibility — it shows whether the government is living within its means relative to the size of the economy.

| Year | Deficit/GDP | President | Context |
|------|-----------|-----------|--------|
| 1993 | -3.72% | Clinton | Inherited deficit |
| 1994 | -2.79% | Clinton | Tax increase takes effect |
| 1997 | -0.26% | Clinton | Near balance |
| **1998** | **+0.76%** | **Clinton** | **First surplus since 1969** |
| **2000** | **+2.30%** | **Clinton** | **Peak surplus** |
| 2001 | +1.21% | Bush | Inherited surplus |
| 2002 | -1.44% | Bush | 9/11 + tax cuts |
| 2004 | -3.38% | Bush | Wars + tax cuts peak |
| 2007 | -1.11% | Bush | Housing boom revenue |
| **2009** | **-9.76%** | **Bush/Obama** | **Financial crisis** |
| 2010 | -8.60% | Obama | Stimulus peak |
| 2013 | -4.03% | Obama | Sequestration kicks in |
| 2016 | -3.11% | Obama | Exit deficit |
| 2017 | -3.39% | Trump I | Inherited deficit |
| 2018 | -3.77% | Trump I | Tax cuts reduce revenue |
| 2019 | -4.57% | Trump I | Deficit rising pre-COVID |
| **2020** | **-14.65%** | **Trump I** | **COVID — largest peacetime deficit ever** |
| 2021 | -11.70% | Biden | COVID aftermath |
| 2022 | -5.28% | Biden | Rapid improvement |
| 2023 | -6.10% | Biden | Partially reversed |
| 2024 | -6.20% | Biden | Essentially flat |
| 2025 | -5.77% | Biden/Trump II | Exit deficit |

**Key insight:** Only Clinton achieved a surplus. Every other president left office with a deficit. The deficit was *already rising* under Trump before COVID hit (from -3.39% in 2017 to -4.57% in 2019), driven by the 2017 tax cuts reducing revenue while spending held constant. Obama and Biden both inherited large deficits and reduced them significantly, but never came close to balance.

*Source: FRED FYFSGDA188S (Federal Surplus or Deficit as % of GDP)*

---

## Cross-Cutting Correlations

When you look across all the data sources together, several patterns emerge that no single metric captures:

### 1. The "Inheritance Tax" — Starting Position Predicts Outcomes

Presidents who inherited crises (Obama, Biden) showed the largest *improvements* in unemployment and jobs — because they started from catastrophic baselines. Presidents who inherited healthy economies (Bush, Trump I) showed the largest *deteriorations* — because crises struck during their terms. **Starting position explains more variance in outcomes than policy does.**

### 2. The Fed Matters More Than the President

| President | Fed Chair(s) | Rate Direction | What Happened |
|-----------|-------------|---------------|---------------|
| Clinton | Greenspan | Accommodative → tightening | Longest expansion ever |
| Bush | Greenspan → Bernanke | Slashed to near-zero | Bubble → bust |
| Obama | Bernanke → Yellen | Held near zero (QE1-3) | Slow recovery, asset inflation |
| Trump I | Yellen → Powell | Raised then slashed (COVID) | Strong then collapse then recovery |
| Biden | Powell | 0% → 5.33% (fastest hike since 1980s) | Inflation killed then soft landing |

The correlation between Fed policy and economic outcomes is stronger than the correlation between presidential policy and outcomes.

### 3. Divided Government Correlates with Fiscal Discipline

| Government Type | Average Deficit Change |
|----------------|----------------------|
| **Divided** (Clinton 1995–2001, Obama 2011–2017) | Deficit *improved* |
| **Unified** (Bush 2001–2007, Trump 2017–2019, Biden 2021–2023) | Deficit *worsened* |

When one party controls everything, they spend (or cut taxes) without restraint. When compromise is forced, fiscal outcomes improve. This is the strongest pattern in the data.

### 4. Real Income Growth ≠ GDP Growth

| President | GDP Growth | Real Median Income Growth |
|-----------|-----------|-------------------------|
| Clinton | +55.6% | +12.6% |
| Bush | +37.8% | -0.8% |
| Obama | +32.3% | +9.5% |
| Trump I | +15.7% | +5.9% |
| Biden | +35.0% | +3.0% |

Bush grew GDP by 37.8% but the median household *lost* purchasing power. Biden grew GDP by 35% but median households gained only 3%. GDP growth does not automatically translate to prosperity for typical families. The gap between GDP and real income is a measure of *who captured the gains* — corporations, investors, and the wealthy vs. median wage earners.

### 5. Housing Prices vs. Income — The Affordability Squeeze

| President | Home Price Growth | Real Income Growth | Gap |
|-----------|------------------|-------------------|-----|
| Clinton | +35.8% | +12.6% | 23.2pp |
| Bush | +30.1% | -0.8% | 30.9pp |
| Obama | +44.0% | +9.5% | 34.5pp |
| Trump I | +15.6% | +5.9% | 9.7pp |
| Biden | +15.0% | +3.0% | 12.0pp |

Home prices have outpaced income under *every single president*. The cumulative effect: a home that cost 2x median income in 1993 now costs roughly 5x median income. This is the slow-motion affordability crisis that spans all administrations.

### 6. Debt Growth Is Accelerating Regardless of Party

| President | Debt Added | Annual Rate |
|-----------|-----------|------------|
| Clinton (8 yr) | +$1.38T | +$173B/yr |
| Bush (8 yr) | +$4.90T | +$613B/yr |
| Obama (8 yr) | +$9.31T | +$1,164B/yr |
| Trump I (4 yr) | +$7.85T | +$1,963B/yr |
| Biden (4 yr) | +$8.43T | +$2,108B/yr |
| Trump II (13 mo) | +$2.55T | +$2,354B/yr** |

The annual rate of debt accumulation has increased under every single president regardless of party. The trajectory is exponential, not linear. At the current pace, debt will exceed $40T before 2027 and interest costs will continue consuming a growing share of the federal budget.

---

## What Was Congress Doing?

A critical pattern emerges when you map economic outcomes to Congressional control:

**The balanced budgets of the 1990s** happened under Clinton (D) + Gingrich (R) divided government.

**The largest deficits** happened under unified party control responding to crises — Bush's wars (unified R), Obama's financial crisis (unified D), Trump's COVID (unified R then divided), Biden's COVID aftermath (barely unified D).

**The periods of fiscal discipline** (deficit reduction) have historically occurred during **divided government** — when neither party can get everything it wants and compromise is forced.

---

## The Honest Assessment

**There is no clear "party of the economy."** The data over 32 years shows:

- The best job creation, GDP growth, stock market, and fiscal discipline: **Clinton** (D)
- The worst job creation and stock market: **Bush** (R) — but he faced 9/11 and the Great Financial Crisis
- The largest debt increases: **Obama** (D) and **Trump** (R) — both facing crises they didn't cause
- The best post-crisis recovery: **Obama/Biden** — but that's partly inheriting low baselines
- The strongest pre-crisis economy: **Trump** (R) through Feb 2020 — but it was partly fueled by deficit spending

**Every president benefited or suffered from forces beyond their control:**

| President | External Shock | Impact |
|-----------|---------------|--------|
| Clinton | Dot-com boom | Inflated revenue, artificial surplus |
| Bush | 9/11 + Housing bubble collapse | Reshaped all spending priorities, financial crisis |
| Obama | Inherited Great Recession | Every metric started from catastrophe |
| Trump I | COVID-19 pandemic | Erased all pre-pandemic gains in 2 months |
| Biden | Post-COVID inflation + Ukraine war | Strong numbers but eroded purchasing power |

The most defensible takeaway from 32 years of data: **who controls Congress matters as much as who's president, and external events matter more than either.**

*Sources: FRED (GDP, UNRATE, PAYEMS, CPIAUCSL, FEDFUNDS, SP500, FYFSGDA188S, GFDEBTN), Treasury Fiscal Data (debt_to_penny), Federal Register (executive orders), Congress.gov (recent laws)*