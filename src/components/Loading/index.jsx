import React, { useState, useRef, createContext, useContext } from 'react';
import LoadingComponent from './component';

const LoadingContext = createContext();

export const LoadingProvider = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [duration, setDuration] = useState(2000);
  const timerRef = useRef(null);

  const showLoading = (msg = '加载中...', dur = 0) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setMessage(msg);
    setDuration(dur);
    setVisible(true);
  };

  const hideLoading = () => {
    setVisible(false);
  };

  return (
    <LoadingContext.Provider value={{ showLoading, hideLoading, isLoading: visible }}>
      {children}
      <LoadingComponent
        visible={visible}
        message={message}
        duration={duration}
        onHide={() => setVisible(false)}
      />
    </LoadingContext.Provider>
  );
};

export const useLoading = () => useContext(LoadingContext);