import { Mesh, Program, Renderer, Triangle } from "ogl";
import { useEffect, useRef } from "react";

const VERTEX = `attribute vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }`;

const FRAGMENT = `precision mediump float;
uniform vec2 uSize;
uniform float uTime;
uniform float uHue;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 3; i++) { v += a * noise(p); p = p * 1.9 + vec2(1.7, 9.2); a *= 0.42; }
  return v;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uSize) / uSize.y;
  float t = uTime * 0.035;
  vec2 q = vec2(fbm(uv * 0.75 + t), fbm(uv * 0.75 - t + 4.0));
  vec2 r = vec2(fbm(uv * 0.6 + 1.4 * q + vec2(1.7, 9.2) + t), fbm(uv * 0.6 + 1.4 * q + vec2(8.3, 2.8)));
  float cloud = fbm(uv * 0.65 + 1.2 * r);

  vec3 void_ = vec3(0.043, 0.055, 0.157);
  vec3 halpha = vec3(1.0, 0.36, 0.48);
  vec3 oiii = vec3(0.26, 0.85, 0.81);
  vec3 sii = vec3(0.96, 0.73, 0.30);
  float phase = uHue * 1.57;
  vec3 a = mix(oiii, halpha, 0.5 + 0.5 * sin(phase));
  vec3 b = mix(halpha, sii, 0.5 + 0.5 * cos(phase));

  vec3 color = mix(void_, vec3(0.20, 0.13, 0.46), smoothstep(0.25, 0.62, cloud));
  color = mix(color, a, smoothstep(0.18, 0.62, q.x * cloud * 2.0) * 0.72);
  color = mix(color, b, smoothstep(0.26, 0.7, r.y * cloud * 2.0) * 0.6);
  color = mix(void_, color, 0.6);
  color *= 1.0 - 0.45 * length(uv);
  gl_FragColor = vec4(color, 1.0);
}`;

export default function NebulaBackground() {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || !host.current) return;
    let renderer: Renderer;
    try {
      // Low internal resolution: the clouds are soft, and this keeps phones cool.
      renderer = new Renderer({ dpr: 0.5, alpha: false, antialias: false, powerPreference: "low-power" });
    } catch {
      return; // No WebGL: the CSS gradient on .nebula remains.
    }
    const { gl } = renderer;
    const program = new Program(gl, {
      vertex: VERTEX,
      fragment: FRAGMENT,
      uniforms: { uTime: { value: 0 }, uHue: { value: 0 }, uSize: { value: [1, 1] } },
    });
    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });
    const canvas = gl.canvas as HTMLCanvasElement;
    host.current.appendChild(canvas);

    const resize = () => {
      renderer.setSize(innerWidth, innerHeight);
      program.uniforms.uSize.value = [gl.drawingBufferWidth, gl.drawingBufferHeight];
    };
    resize();
    addEventListener("resize", resize);

    let targetHue = 0;
    const onHue = (event: Event) => { targetHue = (event as CustomEvent<number>).detail; };
    addEventListener("nebula:hue", onHue);

    let frame = 0;
    let last = 0;
    const draw = (now: number) => {
      frame = requestAnimationFrame(draw);
      if (document.hidden || now - last < 33) return;
      last = now;
      program.uniforms.uTime.value = now * 0.001;
      program.uniforms.uHue.value += (targetHue - program.uniforms.uHue.value) * 0.04;
      renderer.render({ scene: mesh });
    };
    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      removeEventListener("resize", resize);
      removeEventListener("nebula:hue", onHue);
      canvas.remove();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  return <div ref={host} className="nebula" aria-hidden="true" />;
}
