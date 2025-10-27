import React from 'react';

const BucketUsageIndicator = ({ percentage, size = 60, showPercentage = true }) => {
  // Clamp percentage between 0 and 100
  const clampedPercentage = Math.max(0, Math.min(100, percentage));
  
  // Calculate fill height (bucket is about 70% of total height for liquid area)
  const bucketHeight = size * 0.7;
  const fillHeight = (bucketHeight * clampedPercentage) / 100;
  
  return (
    <div className="flex flex-col items-center">
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 60 60" 
        className="drop-shadow-sm"
      >
        {/* Bucket outline */}
        <path
          d="M15 20 L45 20 L42 50 L18 50 Z"
          fill="none"
          stroke="#64748b"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Bucket rim */}
        <path
          d="M12 20 L48 20"
          stroke="#64748b"
          strokeWidth="3"
          strokeLinecap="round"
        />
        
        {/* Handle */}
        <path
          d="M48 22 Q52 22 52 26 Q52 30 48 30"
          fill="none"
          stroke="#64748b"
          strokeWidth="2"
          strokeLinecap="round"
        />
        
        {/* Liquid fill */}
        {clampedPercentage > 0 && (
          <defs>
            <clipPath id={`bucket-clip-${size}`}>
              <path d="M15.5 20.5 L44.5 20.5 L41.8 49.5 L18.2 49.5 Z" />
            </clipPath>
          </defs>
        )}
        
        {clampedPercentage > 0 && (
          <rect
            x="15.5"
            y={50 - fillHeight}
            width="29"
            height={fillHeight}
            fill="url(#liquidGradient)"
            clipPath={`url(#bucket-clip-${size})`}
          />
        )}
        
        {/* Liquid surface wave effect */}
        {clampedPercentage > 5 && (
          <path
            d={`M15.5 ${50 - fillHeight} Q30 ${50 - fillHeight - 1} 44.5 ${50 - fillHeight}`}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="1"
            opacity="0.6"
            clipPath={`url(#bucket-clip-${size})`}
          />
        )}
        
        {/* Gradient definition */}
        <defs>
          <linearGradient id="liquidGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.9" />
          </linearGradient>
        </defs>
      </svg>
      
      {showPercentage && (
        <div className="mt-2 text-center">
          <span className="text-lg font-bold text-blue-600">
            {clampedPercentage.toFixed(0)}%
          </span>
        </div>
      )}
    </div>
  );
};

export default BucketUsageIndicator;