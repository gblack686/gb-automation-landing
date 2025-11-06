import VideoHero from './components/VideoHero';
import Features from './components/Features';
import Process from './components/Process';
import Pricing from './components/Pricing';
import ContactForm from './components/ContactForm';
import Footer from './components/Footer';

function App() {
  return (
    <div className="min-h-screen bg-black">
      <VideoHero />
      <Features />
      <Process />
      <Pricing />
      <ContactForm />
      <Footer />
    </div>
  );
}

export default App;
