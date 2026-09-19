import { useRef, useState } from 'react';
import { Play } from 'lucide-react';

export default function HeroIntroVideo() {
  const videoRef = useRef(null);
  const [started, setStarted] = useState(false);
  const [failed, setFailed] = useState(false);

  function play() {
    setStarted(true);
    videoRef.current?.play().catch(() => setFailed(true));
  }

  return (
    <figure className="hero-intro-video" aria-labelledby="hero-intro-caption">
      <div className="hero-intro-player">
        <video
          ref={videoRef}
          controls={started}
          playsInline
          preload="none"
          src="/media/greg-intro-v2.mp4"
          poster="/media/greg-intro-v2-poster.jpg"
          width="720"
          height="1280"
          aria-label="Greg introduces GBAutomation and how to work together"
          onPlay={() => setStarted(true)}
          onError={() => setFailed(true)}
        >
          <a href="/media/greg-intro-v2.mp4">Watch Greg's introduction</a>
        </video>
        {!started && !failed && (
          <button className="hero-intro-play" type="button" onClick={play} aria-label="Play Greg's introduction, 1 minute 47 seconds">
            <span className="hero-intro-play-icon"><Play size={28} fill="currentColor" aria-hidden="true" /></span>
            <span>Meet Greg <span aria-hidden="true">·</span> 1:47</span>
          </button>
        )}
      </div>
      <figcaption id="hero-intro-caption">
        {failed ? <span role="status">Having trouble playing? <a href="/media/greg-intro-v2.mp4">Open the video.</a></span> : 'Meet Greg and see how we can work together.'}
      </figcaption>
    </figure>
  );
}
