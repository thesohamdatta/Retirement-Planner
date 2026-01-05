
# Retirement Planner

A fully client-side retirement planning application that models long-term portfolio growth, tax-optimized withdrawals, and retirement income using deterministic financial logic.

Demo link :
https://claude.ai/public/artifacts/096ea927-cd52-4c03-b3ce-36778f070c6f
refresh page twice if Clicks aren't working 


<img width="1886" height="862" alt="Screenshot 2026-01-02 225130" src="https://github.com/user-attachments/assets/b961febb-cf54-4614-a218-751bc491466e" />

---

## Overview

This app helps users:

* Model retirement savings growth over time
* Simulate retirement withdrawals with tax optimization
* Understand tax impact year-by-year
* Visualize portfolio drawdown and income sustainability
* Inspect every calculation used in projections

It is built as a **pure frontend application** with no backend or APIs, making it easy to audit, fork, and extend.

---

## Key Features

### Investment Modeling

* Multiple account types:

  * Traditional 401(k)
  * Roth IRA
  * Taxable brokerage
  * HSA
* Employer match support
* Individual return assumptions per account
* Contribution growth over time

### Retirement Simulation

* Accumulation phase (pre-retirement)
* Withdrawal phase (retirement)
* Inflation-adjusted spending
* Social Security integration
* Required Minimum Distributions (RMDs)
* Portfolio longevity tracking

### Tax System(US data)

* 2024 U.S. federal tax brackets
* State tax (flat rate)
* Capital gains tax
* Social Security taxation
* Standard deduction
* RMD enforcement (age 73+)

<img width="1486" height="764" alt="image" src="https://github.com/user-attachments/assets/7315bcee-e0e9-4d4c-b8a7-7f5a5423f051" />
<img width="1891" height="857" alt="image" src="https://github.com/user-attachments/assets/989ed059-0cc9-4829-8486-e8a70683282b" />


### Visualization

* Portfolio growth (stacked)
* Retirement drawdown
* Income vs taxes
* Tax burden over time
* Account composition
* Expandable year-by-year tables

### Transparency

* All calculations exposed
* No hidden assumptions
* Deterministic outputs
* Methodology panel explaining formulas
* Full year-by-year breakdown

---


## How It Works

### Accumulation Phase

For each year until retirement:

1. Apply investment returns
2. Add contributions
3. Apply employer match
4. Increase contributions by growth rate
5. Store yearly balances

### Retirement Phase

For each retirement year:

1. Apply RMDs (if applicable)
2. Withdraw from accounts in tax-efficient order
3. Apply Social Security income
4. Calculate taxes
5. Update remaining balances
6. Track depletion or surplus

---

## Tax Logic

* Uses 2024 U.S. federal tax brackets
* Supports:

  * Ordinary income tax
  * Capital gains tax
  * State tax (flat rate)
  * Social Security taxation
* RMDs follow IRS Uniform Lifetime Table
* Roth withdrawals are tax-free
* All taxes calculated year-by-year


## License

MIT License
Free to use, modify, and distribute.

