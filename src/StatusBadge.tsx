import React from 'react';

interface StatusBadgeProps {
  status?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status = "Under Review" }) => {
  return (
    <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 w-fit">
      <span className="material-symbols-outlined text-[16px]">warning</span>
      Status: {status}
    </div>
  );
};