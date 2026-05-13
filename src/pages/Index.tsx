import { useEffect, useState } from "react";
import { CTABanner } from "@/components/CTABanner";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { Metrics } from "@/components/Metrics";
import { ScanDialog } from "@/components/ScanDialog";
import { SiteFooter, SiteHeader, WhatsAppFab } from "@/components/SiteChrome";
import { TrustStrip } from "@/components/TrustStrip";

const Index = () => {
  const [scanOpen, setScanOpen] = useState(false);
  const [introHidden, setIntroHidden] = useState(false);

  useEffect(() => {
    // Intro curtain — copiado de src/design-reference/A2-scan.js linhas 7-12
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(() => setIntroHidden(true), reduce ? 400 : 2200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    // Console easter egg
    console.log(
      "%c impulso+ %cFaceScan ",
      "background:#0A0A0A;color:#F6F3EE;font:500 14px Inter;padding:4px 8px;border-radius:4px 0 0 4px;",
      "background:#0294E8;color:#fff;font:500 14px Inter;padding:4px 8px;border-radius:0 4px 4px 0;",
    );
    console.log(
      "%c Curioso como isso funciona? contato@impulsomais.app",
      "color:#6B6B6B;font:400 12px Inter;",
    );
  }, []);

  // Scroll reveal — copiado de src/design-reference/A2-scan.js linhas 21-29.
  // Re-roda quando o intro termina (porque os steps/tiles podem já estar no
  // viewport antes do observer ser criado).
  useEffect(() => {
    if (!introHidden) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e, i) => {
          if (e.isIntersecting) {
            setTimeout(() => e.target.classList.add("in"), i * 70);
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
    );
    document
      .querySelectorAll(".step, .metric-tile")
      .forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [introHidden]);

  return (
    <div className="relative min-h-screen">
      {/* Intro curtain — markup das linhas 822-829 do A2-clean-premium.html */}
      <div id="intro" className={introHidden ? "hidden" : ""} aria-hidden={introHidden}>
        <div className="intro-stage">
          <div className="intro-line" />
          <img
            src="/shared/logo-impulso.png"
            alt="impulso+"
            style={{
              height: 72,
              width: "auto",
              opacity: 0,
              animation: "fadeUp .8s var(--ease) .55s forwards",
            }}
          />
          <div className="intro-sub">
            <span className="dot" />
            FaceScan · Sinais vitais em 60 segundos
          </div>
        </div>
      </div>

      <SiteHeader />
      <main>
        <Hero onStart={() => setScanOpen(true)} />
        <TrustStrip />
        <HowItWorks />
        <Metrics />
        <CTABanner onStart={() => setScanOpen(true)} />
      </main>
      <SiteFooter />

      <WhatsAppFab />

      <ScanDialog open={scanOpen} onOpenChange={setScanOpen} />
    </div>
  );
};

export default Index;
