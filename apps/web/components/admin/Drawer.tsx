"use client";
import React from 'react';

export function Drawer({ buttonLabel, title, children }: { buttonLabel: string; title: string; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);

  let content = children;
  if (React.isValidElement(children)) {
    content = React.cloneElement(children as React.ReactElement<any>, {
      onDone: () => setOpen(false),
    });
  }

  return (
    <div>
      <button 
        onClick={() => setOpen(true)} 
        className="btn btn-primary"
      >
        {buttonLabel}
      </button>
      
      {open && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
          />
          
          {/* Drawer */}
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-background shadow-2xl animate-slide-left">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-semibold text-foreground">{title}</h2>
                <button 
                  onClick={() => setOpen(false)} 
                  className="btn btn-ghost btn-sm"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Content */}
              <div className="flex-1 overflow-auto p-6">
                {content}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
