import { gsap } from "gsap";

export const introAnimation = (heroRef: React.RefObject<HTMLDivElement>) => {
  const tl = gsap.timeline();

  if (heroRef.current) {
    const headline = heroRef.current.querySelectorAll("h1 span");
    const subtitle = heroRef.current.querySelectorAll("p span");
    const cta = heroRef.current.querySelector("button");

    tl.from(headline, { opacity: 0, y: 50, stagger: 0.05, duration: 0.8, ease: "power3.out" }, 0.5)
      .from(subtitle, { opacity: 0, y: 30, stagger: 0.03, duration: 0.6, ease: "power3.out" }, "-=0.4")
      .from(cta, { opacity: 0, y: 20, duration: 0.5, ease: "power3.out" }, "-=0.3");

    // Animación de la escena 3D (aún no implementada, solo un placeholder)
    tl.from(".canvas-container", { opacity: 0, duration: 1.5, ease: "power3.out" }, 0);
  }
};
