"use client";

import { motion } from "framer-motion";
import { CONTAINER_MAX_CLASS, SECTION_PADDING_X } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

/** Small uppercase label above sections — KPR/Awwwards style */
const SectionLabel = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <p
    className={cn(
      "body-font text-xs sm:text-sm text-[#EAEAEA]/50 tracking-[0.35em] uppercase mb-4",
      className
    )}
  >
    {children}
  </p>
);

/** Section headline */
const SectionHeadline = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <h2
    className={cn(
      "test-font font-medium text-[#EAEAEA] text-[clamp(2rem,5vw,3.5rem)] leading-tight mb-6",
      className
    )}
  >
    {children}
  </h2>
);

/** Body paragraph */
const Body = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <p className={cn("body-font text-base text-[#EAEAEA]/80 leading-relaxed", className)}>
    {children}
  </p>
);

/** Media block — use src for real image/video from the Awwwards page, or shows placeholder */
const MediaBlock = ({
  label,
  aspectRatio = "16/9",
  className = "",
  caption,
  src,
}: {
  label: string;
  aspectRatio?: string;
  className?: string;
  caption?: string;
  /** Optional: image or video URL (e.g. from Awwwards page) */
  src?: string;
}) => (
  <figure className={cn("my-8", className)}>
    <div
      className="w-full rounded-sm border border-[#EAEAEA]/15 bg-[#0a0a0a] flex items-center justify-center overflow-hidden"
      style={{ aspectRatio }}
      aria-label={label}
    >
      {src ? (
        src.endsWith(".mp4") || src.includes("video") ? (
          <video
            src={src}
            className="w-full h-full object-cover"
            controls
            muted
            loop
            playsInline
            aria-label={label}
          />
        ) : (
          <img
            src={src}
            alt={label}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        )
      ) : (
        <span className="body-font text-sm text-[#EAEAEA]/30 tracking-wider uppercase">
          {label}
        </span>
      )}
    </div>
    {caption && (
      <figcaption className="mt-2 body-font text-sm text-[#EAEAEA]/50">{caption}</figcaption>
    )}
  </figure>
);

/** Pull quote */
const Quote = ({ children }: { children: React.ReactNode }) => (
  <blockquote className="border-l-2 border-[#EAEAEA]/30 pl-6 py-2 my-8 body-font text-lg sm:text-xl text-[#EAEAEA]/90 italic">
    {children}
  </blockquote>
);

const fadeIn = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
};

export default function Article() {
  return (
    <article className="min-h-screen bg-[#070707] text-[#EAEAEA]">
      <div className={cn("mx-auto w-full", CONTAINER_MAX_CLASS, SECTION_PADDING_X)}>
        {/* Hero */}
        <header className="pt-[20vh] pb-16 sm:pt-[24vh] sm:pb-24 border-b border-[#EAEAEA]/20">
          <motion.p
            className="body-font text-sm text-[#EAEAEA]/50 tracking-[0.3em] uppercase mb-4"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            Feb 3, 2023
          </motion.p>
          <motion.h1
            className="test-font font-medium text-[clamp(2.5rem,8vw,5rem)] leading-[0.95] mb-4"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            KPR by Resn wins SOTM December
          </motion.h1>
          <motion.p
            className="body-font text-sm text-[#EAEAEA]/60 flex items-center gap-2"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <span className="px-2 py-0.5 border border-[#EAEAEA]/25 text-[#EAEAEA]/80">Resn PRO</span>
            KPR by Resn wins SOTM December
          </motion.p>
        </header>

        {/* Intro */}
        <motion.div className="py-12 max-w-3xl" {...fadeIn}>
          <Body className="mb-6">
            Congrats to Resn for winning Site of the Month December 2022 for KPR, take a deep dive
            into the making of this immersive world here, thanks if you voted and tweeted, the
            winner of the pro plan is at the end of the article.
          </Body>
          <Body>
            KPR is a unique take on <strong className="text-[#EAEAEA]">Web3</strong> that combines
            art, community, and storytelling to create a new genre of media and entertainment. Our
            challenge was to build an online home for KPR—a living world with a rich story and
            digital collectibles that let visitors become active participants in the narrative.
            Leveraging layered interactive content and community engagement, we set out to create a
            captivating online universe that establishes KPR as a credible new brand in the Web3
            space.
          </Body>
        </motion.div>

        {/* CASE STUDY VIDEO */}
        <motion.section className="py-12" {...fadeIn}>
          <SectionLabel>CASE STUDY VIDEO</SectionLabel>
          <MediaBlock label="Video placeholder" aspectRatio="16/9" />
        </motion.section>

        {/* A Window to the Metaverse */}
        <motion.section className="py-12 border-t border-[#EAEAEA]/10" {...fadeIn}>
          <SectionHeadline>A Window to the Metaverse</SectionHeadline>
          <Body className="mb-6">
            From the outset, we knew that storytelling would be key to KPR's success. We wanted
            visitors to understand that "the Keep" is a living, breathing world with a deep
            backstory and vibrant characters. The collectibles act as portals to the world,
            transporting visitors between imagination and reality. They invite us to journey further
            into the Keep and discover more about the world and its inhabitants.
          </Body>
          <Body className="mb-8">
            We took this idea further with the home page, which plays with notions of perception and
            perspective. We combined 3D characters with 2D design elements, the interactive motion
            revealing a hidden dimension.
          </Body>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
            <div>
              <SectionLabel>INITIAL SCROLL</SectionLabel>
              <MediaBlock label="Initial scroll" aspectRatio="4/3" />
            </div>
            <div>
              <SectionLabel>3D CHARACTER</SectionLabel>
              <MediaBlock label="3D character" aspectRatio="4/3" />
            </div>
          </div>
          <Body className="mb-6">
            When scrolling through the site, visitors discover a series of immersive tableaux—the
            Keep, the Factions, and the World—depicted in a bold concept art style. The tableaux
            serve as a starting point, leaving room for the community to shape the story.
          </Body>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
            <div>
              <SectionLabel>PARALLAX</SectionLabel>
              <MediaBlock label="Parallax" aspectRatio="4/3" />
            </div>
            <div>
              <SectionLabel>TABLEAUX MOTION</SectionLabel>
              <MediaBlock label="Tableaux motion" aspectRatio="4/3" />
            </div>
          </div>
          <Quote>
            "The tableaux serve as a starting point, leaving room for the community to shape the
            story."
          </Quote>
        </motion.section>

        {/* Glimpses of a Rich World */}
        <motion.section className="py-12 border-t border-[#EAEAEA]/10" {...fadeIn}>
          <SectionHeadline>Glimpses of a Rich World</SectionHeadline>
          <Body className="mb-8">
            New Eden is humanity's final refuge. The Keep is its last stronghold. We show glimpses of
            this world using an interactive second layer, accessible through the click-and-hold
            interaction. With this technique, we can provide insights into the lives, interests and
            activites of the inhabitants of New Eden.
          </Body>
          <SectionLabel>CLICK-AND-HOLD</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 my-8">
            <MediaBlock label="THE GEOGRAPHY" aspectRatio="1" />
            <MediaBlock label="THE FACTIONS" aspectRatio="1" />
            <MediaBlock label="THE LIFESTYLE" aspectRatio="1" />
          </div>
        </motion.section>

        {/* Sophisticated Design */}
        <motion.section className="py-12 border-t border-[#EAEAEA]/10" {...fadeIn}>
          <SectionHeadline>Sophisticated Design</SectionHeadline>
          <Body className="mb-8">
            The challenge in designing KPR was to raise the bar with a fresh approach while
            preserving the brand's existing identity. Inspired by futuristic poster design and
            manga/comic book layouts, we crafted high-impact compositions that seamlessly blended
            CG elements and storytelling. We emphasised the grid and a clean, futuristic aesthetic
            through the prominent use of white space and bold typography. The final result of the
            design and art direction is to enhance and elevate the brand's foundation.
          </Body>
          <SectionLabel>DESIGN COMPOSITION</SectionLabel>
          <MediaBlock label="Desktop view — Design composition" aspectRatio="16/9" caption="Desktop view" />
          <Body className="mb-8 mt-8">
            To have unique and ownable typography, we paired the logotype with Whyte—a typeface
            featuring variable width and ink trap settings. This strengthened the consistency and
            tied the typographic language into the site.
          </Body>
          <SectionLabel>ABC WHYTE WITH VARIABLE WEIGHT & INK TRAP SETTINGS</SectionLabel>
          <MediaBlock label="Desktop view — Typography" aspectRatio="16/9" caption="Desktop view" />
          <Body className="mb-8 mt-8">
            We blended high-energy animation with elegant movement to create a balanced and
            captivating motion language. This approach can be seen everywhere from the interactive
            tableaux and dynamic text to the hover effects and micro-interactions.
          </Body>
          <SectionLabel>SITE ANIMATION</SectionLabel>
          <MediaBlock label="Site animation" aspectRatio="16/9" />
        </motion.section>

        {/* Technologies */}
        <motion.section className="py-12 border-t border-[#EAEAEA]/10" {...fadeIn}>
          <SectionHeadline>Technologies</SectionHeadline>

          <div className="mt-10">
            <h3 className="test-font font-medium text-xl text-[#EAEAEA] mb-2">Loader Reveal</h3>
            <Body className="mb-4">
              The KPR logo features a progressive gradient reveal created in After Effects by
              stacking frames with varying levels of opacity. The code reads the color value and
              selects the appropriate frame to display. We then used a sprite sheet and signed
              distance fields (SDFs) to create the morphing/bleeding effect of the elements around
              the logo.
            </Body>
            <SectionLabel>KPR LOGO REVEAL</SectionLabel>
            <MediaBlock label="Desktop view — Full loader reveal" aspectRatio="16/9" caption="Full loader reveal" />
          </div>

          <div className="mt-14">
            <h3 className="test-font font-medium text-xl text-[#EAEAEA] mb-2">Click-and-Hold</h3>
            <Body className="mb-4">
              We used After Effects Quick Exporter to quickly create sequences and layouts, then
              animated them in WebGL and HTML. The hold frames are flexible and the graphic
              elements position and scale themselves according to the frame layout. We accomplished
              this using only CSS transforms to keep the performance high.
            </Body>
            <SectionLabel>CLICK-AND-HOLD FRAMES</SectionLabel>
            <MediaBlock label="Click-and-hold frames" aspectRatio="16/9" />
          </div>

          <div className="mt-14">
            <h3 className="test-font font-medium text-xl text-[#EAEAEA] mb-2">Masking</h3>
            <Body className="mb-4">
              We used a WebGL technique called Stencil Buffer in which one 3D scene masks another.
              This technique applies to all windows, including card flipping and between
              second-layer windows. In addition to the visual effect, Stencil Buffer optimizes
              performance. It does this by discarding pixels outside the mask, so hidden scenes don't
              have to be rendered.
            </Body>
          </div>
        </motion.section>

        {/* Company Info */}
        <motion.section className="py-16 pb-24 border-t border-[#EAEAEA]/10" {...fadeIn}>
          <SectionHeadline>Company Info</SectionHeadline>
          <Body className="max-w-3xl">
            Resn is the world's friendliest evil corporation. We work in tireless pursuit of our
            fiendish goal to bring joy to millions of people. Over the past two decades, Resn has
            plotted and schemed to become a leader in the field of interactive development and
            design. We are in cahoots with some of the world's best-known brands and agencies and
            we will stop at nothing to bring a smile to your face.
          </Body>
          <p className="mt-8 body-font text-sm text-[#EAEAEA]/50 italic">
            Thank you for your vote and tweet @0xMorce, please DM us to collect your prize!
          </p>
        </motion.section>
      </div>
    </article>
  );
}
