import VideoHero from '../components/VideoHero';
import Portfolio from '../components/Portfolio';
import Features from '../components/Features';
import Process from '../components/Process';
import Pricing from '../components/Pricing';
import ContactForm from '../components/ContactForm';
import Footer from '../components/Footer';

function Home() {
  return (
    <div className="min-h-screen bg-[#F3F1E7] selection:bg-[#D97757] selection:text-white overflow-x-hidden">
      <VideoHero />
      <Portfolio />
      <Features />
      <Process />
      <Pricing />
      <ContactForm />
      <Footer />
    </div>
  );
}

export default Home;
