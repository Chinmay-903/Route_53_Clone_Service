'use client';

import { useEffect, useRef } from 'react';

/**
 * A slowly rotating wireframe globe with a marker per hosted zone.
 *
 * DNS is the internet's address book, and a globe is the one image that says
 * so without a caption. The markers are placed from a hash of each zone's name
 * rather than at random, so a given zone keeps its position across reloads —
 * random placement would make the globe look like it was reshuffling data every
 * time the page was opened.
 *
 * Drawn with a hand-rolled orthographic projection rather than a 3D library:
 * the whole thing is a sine and a cosine per point, and pulling in three.js for
 * that would cost more than the rest of the page put together.
 */

interface Marker {
  /** Radians. */
  latitude: number;
  longitude: number;
  label: string;
}

export function Globe({
  zoneNames,
  className,
}: {
  zoneNames: string[];
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Held in a ref so a change of zones does not tear down and restart the
  // animation loop — the loop reads the latest value on its next frame.
  const markersRef = useRef<Marker[]>([]);

  markersRef.current = zoneNames.map((name) => {
    const hash = hashString(name);
    return {
      // Biased away from the poles, where an orthographic projection crowds
      // everything into a few pixels.
      latitude: (((hash % 1000) / 1000) * 1.4 - 0.7),
      longitude: (((hash >> 10) % 1000) / 1000) * Math.PI * 2,
      label: name,
    };
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width = 0;
    let height = 0;
    let radius = 0;
    let rotation = 0;
    let frame = 0;
    let running = true;

    let brand = 'rgb(107,93,242)';
    let line = 'rgb(148,163,184)';

    function readTheme() {
      const styles = getComputedStyle(document.documentElement);
      brand = styles.getPropertyValue('--brand-500').trim() || brand;
      line = styles.getPropertyValue('--border-strong').trim() || line;
    }

    function resize() {
      const bounds = canvas!.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);

      width = bounds.width;
      height = bounds.height;
      canvas!.width = Math.floor(width * ratio);
      canvas!.height = Math.floor(height * ratio);
      context!.setTransform(ratio, 0, 0, ratio, 0, 0);

      // Leaves room for the marker halos, which extend past the sphere.
      radius = Math.min(width, height) * 0.4;
      readTheme();
    }

    /**
     * Orthographic projection.
     *
     * Returns the screen position plus `depth`, which is positive on the half
     * of the sphere facing the viewer. Everything with negative depth is
     * either hidden or drawn faintly, which is what gives the wireframe its
     * sense of volume.
     */
    function project(latitude: number, longitude: number) {
      const x = Math.cos(latitude) * Math.sin(longitude + rotation);
      const y = Math.sin(latitude);
      const z = Math.cos(latitude) * Math.cos(longitude + rotation);

      return {
        x: width / 2 + x * radius,
        y: height / 2 - y * radius,
        depth: z,
      };
    }

    function draw(time: number) {
      context!.clearRect(0, 0, width, height);
      const centreX = width / 2;
      const centreY = height / 2;

      // The sphere's own edge, plus a soft interior wash that reads as
      // atmosphere rather than as a flat disc.
      const wash = context!.createRadialGradient(
        centreX - radius * 0.3,
        centreY - radius * 0.3,
        radius * 0.1,
        centreX,
        centreY,
        radius,
      );
      wash.addColorStop(0, withAlpha(brand, 0.12));
      wash.addColorStop(1, withAlpha(brand, 0.01));

      context!.fillStyle = wash;
      context!.beginPath();
      context!.arc(centreX, centreY, radius, 0, Math.PI * 2);
      context!.fill();

      context!.strokeStyle = withAlpha(line, 0.5);
      context!.lineWidth = 1;
      context!.beginPath();
      context!.arc(centreX, centreY, radius, 0, Math.PI * 2);
      context!.stroke();

      // Parallels ----------------------------------------------------------
      for (let index = -4; index <= 4; index += 1) {
        const latitude = (index / 5) * (Math.PI / 2);
        const ringRadius = Math.cos(latitude) * radius;
        const ringY = centreY - Math.sin(latitude) * radius;

        context!.strokeStyle = withAlpha(line, 0.24);
        context!.beginPath();
        // Drawn as an ellipse rather than a circle: a parallel seen edge-on
        // from a distance is flattened, and drawing it round is the classic
        // tell of a fake globe.
        context!.ellipse(centreX, ringY, ringRadius, ringRadius * 0.22, 0, 0, Math.PI * 2);
        context!.stroke();
      }

      // Meridians -----------------------------------------------------------
      for (let index = 0; index < 12; index += 1) {
        const longitude = (index / 12) * Math.PI * 2;

        context!.beginPath();
        let started = false;

        for (let step = -20; step <= 20; step += 1) {
          const latitude = (step / 20) * (Math.PI / 2);
          const point = project(latitude, longitude);
          // Only the near half is drawn, so meridians disappear round the back
          // instead of doubling up over the front.
          if (point.depth < 0) {
            started = false;
            continue;
          }
          if (!started) {
            context!.moveTo(point.x, point.y);
            started = true;
          } else {
            context!.lineTo(point.x, point.y);
          }
        }

        context!.strokeStyle = withAlpha(line, 0.24);
        context!.stroke();
      }

      // Markers -------------------------------------------------------------
      for (const [index, marker] of markersRef.current.entries()) {
        const point = project(marker.latitude, marker.longitude);
        if (point.depth < 0) continue;

        // Fades in as it rotates into view rather than popping at the limb.
        const alpha = Math.min(1, point.depth * 2.2);
        const pulse = reduceMotion
          ? 0
          : (Math.sin(time * 0.0018 + index * 0.9) + 1) / 2;

        context!.fillStyle = withAlpha(brand, alpha * 0.22);
        context!.beginPath();
        context!.arc(point.x, point.y, 3 + pulse * 7, 0, Math.PI * 2);
        context!.fill();

        context!.fillStyle = withAlpha(brand, alpha);
        context!.beginPath();
        context!.arc(point.x, point.y, 2.6, 0, Math.PI * 2);
        context!.fill();
      }
    }

    function step(time: number) {
      if (!running) return;
      rotation += 0.0016;
      draw(time);
      frame = requestAnimationFrame(step);
    }

    resize();

    if (reduceMotion) {
      draw(0);
    } else {
      frame = requestAnimationFrame(step);
    }

    const resizeObserver = new ResizeObserver(() => {
      resize();
      if (reduceMotion) draw(0);
    });
    resizeObserver.observe(canvas);

    function handleVisibility() {
      if (reduceMotion) return;
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(frame);
      } else if (!running) {
        running = true;
        frame = requestAnimationFrame(step);
      }
    }
    document.addEventListener('visibilitychange', handleVisibility);

    const themeObserver = new MutationObserver(() => {
      readTheme();
      if (reduceMotion) draw(0);
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => {
      running = false;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      themeObserver.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      // Decorative: the zone count beside it carries the information, and a
      // canvas has nothing a screen reader could usefully announce.
      aria-hidden="true"
    />
  );
}

/** A stable 32-bit hash, so a zone keeps its position between page loads. */
function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

/**
 * Applies an alpha to a colour that arrived from a custom property.
 *
 * The tokens resolve to `#rrggbb` or `rgb(r g b)` depending on how they were
 * authored, and neither form takes an alpha directly — so this normalises both
 * into `rgb(r g b / a)`.
 */
function withAlpha(colour: string, alpha: number): string {
  const trimmed = colour.trim();

  if (trimmed.startsWith('#')) {
    const hex = trimmed.slice(1);
    const full =
      hex.length === 3
        ? hex
            .split('')
            .map((character) => character + character)
            .join('')
        : hex;
    const value = Number.parseInt(full, 16);
    const r = (value >> 16) & 255;
    const g = (value >> 8) & 255;
    const b = value & 255;
    return `rgb(${r} ${g} ${b} / ${alpha})`;
  }

  // `rgb(r, g, b)` or `rgb(r g b)` — strip the wrapper and re-emit with alpha.
  const numbers = trimmed.match(/[\d.]+/g);
  if (numbers && numbers.length >= 3) {
    return `rgb(${numbers[0]} ${numbers[1]} ${numbers[2]} / ${alpha})`;
  }

  return trimmed;
}
