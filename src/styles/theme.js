export const theme = {
  colors: {
    // Cores principais baseadas no dourado da imagem
    primary: {
      DEFAULT: '#FFB800', // Dourado principal
      light: '#FFD700',   // Dourado mais claro
      dark: '#CC9200',    // Dourado mais escuro
    },
    // Cores de fundo
    background: {
      DEFAULT: '#000000', // Preto do fundo
      secondary: '#1A1A1A', // Preto um pouco mais claro para contraste
    },
    // Cores de texto
    text: {
      primary: '#FFFFFF',    // Branco para texto principal
      secondary: '#E0E0E0',  // Cinza claro para texto secundário
      gold: '#FFB800',       // Dourado para destaques
    },
    // Cores de estado
    state: {
      success: '#4CAF50',
      error: '#F44336',
      warning: '#FFC107',
      info: '#2196F3',
    },
  },
  // Gradientes inspirados na imagem de fundo
  gradients: {
    primary: 'linear-gradient(90deg, #FFB800 0%, #FFD700 100%)',
    dark: 'linear-gradient(90deg, #CC9200 0%, #FFB800 100%)',
  },
  // Sombras com tom dourado
  shadows: {
    sm: '0 1px 2px rgba(255, 184, 0, 0.05)',
    md: '0 4px 6px rgba(255, 184, 0, 0.1)',
    lg: '0 10px 15px rgba(255, 184, 0, 0.15)',
  },
  // Efeitos de brilho dourado
  effects: {
    glow: 'drop-shadow(0 0 10px rgba(255, 184, 0, 0.5))',
    shimmer: 'linear-gradient(90deg, transparent, rgba(255, 184, 0, 0.1), transparent)',
  },
}
