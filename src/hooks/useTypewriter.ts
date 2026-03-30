import { useEffect, useRef, useState } from 'react';

export function useTypewriter(
  text: string,
  charDelay = 40,
  onChar?: () => void,
): { displayed: string; done: boolean } {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  const onCharRef = useRef(onChar);
  onCharRef.current = onChar;

  useEffect(() => {
    if (text.length === 0) {
      setDisplayed('');
      setDone(true);
      return;
    }

    setDisplayed('');
    setDone(false);

    let index = 0;
    const id = window.setInterval(() => {
      index += 1;
      setDisplayed(text.slice(0, index));
      onCharRef.current?.();
      if (index >= text.length) {
        setDone(true);
        window.clearInterval(id);
      }
    }, charDelay);

    return () => {
      window.clearInterval(id);
    };
  }, [text, charDelay]);

  return { displayed, done };
}
