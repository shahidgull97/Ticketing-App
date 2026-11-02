import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { lookupApi, ticketsApi } from '../../api/endpoints';

export const PAGE_SIZE = 10;

export const ticketKeys = {
  list: (params) => ['tickets', 'list', params],
  detail: (id) => ['tickets', 'detail', String(id)],
};

export const useTickets = (params) =>
  useQuery({
    queryKey: ticketKeys.list(params),
    queryFn: () => ticketsApi.list({ ...params, page_size: PAGE_SIZE }),
    placeholderData: keepPreviousData, // keep the old page on screen while the next one loads
  });

export const useTicket = (id) => useQuery({ queryKey: ticketKeys.detail(id), queryFn: () => ticketsApi.get(id) });

export const useFilterOptions = () =>
  useQuery({ queryKey: ['lookups', 'filters'], queryFn: lookupApi.filterOptions, staleTime: 5 * 60_000 });
export const useClients = () => useQuery({ queryKey: ['lookups', 'clients'], queryFn: lookupApi.clients, staleTime: 5 * 60_000 });
export const useIssues = () => useQuery({ queryKey: ['lookups', 'issues'], queryFn: lookupApi.issues, staleTime: 5 * 60_000 });
export const useQuickIssues = (clientId) =>
  useQuery({ queryKey: ['lookups', 'quick-issues', clientId], queryFn: () => lookupApi.quickIssues(clientId), enabled: Boolean(clientId) });
export const useDepartments = (enabled = true) =>
  useQuery({ queryKey: ['lookups', 'departments'], queryFn: lookupApi.departments, staleTime: 5 * 60_000, enabled });
export const useWorkers = (enabled = true) =>
  useQuery({ queryKey: ['lookups', 'workers'], queryFn: lookupApi.workers, staleTime: 60_000, enabled });

/** Builds a mutation that writes the returned ticket straight into the cache (no refetch needed). */
function useTicketMutation(id, fn) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (ticket) => {
      qc.setQueryData(ticketKeys.detail(id), ticket);
      qc.invalidateQueries({ queryKey: ['tickets', 'list'] });
    },
  });
}

export const useAssignWorker = (id) => useTicketMutation(id, (worker) => ticketsApi.assignWorker(id, worker));
export const useChangeDepartment = (id) => useTicketMutation(id, (payload) => ticketsApi.changeDepartment(id, payload));
export const useSubmitAssessment = (id) => useTicketMutation(id, (payload) => ticketsApi.submitAssessment(id, payload));
export const useResolve = (id) => useTicketMutation(id, () => ticketsApi.resolve(id));

export function useAddComment(id) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (text) => ticketsApi.comment(id, text),
    onSuccess: (activity) => {
      qc.setQueryData(ticketKeys.detail(id), (old) => (old ? { ...old, activities: [...old.activities, activity] } : old));
    },
  });
}

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => ticketsApi.create(payload),
    onSuccess: (ticket) => {
      qc.setQueryData(ticketKeys.detail(ticket.id), ticket);
      qc.invalidateQueries({ queryKey: ['tickets', 'list'] });
      qc.invalidateQueries({ queryKey: ['lookups', 'quick-issues'] });
      qc.invalidateQueries({ queryKey: ['lookups', 'filters'] });
    },
  });
}
