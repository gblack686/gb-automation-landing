import { welcomePage, sourceReferences, welcomeEmailVariants } from '../data/contentSystem';
import { ContentHero, CtaLink, NumberedSteps, SafetyNote, SourceReferences } from './ContentSystemComponents';

export default function WelcomePage() {
  return (
    <div className="space-y-10">
      <ContentHero eyebrow={welcomePage.eyebrow} title={welcomePage.title} intro={welcomePage.intro}>
        <div className="space-y-4 rounded-md border border-[#D6D4C8] bg-[#E6E4D9]/70 p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#191919]/50">Next action</p>
          <div className="flex flex-wrap gap-3">
            <CtaLink to={welcomePage.primaryCta.to}>{welcomePage.primaryCta.label}</CtaLink>
            <CtaLink to={welcomePage.secondaryCta.to} variant="secondary">
              {welcomePage.secondaryCta.label}
            </CtaLink>
          </div>
        </div>
      </ContentHero>

      <section className="space-y-4">
        <h2 className="font-serif text-3xl text-[#191919]">What happens next</h2>
        <NumberedSteps steps={welcomePage.steps} />
      </section>

      <SafetyNote>{welcomePage.safetyNote}</SafetyNote>

      <section className="space-y-4">
        <h2 className="font-serif text-3xl text-[#191919]">Welcome email variants</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {welcomeEmailVariants.map((variant) => (
            <article key={variant.title} className="rounded-md border border-[#D6D4C8] bg-white/45 p-5">
              <h3 className="font-medium text-[#191919]">{variant.title}</h3>
              <ul className="mt-4 space-y-2 text-sm leading-6 text-[#191919]/70">
                {variant.subjects.map((subject) => (
                  <li key={subject}>{subject}</li>
                ))}
              </ul>
              <p className="mt-4 text-xs leading-5 text-[#191919]/50">Source basis: {variant.sourceBasis}</p>
            </article>
          ))}
        </div>
      </section>

      <SourceReferences references={sourceReferences.slice(0, 4)} />
    </div>
  );
}
