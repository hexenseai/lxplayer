"use client";
import React from 'react';
import type { Organization } from '@/lib/api';
import { UserForm } from '@/components/admin/forms/UserForm';

export function CreateDrawer({ orgs }: { orgs: Organization[] }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div>
      <button onClick={() => setOpen(true)} className="border rounded px-3 py-2">Yeni Kullanıcı Ekle</button>
      {open && (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl p-6 overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Yeni Kullanıcı</h2>
              <button onClick={() => setOpen(false)} className="px-2 py-1">İptal</button>
            </div>
            <UserForm orgs={orgs} />
          </div>
        </div>
      )}
    </div>
  );
}
