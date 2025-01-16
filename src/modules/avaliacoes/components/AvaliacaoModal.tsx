import React, { useState } from 'react';

const AvaliacaoModal: React.FC = () => {
  const [nota, setNota] = useState<OptionalNumber>(undefined);

  return (
    <input
      type="number"
      value={nota || ''}
      onChange={(e) => {
        const value = e.target.value === '' ? undefined : Number(e.target.value);
        setNota(value);
      }}
    />
  );
};

export default AvaliacaoModal; 