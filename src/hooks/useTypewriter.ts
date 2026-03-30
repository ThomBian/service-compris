import { useEffect, useState } from 'react';

export function useTypewriter(
  text: string,
  charDelay = 40,
): { displayed: string; done: boolean } {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

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
