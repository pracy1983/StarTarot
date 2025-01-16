import React, { useState } from 'react';

const ConsultaForm: React.FC = () => {
  const [duracao, setDuracao] = useState<OptionalNumber>(undefined);

  return (
    <input
      type="number"
      value={duracao || ''}
      onChange={(e) => {
        const value = e.target.value === '' ? undefined : Number(e.target.value);
        setDuracao(value);
      }}
    />
  );
};

export default ConsultaForm; 