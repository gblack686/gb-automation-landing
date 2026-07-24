import { gettingStartedGuide, sourceReferences } from '../data/contentSystem';
import { ContentHero, SourceReferences } from './ContentSystemComponents';

export default function GettingStartedPage() {
  return (
    <div className="space-y-10">
      <ContentHero eyebrow={gettingStartedGuide.eyebrow} title={gettingStartedGuide.title} intro={gettingStartedGuide.intro} />

      <section className="grid gap-4 md:grid-cols-2">
        {gettingStartedGuide.sections.map((section) => (
          <article key={section.title} className="rounded-md border border-[#D6D4C8] bg-white/45 p-5">
            <h2 className="font-serif text-2xl text-[#191919]">{section.title}</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-[#191919]/70">
              {section.items.map((item) => (
                <li key={item} className="rounded-md bg-[#E6E4D9]/60 p-3">
                  {item}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <SourceReferences references={sourceReferences.slice(1, 5)} />
    </div>
  );
}
