export const generateVerificationCode = () => {
  // Gera um código de 6 dígitos
  return Math.floor(100000 + Math.random() * 900000).toString()
}
