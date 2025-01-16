<input
  type="number"
  value={nota || ''}
  onChange={(e) => {
    const value = e.target.value === '' ? undefined : Number(e.target.value);
    setNota(value);
  }}
/> 