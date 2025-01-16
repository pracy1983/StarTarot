import React, { useState } from 'react';

const PagamentoForm: React.FC = () => {
  const [valor, setValor] = useState<OptionalNumber>(undefined);

  return (
    <input
      type="number"
      value={valor || ''}
      onChange={(e) => {
        const value = e.target.value === '' ? undefined : Number(e.target.value);
        setValor(value);
      }}
    />
  );
};

export default PagamentoForm; 