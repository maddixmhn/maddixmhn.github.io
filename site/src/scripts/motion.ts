import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);

const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const rtl = document.documentElement.dir === "rtl";
let lenis: Lenis | null = null;

if (!reduced) {
  lenis = new Lenis({ lerp: 0.09 });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis?.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    const target = document.querySelector<HTMLElement>(link.getAttribute("href") || "");
    if (!target || !lenis) return;
    event.preventDefault();
    lenis.scrollTo(target, { offset: -84 });
    history.replaceState(null, "", link.hash);
  });
});

const mm = gsap.matchMedia();

mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
  const pin = document.querySelector<HTMLElement>(".journey-pin");
  const stack = document.querySelector<HTMLElement>(".stack");
  const hero = document.querySelector<HTMLElement>(".hero-copy");
  const planes = gsap.utils.toArray<HTMLElement>(".plane");
  const copies = gsap.utils.toArray<HTMLElement>(".layer");
  if (!pin || !stack || !hero || planes.length === 0) return;

  const twist = rtl ? 38 : -38;
  gsap.set(stack, { rotationX: 58, rotationZ: twist, transformPerspective: 1800 });
  planes.forEach((plane, i) => gsap.set(plane, { z: (i - 1.5) * 26 }));

  const timeline = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: { trigger: pin, start: "top top", end: `+=${window.innerHeight * 4.2}`, pin: true, scrub: 0.8, anticipatePin: 1 },
  });

  timeline
    .to(hero, { autoAlpha: 0, y: -60, duration: 0.5 }, 0.05)
    .to(stack, { rotationZ: twist * 0.55, rotationX: 62, duration: 1 }, 0)
    .to(planes, { z: (i) => (i - 1.5) * 150, duration: 1 }, 0);

  copies.forEach((copy, k) => {
    const at = 0.6 + k;
    timeline.fromTo(copy, { autoAlpha: 0, y: 34 }, { autoAlpha: 1, y: 0, duration: 0.3 }, at);
    planes.forEach((plane, i) => {
      const onTop = planes.length - 1 - i === k;
      timeline.to(plane, { opacity: onTop ? 1 : 0.24, duration: 0.3 }, at);
    });
    if (k < copies.length - 1) timeline.to(copy, { autoAlpha: 0, y: -34, duration: 0.25 }, at + 0.72);
  });
  timeline.to({}, { duration: 0.3 });
});

mm.add("(prefers-reduced-motion: no-preference)", () => {
  gsap.utils.toArray<HTMLElement>(".shot").forEach((frame) => {
    const image = frame.querySelector<HTMLElement>("img");
    if (!image) return;
    gsap.to(image, {
      y: () => Math.min(0, frame.clientHeight - image.offsetHeight),
      ease: "none",
      scrollTrigger: { trigger: frame, start: "top 88%", end: "bottom 12%", scrub: 0.6, invalidateOnRefresh: true },
    });
  });

  document.querySelectorAll<HTMLElement>("[data-hue]").forEach((section) => {
    ScrollTrigger.create({
      trigger: section,
      start: "top 60%",
      end: "bottom 60%",
      onToggle: (self) => {
        if (self.isActive) window.dispatchEvent(new CustomEvent("nebula:hue", { detail: Number(section.dataset.hue) }));
      },
    });
  });
});

document.querySelector("details.more")?.addEventListener("toggle", () => {
  ScrollTrigger.refresh();
  lenis?.resize();
});

document.fonts?.ready.then(() => ScrollTrigger.refresh());
