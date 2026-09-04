import { CodeSnippetBridge } from "@/components/code-snippet-bridge";
import { Hero } from "@/components/hero";
import { SiteFooter } from "@/components/site-footer";
import { StudioIntro } from "@/components/studio-intro";
import { VoiceStudio } from "@/components/voice-studio/voice-studio";

export default function Home() {
  return (
    <div className="pageShell">
      <Hero />
      <main>
        <CodeSnippetBridge />
        <section id="studio" className="studio">
          <div className="studioInner">
            <StudioIntro />
            <VoiceStudio />
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
