"use client";
import React from 'react';

export function CompanyUserSection() {
  const [name, setName] = React.useState<string | null>(null);
  const [company, setCompany] = React.useState<string | null>(null);

  React.useEffect(() => {
    try {
      const u = localStorage.getItem('lx_user');
      if (u) {
        const obj = JSON.parse(u);
        setName(obj.full_name || obj.email || null);
        setCompany(obj.company_name || obj.organization_name || null);
      }
    } catch {}
  }, []);

  if (!name && !company) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-primary-50 to-accent-50 border-b border-primary-100">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-center text-center">
          <div className="flex items-center space-x-4 text-sm text-primary-700">
            {company && (
              <div className="flex items-center space-x-2">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span className="font-medium">{company}</span>
              </div>
            )}
            
            {name && (
              <div className="flex items-center space-x-2">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="font-medium">Hoş geldin, {name}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
