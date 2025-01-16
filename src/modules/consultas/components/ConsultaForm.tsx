<input
  type="number"
  value={duracao || ''}
  onChange={(e) => {
    const value = e.target.value === '' ? undefined : Number(e.target.value);
    setDuracao(value);
  }}
/> 