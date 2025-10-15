interface IconProps {
  path: string;
  size?: number;
  className?: string;
  onClick?: () => void;
}

export function Icon({ path, size = 24, className = '', onClick }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <path d={path} fill="currentColor" />
    </svg>
  );
}
