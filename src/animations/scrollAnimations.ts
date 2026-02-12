import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export const scrollAnimations = (camera: any) => {
  if (camera) {
    gsap.to(camera.position, {
      z: -10,
      scrollTrigger: {
        trigger: "body",
        start: "top top",
        end: "bottom bottom",
        scrub: 1,
      },
    });

    gsap.to(camera.rotation, {
      y: Math.PI / 2,
      scrollTrigger: {
        trigger: "body",
        start: "top top",
        end: "bottom bottom",
        scrub: 1,
      },
    });
  }
};
