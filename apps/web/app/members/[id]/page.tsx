import { CompanyUserSection } from '@/components/CompanyUserSection';

export default function MemberProfile({ params }: { params: { id: string } }) {
  return (
    <>
      <CompanyUserSection />
      <main className="p-8 space-y-2">
        <h1 className="text-2xl font-semibold">Üye: {params.id}</h1>
        <p className="text-gray-600">Eğitim geçmişi ve rozetler.</p>
      </main>
    </>
  );
}
