import ClientPortalHeader from './ClientPortalHeader';

export default function ClientPortalLayout({ tenant, children }) {
  return (
    <div className="min-h-screen bg-[#F3F1E7] text-[#191919] selection:bg-[#D97757] selection:text-white">
      <ClientPortalHeader tenant={tenant} />
      <main className="mx-auto max-w-7xl px-6 py-10 md:py-14">{children}</main>
    </div>
  );
}
