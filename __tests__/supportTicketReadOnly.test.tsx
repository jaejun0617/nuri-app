import React from 'react';
import { AppState, ScrollView, View } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { ThemeProvider } from 'styled-components/native';
import { createTheme } from '../src/app/theme/theme';
import {
  InquiryListItem,
  InquiryMessage,
} from '../src/screens/Support/InquiryPresentation';
import IsolatedStaffTickets from '../src/screens/SupportIsolation/IsolatedStaffTickets';
import type { PanelHandle } from '../src/screens/SupportIsolation/IsolatedCommunityNotices';
import { IsolatedNoticeClient } from '../src/screens/SupportIsolation/isolatedNoticeClient';

it.each([true, false])(
  'preserves the visible-reply contract across Back and reentry (read-only: %s)',
  async readOnly => {
    const client = new IsolatedNoticeClient();
    const panel = React.createRef<PanelHandle>();
    const onError = jest.fn();
    const createdAt = '2026-11-27T00:00:00Z';
    let cursor = 0;
    const list = jest
      .spyOn(client, 'myTickets')
      .mockImplementation(async () => [
        {
          id: 'room',
          state: 'open',
          nextActor: 'user',
          category: 'usage',
          createdAt,
          unread: cursor < 3,
        },
      ]);
    const read = jest
      .spyOn(client, 'ticketThread')
      .mockImplementation(async (id, after = 0, ack = null) => {
        if (ack !== null) cursor = Math.max(cursor, ack);
        return {
          id,
          title: null,
          category: 'usage',
          state: 'open',
          nextActor: 'user',
          assignee: null,
          revision: 1,
          lastUserSeq: 1,
          messageSeq: 3,
          messages: [2, 3]
            .filter(seq => seq > after)
            .map(seq => ({
              id: String(seq),
              seq,
              author: 'staff',
              body: String(seq),
              createdAt,
              photos: [],
            })),
        };
      });
    const acks = () =>
      read.mock.calls.flatMap(([, , ack]) => (ack == null ? [] : [ack]));
    const previousState = AppState.currentState;
    AppState.currentState = 'active';
    let tree!: TestRenderer.ReactTestRenderer;
    try {
      await act(async () => {
        tree = TestRenderer.create(
          <ThemeProvider theme={createTheme('light')}>
            <IsolatedStaffTickets
              ref={panel}
              client={client}
              mode="mine"
              customerReadOnly={readOnly}
              status={null}
              onError={onError}
              onBack={jest.fn()}
              onRecovered={jest.fn()}
            />
          </ThemeProvider>,
        );
      });
      for (let visit = 0; visit < 2; visit++) {
        const card = tree.root.findByType(InquiryListItem);
        expect(card.props.unread).toBe(true);
        await act(async () => card.props.onPress());
        const scroll = tree.root.findByType(ScrollView);
        const rows = tree.root.findAllByType(InquiryMessage);
        expect(rows).toHaveLength(2);
        const ancestors = (message: TestRenderer.ReactTestInstance) => {
          const views = [];
          for (
            let node = message.parent;
            node && node !== scroll;
            node = node.parent
          )
            if (node.type === View) views.push(node);
          return views;
        };
        const [first, group] = ancestors(rows[0]);
        const [later] = ancestors(rows[1]);
        const scrollTo = (y: number) =>
          scroll.props.onScroll({
            nativeEvent: {
              contentOffset: { y },
              layoutMeasurement: { height: 500 },
            },
          });
        await act(async () => {
          group.props.onLayout?.({ nativeEvent: { layout: { y: 100 } } });
          first.props.onLayout?.({
            nativeEvent: { layout: { y: 650, height: 80 } },
          });
          later.props.onLayout?.({
            nativeEvent: { layout: { y: 1500, height: 80 } },
          });
          scrollTo(0);
        });
        const prior = acks();
        expect([...new Set(prior)]).toEqual(!readOnly && visit ? [2] : []);
        await act(async () => scrollTo(500));
        const visible = acks();
        await act(async () => scrollTo(505));
        expect(acks()).toEqual(visible);
        expect([...new Set(visible)]).toEqual(readOnly ? [] : [2]);
        expect(cursor).toBe(readOnly ? 0 : 2);
        if (visit === 1) {
          await act(async () => scrollTo(1300));
          expect([...new Set(acks())]).toEqual(readOnly ? [] : [2, 3]);
          expect(cursor).toBe(readOnly ? 0 : 3);
        }
        await act(async () => panel.current?.back());
      }
      expect(list).toHaveBeenCalledTimes(3);
      expect(tree.root.findByType(InquiryListItem).props.unread).toBe(readOnly);
      expect(onError).not.toHaveBeenCalled();
    } finally {
      if (tree) await act(async () => tree.unmount());
      AppState.currentState = previousState;
      jest.restoreAllMocks();
      client.dispose();
    }
  },
);
