import { useEffect, useRef } from 'react';

export default function SciFiWireframe() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    let animationId: number | undefined;
    let rotation = 0;
    let pulseTime = 0;

    // Particles for background effect
    const particles = Array.from({ length: 100 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      z: Math.random() * 1000,
      speed: Math.random() * 2 + 1
    }));

    const draw = () => {
      // Background
      ctx.fillStyle = '#0E0E0E';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Animated particles (stars)
      particles.forEach(p => {
        p.z -= p.speed;
        if (p.z <= 0) {
          p.z = 1000;
          p.x = Math.random() * canvas.width;
          p.y = Math.random() * canvas.height;
        }

        const x = (p.x - canvas.width / 2) * (1000 / p.z) + canvas.width / 2;
        const y = (p.y - canvas.height / 2) * (1000 / p.z) + canvas.height / 2;
        const size = (1 - p.z / 1000) * 2;

        ctx.fillStyle = `rgba(234, 234, 234, ${1 - p.z / 1000})`;
        ctx.fillRect(x, y, size, size);
      });

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const size = Math.min(canvas.width, canvas.height) * 0.25;
      const pulse = Math.sin(pulseTime) * 0.2 + 1;

      ctx.save();
      ctx.translate(centerX, centerY);

      // Outer rotating rings
      for (let ring = 0; ring < 3; ring++) {
        ctx.save();
        ctx.rotate(rotation * (ring % 2 === 0 ? 1 : -1) * (ring + 1) * 0.5);

        const ringSize = size * (1.5 + ring * 0.5) * pulse;
        ctx.strokeStyle = `rgba(234, 234, 234, ${0.3 - ring * 0.08})`;
        ctx.lineWidth = 2;

        // Hexagon ring
        ctx.beginPath();
        for (let i = 0; i <= 6; i++) {
          const angle = (Math.PI / 3) * i;
          const x = Math.cos(angle) * ringSize;
          const y = Math.sin(angle) * ringSize;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Dots on vertices
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i;
          const x = Math.cos(angle) * ringSize;
          const y = Math.sin(angle) * ringSize;

          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.fillStyle = '#EAEAEA';
          ctx.fill();

          // Glowing effect
          ctx.beginPath();
          ctx.arc(x, y, 6, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(234, 234, 234, 0.3)`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        ctx.restore();
      }

      // Central rotating cube
      ctx.rotate(rotation);

      const points3D = [
        [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
        [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]
      ];

      const rotateY = (point: number[], angle: number) => {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return [
          point[0] * cos + point[2] * sin,
          point[1],
          -point[0] * sin + point[2] * cos
        ];
      };

      const rotateX = (point: number[], angle: number) => {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return [
          point[0],
          point[1] * cos - point[2] * sin,
          point[1] * sin + point[2] * cos
        ];
      };

      const project = (point: number[]) => {
        const scale = 300 / (300 + point[2] * 80);
        return [point[0] * size * scale * pulse, point[1] * size * scale * pulse, point[2]];
      };

      const rotatedPoints = points3D.map(p => {
        let point = rotateY(p, rotation * 1.5);
        point = rotateX(point, rotation * 0.8);
        return project(point);
      });

      // Draw cube edges with glow
      const edges = [
        [0, 1], [1, 2], [2, 3], [3, 0],
        [4, 5], [5, 6], [6, 7], [7, 4],
        [0, 4], [1, 5], [2, 6], [3, 7]
      ];

      // Glow effect
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#EAEAEA';

      edges.forEach(([i, j]) => {
        const depth = (rotatedPoints[i][2] + rotatedPoints[j][2]) / 2;
        const alpha = (depth + 1) / 2;

        ctx.strokeStyle = `rgba(234, 234, 234, ${alpha})`;
        ctx.lineWidth = 3;

        ctx.beginPath();
        ctx.moveTo(rotatedPoints[i][0], rotatedPoints[i][1]);
        ctx.lineTo(rotatedPoints[j][0], rotatedPoints[j][1]);
        ctx.stroke();
      });

      ctx.shadowBlur = 0;

      // Draw corner nodes with glow
      rotatedPoints.forEach(point => {
        const depth = point[2];
        const alpha = (depth + 1) / 2;
        const nodeSize = 5 + pulse * 2;

        // Outer glow
        ctx.beginPath();
        ctx.arc(point[0], point[1], nodeSize * 2, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(234, 234, 234, ${alpha * 0.3})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Inner node
        ctx.beginPath();
        ctx.arc(point[0], point[1], nodeSize, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(234, 234, 234, ${alpha})`;
        ctx.fill();
      });

      // Central sphere with pulse
      ctx.beginPath();
      ctx.arc(0, 0, 15 * pulse, 0, Math.PI * 2);
      ctx.fillStyle = '#EAEAEA';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(0, 0, 25 * pulse, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(234, 234, 234, 0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.restore();

      // Scanning lines
      const scanCount = 5;
      ctx.strokeStyle = 'rgba(234, 234, 234, 0.2)';
      ctx.lineWidth = 1;
      for (let i = 0; i < scanCount; i++) {
        const y = ((pulseTime * 50 + i * canvas.height / scanCount) % canvas.height);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Corner HUD elements
      const cornerSize = 40;
      const corners = [
        [30, 30], [canvas.width - 30, 30],
        [30, canvas.height - 30], [canvas.width - 30, canvas.height - 30]
      ];

      ctx.strokeStyle = '#EAEAEA';
      ctx.lineWidth = 2;

      corners.forEach(([x, y], i) => {
        // L-shaped corners
        ctx.beginPath();
        if (i === 0) {
          ctx.moveTo(x + cornerSize, y);
          ctx.lineTo(x, y);
          ctx.lineTo(x, y + cornerSize);
        } else if (i === 1) {
          ctx.moveTo(x - cornerSize, y);
          ctx.lineTo(x, y);
          ctx.lineTo(x, y + cornerSize);
        } else if (i === 2) {
          ctx.moveTo(x, y - cornerSize);
          ctx.lineTo(x, y);
          ctx.lineTo(x + cornerSize, y);
        } else {
          ctx.moveTo(x, y - cornerSize);
          ctx.lineTo(x, y);
          ctx.lineTo(x - cornerSize, y);
        }
        ctx.stroke();

        // Small crosses near corners
        const crossSize = 8;
        const offset = 50;
        ctx.beginPath();
        if (i === 0) {
          ctx.moveTo(x + offset - crossSize, y + offset);
          ctx.lineTo(x + offset + crossSize, y + offset);
          ctx.moveTo(x + offset, y + offset - crossSize);
          ctx.lineTo(x + offset, y + offset + crossSize);
        }
        ctx.stroke();
      });

      // Circular HUD in corners
      ctx.strokeStyle = 'rgba(234, 234, 234, 0.5)';
      ctx.lineWidth = 1;
      corners.forEach(([x, y], i) => {
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(x, y, 15, rotation * (i % 2 === 0 ? 1 : -1), rotation * (i % 2 === 0 ? 1 : -1) + Math.PI);
        ctx.stroke();
      });

      rotation += 0.015;
      pulseTime += 0.03;
      animationId = requestAnimationFrame(draw);
    };

    draw();

    const handleResize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#0E0E0E]">
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full"
      />

      {/* HUD Text Overlays */}
      <div className="absolute top-8 left-8 font-mono text-[#EAEAEA] text-sm space-y-1 pointer-events-none">
        <div className="opacity-70">SYSTEM: <span className="opacity-100">ACTIVE</span></div>
        <div className="opacity-70">SCAN: <span className="opacity-100">IN PROGRESS</span></div>
        <div className="opacity-70">RENDER: <span className="opacity-100">3D WIREFRAME</span></div>
        <div className="opacity-70 mt-4">STATUS: <span className="text-[#EAEAEA]">OPERATIONAL</span></div>
      </div>

      <div className="absolute bottom-8 right-8 font-mono text-[#EAEAEA] text-xs space-y-1 text-right pointer-events-none">
        <div className="opacity-70">FRAMERATE: <span className="opacity-100">60 FPS</span></div>
        <div className="opacity-70">LATENCY: <span className="opacity-100">12ms</span></div>
        <div className="opacity-70">COORDS: <span className="opacity-100">[0,0,0]</span></div>
      </div>

      <div className="absolute top-8 right-8 font-mono text-[#EAEAEA] text-xs pointer-events-none">
        <div className="border border-[#EAEAEA] border-opacity-30 p-3 backdrop-blur-sm">
          <div className="opacity-70 mb-1">WIREFRAME ENGINE v2.1</div>
          <div className="opacity-50 text-[10px]">ANTHROPIC SYSTEMS</div>
        </div>
      </div>
    </div>
  );
}