interface ColorPalette {
  DEFAULT: string
  light?: string
  dark?: string
  secondary?: string
  gold?: string
}

interface ThemeColors {
  primary: ColorPalette
  background: ColorPalette
  text: {
    primary: string
    secondary: string
    gold: string
  }
  state: {
    success: string
    error: string
    warning: string
    info: string
  }
}

interface Theme {
  colors: ThemeColors
  gradients: {
    primary: string
    dark: string
  }
  shadows: {
    sm: string
    md: string
    lg: string
  }
  effects: {
    glow: string
    shimmer: string
  }
}

export const theme: Theme = {
  colors: {
    primary: {
      DEFAULT: '#FFB800',
      light: '#FFD700',
      dark: '#CC9200',
    },
    background: {
      DEFAULT: '#000000',
      secondary: '#1A1A1A',
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#E0E0E0',
      gold: '#FFB800',
    },
    state: {
      success: '#4CAF50',
      error: '#F44336',
      warning: '#FFC107',
      info: '#2196F3',
    },
  },
  gradients: {
    primary: 'linear-gradient(90deg, #FFB800 0%, #FFD700 100%)',
    dark: 'linear-gradient(90deg, #CC9200 0%, #FFB800 100%)',
  },
  shadows: {
    sm: '0 1px 2px rgba(255, 184, 0, 0.05)',
    md: '0 4px 6px rgba(255, 184, 0, 0.1)',
    lg: '0 10px 15px rgba(255, 184, 0, 0.15)',
  },
  effects: {
    glow: 'drop-shadow(0 0 10px rgba(255, 184, 0, 0.5))',
    shimmer: 'linear-gradient(90deg, transparent, rgba(255, 184, 0, 0.1), transparent)',
  },
}
