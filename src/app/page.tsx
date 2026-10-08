import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Layers,
  SlidersHorizontal,
  MousePointer2,
  ImagePlus,
  Check,
  MoveUpRight,
  Download,
  Undo2,
  Type,
  Paintbrush,
  Crop,
  Hand,
  Square,
  LockKeyhole,
  WifiOff,
  CheckCheck,
} from "lucide-react";
import "./landing.css";
export default function Home() {
  return (
    <main className="landing">
      <nav className="landing-nav">
        <Link href="/" className="landing-brand">
          <span className="landing-mark">
            u<span>✦</span>
          </span>
          UnCanva
        </Link>
        <div className="landing-links">
          <a href="#possibilities">The possibilities</a>
          <a href="#how-it-works">How it works</a>
          <a href="#your-device">Built for you</a>
        </div>
        <Link className="landing-nav-cta" href="/editor">
          Open the studio
          <ArrowUpRight size={16} />
        </Link>
      </nav>
      <section className="hero">
        <div className="hero-note">
          <span />A little less cloud. A lot more creative.
        </div>
        <h1>
          Your ideas.
          <br />
          Your canvas.
          <span className="hero-serif">
            Your device.
            <svg viewBox="0 0 400 20" aria-hidden="true">
              <path d="M4 12 Q140 -3 395 10 M30 18 Q195 5 355 15" />
            </svg>
          </span>
        </h1>
        <p>
          A fresh space to make images your own.
          <br />
          Edit, layer, refine, and create — all in your browser.
          <br />
          Your work stays right where it belongs. With you.
        </p>
        <div className="hero-actions">
          <Link href="/editor" className="landing-cta">
            Make something yours
            <ArrowUpRight size={18} />
          </Link>
          <a href="#possibilities" className="hero-secondary">
            Take a look around
            <ArrowRight size={15} />
          </a>
        </div>
        <div className="hero-perks">
          <span>
            <Check size={13} />
            No sign-up
          </span>
          <span>
            <Check size={13} />
            No subscriptions
          </span>
          <span>
            <Check size={13} />
            Entirely on-device
          </span>
        </div>
        <div className="hero-sticker sticker-one">
          <Sparkles size={17} />
          <span>
            A little creative
            <br />
            freedom looks good on you.
          </span>
        </div>
        <div className="hero-sticker sticker-two">
          <span className="tiny-star">✳</span>Made by you.
          <br />
          Kept by you.
        </div>
      </section>
      <section
        className="preview-section"
        aria-label="A look inside the studio"
      >
        <div className="preview-caption">
          <span className="preview-dot" />
          MEET YOUR NEW CREATIVE CORNER<span>Less friction. More flow. ↘</span>
        </div>
        <div className="studio-preview">
          <div className="preview-topbar">
            <span className="preview-logo">u✦</span>
            <strong>UnCanva</strong>
            <span className="preview-divider" />
            <span>Sunday, in full color</span>
            <span className="preview-saved">
              <CheckCheck size={12} />
              Saved on this device
            </span>
            <Undo2 size={14} />
            <span className="preview-export">
              Export
              <ArrowUpRight size={12} />
            </span>
          </div>
          <div className="preview-body">
            <div className="preview-tools">
              {[MousePointer2, Hand, Crop, Paintbrush, Type, Square].map(
                (Icon, i) => (
                  <span key={i} className={i === 0 ? "active" : ""}>
                    <Icon size={17} />
                  </span>
                ),
              )}
            </div>
            <div className="preview-pages">
              <strong>
                Pages<span>+</span>
              </strong>
              <div className="mini-art">
                <div />
                <span>01</span>
              </div>
              <small>A softer kind of Sunday</small>
              <p>LAYERS</p>
              <span>
                <Type size={11} />
                The good things
              </span>
              <span>
                <Square size={11} />
                Little moments
              </span>
              <span>
                <ImagePlus size={11} />
                The everyday
              </span>
              <div className="preview-private">
                <ShieldCheck size={13} />
                Made here. Stays here.
              </div>
            </div>
            <div className="preview-workspace">
              <span className="preview-board-title">
                A softer kind of Sunday<span>1080 × 1350 px</span>
              </span>
              <div className="poster">
                <div className="poster-text">
                  <small>NOTICING THE EVERYDAY / VOL. 01</small>
                  <span>
                    The good
                    <br />
                    things are
                    <br />
                    <em>right here.</em>
                  </span>
                  <div className="poster-flower" aria-hidden="true">
                    <span>✳</span>
                    <span>✳</span>
                    <span>✳</span>
                    <span>✳</span>
                  </div>
                  <div className="poster-bottom">
                    <span>
                      A slower morning.
                      <br />A brighter point of view.
                    </span>
                    <span>TAKE YOUR TIME ↗</span>
                  </div>
                </div>
                <div className="poster-selection">
                  <i />
                  <i />
                  <i />
                  <i />
                  <MousePointer2 size={21} />
                  <span>You, making it yours</span>
                </div>
              </div>
              <div className="preview-zoom">
                −<span>75%</span>+
              </div>
            </div>
            <div className="preview-properties">
              <strong>
                Make it yours <Sparkles size={13} />
              </strong>
              <div className="preview-tabs">
                <span>Adjust</span>
                <span>Layer</span>
                <span>Canvas</span>
              </div>
              <small>SMART TOOLS</small>
              <div className="preview-ai">
                <Sparkles size={16} />
                <span>
                  Remove background<small>Local AI · your device</small>
                </span>
              </div>
              <p>
                Light & color<span>Reset</span>
              </p>
              {["Brightness", "Contrast", "Saturation"].map((text, i) => (
                <div className="preview-slider" key={text}>
                  <span>
                    {text}
                    <small>{[12, 8, 20][i]}</small>
                  </span>
                  <div>
                    <i style={{ left: `${[62, 58, 70][i]}%` }} />
                  </div>
                </div>
              ))}
              <div className="preview-layer-note">
                <ShieldCheck size={15} />
                <span>
                  Your creativity.
                  <br />
                  Without the cloud.
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="preview-footnote">
          <ShieldCheck size={15} />
          <span>No uploads. No accounts. Just you and your next idea.</span>
        </div>
      </section>
      <section className="possibilities" id="possibilities">
        <div className="section-eyebrow">SMALL TOOLS. BIG POSSIBILITIES.</div>
        <div className="landing-section-title">
          <h2>
            From “what if”
            <br />
            to <em>“look at that.”</em>
          </h2>
          <p>
            The tools you reach for.
            <br />
            The space to do something with them.
          </p>
        </div>
        <div className="feature-grid">
          <article className="feature-card lilac">
            <div className="feature-visual cutout-visual">
              <div className="checker-patch" />
              <span className="cutout-flower">✳</span>
              <span className="floating-tag">
                <Sparkles size={12} />A fresh perspective
              </span>
            </div>
            <span className="feature-number">01 / REFINE</span>
            <h3>
              A little less background.
              <br />A little more you.
            </h3>
            <p>
              On-device AI matting for people and portraits. Keep the details
              you love with erase and restore brushes.
            </p>
            <Link href="/editor">
              Find your focus
              <ArrowUpRight size={16} />
            </Link>
          </article>
          <article className="feature-card peach">
            <div className="feature-visual layer-visual">
              <div className="layer-sheet sheet-back">a little</div>
              <div className="layer-sheet sheet-middle">✳</div>
              <div className="layer-sheet sheet-front">
                more <em>you.</em>
                <span>YOUR IDEAS, IN LAYERS</span>
              </div>
            </div>
            <span className="feature-number">02 / COMPOSE</span>
            <h3>
              Good ideas
              <br />
              have layers.
            </h3>
            <p>
              Bring images, shapes, and words together. Move, resize, rotate,
              and make room for another artboard.
            </p>
            <Link href="/editor">
              Put it all together
              <ArrowUpRight size={16} />
            </Link>
          </article>
          <article className="feature-card sage">
            <div className="feature-visual color-visual">
              <span className="color-orb" />
              <div className="color-controls">
                <span>
                  Just the right feeling <SlidersHorizontal size={12} />
                </span>
                <div />
                <div />
                <div />
              </div>
            </div>
            <span className="feature-number">03 / FINESSE</span>
            <h3>
              Make the mood.
              <br />
              Keep the original.
            </h3>
            <p>
              Find your light, fine-tune color, and soften the edges. Every
              adjustment stays editable. Every idea gets a do-over.
            </p>
            <Link href="/editor">
              Get the feeling right
              <ArrowUpRight size={16} />
            </Link>
          </article>
        </div>
      </section>
      <section className="how-section" id="how-it-works">
        <div className="section-eyebrow">LESS SETUP. MORE MAKING.</div>
        <h2>
          In your flow.
          <br />
          <em>In three little steps.</em>
        </h2>
        <div className="steps">
          <article>
            <span>1</span>
            <ImagePlus size={23} />
            <h3>Bring an idea.</h3>
            <p>
              Drop in an image, choose a file, or paste straight from your
              clipboard.
            </p>
          </article>
          <div className="step-arrow">⤳</div>
          <article>
            <span>2</span>
            <SlidersHorizontal size={23} />
            <h3>Make it your own.</h3>
            <p>
              Play with layers, color, text, and a little AI. Undo is always
              there.
            </p>
          </article>
          <div className="step-arrow">⤳</div>
          <article>
            <span>3</span>
            <Download size={23} />
            <h3>Take it with you.</h3>
            <p>
              Export PNG, SVG, PDF, and more. Save an editable project backup
              for next time.
            </p>
          </article>
        </div>
      </section>
      <section className="privacy-section" id="your-device">
        <div className="privacy-art" aria-hidden="true">
          <div className="privacy-orbit orbit-one" />
          <div className="privacy-orbit orbit-two" />
          <div className="privacy-orbit orbit-three" />
          <div className="privacy-center">
            <LockKeyhole size={42} />
          </div>
          <span className="orbit-label label-a">
            <ImagePlus size={14} />
            Your images
          </span>
          <span className="orbit-label label-b">
            <Layers size={14} />
            Your projects
          </span>
          <span className="orbit-label label-c">
            <Sparkles size={14} />
            Your ideas
          </span>
          <span className="orbit-spark">✳</span>
        </div>
        <div className="privacy-copy">
          <div className="section-eyebrow">YOUR DEVICE IS THE STUDIO.</div>
          <h2>
            Your work is yours.
            <br />
            <em>Let’s keep it that way.</em>
          </h2>
          <p>
            Your images are processed in your browser. Your projects are saved
            on your device. Even the AI runs locally, using model files served
            by this website.
          </p>
          <div className="privacy-points">
            <span>
              <ShieldCheck size={17} />
              No image uploads. No remote processing.
            </span>
            <span>
              <WifiOff size={17} />
              Works offline after the app and tools are cached.
            </span>
            <span>
              <LockKeyhole size={17} />
              No accounts, subscriptions, or tracking.
            </span>
          </div>
          <Link href="/editor" className="privacy-link">
            A little peace of mind. A lot of possibility.
            <MoveUpRight size={15} />
          </Link>
        </div>
      </section>
      <section className="final-cta">
        <span className="cta-star">✳</span>
        <div className="section-eyebrow">GO ON. SEE WHAT HAPPENS.</div>
        <h2>
          Something good
          <br />
          starts with <em>you.</em>
        </h2>
        <Link href="/editor" className="landing-cta">
          Open your canvas
          <ArrowUpRight size={18} />
        </Link>
        <p>Free to create. Private by design.</p>
        <span className="cta-scribble">
          make a little
          <br />
          something ↗
        </span>
      </section>
      <footer className="landing-footer">
        <Link href="/" className="landing-brand">
          <span className="landing-mark">
            u<span>✦</span>
          </span>
          UnCanva
        </Link>
        <span>A little space for your big ideas.</span>
        <div>
          <a href="#your-device">Privacy, by design</a>
          <Link href="/editor">
            Let’s create
            <ArrowUpRight size={13} />
          </Link>
        </div>
        <small>© {new Date().getFullYear()} UnCanva</small>
      </footer>
    </main>
  );
}
