// ModelContext.tsx
import React, {createContext, useState} from 'react';

export const ModelContext = createContext({
  gptModel: 'gpt-3.5-turbo',
  setGptModel: (model: string) => {},
  whisperModel: 'base',
  setWhisperModel: (wm: string) => {},
});

export const ModelProvider = ({children}: any) => {
  const [gptModel, setGptModel] = useState('gpt-3.5-turbo');
  const [whisperModel, setWhisperModel] = useState('base');

  return (
    <ModelContext.Provider value={{gptModel, setGptModel, whisperModel, setWhisperModel}}>
      {children}
    </ModelContext.Provider>
  );
};
