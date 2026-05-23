type Listener = (token: string | null) => void;
const listeners: Listener[] = [];

export const tokenBus = {
  emit(token: string | null): void {
    listeners.slice().forEach((l) => l(token));
  },
  subscribe(listener: Listener): () => void {
    listeners.push(listener);
    return () => {
      const i = listeners.indexOf(listener);
      if (i >= 0) listeners.splice(i, 1);
    };
  },
};
