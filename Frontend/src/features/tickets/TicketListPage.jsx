import { useCallback, useMemo, useState } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import {
  Box, Button, Chip, LinearProgress, Pagination, Paper, Skeleton, Stack, Tab, Tabs, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import FolderOpenRoundedIcon from '@mui/icons-material/FolderOpenRounded';
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded';
import ViewListRoundedIcon from '@mui/icons-material/ViewListRounded';
import ViewKanbanRoundedIcon from '@mui/icons-material/ViewKanbanRounded';
import GridViewRoundedIcon from '@mui/icons-material/GridViewRounded';
import PriorityHighRoundedIcon from '@mui/icons-material/PriorityHighRounded';
import HourglassTopRoundedIcon from '@mui/icons-material/HourglassTopRounded';
import EngineeringRoundedIcon from '@mui/icons-material/EngineeringRounded';
import RateReviewRoundedIcon from '@mui/icons-material/RateReviewRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { EmptyState, ErrorState } from '../../components/States';
import { useAuth } from '../auth/AuthContext';
import CreateTicketDialog from './CreateTicketDialog';
import TicketCard, { TicketSummary } from './TicketCard';
import TicketBoard from './TicketBoard';
import TicketFilters from './TicketFilters';
import { PAGE_SIZE, useTickets } from './hooks';

const KEYS = ['tab', 'search', 'client', 'department', 'facility_manager', 'status', 'ordering', 'page', 'view'];

export default function TicketListPage() {
  const { user } = useAuth();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [searchParams, setSearchParams] = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);

  const params = useMemo(() => {
    const p = Object.fromEntries(KEYS.map((k) => [k, searchParams.get(k) || '']));
    return {
      ...p,
      tab: p.tab === 'closed' ? 'closed' : 'open',
      view: ['list', 'grid', 'board'].includes(p.view) ? p.view : 'list',
      page: Number(p.page) || 1,
    };
  }, [searchParams]);

  const update = useCallback(
    (patch) =>
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          Object.entries(patch).forEach(([k, v]) => (v === '' || v == null ? next.delete(k) : next.set(k, v)));
          if (!('page' in patch) && !('view' in patch)) next.delete('page');
          return next;
        },
        { replace: true },
      ),
    [setSearchParams],
  );

  const apiParams = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(params).filter(([k, v]) => k !== 'view' && v !== '' && v != null),
      ),
    [params],
  );
  const { data, isLoading, isError, error, refetch, isFetching, isPlaceholderData } = useTickets(apiParams);

  const hasFilters = Boolean(params.search || params.client || params.department || params.facility_manager || params.status);
  const pageCount = data ? Math.max(1, Math.ceil(data.count / PAGE_SIZE)) : 1;

  const results = data?.results || [];
  const stats = useMemo(() => {
    const countStatus = (s) => results.filter((t) => t.status === s).length;
    return [
      {
        key: '',
        label: params.tab === 'closed' ? 'Total Closed' : 'Total Open',
        value: data?.count ?? '—',
        color: '#6366f1',
        icon: <FolderOpenRoundedIcon fontSize="small" />,
      },
      {
        key: 'PENDING_ASSIGNMENT',
        label: 'Awaiting Assignment',
        value: countStatus('PENDING_ASSIGNMENT'),
        color: '#f59e0b',
        icon: <HourglassTopRoundedIcon fontSize="small" />,
      },
      {
        key: 'PENDING_ASSESSMENT',
        label: 'In Technician Assessment',
        value: countStatus('PENDING_ASSESSMENT'),
        color: '#0ea5e9',
        icon: <EngineeringRoundedIcon fontSize="small" />,
      },
      {
        key: 'PENDING_POC_REVIEW',
        label: 'Pending POC Review',
        value: countStatus('PENDING_POC_REVIEW'),
        color: '#8b5cf6',
        icon: <RateReviewRoundedIcon fontSize="small" />,
      },
      {
        key: 'ACTION',
        label: 'Action Required (You)',
        value: results.filter((t) => t.action_required).length,
        color: '#ef4444',
        icon: <PriorityHighRoundedIcon fontSize="small" />,
      },
    ];
  }, [results, data?.count, params.tab]);

  return (
    <Stack spacing={2}>
      {/* Top Toolbar: Title + KPI Strip + Create CTA */}
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 2, sm: 2.25 },
          borderRadius: 3,
          bgcolor: 'background.paper',
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', md: 'center' }}
          spacing={1.5}
          sx={{ mb: params.tab === 'open' ? 2 : 0 }}
        >
          <Box>
            <Stack direction="row" alignItems="center" spacing={1.25}>
              <Typography variant="h5" component="h1" sx={{ fontWeight: 800, color: 'text.primary' }}>
                Tickets
              </Typography>
              {data && (
                <Chip
                  size="small"
                  label={`${data.count} ticket${data.count === 1 ? '' : 's'}`}
                  sx={{
                    bgcolor: alpha('#6366f1', isDark ? 0.2 : 0.12),
                    color: isDark ? '#a5b4fc' : '#4338ca',
                    fontWeight: 700,
                    height: 24,
                  }}
                />
              )}
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.2 }}>
              Switch between compact list, 2-column grid, or Kanban board view.
            </Typography>
          </Box>

          <Stack direction="row" spacing={1.25} alignItems="center" flexWrap="wrap" useFlexGap>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={params.view}
              aria-label="Ticket view mode"
              onChange={(_, v) => v && update({ view: v === 'list' ? '' : v })}
            >
              <ToggleButton value="list" aria-label="List view">
                <ViewListRoundedIcon sx={{ fontSize: 18, mr: 0.6 }} /> List
              </ToggleButton>
              <ToggleButton value="grid" aria-label="Grid view">
                <GridViewRoundedIcon sx={{ fontSize: 17, mr: 0.6 }} /> Grid
              </ToggleButton>
              <ToggleButton value="board" aria-label="Board view">
                <ViewKanbanRoundedIcon sx={{ fontSize: 18, mr: 0.6 }} /> Board
              </ToggleButton>
            </ToggleButtonGroup>

            {user.can_create_ticket && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setCreateOpen(true)}
                sx={{ px: 2, py: 0.9 }}
              >
                Create New Ticket
              </Button>
            )}
          </Stack>
        </Stack>

        {/* Interactive KPI Summary Cards (click to filter by status) */}
        {params.tab === 'open' && (
          <Box
            sx={{
              display: 'grid',
              gap: 1.25,
              gridTemplateColumns: {
                xs: 'repeat(2, 1fr)',
                sm: 'repeat(3, 1fr)',
                lg: 'repeat(5, 1fr)',
              },
            }}
          >
            {stats.map((s) => {
              const selectable = s.key !== 'ACTION';
              const active = selectable && (params.status || '') === s.key && s.key !== '';
              const tint = alpha(s.color, isDark ? 0.16 : 0.1);
              return (
                <Paper
                  key={s.label}
                  variant="outlined"
                  onClick={() => {
                    if (!selectable) return;
                    update({ status: params.status === s.key ? '' : s.key });
                  }}
                  sx={{
                    p: 1.25,
                    px: 1.5,
                    borderRadius: 2.25,
                    cursor: selectable ? 'pointer' : 'default',
                    borderColor: active ? s.color : 'divider',
                    bgcolor: active ? tint : isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc',
                    transition: 'all 0.14s ease',
                    '&:hover': selectable ? { borderColor: s.color, bgcolor: tint } : undefined,
                  }}
                >
                  <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                    <Box>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', lineHeight: 1.2 }}>
                        {s.label}
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: s.color, lineHeight: 1.25, mt: 0.25 }}>
                        {s.value}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        width: 34,
                        height: 34,
                        borderRadius: 2,
                        display: 'grid',
                        placeItems: 'center',
                        bgcolor: tint,
                        color: s.color,
                      }}
                    >
                      {s.icon}
                    </Box>
                  </Stack>
                </Paper>
              );
            })}
          </Box>
        )}
      </Paper>

      {/* Tabs + Search / Filter / Sort Bar on one unified row on wide screens */}
      <Stack
        direction={{ xs: 'column', lg: 'row' }}
        spacing={1.5}
        alignItems={{ xs: 'stretch', lg: 'flex-start' }}
      >
        <Paper
          variant="outlined"
          sx={{
            p: 0.5,
            borderRadius: 2.5,
            bgcolor: 'background.paper',
            flexShrink: 0,
            alignSelf: { xs: 'stretch', sm: 'flex-start' },
          }}
        >
          <Tabs
            value={params.tab}
            onChange={(_, tab) => update({ tab: tab === 'open' ? '' : tab, status: '' })}
            aria-label="Ticket status tabs"
            sx={{
              minHeight: 40,
              '& .MuiTabs-indicator': { display: 'none' },
              '& .MuiTab-root': {
                minHeight: 40,
                py: 0.75,
                px: 2,
                borderRadius: 2,
                fontWeight: 700,
                color: 'text.secondary',
                transition: 'all 0.15s ease',
                '&.Mui-selected': {
                  bgcolor: '#4f46e5',
                  color: '#ffffff',
                  boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)',
                },
              },
            }}
          >
            <Tab value="open" icon={<FolderOpenRoundedIcon sx={{ fontSize: 17 }} />} iconPosition="start" label="Open Tickets" />
            <Tab value="closed" icon={<TaskAltRoundedIcon sx={{ fontSize: 17 }} />} iconPosition="start" label="Closed Tickets" />
          </Tabs>
        </Paper>

        <Box sx={{ flexGrow: 1 }}>
          <TicketFilters params={params} onChange={update} />
        </Box>
      </Stack>

      {/* Results Area */}
      <Box aria-live="polite" aria-busy={isFetching}>
        {isFetching && !isLoading && <LinearProgress sx={{ mb: 1, borderRadius: 1 }} aria-label="Updating results" />}
        {isLoading ? (
          <Stack spacing={1.25} aria-label="Loading tickets">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" height={84} sx={{ borderRadius: 2.25 }} />)}
          </Stack>
        ) : isError ? (
          <ErrorState error={error} onRetry={refetch} title="Could not load tickets" />
        ) : data.results.length === 0 ? (
          <Paper variant="outlined" sx={{ borderRadius: 3 }}>
            <EmptyState
              title={hasFilters ? 'No tickets match your filters' : params.tab === 'closed' ? 'No closed tickets yet' : 'No open tickets'}
              message={hasFilters ? 'Try changing or clearing the search and filters.' : 'Tickets will show up here as they are raised.'}
              action={user.can_create_ticket && !hasFilters && params.tab === 'open' ? (
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>Create New Ticket</Button>
              ) : null}
            />
          </Paper>
        ) : (
          <Box sx={{ opacity: isPlaceholderData ? 0.6 : 1, transition: 'opacity .15s' }}>
            {params.view === 'board' ? (
              <TicketBoard tickets={data.results} tab={params.tab} />
            ) : params.view === 'grid' ? (
              <Box
                sx={{
                  display: 'grid',
                  gap: 1.75,
                  gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
                }}
              >
                {data.results.map((t) => (
                  <Paper
                    key={t.id}
                    variant="outlined"
                    sx={{
                      p: 2,
                      borderRadius: 2.5,
                      borderLeft: '4px solid',
                      borderLeftColor: t.action_required ? '#ef4444' : '#4f46e5',
                      '&:hover': { boxShadow: '0 8px 20px -6px rgba(15, 23, 42, 0.15)' },
                    }}
                  >
                    <TicketSummary
                      ticket={t}
                      action={
                        <Button
                          component={RouterLink}
                          to={`/tickets/${t.id}`}
                          variant="contained"
                          color="success"
                          size="small"
                          endIcon={<ArrowForwardRoundedIcon sx={{ fontSize: '15px !important' }} />}
                        >
                          View
                        </Button>
                      }
                    />
                  </Paper>
                ))}
              </Box>
            ) : (
              <Stack spacing={1}>
                {data.results.map((t) => <TicketCard key={t.id} ticket={t} />)}
              </Stack>
            )}

            {pageCount > 1 && (
              <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" sx={{ pt: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Showing page {params.page} of {pageCount} ({data.count} total tickets)
                </Typography>
                <Pagination
                  count={pageCount}
                  page={params.page}
                  color="primary"
                  shape="rounded"
                  siblingCount={1}
                  onChange={(_, page) => {
                    update({ page: String(page) });
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              </Stack>
            )}
          </Box>
        )}
      </Box>

      {createOpen && <CreateTicketDialog open onClose={() => setCreateOpen(false)} />}
    </Stack>
  );
}
