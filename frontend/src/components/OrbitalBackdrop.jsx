/**
 * Original SVG geometry inspired by celestial maps.
 * No external imagery, brand assets, or animation libraries are required.
 * Decorative: the background is hidden from assistive technology.
 */
const MERIDIANS = Array.from({ length: 23 }, (_, index) => index - 11);
const LATITUDES = Array.from({ length: 13 }, (_, index) => index - 6);

export default function OrbitalBackdrop() {
  return (
    <div className="orbital-backdrop" aria-hidden="true">
      <div className="orbital-halo" />
      <svg className="orbital-mesh" viewBox="0 0 1440 680" fill="none" preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="orbital-glow" cx="0" cy="0" r="1" gradientTransform="translate(720 235) rotate(90) scale(400 750)" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#304C8B" stopOpacity=".38" />
            <stop offset=".55" stopColor="#17253F" stopOpacity=".16" />
            <stop offset="1" stopColor="#0A0B0E" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="mesh-opacity" cx="0" cy="0" r="1" gradientTransform="translate(720 250) rotate(90) scale(350 730)" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="white" stopOpacity=".85" />
            <stop offset=".64" stopColor="white" stopOpacity=".7" />
            <stop offset="1" stopColor="black" stopOpacity="0" />
          </radialGradient>
          <mask id="orbital-fade">
            <rect width="1440" height="680" fill="url(#mesh-opacity)" />
          </mask>
        </defs>
        <ellipse cx="720" cy="235" rx="720" ry="400" fill="url(#orbital-glow)" />
        <g mask="url(#orbital-fade)" stroke="#879BC0" strokeWidth=".75" strokeOpacity=".33">
          <ellipse cx="720" cy="248" rx="650" ry="280" />
          {MERIDIANS.map((position) => {
            const radians = (position / 12) * (Math.PI / 2);
            return (
              <ellipse
                key={"meridian-" + position}
                cx="720"
                cy="248"
                rx={Math.max(8, Math.cos(radians) * 650)}
                ry="280"
              />
            );
          })}
          {LATITUDES.map((position) => {
            const t = position / 7;
            const scale = Math.sqrt(1 - t * t);
            return (
              <ellipse
                key={"latitude-" + position}
                cx="720"
                cy={248 + t * 280}
                rx={650 * scale}
                ry={Math.max(7, 30 * scale)}
              />
            );
          })}
        </g>
      </svg>
      <div className="orbital-vignette" />
    </div>
  );
}
