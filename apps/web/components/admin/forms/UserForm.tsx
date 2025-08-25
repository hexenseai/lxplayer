"use client";
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input, Label } from '@lxplayer/ui';
import { useRouter } from 'next/navigation';
import type { User } from '@/lib/api';

const Schema = z.object({
  email: z.string().email(),
  username: z.string().optional(),
  full_name: z.string().optional(),
  organization_id: z.string().optional().or(z.literal('')),
  role: z.enum(['Admin','User']).optional(),
  department: z.string().optional(),
  password: z.string().optional(),
  gpt_prefs: z.string().optional(),
});

type FormValues = z.infer<typeof Schema>;

export function UserForm({ orgs, initialUser, onDone }: { orgs: { id: string; name: string }[]; initialUser?: User; onDone?: () => void }) {
  const router = useRouter();
  
  // Yeni kullanıcı için otomatik olarak ilk firmayı seç
  const defaultValues: Partial<FormValues> | undefined = initialUser
    ? {
        email: initialUser.email,
        username: initialUser.username ?? undefined,
        full_name: initialUser.full_name ?? undefined,
        organization_id: initialUser.organization_id ?? '',
        role: (initialUser.role as 'Admin' | 'User') ?? undefined,
        department: initialUser.department ?? undefined,
      }
    : {
        // Yeni kullanıcı için otomatik olarak ilk firmayı seç
        organization_id: orgs.length > 0 ? orgs[0].id : '',
        role: 'User' as const,
      };

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset, setError } = useForm<FormValues>({ resolver: zodResolver(Schema), defaultValues });

  const onSubmit = async (values: FormValues) => {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const isUpdate = Boolean(initialUser?.id);
    const path = isUpdate ? `${base}/users/${initialUser!.id}` : `${base}/users`;
    const method = isUpdate ? 'PUT' : 'POST';
    
    // Yeni kullanıcı için otomatik olarak ilk firmayı ata
    let organization_id = values.organization_id;
    if (!isUpdate && !organization_id && orgs.length > 0) {
      organization_id = orgs[0].id;
    }
    
    const payload: Record<string, unknown> = { ...values, organization_id: organization_id || null };
    if (isUpdate && (!values.password || values.password.length === 0)) {
      delete payload.password;
    }
    const res = await fetch(path, {
      method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.status === 409) {
      setError('email', { type: 'manual', message: 'Bu email zaten kayıtlı.' });
      return;
    }
    if (!res.ok) {
      setError('email', { type: 'manual', message: `Hata: ${res.status}` });
      return;
    }
    reset();
    router.refresh();
    onDone?.();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-3 max-w-md">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" {...register('email')} placeholder="email" />
        {errors.email && <p className="text-red-600 text-xs mt-1">{errors.email.message as any}</p>}
      </div>
      <div>
        <Label htmlFor="username">Kullanıcı Adı</Label>
        <Input id="username" {...register('username')} placeholder="kullanıcı adı" />
      </div>
      <div>
        <Label htmlFor="full_name">Ad Soyad</Label>
        <Input id="full_name" {...register('full_name')} placeholder="ad soyad" />
      </div>
      <div>
        <Label htmlFor="role">Görev (Rol)</Label>
        <select id="role" {...register('role')} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-gray-900 focus:ring-gray-900">
          <option value="User">User</option>
          <option value="Admin">Admin</option>
        </select>
      </div>
      <div>
        <Label htmlFor="department">Departman</Label>
        <Input id="department" {...register('department')} placeholder="departman" />
      </div>
      <div>
        <Label htmlFor="organization_id">Firma</Label>
        {orgs.length === 1 ? (
          <div className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 bg-gray-50 text-gray-600">
            {orgs[0].name} (Otomatik atanmış)
          </div>
        ) : (
          <select id="organization_id" {...register('organization_id')} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-gray-900 focus:ring-gray-900">
            <option value="">(firma yok)</option>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        )}
      </div>
      <div>
        <Label htmlFor="password">Geçici Şifre</Label>
        <Input id="password" type="password" {...register('password')} placeholder="geçici şifre" />
      </div>
      <div className="flex justify-end gap-2">
        <button disabled={isSubmitting} type="submit" className="border rounded px-3 py-2">Kaydet</button>
      </div>
    </form>
  );
}
