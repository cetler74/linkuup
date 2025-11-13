import React, { useEffect, useRef, useState } from 'react';

interface OriginalShaderBackgroundProps {
  className?: string;
  opacity?: number;
}

const OriginalShaderBackground: React.FC<OriginalShaderBackgroundProps> = ({ 
  className = '', 
  opacity = 0.97 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const animate = () => {
      if (!ctx) return;
      
      time += 0.008; // Match original speed
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const centerX = canvas.width * 0.5;
      const centerY = canvas.height * 0.5;
      const maxRadius = Math.max(canvas.width, canvas.height) * 0.8;
      
      // Create multiple overlapping gradients to simulate Swirl effect
      for (let i = 0; i < 3; i++) {
        const angle = time * 0.8 + i * Math.PI * 0.67;
        const radius = 150 + Math.sin(time * 0.5 + i) * 100;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        
        // Swirl gradient - exact colors from original
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, maxRadius * 0.6);
        gradient.addColorStop(0, `rgba(18, 119, 216, ${opacity * 0.8})`); // #1275d8
        gradient.addColorStop(0.5, `rgba(225, 145, 54, ${opacity * 0.6})`); // #e19136
        gradient.addColorStop(1, `rgba(0, 102, 255, ${opacity * 0.4})`); // #0066ff
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      
      // ChromaFlow effect - create flowing patterns
      for (let i = 0; i < 2; i++) {
        const flowAngle = time * 0.3 + i * Math.PI;
        const flowX = centerX + Math.cos(flowAngle) * 200;
        const flowY = centerY + Math.sin(flowAngle * 0.7) * 200;
        
        const flowGradient = ctx.createRadialGradient(
          flowX, flowY, 0,
          flowX, flowY, maxRadius * 0.4
        );
        
        // ChromaFlow colors from original
        flowGradient.addColorStop(0, `rgba(0, 102, 255, ${opacity * 0.7})`); // #0066ff
        flowGradient.addColorStop(0.3, `rgba(225, 145, 54, ${opacity * 0.5})`); // #e19136
        flowGradient.addColorStop(0.7, `rgba(209, 209, 209, ${opacity * 0.3})`); // #d1d1d1
        flowGradient.addColorStop(1, `rgba(0, 102, 255, ${opacity * 0.2})`); // #0066ff
        
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = flowGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      
      // Reset composite operation
      ctx.globalCompositeOperation = 'source-over';
      
      // Add swirling particles for texture
      ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.1})`;
      for (let i = 0; i < 30; i++) {
        const particleAngle = time * 2 + i * 0.2;
        const particleRadius = 50 + Math.sin(time + i) * 30;
        const x = centerX + Math.cos(particleAngle) * particleRadius;
        const y = centerY + Math.sin(particleAngle) * particleRadius;
        const size = Math.sin(time * 3 + i) * 2 + 3;
        
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Add flowing lines for ChromaFlow effect
      ctx.strokeStyle = `rgba(0, 102, 255, ${opacity * 0.3})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const lineAngle = time * 0.5 + i * Math.PI / 4;
        const x1 = centerX + Math.cos(lineAngle) * 100;
        const y1 = centerY + Math.sin(lineAngle) * 100;
        const x2 = centerX + Math.cos(lineAngle + 0.3) * 300;
        const y2 = centerY + Math.sin(lineAngle + 0.3) * 300;
        
        if (i === 0) {
          ctx.moveTo(x1, y1);
        } else {
          ctx.lineTo(x1, y1);
        }
        ctx.lineTo(x2, y2);
      }
      ctx.stroke();
      
      animationRef.current = requestAnimationFrame(animate);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Start animation
    animate();
    setIsLoaded(true);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [opacity]);

  return (
    <div className={`fixed inset-0 z-0 ${className}`}>
      <canvas
        ref={canvasRef}
        className={`w-full h-full transition-opacity duration-1000 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ 
          background: 'transparent',
          mixBlendMode: 'multiply'
        }}
      />
      {/* Black overlay exactly like original */}
      <div 
        className="absolute inset-0 bg-black/20"
        style={{ mixBlendMode: 'multiply' }}
      />
    </div>
  );
};

export default OriginalShaderBackground;
