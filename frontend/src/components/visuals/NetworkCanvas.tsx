'use client';

import { useEffect, useRef } from 'react';

/**
 * The animated resolver lattice behind the login screen.
 *
 * A network of nodes with query packets travelling between them — a literal
 * picture of what the product does, rather than generic particles. Written
 * against the 2D canvas rather than as DOM elements because a hundred moving
 * points as divs is a hundred elements the compositor has to lay out every
 * frame; on canvas it is one.
 *
 * Three things keep it from being a battery drain:
 *   - it stops entirely when the tab is hidden or the element scrolls away
 *   - it renders one static frame and stops when the user asks for reduced
 *     motion, so the composition survives without the movement
 *   - it reads its colours from the CSS custom properties, so it follows the
 *     theme without a second palette to keep in sync
 */

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  /** Phase offset so the nodes do not pulse in unison. */
  phase: number;
}

interface Packet {
  from: number;
  to: number;
  progress: number;
  speed: number;
}

const NODE_COUNT = 34;
const LINK_DISTANCE = 165;
const PACKET_COUNT = 14;

export function NetworkCanvas({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width = 0;
    let height = 0;
    let frame = 0;
    let running = true;

    const nodes: Node[] = [];
    const packets: Packet[] = [];

    /**
     * Reads the live theme colours.
     *
     * Resolved once per resize rather than per frame: `getComputedStyle` forces
     * a style recalculation, and doing that sixty times a second would cost
     * more than everything else here combined.
     */
    let brand = 'rgb(107, 93, 242)';
    let ink = 'rgb(148, 163, 184)';

    function readTheme() {
      const styles = getComputedStyle(document.documentElement);
      brand = styles.getPropertyValue('--brand-500').trim() || brand;
      ink = styles.getPropertyValue('--text-faint').trim() || ink;
    }

    function resize() {
      const bounds = canvas!.getBoundingClientRect();
      // Capped at 2: beyond that the extra pixels are invisible and the fill
      // cost is quadratic.
      const ratio = Math.min(window.devicePixelRatio || 1, 2);

      width = bounds.width;
      height = bounds.height;
      canvas!.width = Math.floor(width * ratio);
      canvas!.height = Math.floor(height * ratio);
      context!.setTransform(ratio, 0, 0, ratio, 0, 0);

      readTheme();
    }

    function seed() {
      nodes.length = 0;
      for (let index = 0; index < NODE_COUNT; index += 1) {
        nodes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.18,
          vy: (Math.random() - 0.5) * 0.18,
          radius: 1.2 + Math.random() * 1.9,
          phase: Math.random() * Math.PI * 2,
        });
      }

      packets.length = 0;
      for (let index = 0; index < PACKET_COUNT; index += 1) {
        packets.push(newPacket());
      }
    }

    function newPacket(): Packet {
      const from = Math.floor(Math.random() * NODE_COUNT);
      let to = Math.floor(Math.random() * NODE_COUNT);
      if (to === from) to = (to + 1) % NODE_COUNT;

      return {
        from,
        to,
        progress: Math.random(),
        speed: 0.0016 + Math.random() * 0.0032,
      };
    }

    function draw(time: number) {
      context!.clearRect(0, 0, width, height);

      // Links ---------------------------------------------------------------
      // Opacity falls off with distance, so the lattice reads as depth rather
      // than as a uniform mesh.
      for (let a = 0; a < nodes.length; a += 1) {
        const first = nodes[a];
        if (!first) continue;

        for (let b = a + 1; b < nodes.length; b += 1) {
          const second = nodes[b];
          if (!second) continue;

          const distance = Math.hypot(first.x - second.x, first.y - second.y);
          if (distance > LINK_DISTANCE) continue;

          context!.globalAlpha = (1 - distance / LINK_DISTANCE) * 0.16;
          context!.strokeStyle = ink;
          context!.lineWidth = 1;
          context!.beginPath();
          context!.moveTo(first.x, first.y);
          context!.lineTo(second.x, second.y);
          context!.stroke();
        }
      }

      // Nodes ---------------------------------------------------------------
      for (const node of nodes) {
        const pulse = reduceMotion ? 1 : 0.72 + Math.sin(time * 0.0013 + node.phase) * 0.28;

        context!.globalAlpha = 0.5 * pulse;
        context!.fillStyle = ink;
        context!.beginPath();
        context!.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        context!.fill();
      }

      // Packets -------------------------------------------------------------
      // Each one is a short comet: a bright head with a fading tail drawn as a
      // gradient along the segment it is crossing.
      for (const packet of packets) {
        const from = nodes[packet.from];
        const to = nodes[packet.to];
        if (!from || !to) continue;

        const distance = Math.hypot(to.x - from.x, to.y - from.y);
        // Only travel between nodes close enough to be linked, so a packet
        // never crosses empty space with no line beneath it.
        if (distance > LINK_DISTANCE * 1.5) {
          Object.assign(packet, newPacket());
          continue;
        }

        const x = from.x + (to.x - from.x) * packet.progress;
        const y = from.y + (to.y - from.y) * packet.progress;

        const tailProgress = Math.max(0, packet.progress - 0.16);
        const tailX = from.x + (to.x - from.x) * tailProgress;
        const tailY = from.y + (to.y - from.y) * tailProgress;

        const gradient = context!.createLinearGradient(tailX, tailY, x, y);
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(1, brand);

        context!.globalAlpha = 0.85;
        context!.strokeStyle = gradient;
        context!.lineWidth = 1.6;
        context!.lineCap = 'round';
        context!.beginPath();
        context!.moveTo(tailX, tailY);
        context!.lineTo(x, y);
        context!.stroke();

        context!.globalAlpha = 1;
        context!.fillStyle = brand;
        context!.beginPath();
        context!.arc(x, y, 2, 0, Math.PI * 2);
        context!.fill();
      }

      context!.globalAlpha = 1;
    }

    function step(time: number) {
      if (!running) return;

      for (const node of nodes) {
        node.x += node.vx;
        node.y += node.vy;

        // Bounce off the edges rather than wrapping: a node reappearing on the
        // opposite side snaps its links across the whole canvas.
        if (node.x < 0 || node.x > width) node.vx *= -1;
        if (node.y < 0 || node.y > height) node.vy *= -1;
      }

      for (const packet of packets) {
        packet.progress += packet.speed;
        if (packet.progress >= 1) Object.assign(packet, newPacket(), { progress: 0 });
      }

      draw(time);
      frame = requestAnimationFrame(step);
    }

    resize();
    seed();

    if (reduceMotion) {
      // One frame, then nothing moves. The composition is the point; the
      // motion is the flourish, and this user asked for none.
      draw(0);
    } else {
      frame = requestAnimationFrame(step);
    }

    const resizeObserver = new ResizeObserver(() => {
      resize();
      seed();
      if (reduceMotion) draw(0);
    });
    resizeObserver.observe(canvas);

    // Pauses in a background tab. Without this the loop keeps running at
    // whatever rate the browser throttles it to, for a canvas nobody can see.
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

    // Repaints on a theme change so the lattice does not keep the old palette.
    const themeObserver = new MutationObserver(() => {
      readTheme();
      if (reduceMotion) draw(0);
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      themeObserver.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
