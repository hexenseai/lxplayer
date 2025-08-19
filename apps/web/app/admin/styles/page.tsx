import { api, Style as StyleT } from '@/lib/api';
import { AdminNav } from '@/components/admin/AdminNav';
import { StyleForm } from '@/components/admin/forms/StyleForm';
import { StyleEditForm } from '@/components/admin/forms/StyleEditForm';
import { DeleteStyleButton } from '@/components/admin/DeleteStyleButton';
import { Drawer } from '@/components/admin/Drawer';
import { SeedStylesButton } from '@/components/admin/SeedStylesButton';
import { StyleCard } from '@/components/admin/StyleCard';

export default async function AdminStylesPage() {
  let styles: StyleT[] = [];
  try {
    styles = await api.listStyles();
  } catch (error) {
    console.error('API Error:', error);
  }

  return (
    <main className="p-0">
      <AdminNav />
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Stil Yönetimi</h1>
          <div className="flex items-center space-x-4">
            <SeedStylesButton />
            <Drawer buttonLabel="Yeni Stil Ekle" title="Yeni Stil">
              <StyleForm />
            </Drawer>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {styles.map((style) => (
            <StyleCard key={style.id} style={style} />
          ))}
        </div>

        {styles.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-4">Henüz stil tanımlanmamış</div>
            <SeedStylesButton />
          </div>
        )}
      </div>
    </main>
  );
}
