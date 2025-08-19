"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from 'react';
import { CompanyUserSection } from '@/components/CompanyUserSection';

export default function ProfilePage() {
  const [form, setForm] = useState<any>({});
  const [msg, setMsg] = useState<string | null>(null);
  const token = (typeof document !== 'undefined' && document.cookie.split('; ').find(x => x.startsWith('lx_token=')))?.split('=')[1] || '';

  useEffect(() => {
    try {
      const u = localStorage.getItem('lx_user');
      if (u) setForm(JSON.parse(u));
    } catch {}
  }, []);

  const save = async () => {
    setMsg(null);
    if (!form?.id) return;
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const res = await fetch(`${base}/users/${form.id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({
        email: form.email,
        full_name: form.full_name,
        username: form.username,
        role: form.role,
        department: form.department,
        organization_id: form.organization_id,
        // do not send password from profile page unless explicitly changed later
      }),
    });
    if (!res.ok) { setMsg('Kaydetme başarısız'); return; }
    const data = await res.json();
    localStorage.setItem('lx_user', JSON.stringify(data));
    setMsg('Kaydedildi');
  };

  return (
    <>
      <CompanyUserSection />
      <main className="max-w-3xl mx-auto p-6 space-y-3">
        <h1 className="text-xl font-semibold">Profil Bilgileri</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input className="border rounded px-3 py-2" placeholder="Ad Soyad" value={form.full_name || ''} onChange={e=>setForm({...form, full_name: e.target.value})} />
          <input className="border rounded px-3 py-2" placeholder="Kullanıcı Adı" value={form.username || ''} onChange={e=>setForm({...form, username: e.target.value})} />
          <input className="border rounded px-3 py-2" placeholder="Görev" value={form.role || ''} onChange={e=>setForm({...form, role: e.target.value})} />
          <input className="border rounded px-3 py-2" placeholder="Departman" value={form.department || ''} onChange={e=>setForm({...form, department: e.target.value})} />
        </div>
        <div className="flex gap-2">
          <button onClick={save} className="border rounded px-3 py-2">Kaydet</button>
          {msg && <span className="text-sm text-gray-600">{msg}</span>}
        </div>
      </main>
    </>
  );
}
