
# Retirement Planner

A fully client-side retirement planning application that models long-term portfolio growth, tax-optimized withdrawals, and retirement income using deterministic financial logic.

This project is designed to be **transparent, auditable, and realistic**, not a black-box calculator.

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

### Tax System

* 2024 U.S. federal tax brackets
* State tax (flat rate)
* Capital gains tax
* Social Security taxation
* Standard deduction
* RMD enforcement (age 73+)

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

## Tech Stack

* **React 19**
* **TypeScript**
* **Vite**
* **Tailwind CSS**
* **Recharts**
* **LocalStorage (persistence)**
* **Vitest / Jest (testing)**

No backend. No APIs. No external services.

---

## Project Structure

```
src/
├── components/
│   ├── AccountForm.tsx
│   ├── AccountList.tsx
│   ├── AssumptionsForm.tsx
│   ├── ChartAccumulation.tsx
│   ├── ChartDrawdown.tsx
│   ├── ChartIncome.tsx
│   ├── ChartTax.tsx
│   ├── ChartComposition.tsx
│   ├── DataTableAccumulation.tsx
│   ├── DataTableWithdrawal.tsx
│   ├── SummaryCards.tsx
│   ├── MethodologyPanel.tsx
│   └── Layout.tsx
│
├── hooks/
│   ├── useLocalStorage.ts
│   └── useRetirementCalc.ts
│
├── utils/
│   ├── projections.ts
│   ├── withdrawals.ts
│   ├── taxes.ts
│   └── constants.ts
│
├── types/
│   └── index.ts
│
├── tests/
│   └── calculations.test.ts
│
├── App.tsx
├── main.tsx
└── index.css
```

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

---

## Getting Started

### Prerequisites

* Node.js 18+
* npm or yarn

### Installation

```bash
git clone https://github.com/yourusername/retirement-planner.git
cd retirement-planner
npm install
```

### Run Locally

```bash
npm run dev
```

### Build for Production

```bash
npm run build
```

### Run Tests

```bash
npm test
```

---

## Design Philosophy

* Deterministic over predictive
* Transparent over clever
* Explainable over optimized
* Financially conservative assumptions
* No magic numbers
* No hidden logic

This is meant to be:

* Auditable
* Extendable
* Educational
* Practical

---

## Disclaimer

This tool is for **educational and planning purposes only**.

It does **not** provide financial, tax, or investment advice.
Tax laws vary by jurisdiction and change over time.

Always consult a licensed financial professional before making decisions.

---

## License

MIT License
Free to use, modify, and distribute.

