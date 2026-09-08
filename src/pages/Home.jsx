import { ArrowDown, ArrowUpRight, ArrowUp, Blocks, GitBranch, Plus, ScanLine } from 'lucide-react';
import StudioNav from '../components/marketing/StudioNav';
import SystemArtwork from '../components/marketing/SystemArtwork';
import WorkflowDemo from '../components/marketing/WorkflowDemo';
import ProjectBrief from '../components/marketing/ProjectBrief';
import { approach, discoveryUrl, faqs, selectedWork } from '../data/marketingContent';
import '../styles/marketing.css';

export default function Home() {
  return (
    <div className="gb-marketing-home" id="top">
      <a href="#main" className="studio-skip-link">Skip to content</a>
      <StudioNav />
      <main id="main" tabIndex={-1}>
        <section className="studio-hero studio-container" aria-labelledby="hero-title">
          <div className="hero-layout">
            <div className="hero-copy">
              <p className="studio-label hero-eyebrow"><span className="studio-dot" />INDEPENDENT AI SYSTEMS STUDIO</p>
              <h1 className="hero-title" id="hero-title"><span>AI systems.</span><span>Built to do</span><span><em>the work.</em></span></h1>
              <p className="hero-description">Custom agents, internal tools, and workflows built around your business.</p>
              <div className="hero-actions">
                <a className="studio-button studio-button-dark" href={discoveryUrl} target="_blank" rel="noreferrer">Book a discovery call <ArrowUpRight size={18} /></a>
                <a className="studio-text-link" href="#work">Explore the work <ArrowDown size={15} /></a>
              </div>
            </div>
            <div className="hero-visual">
              <SystemArtwork />
              <a className="hero-preview" href="#logo-motion">
                <img src="/marketing/logo-motion.webp" alt="" width="78" height="53" />
                <span className="hero-preview-copy"><span className="studio-label">FROM THE STUDIO / CREATIVE AUTOMATION</span><strong>From a static mark to something moving.</strong></span>
                <ArrowUpRight size={18} />
              </a>
            </div>
          </div>
          <div className="hero-baseline"><span>LESS REPETITION. MORE ROOM FOR THE WORK THAT MATTERS.</span><span>SCROLL TO EXPLORE <ArrowDown size={12} /></span></div>
        </section>

        <section className="studio-section studio-container" id="work" tabIndex={-1} aria-labelledby="work-title">
          <div className="section-topline"><span className="studio-label">01 / SELECTED WORK</span><span className="studio-label">A FEW THINGS WE’VE BUILT</span></div>
          <div className="section-heading"><h2 id="work-title">Useful work,<br /><em>made visible.</em></h2><p className="section-intro">A look inside the studio: working systems, shared tools, and experiments that turn an idea into something you can use.</p></div>
          <div className="work-grid">
            {selectedWork.map((work, i) => <article className={`work-card work-card-${i + 1}`} id={work.id} key={work.id}>
              <a className="work-image-link" href={work.href} target="_blank" rel="noreferrer" aria-label={work.action}>
                <img src={work.image} alt={work.alt} width={i === 2 ? 640 : 1280} height={i === 2 ? 640 : 860} loading="lazy" decoding="async" />
                <span className="work-image-label">GB / {work.number} · {i === 2 ? 'MOTION STUDY' : 'PROJECT PREVIEW'}</span><span className="work-open"><ArrowUpRight size={20} /></span>
              </a>
              <div className="work-meta"><span>{work.category}</span><span>/{work.number}</span></div>
              <h3>{work.title}</h3><p>{work.description}</p>
              <p className="work-kind">{work.kind}</p>
              <a className="studio-text-link" href={work.href} target="_blank" rel="noreferrer">{work.action}<ArrowUpRight size={14} /></a>
            </article>)}
          </div>
        </section>

        <section className="studio-section studio-container systems-section" id="systems" tabIndex={-1} aria-labelledby="systems-title">
          <div className="section-topline"><span className="studio-label">02 / CONNECTING THE PIECES</span><span className="studio-label">BUILT AROUND YOUR BUSINESS</span></div>
          <div className="section-heading"><h2 id="systems-title">Your work.<br /><em>A better way through it.</em></h2><p className="section-intro">The useful part of AI is what it helps you get done. Connect the context, the tools, and the next step.</p></div>
          <div className="system-capabilities">
            <div className="capability"><ScanLine size={22} strokeWidth={1.3} /><h3>Agents with context</h3><p>Research, organize knowledge, and prepare useful outputs with clear points for your review.</p></div>
            <div className="capability"><Blocks size={22} strokeWidth={1.3} /><h3>Tools that fit the job</h3><p>Purpose-built workspaces that bring the information and actions you need into one place.</p></div>
            <div className="capability"><GitBranch size={22} strokeWidth={1.3} /><h3>Workflows that connect</h3><p>Link the tools you already use and reduce the repetitive work between them.</p></div>
          </div>
          <WorkflowDemo />
        </section>

        <section className="studio-section studio-container" id="approach" tabIndex={-1} aria-labelledby="approach-title">
          <div className="section-topline"><span className="studio-label">03 / THE APPROACH</span><span className="studio-label">THOUGHTFUL BY DESIGN</span></div>
          <div className="section-heading"><h2 id="approach-title">Start with the work.<br /><em>Build from there.</em></h2><p className="section-intro">A close collaboration, from the first conversation to a system that earns its place in your day.</p></div>
          <div className="approach-grid">{approach.map(([title, description], i) => <div className="approach-step" key={title}><span>0{i + 1}</span><h3>{title}</h3><p>{description}</p></div>)}</div>
        </section>

        <section className="studio-section studio-container about-section" id="about" tabIndex={-1} aria-labelledby="about-title">
          <div className="about-intro"><span className="studio-label">04 / THE PERSON BEHIND THE SYSTEMS</span><h2 id="about-title">Hi, I’m Greg.<br />Let’s make it useful.</h2><p>I’m the founder of GB Automation, an AI and data engineer working across custom agents, business workflows, and cloud infrastructure. I bring the engineering and the context together, so the system makes sense for the people using it.</p><div className="founder-lockup"><img src="/marketing/gb-logo.webp" alt="" width="65" height="65" loading="lazy" /><div><strong>Greg Black</strong><span>Founder & engineer, GB Automation</span></div></div></div>
          <div className="studio-faq"><span className="studio-label">A FEW THINGS YOU MIGHT BE WONDERING</span>{faqs.map(([question, answer]) => <details key={question}><summary>{question}<Plus size={17} strokeWidth={1.4} /></summary><p>{answer}</p></details>)}</div>
        </section>

        <section className="studio-contact" id="contact" tabIndex={-1} aria-labelledby="contact-title">
          <div className="studio-container"><div className="contact-layout"><div className="contact-copy"><span className="studio-label"><span className="studio-dot" />05 / LET’S MAKE SOMETHING WORK</span><h2 id="contact-title">What’s taking<br /><em>too much time?</em></h2><p>Bring the messy workflow, the scattered context, or the idea you keep coming back to. Let’s find a useful first step.</p><a className="studio-button studio-button-light" href={discoveryUrl} target="_blank" rel="noreferrer">Book a discovery call <ArrowUpRight size={18} /></a><span className="contact-note">A 30-minute conversation about your work.</span></div><ProjectBrief /></div></div>
          <footer className="studio-footer studio-container"><div className="footer-top"><span>Independent thinking. Connected systems.</span><div className="footer-links"><a href="https://www.linkedin.com/in/gregory-black-gbautomation/" target="_blank" rel="noreferrer">LinkedIn <ArrowUpRight size={13} /></a><a href="/login">Client sign in <ArrowUpRight size={13} /></a><a href="#top">Back to top <ArrowUp size={13} /></a></div></div><div className="footer-wordmark" aria-hidden="true">GB AUTOMATION<span>.</span></div><div className="footer-bottom"><span>© {new Date().getFullYear()} GB Automation</span><span>AI SYSTEMS. BUILT TO DO THE WORK.</span></div></footer>
        </section>
      </main>
    </div>
  );
}
