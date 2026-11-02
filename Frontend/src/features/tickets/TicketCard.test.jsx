import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import ActivityTimeline from './ActivityTimeline';
import TicketCard from './TicketCard';

const TICKET = {
  id: 7, number: 'TKT-1007', title: 'AC not cooling', status: 'PENDING_ASSIGNMENT', status_label: 'Pending Technician Assignment',
  client: { id: 1, name: 'Harness', label: 'Harness-1317' }, floors: '2F, 3F', department: { id: 1, name: 'Technical' },
  facility_manager: { id: 2, name: 'Chandan S' }, created_at: '2025-10-27T06:10:00Z',
  created_by: { id: 3, name: 'Chaitya M', designation: 'Client POC' },
  assignees: [{ id: 4, name: 'Dhananjaya Murthy', designation: 'Technical Manager' }], action_required: true,
};

describe('TicketCard', () => {
  it('renders the wireframe fields and links to the detail page', () => {
    render(<MemoryRouter><TicketCard ticket={TICKET} /></MemoryRouter>);
    expect(screen.getByText('AC not cooling')).toBeInTheDocument();
    expect(screen.getByText(/Harness-1317; 2F, 3F/)).toBeInTheDocument();
    expect(screen.getByText('Pending Technician Assignment')).toBeInTheDocument();
    expect(screen.getByText('Action Required')).toBeInTheDocument();
    expect(screen.getByText('Dhananjaya Murthy (Technical Manager)')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View' })).toHaveAttribute('href', '/tickets/7');
  });
});

describe('ActivityTimeline', () => {
  const system = { id: null, name: 'System', designation: '' };
  const chaitya = { id: 3, name: 'Chaitya M', designation: 'Client POC' };
  const activities = [
    { id: 1, type: 'CREATED', is_comment: false, actor: chaitya, from_value: '', to_value: '', message: '', created_at: '2025-10-27T06:10:00Z' },
    { id: 2, type: 'AUTO_ASSIGNED', is_comment: false, actor: system, from_value: 'Unassigned', to_value: 'Dhananjaya Murthy (Technical Manager)', message: '', created_at: '2025-10-27T06:10:00Z' },
    { id: 3, type: 'COMMENT', is_comment: true, actor: chaitya, from_value: '', to_value: '', message: 'Please hurry', created_at: '2025-10-27T07:00:00Z' },
  ];

  it('shows all events by default and filters to Actions / Comments', async () => {
    const user = userEvent.setup();
    render(<ActivityTimeline activities={activities} />);
    expect(screen.getByText('3 events')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);

    await user.click(screen.getByRole('button', { name: 'Comments' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText('Please hurry')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Actions' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText(/auto-assigned/)).toBeInTheDocument();
  });
});

