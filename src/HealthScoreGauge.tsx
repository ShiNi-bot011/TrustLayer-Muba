import React from 'react';

interface HealthScoreProps {
  score?: number;
}

export const HealthScoreGauge: React.FC<HealthScoreProps> = ({ score = 38 }) => {
  return (
    <div className="relative flex items-center justify-center w-32 h-32">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="15.9155" fill="none" className="text-gray-200" stroke="currentColor" strokeWidth="3" />
        <circle 
          cx="18" cy="18" r="15.9155" fill="none" 
          className="text-red-600 transition-all duration-500" 
          stroke="currentColor" strokeWidth="3" 
          strokeDasharray={`${score}, 100`} 
          strokeLinecap="round" 
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <div className="text-3xl font-bold text-red-600 leading-none">{score}</div>
        <div className="text-xs text-gray-400">/ 100</div>
      </div>
    </div>
  );
};