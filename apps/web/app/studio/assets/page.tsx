import { CompanyUserSection } from '@/components/CompanyUserSection';

export default function StudioAssetsPage() {
  return (
    <>
      <CompanyUserSection />
      <main className="p-8">
        <h1 className="text-2xl font-semibold">Studio: Assets</h1>
        <p className="text-gray-600">Yüklenen medya ve HLS varlıkları.</p>
      </main>
    </>
  );
}
