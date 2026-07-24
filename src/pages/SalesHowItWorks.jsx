import { salesHowItWorks, sourceReferences } from '../clients/gbautomation/data/contentSystem';
import { ClaimList, ContentHero, SafetyNote, SourceReferences } from '../clients/gbautomation/pages/ContentSystemComponents';

export default function SalesHowItWorks() {
  return (
    <main className="min-h-screen bg-[#F3F1E7] px-6 py-10 text-[#191919] md:py-14">
      <div className="mx-auto max-w-7xl space-y-10">
        <ContentHero eyebrow={salesHowItWorks.eyebrow} title={salesHowItWorks.title} intro={salesHowItWorks.intro} />

        <section className="space-y-4">
          <h2 className="font-serif text-3xl text-[#191919]">Source-backed claims</h2>
          <ClaimList items={salesHowItWorks.claims} />
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-3xl text-[#191919]">Excluded until sourced</h2>
          <SafetyNote>{salesHowItWorks.excludedClaims.join(' ')}</SafetyNote>
        </section>

        <SourceReferences references={sourceReferences.filter((ref) => ['Sales material source', 'Content draft package', 'Recovered PRD'].includes(ref.label))} />
      </div>
    </main>
  );
}
