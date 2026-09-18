import { Video } from 'lucide-react';

// Replace this figure with Greg's recording once the Loom URL is available.
// A placeholder deliberately has no play control or third-party embed.
export default function HeroIntroVideo() {
  return (
    <figure className="hero-intro-video" aria-labelledby="hero-intro-caption">
      <div className="hero-intro-icon" aria-hidden="true"><Video size={28} strokeWidth={1.5} /></div>
      <figcaption id="hero-intro-caption">
        <span className="home-eyebrow">A quick introduction</span>
        <span className="hero-intro-title">Intro video coming soon</span>
        <span className="hero-intro-note">Meet Greg and see how we can work together.</span>
      </figcaption>
    </figure>
  );
}
