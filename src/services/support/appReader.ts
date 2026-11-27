import { supabase } from '../supabase/client';
import { useAuthStore } from '../../store/authStore';
import { IsolatedNoticeClient, NoticeError } from '../../screens/SupportIsolation/isolatedNoticeClient';

const paths = new Map([
  ['support_notice_list_v1', ['p_cursor', 'p_category', 'p_limit']],
  ['support_notice_detail_v1', ['p_id', 'p_mark_read']],
  ['support_faq_list_v1', ['p_management']],
  ['support_ticket_list_v2', ['p_management', 'p_before', 'p_before_id', 'p_limit']],
  ['support_ticket_read_v2', ['p_ticket', 'p_after', 'p_limit', 'p_ack']],
]);

/** The customer view uses the app session, never the isolated login or an operator transport. */
export function createAppReader(owner: string) {
  return async (path: string, input: unknown, signal: AbortSignal) => {
    const prefix = '/rest/v1/rpc/';
    const name = path.slice(prefix.length);
    const accepted = paths.get(name);
    if (!path.startsWith(prefix) || !accepted || !input || typeof input !== 'object' || Array.isArray(input))
      throw new NoticeError('DISABLED');
    const args = Object.fromEntries(Object.entries(input));
    if (Object.keys(args).some(key => !accepted.includes(key)) ||
        (accepted.includes('p_management') && args.p_management !== false))
      throw new NoticeError('DISABLED');

    const session = useAuthStore.getState().session;
    if (!session?.access_token || session.user.id !== owner) throw new NoticeError('AUTH_REQUIRED');
    // Pin the caller even if the shared client refreshes or switches users in flight.
    const { data, error, status } = await supabase.rpc(name, args)
      .setHeader('Authorization', 'Bearer ' + session.access_token).abortSignal(signal);
    if (signal.aborted || useAuthStore.getState().session !== session)
      throw new NoticeError('SESSION_CHANGED');
    if (error) {
      if (status === 401) throw new NoticeError('AUTH_REQUIRED');
      if ((name === 'support_notice_list_v1' || name === 'support_faq_list_v1') &&
          (error.code === '55000' || error.code === 'PT403') &&
          error.message === 'SUPPORT_UNAVAILABLE') throw new NoticeError('SUPPORT_UNAVAILABLE');
      if (error.code === 'PGRST202') throw new NoticeError('SUPPORT_UNAVAILABLE');
      if (status === 403 || error.code === '42501') throw new NoticeError('SUPPORT_FORBIDDEN');
      if (['SUPPORT_FORBIDDEN', 'SUPPORT_NOT_FOUND', 'SUPPORT_AUTH_REQUIRED'].includes(error.message))
        throw new NoticeError(error.message);
      throw new NoticeError(status === 0 || status >= 500 ? 'NETWORK_UNCERTAIN' : 'REQUEST_REJECTED');
    }
    return data;
  };
}

export function createCustomerSupportClient(owner: string) {
  return new IsolatedNoticeClient(createAppReader(owner));
}
