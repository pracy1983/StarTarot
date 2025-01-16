<input
  type="number"
  value={valor || ''}
  onChange={(e) => {
    const value = e.target.value === '' ? undefined : Number(e.target.value);
    setValor(value);
  }}
/> 