import { useEffect, useRef } from "react";

/**
 * Original mathematical globe, not a copied image or brand mark.
 * Longitudes and depth-lit surface points orbit at a measured, calm pace.
 * Imperative SVG updates avoid React rerenders on every frame.
 */
const RADIUS = 348;
const POINT_COUNT = 168;
const MERIDIAN_COUNT = 24;
const MERIDIANS = Array.from({ length: MERIDIAN_COUNT }, (_, i) => i);
const LATITUDES = [-72, -58, -44, -30, -16, 0, 16, 30, 44, 58, 72];
const POINTS = Array.from({ length: POINT_COUNT }, (_, index) => {
  // Deterministic Fibonacci-sphere distribution, not random particles.
  const latitude = Math.asin(1 - (2 * (index + 0.5)) / POINT_COUNT);
  const longitude = index * Math.PI * (3 - Math.sqrt(5));
  return { latitude, longitude };
});

export default function OrbitalBackdrop() {
  const globeRef = useRef(null);

  useEffect(() => {
    const svg = globeRef.current;
    if (!svg) return undefined;
    const meridians = [...svg.querySelectorAll("[data-meridian]")];
    const points = [...svg.querySelectorAll("[data-point]")];
    const travelers = [...svg.querySelectorAll("[data-traveler]")];
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let previous = -100;
    let reduced = media.matches;

    const draw = (time) => {
      const angle = reduced ? 0.45 : time * Math.PI * 2 / 68000;
      meridians.forEach((ellipse, index) => {
        const phase = (index / MERIDIAN_COUNT) * Math.PI + angle;
        ellipse.setAttribute("rx", String(Math.max(1.5, Math.abs(Math.cos(phase)) * RADIUS)));
        ellipse.style.strokeOpacity = String(0.17 + 0.29 * Math.max(0, Math.sin(phase)));
      });
      points.forEach((circle, index) => {
        const { latitude, longitude } = POINTS[index];
        const theta = longitude + angle;
        const visibility = Math.cos(theta) * Math.cos(latitude);
        const x = RADIUS * Math.cos(latitude) * Math.sin(theta);
        const y = -RADIUS * Math.sin(latitude);
        circle.setAttribute("cx", x.toFixed(2));
        circle.setAttribute("cy", y.toFixed(2));
        circle.style.opacity = (visibility < 0 ? 0.03 : 0.21 + 0.59 * visibility).toFixed(3);
      });
      travelers.forEach((circle, index) => {
        // Tilted orbit, separate from the globe, with slow moving light points.
        const t = (reduced ? 0.75 : time * 0.00007) + Math.floor(index / 2) * Math.PI;
        const px = 600 + 460 * Math.cos(t);
        const py = 346 + 160 * Math.sin(t) - 0.13 * (px - 600);
        circle.setAttribute("cx", px.toFixed(2));
        circle.setAttribute("cy", py.toFixed(2));
      });
    };

    const tick = (time) => {
      if (!reduced && time - previous > 32 && !document.hidden) {
        draw(time);
        previous = time;
      }
      if (!reduced) frame = window.requestAnimationFrame(tick);
    };

    const onPreference = (event) => {
      reduced = event.matches;
      window.cancelAnimationFrame(frame);
      draw(0);
      if (!reduced) frame = window.requestAnimationFrame(tick);
    };

    draw(0);
    if (!reduced) frame = window.requestAnimationFrame(tick);
    media.addEventListener("change", onPreference);
    return () => {
      window.cancelAnimationFrame(frame);
      media.removeEventListener("change", onPreference);
    };
  }, []);

  return (
    <div className="orbital-backdrop" aria-hidden="true">
      <div className="orbital-dotfield" />
      <div className="orbital-halo" />
      <svg
        ref={globeRef}
        className="orbital-mesh"
        viewBox="0 0 1200 780"
        fill="none"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <radialGradient id="globe-surface">
            <stop offset="0" stopColor="#152035" stopOpacity=".31" />
            <stop offset=".72" stopColor="#0b1220" stopOpacity=".15" />
            <stop offset="1" stopColor="#080a0e" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="globe-stroke" x1="250" y1="0" x2="930" y2="730" gradientUnits="userSpaceOnUse">
            <stop stopColor="#5c9aab" stopOpacity=".66" />
            <stop offset=".42" stopColor="#6588c2" stopOpacity=".86" />
            <stop offset="1" stopColor="#9279b8" stopOpacity=".6" />
          </linearGradient>
          <linearGradient id="orbit-stroke" x1="180" y1="260" x2="1070" y2="500" gradientUnits="userSpaceOnUse">
            <stop stopColor="#3c7ea7" stopOpacity="0" />
            <stop offset=".3" stopColor="#62c8d2" stopOpacity=".39" />
            <stop offset=".67" stopColor="#6478bc" stopOpacity=".31" />
            <stop offset="1" stopColor="#9777bb" stopOpacity=".04" />
          </linearGradient>
          <radialGradient id="signal-glow">
            <stop stopColor="#d7fcf4" stopOpacity=".85" />
            <stop offset=".3" stopColor="#5ab9dd" stopOpacity=".45" />
            <stop offset="1" stopColor="#5ab9dd" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="mesh-fade">
            <stop stopColor="white" stopOpacity=".87" />
            <stop offset=".64" stopColor="white" stopOpacity=".6" />
            <stop offset="1" stopColor="black" stopOpacity=".12" />
          </radialGradient>
          <mask id="globe-fade"><circle cx="0" cy="0" r="350" fill="url(#mesh-fade)" /></mask>
          <clipPath id="globe-clip"><circle cx="0" cy="0" r="348" /></clipPath>
        </defs>

        <g className="globe-core" transform="translate(600 345)">
          <circle r={RADIUS} fill="url(#globe-surface)" />
          <circle r={RADIUS} stroke="#577999" strokeOpacity=".26" strokeWidth=".8" />
          <g mask="url(#globe-fade)" clipPath="url(#globe-clip)">
            <g stroke="url(#globe-stroke)" strokeWidth=".95">
              {MERIDIANS.map((position) => (
                <ellipse key={position} data-meridian cx="0" cy="0" rx={RADIUS} ry={RADIUS} />
              ))}
              {LATITUDES.map((latitude) => {
                const rad = latitude * Math.PI / 180;
                return (
                  <ellipse
                    key={latitude}
                    cx="0"
                    cy={(-RADIUS * Math.sin(rad)).toFixed(1)}
                    rx={(RADIUS * Math.cos(rad)).toFixed(1)}
                    ry={(45 * Math.cos(rad)).toFixed(1)}
                    strokeOpacity={Math.abs(latitude) > 50 ? ".18" : ".34"}
                  />
                );
              })}
            </g>
            <g>
              {POINTS.map((_, index) => (
                <circle key={index} data-point r={index % 7 === 0 ? "2.3" : "1.35"} fill={index % 9 === 0 ? "#f6e9d2" : index % 4 === 0 ? "#a68bc8" : "#65bcd1"} />
              ))}
            </g>
          </g>
        </g>

        <ellipse
          cx="600"
          cy="346"
          rx="460"
          ry="160"
          stroke="url(#orbit-stroke)"
          strokeWidth=".85"
          transform="rotate(-7.4 600 346)"
          strokeDasharray="2 8"
        />
        {[0, 1].map((index) => (
          <g key={index}>
            <circle data-traveler r="15" fill="url(#signal-glow)" />
            <circle data-traveler r="2.3" fill={index === 0 ? "#b1e2df" : "#b19ee1"} />
          </g>
        ))}
      </svg>
      <div className="orbital-vignette" />
    </div>
  );
}
