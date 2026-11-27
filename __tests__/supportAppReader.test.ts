import { createAppReader, createCustomerSupportClient } from '../src/services/support/appReader';

const mockRpc = jest.fn();
let mockSession = { access_token: 'synthetic-a', user: { id: 'A' } };
jest.mock('../src/services/supabase/client', () => ({ supabase: { rpc: (...args: unknown[]) => mockRpc(...args) } }));
jest.mock('../src/store/authStore', () => ({ useAuthStore: { getState: () => ({ session: mockSession }) } }));
const signal = new AbortController().signal;
const path = '/rest/v1/rpc/';
it('rejects ticket acknowledgments before a read-only RPC leaves the app', async () => {
  const client = createCustomerSupportClient('A');
  try {
    await expect(client.ticketThread('ticket', 2, 2)).rejects.toMatchObject({ code: 'DISABLED' });
    expect(mockRpc).not.toHaveBeenCalled();
  } finally { client.dispose(); }
});
function respond(result: () => Promise<unknown>) {
  const abortSignal = jest.fn(result);
  const setHeader = jest.fn(() => ({ abortSignal }));
  mockRpc.mockReturnValue({ setHeader });
  return setHeader;
}
beforeEach(() => { mockRpc.mockReset(); mockSession = { access_token: 'synthetic-a', user: { id: 'A' } }; });

it('uses the signed-in caller and customer arguments for all three lists', async () => {
  const header = respond(async () => ({ data: { items: [], count: 0, nextCursor: null }, status: 200 }));
  const client = createCustomerSupportClient('A');
  await expect(client.list()).resolves.toMatchObject({ count: 0 });
  await expect(client.faqs(false)).resolves.toEqual([]);
  await expect(client.myTickets()).resolves.toEqual([]);
  expect(mockRpc.mock.calls.map(call => call[0])).toEqual(['support_notice_list_v1', 'support_faq_list_v1', 'support_ticket_list_v2']);
  expect(header).toHaveBeenCalledWith('Authorization', 'Bearer synthetic-a');
  client.dispose();
  expect(mockRpc).toHaveBeenCalledTimes(3);
});

it('does not treat an absent v2 service as an empty inbox or use another API', async () => {
  respond(async () => ({ error: { code: 'PGRST202' }, status: 404 }));
  await expect(createCustomerSupportClient('A').myTickets()).rejects.toMatchObject({code:'SUPPORT_UNAVAILABLE'});
  expect(mockRpc).toHaveBeenCalledTimes(1);
});

it.each([
  [500, '55000', 'SUPPORT_UNAVAILABLE', 'SUPPORT_UNAVAILABLE'],
  [403, 'PT403', 'SUPPORT_UNAVAILABLE', 'SUPPORT_UNAVAILABLE'],
  [500, '55000', 'OTHER_FAILURE', 'NETWORK_UNCERTAIN'],
  [403, '42501', 'SUPPORT_FORBIDDEN', 'SUPPORT_FORBIDDEN'],
])('distinguishes a closed rollout from other list failures (%s, %s, %s)', async (status, code, message, expected) => {
  respond(async () => ({ error: { code, message }, status }));
  const client = createCustomerSupportClient('A');
  try {
    await expect(client.list()).rejects.toMatchObject({code:expected});
    await expect(client.faqs(false)).rejects.toMatchObject({code:expected});
  } finally { client.dispose(); }
});

it('discards the previous account response after a switch and refuses subsequent reads', async () => {
  respond(async () => {
    mockSession = { access_token: 'synthetic-b', user: { id: 'B' } };
    return { data: {items:[{title:'A-only'}]}, status:200 };
  });
  const reader = createAppReader('A');
  await expect(reader(path+'support_faq_list_v1',{p_management:false}, signal)).rejects.toMatchObject({code:'SESSION_CHANGED'});
  await expect(reader(path+'support_faq_list_v1',{p_management:false}, signal)).rejects.toMatchObject({code:'AUTH_REQUIRED'});
  expect(mockRpc).toHaveBeenCalledTimes(1);
});

it('does not call auth, operator, photo, write or management-list endpoints', async () => {
  const reader = createAppReader('A');
  for (const endpoint of ['/auth/v1/logout', '/support/photos/upload', path+'support_ticket_create_v2',path+'support_notice_command_v1'])
    await expect(reader(endpoint,{},signal)).rejects.toMatchObject({code:'DISABLED'});
  await expect(reader(path+'support_notice_list_v1',{p_management:true},signal)).rejects.toMatchObject({code:'DISABLED'});
  await expect(reader(path+'support_ticket_list_v2',{p_management:true},signal)).rejects.toMatchObject({code:'DISABLED'});
  expect(mockRpc).not.toHaveBeenCalled();
});
