import { useEffect, useRef, useState } from 'react';
import { Keyboard, Platform, useWindowDimensions } from 'react-native';

export const useKeyboardInset = () => {
  const { height: windowHeight } = useWindowDimensions();
  const initialHeightRef = useRef(windowHeight);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    if (!keyboardVisible && windowHeight > initialHeightRef.current) {
      initialHeightRef.current = windowHeight;
    }
  }, [keyboardVisible, windowHeight]);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }
    const showSub = Keyboard.addListener('keyboardDidShow', (event) => {
      setKeyboardVisible(true);
      setKeyboardHeight(event.endCoordinates?.height || 0);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  if (Platform.OS !== 'android') {
    return 0;
  }

  const resizeInset = Math.max(0, initialHeightRef.current - windowHeight);
  if (resizeInset > 0) {
    return 0;
  }
  return keyboardVisible ? keyboardHeight : 0;
};
