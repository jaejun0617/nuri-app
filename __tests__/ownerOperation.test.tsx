import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { useOwnerOperation } from '../src/hooks/useOwnerOperation';

type State = { session: { user: { id: string } } | null };
let mockState: State = { session: { user: { id: 'A' } } };
const mockListeners = new Set<(next: State, previous: State) => void>();
jest.mock('../src/store/authStore', () => ({
  useAuthStore: {
    getState: () => mockState,
    subscribe: (listener: (next: State, previous: State) => void) => {
      mockListeners.add(listener);
      return () => mockListeners.delete(listener);
    },
  },
}));
function changeOwner(id: string | null) {
  const previous = mockState;
  mockState = { session: id ? { user: { id } } : null };
  mockListeners.forEach(listener => listener(mockState, previous));
}
let capture: () => () => boolean;
function Screen({ scope }: { scope: string }) {
  capture = useOwnerOperation(scope);
  return null;
}
let renderer: Renderer.ReactTestRenderer;
beforeEach(async () => {
  mockState = { session: { user: { id: 'A' } } };
  await act(async () => {
    renderer = Renderer.create(<Screen scope="pet-1" />);
  });
});
afterEach(async () => {
  await act(async () => renderer.unmount());
  expect(mockListeners.size).toBe(0);
});
it('accepts only the mounted owner and invalidates a late callback on unmount', async () => {
  const current = capture();
  expect(current()).toBe(true);
  await act(async () => renderer.unmount());
  expect(current()).toBe(false);
});
it('invalidates an A -> B -> A callback even without a React render between changes', () => {
  const current = capture();
  changeOwner('B');
  changeOwner('A');
  expect(current()).toBe(false);
  expect(capture()()).toBe(true);
});
it('invalidates a previous pet scope', async () => {
  const current = capture();
  await act(async () => renderer.update(<Screen scope="pet-2" />));
  expect(current()).toBe(false);
  expect(capture()()).toBe(true);
});
it('does not mistake a refreshed same-owner session for a different owner and rejects guests', () => {
  const current = capture();
  changeOwner('A');
  expect(current()).toBe(true);
  changeOwner(null);
  expect(current()).toBe(false);
  expect(capture()()).toBe(false);
});
