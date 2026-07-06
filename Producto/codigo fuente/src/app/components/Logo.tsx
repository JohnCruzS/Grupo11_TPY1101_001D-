import logoColored from '../../assets/logo_colored.png';
import logoTransparent from '../../assets/logo_transparent.png';
import conectaLogo from '../../assets/sotloy_conecta.png';

export function ConectaLogo({
  height = 32,
  style,
}: {
  height?: number;
  style?: React.CSSProperties;
}) {
  return (
    <img
      src={conectaLogo}
      alt="SotLoy Conecta"
      style={{ height, width: 'auto', display: 'block', ...style }}
    />
  );
}

const HEIGHTS: Record<'xs' | 'sm' | 'md' | 'lg' | 'xl', number> = {
  xs: 34,
  sm: 48,
  md: 64,
  lg: 96,
  xl: 128,
};

export function Logo({
  size = 'md',
  variant = 'colored',
}: {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'colored' | 'transparent';
}) {
  return (
    <img
      src={variant === 'colored' ? logoColored : logoTransparent}
      alt="SotLoy Asesorías"
      style={{ height: HEIGHTS[size], width: 'auto', display: 'block' }}
    />
  );
}
