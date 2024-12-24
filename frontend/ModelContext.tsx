// ModelContext.tsx
import React, {createContext, useState} from 'react';

export const ModelContext = createContext({
  model: 'gpt-3.5-turbo',
  setModel: (model: string) => {},
});

export const ModelProvider = ({children}: any) => {
  const [model, setModel] = useState('gpt-3.5-turbo');

  return (
    <ModelContext.Provider value={{model, setModel}}>
      {children}
    </ModelContext.Provider>
  );
};
