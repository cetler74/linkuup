import React, { useEffect, useRef, useState } from 'react';

interface SimpleShaderBackgroundProps {
  className?: string;
  opacity?: number;
}

const SimpleShaderBackground: React.FC<SimpleShaderBackgroundProps> = ({ 
  className = '', 
  opacity = 0.5 
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
      
      time += 0.01; // Slower, more gentle animation
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const centerX = canvas.width * 0.5;
      const centerY = canvas.height * 0.5;
      const maxRadius = Math.max(canvas.width, canvas.height) * 0.8;
      
      // Create multiple moving gradients that flow around the screen
      for (let i = 0; i < 3; i++) {
        const angle = time * 0.2 + i * Math.PI * 0.67;
        const radius = 200 + Math.sin(time * 0.3 + i) * 150;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle * 0.8) * radius;
        
        const gradient = ctx.createRadialGradient(
          x, y, 0,
          x, y, maxRadius * 0.6
        );
      
        // Much softer colors for subtle effect
        const baseOpacity = Math.min(opacity, 0.15) / 3; // Much lower base opacity
        const colorVariation = i * 0.05; // Much smaller variation
        
        gradient.addColorStop(0, `rgba(18, 119, 216, ${baseOpacity + colorVariation})`); // Soft blue #1275d8
        gradient.addColorStop(0.4, `rgba(225, 145, 54, ${baseOpacity * 0.6 + colorVariation})`); // Soft orange #e19136
        gradient.addColorStop(0.7, `rgba(0, 102, 255, ${baseOpacity * 0.4 + colorVariation})`); // Soft blue #0066ff
        gradient.addColorStop(1, `rgba(209, 209, 209, ${baseOpacity * 0.2 + colorVariation})`); // Soft gray #d1d1d1
        
        ctx.globalCompositeOperation = i === 0 ? 'source-over' : 'screen';
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      
      // Reset composite operation
      ctx.globalCompositeOperation = 'source-over';
      
      // Add moving texture particles that flow around the screen (fewer for softer effect)
      for (let i = 0; i < 15; i++) {
        const angle = time * 0.3 + i * 0.2;
        const radius = Math.max(50, 100 + Math.sin(time * 0.2 + i) * 150); // Ensure minimum radius
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle * 0.7) * radius;
        const size = Math.max(0.5, 1 + Math.sin(time * 2 + i) * 1.5); // Ensure minimum size
        const alpha = opacity * 0.03; // Much softer particles
        
        ctx.fillStyle = `rgba(18, 119, 216, ${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
        
        // Add some orange particles too
        if (i % 3 === 0) {
          const angle2 = time * 0.4 + i * 0.3 + Math.PI;
          const radius2 = Math.max(50, 150 + Math.cos(time * 0.25 + i) * 120); // Ensure minimum radius
          const x2 = centerX + Math.cos(angle2) * radius2;
          const y2 = centerY + Math.sin(angle2 * 0.6) * radius2;
          const size2 = Math.max(0.3, size * 0.8); // Ensure minimum size
          
          ctx.fillStyle = `rgba(225, 145, 54, ${alpha})`;
          ctx.beginPath();
          ctx.arc(x2, y2, size2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      
      // Add flowing lines that move across the screen (much softer)
      ctx.strokeStyle = `rgba(0, 102, 255, ${opacity * 0.05})`;
      ctx.lineWidth = 0.5; // Thinner lines for softer effect
      for (let i = 0; i < 3; i++) {
        const lineAngle = time * 0.1 + i * Math.PI / 2.5;
        const lineRadius = Math.max(100, 300 + Math.sin(time * 0.15 + i) * 150); // Ensure minimum radius
        const x1 = centerX + Math.cos(lineAngle) * lineRadius;
        const y1 = centerY + Math.sin(lineAngle) * lineRadius;
        const x2 = centerX + Math.cos(lineAngle + 0.5) * (lineRadius * 0.7);
        const y2 = centerY + Math.sin(lineAngle + 0.5) * (lineRadius * 0.7);
        
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      
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
    <div className={`fixed inset-0 z-0 pointer-events-none ${className}`}>
      <canvas
        ref={canvasRef}
        className={`w-full h-full transition-opacity duration-1000 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ 
          background: 'transparent',
          display: 'block'
        }}
      />
      {/* Debug: Make sure shader container is visible */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-blue-200/20" />
      )}
    </div>
  );
};

export default SimpleShaderBackground;
