import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from 'recharts';
import { ChevronDown, ChevronRight } from 'lucide-react';

// Types
interface Account {
  id: string;
  name: string;
  type: 'pre-tax' | 'roth' | 'taxable' | 'hsa';
  balance: number;
  contribution: number;
  employerMatch: number;
  returnRate: number;
}

interface PersonalProfile {
  currentAge: number;
  retirementAge: number;
  lifeExpectancy: number;
  filingStatus: 'single' | 'married';
  annualSpending: number;
  socialSecurityAge: number;
  socialSecurityMonthly: number;
}

interface EconomicAssumptions {
  inflation: number;
  contributionGrowth: number;
  stateIncomeTax: number;
}

// Tax Constants
const FEDERAL_BRACKETS = {
  single: [[11600,0.10],[47150,0.12],[100525,0.22],[191950,0.24],[243725,0.32],[609350,0.35],[Infinity,0.37]],
  married: [[23200,0.10],[94300,0.12],[201050,0.22],[383900,0.24],[487450,0.32],[731200,0.35],[Infinity,0.37]]
};

const DEDUCTION = { single: 14600, married: 29200 };
const CAP_GAINS = {
  single: [[47025,0],[518900,0.15],[Infinity,0.20]],
  married: [[94050,0],[583750,0.15],[Infinity,0.20]]
};

const RMD = [
  [73,26.5],[74,25.5],[75,24.6],[76,23.7],[77,22.9],[78,22.0],[79,21.1],[80,20.2],
  [81,19.4],[82,18.5],[83,17.7],[84,16.8],[85,16.0],[86,15.2],[87,14.4],[88,13.7],
  [89,12.9],[90,12.2],[91,11.5],[92,10.8],[93,10.1],[94,9.5],[95,8.9],[96,8.4],
  [97,7.8],[98,7.3],[99,6.8],[100,6.4]
];

// Tax Functions
const calcTax = (income: number, brackets: any[], deduction: number) => {
  const taxable = Math.max(0, income - deduction);
  let tax = 0, prev = 0;
  for (const [limit, rate] of brackets) {
    const amt = Math.min(taxable, limit) - prev;
    if (amt <= 0) break;
    tax += amt * rate;
    prev = limit;
  }
  return tax;
};

const calcCapGains = (gains: number, brackets: any[]) => {
  let tax = 0, prev = 0;
  for (const [limit, rate] of brackets) {
    const amt = Math.min(gains, limit) - prev;
    if (amt <= 0) break;
    tax += amt * rate;
    prev = limit;
  }
  return tax;
};

const calcSSTax = (ss: number, other: number, status: string) => {
  const t1 = status === 'married' ? 32000 : 25000;
  const t2 = status === 'married' ? 44000 : 34000;
  const combined = other + ss * 0.5;
  if (combined > t2) return Math.min(ss * 0.85, ss);
  if (combined > t1) return Math.min(ss * 0.5, ss);
  return 0;
};

const calcRMD = (bal: number, age: number) => {
  const entry = RMD.find(([a]) => a === age);
  return entry && age >= 73 ? bal / entry[1] : 0;
};

// Projection Engine
const projectAccumulation = (accounts: Account[], profile: PersonalProfile, econ: EconomicAssumptions) => {
  const projections: any[] = [];
  const bal: any = {}, contrib: any = {};
  accounts.forEach(a => { bal[a.id] = a.balance; contrib[a.id] = a.contribution; });
  
  for (let age = profile.currentAge; age < profile.retirementAge; age++) {
    let match = 0, total = 0;
    accounts.forEach(a => {
      bal[a.id] *= (1 + a.returnRate);
      bal[a.id] += contrib[a.id];
      total += contrib[a.id];
      if (a.employerMatch > 0) {
        const m = contrib[a.id] * a.employerMatch;
        bal[a.id] += m;
        match += m;
        total += m;
      }
      contrib[a.id] *= (1 + econ.contributionGrowth);
    });
    
    projections.push({
      age,
      ...Object.fromEntries(accounts.map(a => [a.name, bal[a.id]])),
      total: Object.values(bal).reduce((s: any, v: any) => s + v, 0)
    });
  }
  return projections;
};

const projectRetirement = (accounts: Account[], profile: PersonalProfile, econ: EconomicAssumptions, startBal: any) => {
  const years: any[] = [];
  const bal = { ...startBal };
  let spending = profile.annualSpending;
  
  for (let age = profile.retirementAge; age <= profile.lifeExpectancy; age++) {
    const ss = age >= profile.socialSecurityAge ? profile.socialSecurityMonthly * 12 : 0;
    const withdrawals: any = {};
    let needed = spending - ss;
    
    // RMDs
    const preTax = accounts.filter(a => a.type === 'pre-tax');
    let rmd = 0;
    preTax.forEach(a => { rmd += calcRMD(bal[a.id] || 0, age); });
    
    // Withdraw: taxable, pre-tax, roth
    accounts.filter(a => a.type === 'taxable').forEach(a => {
      const w = Math.min(needed, bal[a.id] || 0);
      withdrawals[a.id] = w;
      needed -= w;
    });
    
    preTax.forEach(a => {
      const r = calcRMD(bal[a.id] || 0, age);
      const w = Math.max(r, Math.min(needed + r, bal[a.id] || 0));
      withdrawals[a.id] = w;
      needed -= (w - r);
    });
    
    accounts.filter(a => a.type === 'roth').forEach(a => {
      const w = Math.min(needed, bal[a.id] || 0);
      withdrawals[a.id] = w;
      needed -= w;
    });
    
    const totalW = Object.values(withdrawals).reduce((s: any, v: any) => s + v, 0);
    const preTaxW = preTax.reduce((s, a) => s + (withdrawals[a.id] || 0), 0);
    const taxableW = accounts.filter(a => a.type === 'taxable').reduce((s, a) => s + (withdrawals[a.id] || 0), 0);
    const capGains = taxableW * 0.3;
    
    const taxableSS = calcSSTax(ss, preTaxW, profile.filingStatus);
    const ordIncome = preTaxW + taxableSS;
    const fedTax = calcTax(ordIncome, FEDERAL_BRACKETS[profile.filingStatus], DEDUCTION[profile.filingStatus]) +
                   calcCapGains(capGains, CAP_GAINS[profile.filingStatus]);
    const stateTax = ordIncome * econ.stateIncomeTax;
    const totalTax = fedTax + stateTax;
    
    const gross = totalW + ss;
    const afterTax = gross - totalTax;
    
    // Update balances
    accounts.forEach(a => {
      bal[a.id] = (bal[a.id] || 0) - (withdrawals[a.id] || 0);
      bal[a.id] *= (1 + a.returnRate);
      bal[a.id] = Math.max(0, bal[a.id]);
    });
    
    years.push({
      age,
      spending,
      withdrawal: totalW,
      ss,
      gross,
      fedTax,
      stateTax,
      totalTax,
      afterTax,
      ...Object.fromEntries(accounts.map(a => [a.name, bal[a.id]])),
      total: Object.values(bal).reduce((s: any, v: any) => s + v, 0),
      effectiveRate: gross > 0 ? (totalTax / gross) * 100 : 0
    });
    
    spending *= (1 + econ.inflation);
  }
  return years;
};

export default function RetirementPlanner() {
  const [accounts, setAccounts] = useState<Account[]>([
    { id: '401k', name: '401(k)', type: 'pre-tax', balance: 150000, contribution: 23000, employerMatch: 0.5, returnRate: 0.07 },
    { id: 'roth', name: 'Roth IRA', type: 'roth', balance: 80000, contribution: 7000, employerMatch: 0, returnRate: 0.07 },
    { id: 'taxable', name: 'Brokerage', type: 'taxable', balance: 50000, contribution: 10000, employerMatch: 0, returnRate: 0.06 },
    { id: 'hsa', name: 'HSA', type: 'hsa', balance: 15000, contribution: 4150, employerMatch: 0, returnRate: 0.06 }
  ]);
  
  const [profile, setProfile] = useState<PersonalProfile>({
    currentAge: 35, retirementAge: 65, lifeExpectancy: 95, filingStatus: 'married',
    annualSpending: 80000, socialSecurityAge: 67, socialSecurityMonthly: 3000
  });
  
  const [econ, setEcon] = useState<EconomicAssumptions>({
    inflation: 0.03, contributionGrowth: 0.02, stateIncomeTax: 0.05
  });
  
  const [tab, setTab] = useState('summary');
  const [expanded, setExpanded] = useState({ accounts: true, profile: true, econ: true });
  const [subTab, setSubTab] = useState({ accum: 'chart', retire: 'chart' });
  
  useEffect(() => {
    const saved = localStorage.getItem('retirementPlanner');
    if (saved) {
      const data = JSON.parse(saved);
      if (data.accounts) setAccounts(data.accounts);
      if (data.profile) setProfile(data.profile);
      if (data.econ) setEcon(data.econ);
    }
  }, []);
  
  useEffect(() => {
    localStorage.setItem('retirementPlanner', JSON.stringify({ accounts, profile, econ }));
  }, [accounts, profile, econ]);
  
  const accumData = useMemo(() => projectAccumulation(accounts, profile, econ), [accounts, profile, econ]);
  
  const retireBal = useMemo(() => {
    if (!accumData.length) return {};
    const last = accumData[accumData.length - 1];
    const bal: any = {};
    accounts.forEach(a => { bal[a.id] = last[a.name] || 0; });
    return bal;
  }, [accumData, accounts]);
  
  const retireData = useMemo(() => projectRetirement(accounts, profile, econ, retireBal), [accounts, profile, econ, retireBal]);
  
  const totalRet = Object.values(retireBal).reduce((s: any, v: any) => s + v, 0);
  const preTaxRet = accounts.filter(a => a.type === 'pre-tax').reduce((s, a) => s + (retireBal[a.id] || 0), 0);
  const rothRet = accounts.filter(a => a.type === 'roth').reduce((s, a) => s + (retireBal[a.id] || 0), 0);
  const taxableRet = accounts.filter(a => a.type !== 'pre-tax' && a.type !== 'roth').reduce((s, a) => s + (retireBal[a.id] || 0), 0);
  const lifetimeTax = retireData.reduce((s, y) => s + y.totalTax, 0);
  const monthlyW = retireData[0]?.spending / 12 || 0;
  const longevity = retireData.find(y => y.total < 1000) ? `Depletes at ${retireData.find(y => y.total < 1000)?.age}` : 'Never Depletes';
  
  const fmt = (v: number) => `$${(v/1000).toFixed(0)}k`;
  const fmtPct = (v: number) => `${(v*100).toFixed(1)}%`;
  
  const COLORS: any = { '401(k)': '#3b82f6', 'Roth IRA': '#10b981', 'Brokerage': '#f59e0b', 'HSA': '#8b5cf6' };

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100">
      <div className="w-80 bg-gray-900 border-r border-gray-800 overflow-y-auto p-6">
        <h1 className="text-2xl font-bold mb-6 text-blue-400">Retirement Planner</h1>
        
        <div className="mb-6">
          <button onClick={() => setExpanded(p => ({...p, accounts: !p.accounts}))} className="flex items-center justify-between w-full font-semibold mb-3">
            <span>Investment Accounts</span>
            {expanded.accounts ? <ChevronDown size={20}/> : <ChevronRight size={20}/>}
          </button>
          {expanded.accounts && accounts.map(a => (
            <div key={a.id} className="bg-gray-800 p-3 rounded mb-3">
              <div className="font-medium mb-2">{a.name}</div>
              <div className="space-y-2 text-sm">
                <div><label className="text-gray-400">Balance</label>
                  <input type="number" value={a.balance} onChange={e => setAccounts(accounts.map(x => x.id === a.id ? {...x, balance: +e.target.value} : x))} className="w-full bg-gray-700 px-2 py-1 rounded mt-1"/>
                </div>
                <div><label className="text-gray-400">Contribution</label>
                  <input type="number" value={a.contribution} onChange={e => setAccounts(accounts.map(x => x.id === a.id ? {...x, contribution: +e.target.value} : x))} className="w-full bg-gray-700 px-2 py-1 rounded mt-1"/>
                </div>
                <div><label className="text-gray-400">Return</label>
                  <input type="number" step="0.01" value={a.returnRate} onChange={e => setAccounts(accounts.map(x => x.id === a.id ? {...x, returnRate: +e.target.value} : x))} className="w-full bg-gray-700 px-2 py-1 rounded mt-1"/>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mb-6">
          <button onClick={() => setExpanded(p => ({...p, profile: !p.profile}))} className="flex items-center justify-between w-full font-semibold mb-3">
            <span>Personal Profile</span>
            {expanded.profile ? <ChevronDown size={20}/> : <ChevronRight size={20}/>}
          </button>
          {expanded.profile && (
            <div className="space-y-3 text-sm">
              {[['Current Age','currentAge'],['Retirement Age','retirementAge'],['Life Expectancy','lifeExpectancy'],['Annual Spending','annualSpending'],['SS Monthly','socialSecurityMonthly']].map(([label, key]) => (
                <div key={key}><label className="text-gray-400">{label}</label>
                  <input type="number" value={(profile as any)[key]} onChange={e => setProfile({...profile, [key]: +e.target.value})} className="w-full bg-gray-800 px-3 py-2 rounded mt-1"/>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="mb-6">
          <button onClick={() => setExpanded(p => ({...p, econ: !p.econ}))} className="flex items-center justify-between w-full font-semibold mb-3">
            <span>Economic Assumptions</span>
            {expanded.econ ? <ChevronDown size={20}/> : <ChevronRight size={20}/>}
          </button>
          {expanded.econ && (
            <div className="space-y-3 text-sm">
              {[['Inflation','inflation'],['Contribution Growth','contributionGrowth'],['State Tax','stateIncomeTax']].map(([label, key]) => (
                <div key={key}><label className="text-gray-400">{label}</label>
                  <input type="number" step="0.001" value={(econ as any)[key]} onChange={e => setEcon({...econ, [key]: +e.target.value})} className="w-full bg-gray-800 px-3 py-2 rounded mt-1"/>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <div className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex space-x-6">
          {['summary','accumulation','retirement','methodology'].map(t => (
            <button key={t} onClick={() => setTab(t)} className={`pb-2 border-b-2 ${tab === t ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400'}`}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        
        <div className="p-6">
          {tab === 'summary' && (
            <div className="space-y-6">
              <div className="grid grid-cols-4 gap-4">
                {[['Total at Retirement', totalRet, ''], ['Pre-Tax', preTaxRet, 'blue'], ['Roth', rothRet, 'green'], ['Taxable+HSA', taxableRet, 'orange']].map(([label, val, color]) => (
                  <div key={label as string} className={`bg-gray-900 p-4 rounded-lg border ${color ? `border-${color}-900` : 'border-gray-800'}`}>
                    <div className="text-gray-400 text-sm">{label}</div>
                    <div className={`text-2xl font-bold ${color ? `text-${color}-400` : ''}`}>{fmt(val as number)}</div>
                    {val !== totalRet && <div className="text-sm text-gray-500">{fmtPct((val as number)/totalRet)}</div>}
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-4 gap-4">
                {[['Monthly Withdrawal', fmt(monthlyW)], ['Annual Withdrawal', fmt(retireData[0]?.spending||0)], ['Portfolio Longevity', longevity], ['Lifetime Taxes', fmt(lifetimeTax)]].map(([label, val]) => (
                  <div key={label} className="bg-gray-900 p-4 rounded-lg">
                    <div className="text-gray-400 text-sm">{label}</div>
                    <div className="text-xl font-bold mt-1">{val}</div>
                  </div>
                ))}
              </div>
              
              <div className="bg-gray-900 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Portfolio Growth</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={accumData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151"/>
                    <XAxis dataKey="age" stroke="#9ca3af"/>
                    <YAxis stroke="#9ca3af" tickFormatter={v => `$${(v/1000).toFixed(0)}k`}/>
                    <Tooltip contentStyle={{backgroundColor: '#1f2937', border: 'none'}} formatter={(v: any) => fmt(v)}/>
                    <Legend/>
                    {accounts.map(a => <Area key={a.id} type="monotone" dataKey={a.name} stackId="1" stroke={COLORS[a.name]} fill={COLORS[a.name]}/>)}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          
          {tab === 'accumulation' && (
            <div className="space-y-6">
              <div className="flex gap-4 mb-4">
                {['chart','table'].map(t => (
                  <button key={t} onClick={() => setSubTab({...subTab, accum: t})} className={`px-4 py-2 rounded ${subTab.accum === t ? 'bg-blue-600' : 'bg-gray-800'}`}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
              
              {subTab.accum === 'chart' && (
                <div className="bg-gray-900 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">Account Growth (Age {profile.currentAge} → {profile.retirementAge})</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={accumData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151"/>
                      <XAxis dataKey="age" stroke="#9ca3af"/>
                      <YAxis stroke="#9ca3af" tickFormatter={v => `$${(v/1000).toFixed(0)}k`}/>
                      <Tooltip contentStyle={{backgroundColor: '#1f2937', border: 'none'}} formatter={(v: any) => fmt(v)}/>
                      <Legend/>
                      {accounts.map(a => <Area key={a.id} type="monotone" dataKey={a.name} stackId="1" stroke={COLORS[a.name]} fill={COLORS[a.name]}/>)}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
              
              {subTab.accum === 'table' && (
                <div className="bg-gray-900 p-6 rounded-lg overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-gray-700">{['Age','401(k)','Roth IRA','Brokerage','HSA','Total'].map(h => <th key={h} className="text-left p-2">{h}</th>)}</tr></thead>
                    <tbody>{accumData.map(row => <tr key={row.age} className="border-b border-gray-800"><td className="p-2">{row.age}</td>{accounts.map(a => <td key={a.id} className="p-2">{fmt(row[a.name])}</td>)}<td className="p-2 font-bold">{fmt(row.total)}</td></tr>)}</tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          
          {tab === 'retirement' && (
            <div className="space-y-6">
              <div className="flex gap-4 mb-4">
                {['chart','income','table'].map(t => (
                  <button key={t} onClick={() => setSubTab({...subTab, retire: t})} className={`px-4 py-2 rounded ${subTab.retire === t ? 'bg-blue-600' : 'bg-gray-800'}`}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
              
              {subTab.retire === 'chart' && (
                <div className="bg-gray-900 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">Portfolio Drawdown</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={retireData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151"/>
                      <XAxis dataKey="age" stroke="#9ca3af"/>
                      <YAxis stroke="#9ca3af" tickFormatter={v => `$${(v/1000).toFixed(0)}k`}/>
                      <Tooltip contentStyle={{backgroundColor: '#1f2937', border: 'none'}} formatter={(v: any) => fmt(v)}/>
                      <Legend/>
                      {accounts.map(a => <Area key={a.id} type="monotone" dataKey={a.name} stackId="1" stroke={COLORS[a.name]} fill={COLORS[a.name]}/>)}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
              
              {subTab.retire === 'income' && (
                <div className="bg-gray-900 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">Income & Taxes</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <ComposedChart data={retireData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151"/>
                      <XAxis dataKey="age" stroke="#9ca3af"/>
                      <YAxis stroke="#9ca3af" tickFormatter={v => `$${(v/1000).toFixed(0)}k`}/>
                      <Tooltip contentStyle={{backgroundColor: '#1f2937', border: 'none'}} formatter={(v: any) => fmt(v)}/>
                      <Legend/>
                      <Bar dataKey="withdrawal" fill="#3b82f6" name="Withdrawals"/>
                      <Line type="monotone" dataKey="afterTax" stroke="#10b981" name="After-Tax" strokeWidth={2}/>
                      <Line type="monotone" dataKey="totalTax" stroke="#ef4444" name="Taxes" strokeWidth={2}/>
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
              
              {subTab.retire === 'table' && (
                <div className="bg-gray-900 p-6 rounded-lg overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-gray-700">{['Age','Spending','Withdrawal','SS','Gross','Tax','After-Tax','Balance'].map(h => <th key={h} className="text-left p-2">{h}</th>)}</tr></thead>
                    <tbody>{retireData.map(row => <tr key={row.age} className="border-b border-gray-800"><td className="p-2">{row.age}</td><td className="p-2">{fmt(row.spending)}</td><td className="p-2">{fmt(row.withdrawal)}</td><td className="p-2">{fmt(row.ss)}</td><td className="p-2">{fmt(row.gross)}</td><td className="p-2">{fmt(row.totalTax)}</td><td className="p-2">{fmt(row.afterTax)}</td><td className="p-2 font-bold">{fmt(row.total)}</td></tr>)}</tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          
          {tab === 'methodology' && (
            <div className="bg-gray-900 p-6 rounded-lg space-y-6">
              <div><h3 className="text-lg font-semibold mb-2">Accumulation Phase</h3><p className="text-gray-400">For each year until retirement: (1) Apply investment returns to balances, (2) Add annual contributions, (3) Add employer match, (4) Increase contributions by growth rate.</p></div>
              <div><h3 className="text-lg font-semibold mb-2">Retirement Phase</h3><p className="text-gray-400">For each year in retirement: (1) Calculate RMDs (age 73+), (2) Withdraw from taxable accounts first, (3) Withdraw from pre-tax accounts second (including RMDs), (4) Withdraw from Roth accounts last, (5) Apply tax calculations, (6) Apply investment returns.</p></div>
              <div><h3 className="text-lg font-semibold mb-2">Tax System</h3><p className="text-gray-400">Federal income tax uses 2024 brackets with standard deduction. Capital gains taxed at 0%/15%/20% based on income. Social Security up to 85% taxable. State tax as flat percentage. RMDs calculated using IRS Uniform Lifetime Table starting age 73.</p></div>
              <div><h3 className="text-lg font-semibold mb-2">Assumptions</h3><p className="text-gray-400">All calculations are deterministic with no Monte Carlo simulation. Returns are constant annual rates. Inflation adjusts spending. No consideration of sequence of returns risk. Tax law assumed constant at 2024 levels.</p></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
