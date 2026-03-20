export const formatTime = (minutes: number) => {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

export const getRandom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
