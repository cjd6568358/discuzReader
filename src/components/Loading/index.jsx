import React, { useState, useRef, createContext, useContext } from 'react';
import LoadingComponent from './component';

const LoadingContext = createContext();

export const LoadingProvider = ({ children }) => {
  const [props, setProps] = useState({
    visible: false,
    message: '加载中...',
  });
  const timerRef = useRef(null);

  const showLoading = (msg = '加载中...') => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setProps({
      visible: true,
      message: msg,
    })
  };

  const hideLoading = () => {
    setProps({
      ...props,
      visible: false,
    })
  };

  return (
    <LoadingContext.Provider value={{ showLoading, hideLoading, isLoading: props.visible }}>
      {children}
      <LoadingComponent
        visible={props.visible}
        message={props.message}
      />
    </LoadingContext.Provider>
  );
};

export const useLoading = () => useContext(LoadingContext);