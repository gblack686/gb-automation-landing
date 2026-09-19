import VideoHero from '../components/VideoHero';
import AgentForgePreview from '../components/AgentForgePreview';
import ZeroTouchEngineering from '../components/ZeroTouchEngineering';
import ArtifactGallery from '../components/ArtifactGallery';
import '../components/HomeShowcase.css';
import Portfolio from '../components/Portfolio';
import TechMarquee from '../components/TechMarquee';
import Features from '../components/Features';
import Process from '../components/Process';
import ContactForm from '../components/ContactForm';
import Footer from '../components/Footer';
import ParticleBackground from '../components/ParticleBackground';

function Home() {
  return (
    <div className="particle-home selection:bg-[#D97757] selection:text-white">
      <ParticleBackground />
      <div className="particle-home-content">
        <VideoHero />
        <AgentForgePreview />
        <Portfolio />
        <TechMarquee />
        <Features />
        <ZeroTouchEngineering />
        <ArtifactGallery />
        <Process />
        <ContactForm />
        <Footer />
      </div>
    </div>
  );
}

export default Home;
