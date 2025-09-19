import React from 'react';

interface SectionContainerProps {
  children: React.ReactNode;
  className?: string;
}

export const SectionContainer = ({ children, className = '' }: SectionContainerProps) => {
  return (
    <div className={`w-full h-full max-w-7xl mx-auto flex flex-col ${className}`}>
      {children}
    </div>
  );
};

interface SectionHeaderProps {
  title: string;
  description?: string;
  icon?: string;
  className?: string;
}

export const SectionHeader = ({ title, description, icon, className = '' }: SectionHeaderProps) => {
  return (
    <div className={`bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700 p-4 ${className}`}>
      <div className="flex items-center gap-3">
        {icon && <span className="text-2xl">{icon}</span>}
        <div>
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          {description && (
            <p className="text-sm text-slate-300 mt-1">{description}</p>
          )}
        </div>
      </div>
    </div>
  );
};

interface SectionContentProps {
  children: React.ReactNode;
  className?: string;
}

export const SectionContent = ({ children, className = '' }: SectionContentProps) => {
  return (
    <div className={`flex-1 overflow-hidden bg-slate-900 ${className}`}>
      {children}
    </div>
  );
};

interface SectionControlsProps {
  children: React.ReactNode;
  className?: string;
}

export const SectionControls = ({ children, className = '' }: SectionControlsProps) => {
  return (
    <div className={`bg-slate-800 border-t border-slate-700 p-4 ${className}`}>
      {children}
    </div>
  );
};
