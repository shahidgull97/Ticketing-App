import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CreateTicketDialog, { validateTicketForm } from './CreateTicketDialog';
import { NotifyProvider } from '../../components/NotifyProvider';
import { lookupApi, ticketsApi } from '../../api/endpoints';

vi.mock('../../api/endpoints', () => ({
  lookupApi: { clients: vi.fn(), issues: vi.fn(), quickIssues: vi.fn() },
  ticketsApi: { create: vi.fn() },
}));

const CLIENT = { id: 1, name: 'Harness', label: 'Harness-1317', floors: [{ id: 11, label: '1F' }, { id: 12, label: '2F' }, { id: 13, label: '3F' }] };
const ISSUES = [
  { id: 1, name: 'AC not cooling', department: 'Technical', department_id: 1 },
  { id: 2, name: 'Internet not working', department: 'IT', department_id: 2 },
];

function renderDialog() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <NotifyProvider>
          <CreateTicketDialog open onClose={vi.fn()} />
        </NotifyProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('CreateTicketDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lookupApi.clients.mockResolvedValue([CLIENT]);
    lookupApi.issues.mockResolvedValue(ISSUES);
    lookupApi.quickIssues.mockResolvedValue([ISSUES[0]]);
  });

  it('shows validation errors and does not call the API when required fields are empty', async () => {
    const user = userEvent.setup();
    renderDialog();
    await screen.findByRole('button', { name: 'AC not cooling' }); // form loaded
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    expect(await screen.findByText('Select at least one issue.')).toBeInTheDocument();
    expect(screen.getByText('Select at least one floor.')).toBeInTheDocument();
    expect(ticketsApi.create).not.toHaveBeenCalled();
  });

  it('autofills from a quick issue and submits exactly once even when double-clicked', async () => {
    const user = userEvent.setup();
    let resolve;
    ticketsApi.create.mockReturnValue(new Promise((r) => { resolve = r; }));
    renderDialog();

    await user.click(await screen.findByRole('button', { name: 'AC not cooling' }));
    expect(screen.getByRole('button', { name: 'AC not cooling', pressed: true })).toBeInTheDocument();

    await user.click(screen.getByRole('combobox', { name: /Floor/ }));
    await user.click(await screen.findByRole('option', { name: 'All Floors' }));
    await user.keyboard('{Escape}');

    const submit = screen.getByRole('button', { name: 'Submit' });
    await user.dblClick(submit);
    await waitFor(() => expect(ticketsApi.create).toHaveBeenCalledTimes(1));
    expect(ticketsApi.create).toHaveBeenCalledWith({ client: 1, issues: [1], floors: [11, 12, 13], description: '' });
    expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled();
    resolve({ id: 5 });
  });
});

describe('validateTicketForm', () => {
  it('rejects issues from different departments', () => {
    const errors = validateTicketForm({ clientId: 1, issues: ISSUES, floorIds: [], needsFloors: false, description: '' });
    expect(errors.issues).toMatch(/different departments/);
  });
});
