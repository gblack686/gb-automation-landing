import VideoHero from '../components/VideoHero';
import Portfolio from '../components/Portfolio';
import TechMarquee from '../components/TechMarquee';
import Features from '../components/Features';
import Process from '../components/Process';
import HowItWorks from '../components/HowItWorks';
import HermesProfile from '../components/HermesProfile';
import HermesTeamSession from '../components/HermesTeamSession';
import Pricing from '../components/Pricing';
import ContactForm from '../components/ContactForm';
import Footer from '../components/Footer';

function Home() {
  return (
    <div className="min-h-screen bg-[#F3F1E7] selection:bg-[#D97757] selection:text-white overflow-x-hidden">
      <VideoHero />
      <Portfolio />
      <TechMarquee />
      <Features />
      <HowItWorks />
      <HermesProfile />
      <HermesTeamSession />
      <Process />
      <Pricing />
      <ContactForm />
      <Footer />
    </div>
  );
}

export default Home;
