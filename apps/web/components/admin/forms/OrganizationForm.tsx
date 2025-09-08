"use client";
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input, Label } from '@lxplayer/ui';
import { useRouter } from 'next/navigation';
import type { Organization } from '@/lib/api';

const Schema = z.object({ name: z.string().min(1), business_topic: z.string().optional() });

type FormValues = z.infer<typeof Schema>;

export function OrganizationForm({ initialOrganization, onDone }: { initialOrganization?: Organization; onDone?: () => void }) {
  const router = useRouter();
  const defaultValues = initialOrganization ? { name: initialOrganization.name, business_topic: initialOrganization.business_topic ?? undefined } : undefined;
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset, setError } = useForm<FormValues>({ resolver: zodResolver(Schema), defaultValues });

  const onSubmit = async (values: FormValues) => {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const isUpdate = Boolean(initialOrganization?.id);
    const path = isUpdate ? `${base}/organizations/${initialOrganization!.id}` : `${base}/organizations`;
    const method = isUpdate ? 'PUT' : 'POST';
    // Get token from localStorage
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (token) {
      headers['authorization'] = `Bearer ${token}`;
    }
    
    const res = await fetch(path, { method, headers, body: JSON.stringify(values) });
    if (!res.ok) {
      setError('name', { type: 'manual', message: `Hata: ${res.status}` });
      return;
    }
    reset();
    router.refresh();
    onDone?.();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-3 max-w-md">
      <div>
        <Label htmlFor="name">Firma Adı</Label>
        <Input id="name" {...register('name')} placeholder="firma adı" />
        {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name.message as any}</p>}
      </div>
      <div>
        <Label htmlFor="business_topic">İş Konusu</Label>
        <Input id="business_topic" {...register('business_topic')} placeholder="iş konusu" />
      </div>
      <div className="flex justify-end gap-2">
        <button disabled={isSubmitting} type="submit" className="border rounded px-3 py-2">Kaydet</button>
      </div>
    </form>
  );
}
