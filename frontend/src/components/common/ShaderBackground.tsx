import React, { useEffect, useRef, useState } from 'react';

interface ShaderBackgroundProps {
  className?: string;
  opacity?: number;
}

const ShaderBackground: React.FC<ShaderBackgroundProps> = ({ 
  className = '', 
  opacity = 0.3 
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
      
      time += 0.005; // Slower animation for subtlety
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Create multiple overlapping gradients for more complex effect
      const centerX = canvas.width * 0.5;
      const centerY = canvas.height * 0.5;
      
      // First gradient - swirl effect
      const gradient1 = ctx.createRadialGradient(
        centerX + Math.sin(time) * 150,
        centerY + Math.cos(time * 0.8) * 150,
        0,
        centerX,
        centerY,
        Math.max(canvas.width, canvas.height) * 0.6
      );
      
      gradient1.addColorStop(0, `rgba(18, 117, 216, ${opacity * 0.4})`); // More visible blue
      gradient1.addColorStop(0.5, `rgba(225, 145, 54, ${opacity * 0.3})`); // More visible orange
      gradient1.addColorStop(1, `rgba(0, 102, 255, ${opacity * 0.2})`); // More visible blue
      
      ctx.fillStyle = gradient1;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Second gradient - counter swirl
      const gradient2 = ctx.createRadialGradient(
        centerX + Math.cos(time * 1.2) * 200,
        centerY + Math.sin(time * 0.6) * 200,
        0,
        centerX,
        centerY,
        Math.max(canvas.width, canvas.height) * 0.4
      );
      
      gradient2.addColorStop(0, `rgba(225, 145, 54, ${opacity * 0.3})`); // More visible orange
      gradient2.addColorStop(0.7, `rgba(209, 209, 209, ${opacity * 0.2})`); // More visible gray
      gradient2.addColorStop(1, `rgba(18, 117, 216, ${opacity * 0.15})`); // More visible blue
      
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = gradient2;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Reset composite operation
      ctx.globalCompositeOperation = 'source-over';
      
      // Add subtle noise/particles for texture
      ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.03})`;
      for (let i = 0; i < 15; i++) {
        const x = (Math.sin(time * 0.5 + i * 0.3) * 0.5 + 0.5) * canvas.width;
        const y = (Math.cos(time * 0.3 + i * 0.2) * 0.5 + 0.5) * canvas.height;
        const size = Math.sin(time * 1.5 + i) * 1.5 + 2;
        
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Add some flowing lines for more dynamic effect
      ctx.strokeStyle = `rgba(18, 117, 216, ${opacity * 0.08})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const x1 = (Math.sin(time + i) * 0.5 + 0.5) * canvas.width;
        const y1 = (Math.cos(time * 0.7 + i) * 0.5 + 0.5) * canvas.height;
        const x2 = (Math.sin(time + i + 0.5) * 0.5 + 0.5) * canvas.width;
        const y2 = (Math.cos(time * 0.7 + i + 0.5) * 0.5 + 0.5) * canvas.height;
        
        if (i === 0) {
          ctx.moveTo(x1, y1);
        } else {
          ctx.lineTo(x1, y1);
        }
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
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
          mixBlendMode: 'multiply'
        }}
      />
      {/* Additional overlay for extra subtlety */}
      <div 
        className="absolute inset-0 bg-white/10"
        style={{ mixBlendMode: 'overlay' }}
      />
    </div>
  );
};

export default ShaderBackground;
