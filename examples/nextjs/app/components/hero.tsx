import { HERO_VIDEO_URL } from "@/lib/constants";

export function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <video
        className="heroVideo"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
        tabIndex={-1}
      >
        <source src={HERO_VIDEO_URL} type="video/mp4" />
      </video>
      <div className="heroOverlay" aria-hidden="true" />

      <header className="siteHeader">
        <nav aria-label="Primary navigation">
          <a href="https://camb.ai" className="brand">
            CAMB<sup>®</sup>
          </a>
          <div className="navLinks">
            <a href="#studio">Studio</a>
            <a href="#workflow">How it works</a>
          </div>
          <a href="#studio" className="navCta">
            Start creating
          </a>
        </nav>
      </header>

      <div className="heroContent">
        <p className="eyebrow fadeRise">CAMB Voice Studio</p>
        <h1 id="hero-title" className="fadeRise delayOne">
          Every language deserves a natural <em>voice.</em>
        </h1>
        <p className="heroCopy fadeRise delayOne">
          Generate expressive speech directly or translate your script before
          CAMB speaks it in a voice made for the moment.
        </p>
        <a href="#studio" className="heroCta fadeRise delayTwo">
          Start creating <span aria-hidden="true">↓</span>
        </a>
      </div>
    </section>
  );
}
