import React from 'react';

interface ShaderBackgroundCSSProps {
  className?: string;
  opacity?: number;
}

const ShaderBackgroundCSS: React.FC<ShaderBackgroundCSSProps> = ({ 
  className = '', 
  opacity = 0.3 
}) => {
  return (
    <div className={`fixed inset-0 z-0 ${className}`}>
      {/* Base gradient */}
      <div 
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, 
            rgba(18, 117, 216, ${opacity * 0.3}) 0%, 
            rgba(225, 145, 54, ${opacity * 0.25}) 25%, 
            rgba(0, 102, 255, ${opacity * 0.2}) 50%, 
            rgba(209, 209, 209, ${opacity * 0.15}) 75%, 
            rgba(18, 117, 216, ${opacity * 0.2}) 100%)`
        }}
      />
      
      {/* Animated gradient overlay */}
      <div 
        className="absolute inset-0 animate-pulse"
        style={{
          background: `radial-gradient(circle at 30% 20%, 
            rgba(225, 145, 54, ${opacity * 0.2}) 0%, 
            transparent 50%), 
            radial-gradient(circle at 70% 80%, 
            rgba(18, 117, 216, ${opacity * 0.15}) 0%, 
            transparent 50%)`,
          animation: 'shaderFloat 8s ease-in-out infinite'
        }}
      />
      
      {/* Subtle noise texture */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          mixBlendMode: 'overlay'
        }}
      />
      
      {/* Final overlay for subtlety */}
      <div 
        className="absolute inset-0 bg-white/5"
        style={{ mixBlendMode: 'overlay' }}
      />
      
      <style jsx>{`
        @keyframes shaderFloat {
          0%, 100% {
            transform: translate(0, 0) scale(1);
            opacity: 0.3;
          }
          25% {
            transform: translate(20px, -20px) scale(1.05);
            opacity: 0.4;
          }
          50% {
            transform: translate(-10px, 10px) scale(0.95);
            opacity: 0.2;
          }
          75% {
            transform: translate(15px, 5px) scale(1.02);
            opacity: 0.35;
          }
        }
      `}</style>
    </div>
  );
};

export default ShaderBackgroundCSS;
