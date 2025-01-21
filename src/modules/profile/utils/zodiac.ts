export function getZodiacSign(date: string): string {
  const d = new Date(date)
  const day = d.getDate()
  const month = d.getMonth() + 1

  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return 'Áries'
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 'Touro'
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return 'Gêmeos'
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return 'Câncer'
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'Leão'
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'Virgem'
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return 'Libra'
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return 'Escorpião'
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return 'Sagitário'
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return 'Capricórnio'
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return 'Aquário'
  return 'Peixes'
}
