import React from 'react';

interface BioDiamondIconProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

const BioDiamondIcon: React.FC<BioDiamondIconProps> = ({ 
  className = '', 
  size = 'md', 
  showText = false 
}) => {
  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
    xl: 'h-8 w-8'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg'
  };

  const viewBox = showText ? "0 0 100 120" : "0 0 100 100";

  return (
    <svg
      className={`${sizeClasses[size]} ${className}`}
      viewBox={viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Diamond Shape - Adjusted proportions: 10% shorter height, 10% wider */}
      {/* Main diamond outline - adjusted dimensions */}
      <path
        d="M50 8 L91.25 43.75 L50 101.25 L8.75 43.75 Z"
        fill="white"
        stroke="currentColor"
        strokeWidth="2"
      />
      
      {/* Crown section - top facets with more detail */}
      <path
        d="M50 8 L78.75 29.375 L50 47.5 Z"
        fill="#f8f9fa"
        stroke="currentColor"
        strokeWidth="1"
      />
      <path
        d="M50 8 L21.25 29.375 L50 47.5 Z"
        fill="#f8f9fa"
        stroke="currentColor"
        strokeWidth="1"
      />
      
      {/* Additional crown facets for realism */}
      <path
        d="M50 8 L65.625 23.75 L50 47.5 Z"
        fill="#f0f1f2"
        stroke="currentColor"
        strokeWidth="0.8"
      />
      <path
        d="M50 8 L34.375 23.75 L50 47.5 Z"
        fill="#f0f1f2"
        stroke="currentColor"
        strokeWidth="0.8"
      />
      
      {/* Table facet - top center with enhanced detail */}
      <path
        d="M36.875 29.375 L63.125 29.375 L50 47.5 Z"
        fill="#ffffff"
        stroke="currentColor"
        strokeWidth="0.6"
      />
      
      {/* Additional table facets */}
      <path
        d="M41.25 33.125 L58.75 33.125 L50 47.5 Z"
        fill="#fafbfc"
        stroke="currentColor"
        strokeWidth="0.4"
      />
      
      {/* Girdle section - middle horizontal band with more detail */}
      <path
        d="M21.25 47.5 L78.75 47.5 L70.625 58.75 L29.375 58.75 Z"
        fill="#e9ecef"
        stroke="currentColor"
        strokeWidth="1"
      />
      
      {/* Pavilion section - lower facets with enhanced detail */}
      <path
        d="M29.375 58.75 L50 101.25 L8.75 43.75 Z"
        fill="#dee2e6"
        stroke="currentColor"
        strokeWidth="1"
      />
      <path
        d="M70.625 58.75 L50 101.25 L91.25 43.75 Z"
        fill="#dee2e6"
        stroke="currentColor"
        strokeWidth="1"
      />
      
      {/* Central pavilion facets with more detail */}
      <path
        d="M29.375 58.75 L50 101.25 L50 58.75 Z"
        fill="#ced4da"
        stroke="currentColor"
        strokeWidth="0.8"
      />
      <path
        d="M70.625 58.75 L50 101.25 L50 58.75 Z"
        fill="#ced4da"
        stroke="currentColor"
        strokeWidth="0.8"
      />
      
      {/* Additional pavilion facets for depth */}
      <path
        d="M35.625 58.75 L50 101.25 L41.25 58.75 Z"
        fill="#c6ccd1"
        stroke="currentColor"
        strokeWidth="0.6"
      />
      <path
        d="M64.375 58.75 L50 101.25 L58.75 58.75 Z"
        fill="#c6ccd1"
        stroke="currentColor"
        strokeWidth="0.6"
      />
      
      {/* Enhanced sparkle effects - multiple highlights */}
      <circle
        cx="50"
        cy="53.125"
        r="4.5"
        fill="white"
        opacity="0.8"
      />
      <circle
        cx="50"
        cy="53.125"
        r="2.5"
        fill="white"
        opacity="0.9"
      />
      <circle
        cx="50"
        cy="53.125"
        r="1"
        fill="white"
        opacity="1"
      />
      
      {/* Additional sparkle points */}
      <circle cx="41.25" cy="39.375" r="1.5" fill="white" opacity="0.7"/>
      <circle cx="58.75" cy="39.375" r="1.5" fill="white" opacity="0.7"/>
      <circle cx="50" cy="31.25" r="1" fill="white" opacity="0.8"/>
      
      {/* Enhanced facet lines for realism */}
      <line x1="36.875" y1="29.375" x2="36.875" y2="47.5" stroke="currentColor" strokeWidth="0.4" opacity="0.6"/>
      <line x1="63.125" y1="29.375" x2="63.125" y2="47.5" stroke="currentColor" strokeWidth="0.4" opacity="0.6"/>
      <line x1="41.25" y1="33.125" x2="41.25" y2="47.5" stroke="currentColor" strokeWidth="0.3" opacity="0.5"/>
      <line x1="58.75" y1="33.125" x2="58.75" y2="47.5" stroke="currentColor" strokeWidth="0.3" opacity="0.5"/>
      <line x1="29.375" y1="58.75" x2="29.375" y2="101.25" stroke="currentColor" strokeWidth="0.4" opacity="0.4"/>
      <line x1="70.625" y1="58.75" x2="70.625" y2="101.25" stroke="currentColor" strokeWidth="0.4" opacity="0.4"/>
      <line x1="35.625" y1="58.75" x2="35.625" y2="101.25" stroke="currentColor" strokeWidth="0.3" opacity="0.3"/>
      <line x1="64.375" y1="58.75" x2="64.375" y2="101.25" stroke="currentColor" strokeWidth="0.3" opacity="0.3"/>
      
      {/* Horizontal facet lines for depth */}
      <line x1="29.375" y1="76.25" x2="70.625" y2="76.25" stroke="currentColor" strokeWidth="0.3" opacity="0.3"/>
      <line x1="32.5" y1="84.375" x2="67.5" y2="84.375" stroke="currentColor" strokeWidth="0.3" opacity="0.3"/>
      <line x1="35.625" y1="92.5" x2="64.375" y2="92.5" stroke="currentColor" strokeWidth="0.3" opacity="0.3"/>

      {/* Optional Text Element */}
      {showText && (
        <g transform="translate(0, 110)">
          {/* DIAMOND text */}
          <text 
            x="50" 
            y="15" 
            textAnchor="middle" 
            className={`font-bold uppercase tracking-wide fill-current ${textSizeClasses[size]}`}
            fill="currentColor"
          >
            DIAMO
            {/* Custom stylized "O" with mini diamond */}
            <tspan>
              <circle cx="78" cy="7" r="6" fill="currentColor"/>
              <path d="M75 4L78 1L81 4L78 10Z" fill="white"/>
              <line x1="76" y1="6" x2="80" y2="6" stroke="white" strokeWidth="0.5"/>
              <line x1="77" y1="7" x2="79" y2="7" stroke="white" strokeWidth="0.5"/>
            </tspan>
            ND
          </text>
        </g>
      )}
    </svg>
  );
};

export default BioDiamondIcon;
