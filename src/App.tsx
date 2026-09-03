import { useState } from 'react';
import { StatusBadge } from './StatusBadge';
import { HealthScoreGauge } from './HealthScoreGauge';
import { formatSuiBond } from './format';

export default function App() {
  // 控制演示的 3 个阶段
  const [demoStep, setDemoStep] = useState<1 | 2 | 3>(1);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* 顶部给评审看的 Demo 控制条 */}
      <header className="bg-slate-900 text-white p-3 flex justify-between items-center shadow-lg border-b border-slate-700">
        <div className="flex items-center gap-2">
          <span className="bg-blue-600 text-xs font-bold px-2 py-0.5 rounded">TrustLayer</span>
          <span className="text-sm font-semibold tracking-wide">Live Demo Presenter</span>
        </div>
        
        {/* 3 个核心 Demo 节点 */}
        <div className="flex gap-2 bg-slate-800 p-1 rounded-lg">
          <button
            onClick={() => setDemoStep(1)}
            className={`px-3 py-1 rounded text-xs font-semibold transition ${
              demoStep === 1 ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Step 1: Healthy Merchant
          </button>
          <button
            onClick={() => setDemoStep(2)}
            className={`px-3 py-1 rounded text-xs font-semibold transition ${
              demoStep === 2 ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Step 2: Risk Warning (Consumer)
          </button>
          <button
            onClick={() => setDemoStep(3)}
            className={`px-3 py-1 rounded text-xs font-semibold transition ${
              demoStep === 3 ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Step 3: Admin Slash Bond
          </button>
        </div>
      </header>

      {/* 核心展示主体 */}
      <main className="flex-1 p-8 max-w-4xl mx-auto w-full">
        {demoStep === 1 && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-800">Fitbook Checkout - Merchant Status</h2>
              <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-full">Verified</span>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Active Collateral Bond</p>
                <p className="text-xl font-extrabold text-slate-800">{formatSuiBond("2500000000")}</p>
              </div>
              <HealthScoreGauge score={95} />
            </div>
          </div>
        )}

        {demoStep === 2 && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-amber-200 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-800">Consumer View - Warning Alert</h2>
              <StatusBadge status="Under Review" />
            </div>
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-800 font-semibold">High Dispute Rate Detected!</p>
                <p className="text-xs text-amber-600 mt-1">Bond may be liquidated to compensate users.</p>
                <p className="text-lg font-bold text-slate-800 mt-2">Bond Pool: {formatSuiBond("2500000000")}</p>
              </div>
              <HealthScoreGauge score={38} />
            </div>
          </div>
        )}

        {demoStep === 3 && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-red-200 space-y-4">
            <h2 className="text-lg font-bold text-slate-800">Admin Control Panel</h2>
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-3">
              <p className="text-xs font-bold text-red-800">Action Required: Slashed Merchant Escrow</p>
              <p className="text-sm text-slate-700">Executing Sui Move Smart Contract: <code className="bg-red-100 px-1 rounded text-red-900 text-xs">slash_bond()</code></p>
              <button className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-lg text-sm transition">
                Confirm & Liquidate Bond ({formatSuiBond("2500000000")})
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}