interface LogoProps {
  size?: number;
  className?: string;
}

export default function Logo({ size = 40, className = '' }: LogoProps) {
  return (
    <div
      className={`flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Красный круг */}
        <circle cx="50" cy="50" r="50" fill="#FF0000" />
        {/* Две белые буквы h, расположенные точно по центру */}
        <text
          x="50"
          y="50"
          fontSize="36"
          fontFamily="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Roboto', 'Helvetica Neue', Arial, sans-serif"
          fontWeight="600"
          fill="white"
          textAnchor="middle"
          dominantBaseline="middle"
          letterSpacing="2"
        >
          hh
        </text>
      </svg>
    </div>
  );
}

