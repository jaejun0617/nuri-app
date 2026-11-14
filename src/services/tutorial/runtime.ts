type Listener = () => void;
const listeners = new Set<Listener>();
let revision = 0;
export function interruptTutorial() {
  revision += 1;
  for (const listener of listeners) listener();
}
export function observeTutorialInterrupt(listener: Listener) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export const tutorialInterruptRevision = () => revision;
