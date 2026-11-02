import { memo } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Avatar, AvatarGroup, Box, Button, Chip, Divider, Paper, Stack, Tooltip, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import PriorityHighRoundedIcon from '@mui/icons-material/PriorityHighRounded';
import ScheduleIcon from '@mui/icons-material/Schedule';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { avatarColorFor } from '../../theme';
import { formatDateTime, initials } from '../../utils/format';

const COLUMNS = [
  { status: 'PENDING_ASSIGNMENT', title: 'Pending Assignment', subtitle: 'Awaiting POC routing', color: '#f59e0b' },
  { status: 'PENDING_ASSESSMENT', title: 'In Assessment', subtitle: 'Technician assigned', color: '#0ea5e9' },
  { status: 'PENDING_POC_REVIEW', title: 'POC Review', subtitle: 'Technician closed', color: '#8b5cf6' },
  { status: 'RESOLVED', title: 'Resolved', subtitle: 'Closed & verified', color: '#10b981' },
];

function BoardCard({ ticket, accent }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Paper
      component="article"
      variant="outlined"
      sx={{
        p: 1.75,
        borderRadius: 2.25,
        bgcolor: 'background.paper',
        borderLeft: `3.5px solid ${ticket.action_required ? '#ef4444' : accent}`,
        transition: 'transform 0.14s ease, box-shadow 0.14s ease, border-color 0.14s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: isDark ? '0 8px 20px -6px rgba(0, 0, 0, 0.5)' : '0 8px 20px -6px rgba(15, 23, 42, 0.12)',
        },
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={0.75} sx={{ mb: 0.75 }}>
        <Stack direction="row" spacing={0.6} alignItems="center">
          <Chip
            size="small"
            label={ticket.number}
            sx={{
              height: 20,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              fontWeight: 700,
              fontSize: '0.68rem',
              bgcolor: alpha('#6366f1', isDark ? 0.2 : 0.12),
              color: isDark ? '#a5b4fc' : '#4338ca',
            }}
          />
          <Chip
            size="small"
            label={ticket.department.name}
            sx={{
              height: 20,
              fontSize: '0.68rem',
              fontWeight: 600,
              bgcolor: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
              color: 'text.secondary',
            }}
          />
        </Stack>
        {ticket.action_required && (
          <Chip
            size="small"
            icon={<PriorityHighRoundedIcon sx={{ fontSize: '12px !important', color: '#ef4444 !important' }} />}
            label="Action"
            sx={{
              height: 20,
              fontSize: '0.66rem',
              fontWeight: 700,
              bgcolor: alpha('#ef4444', isDark ? 0.16 : 0.1),
              color: isDark ? '#f87171' : '#dc2626',
              border: '1px solid',
              borderColor: alpha('#ef4444', 0.35),
            }}
          />
        )}
      </Stack>

      <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.9rem', lineHeight: 1.35, mb: 0.5, color: 'text.primary' }}>
        {ticket.title}
      </Typography>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.4, fontWeight: 500, mb: 1 }}>
        <LocationOnOutlinedIcon sx={{ fontSize: 14, color: 'primary.main' }} />
        {ticket.client.label}; {ticket.floors}
      </Typography>

      <Divider sx={{ my: 1, borderStyle: 'dashed' }} />

      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
        <Stack direction="row" alignItems="center" spacing={0.75} sx={{ minWidth: 0 }}>
          {ticket.assignees.length ? (
            <AvatarGroup max={3} sx={{ '& .MuiAvatar-root': { width: 24, height: 24, fontSize: '0.65rem', fontWeight: 700 } }}>
              {ticket.assignees.map((a) => {
                const c = avatarColorFor(a.name);
                return (
                  <Tooltip key={a.id} title={`${a.name} (${a.designation})`} arrow>
                    <Avatar sx={{ bgcolor: c.bg, color: c.fg }}>{initials(a.name)}</Avatar>
                  </Tooltip>
                );
              })}
            </AvatarGroup>
          ) : (
            <Typography variant="caption" color="text.disabled">Unassigned</Typography>
          )}
          <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: '0.7rem' }}>
            {ticket.assignees[0]?.name}
          </Typography>
        </Stack>

        <Button
          component={RouterLink}
          to={`/tickets/${ticket.id}`}
          size="small"
          variant="contained"
          color="success"
          endIcon={<ArrowForwardRoundedIcon sx={{ fontSize: '13px !important' }} />}
          sx={{ py: 0.3, px: 1.1, fontSize: '0.73rem', minWidth: 0 }}
        >
          View
        </Button>
      </Stack>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.4, mt: 0.85, fontSize: '0.68rem' }}>
        <ScheduleIcon sx={{ fontSize: 12 }} />
        {formatDateTime(ticket.created_at)} · {ticket.created_by.name}
      </Typography>
    </Paper>
  );
}

/** Jira-style multi-column Kanban Board grouping visible tickets by workflow status. */
function TicketBoard({ tickets, tab }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const visibleColumns = tab === 'closed'
    ? COLUMNS.filter((c) => c.status === 'RESOLVED')
    : COLUMNS.filter((c) => c.status !== 'RESOLVED');

  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: {
          xs: '1fr',
          md: visibleColumns.length === 1 ? '1fr' : 'repeat(3, minmax(0, 1fr))',
        },
        alignItems: 'flex-start',
      }}
    >
      {visibleColumns.map((col) => {
        const items = tickets.filter((t) => t.status === col.status);
        const colTint = alpha(col.color, isDark ? 0.14 : 0.1);
        return (
          <Paper
            key={col.status}
            variant="outlined"
            sx={{
              p: 1.5,
              borderRadius: 3,
              bgcolor: isDark ? 'rgba(17, 24, 39, 0.7)' : '#f8fafc',
              minHeight: 280,
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{
                mb: 1.5,
                p: 1.1,
                borderRadius: 2,
                bgcolor: colTint,
                border: '1px solid',
                borderColor: alpha(col.color, 0.3),
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1}>
                <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: col.color }} />
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '0.84rem', lineHeight: 1.15, color: 'text.primary' }}>
                    {col.title}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.68rem' }}>
                    {col.subtitle}
                  </Typography>
                </Box>
              </Stack>
              <Chip
                size="small"
                label={items.length}
                sx={{
                  height: 22,
                  minWidth: 26,
                  fontWeight: 800,
                  fontSize: '0.74rem',
                  bgcolor: 'background.paper',
                  color: 'text.primary',
                  border: '1px solid',
                  borderColor: alpha(col.color, 0.3),
                }}
              />
            </Stack>

            {items.length === 0 ? (
              <Box
                sx={{
                  py: 5,
                  px: 2,
                  textAlign: 'center',
                  borderRadius: 2,
                  border: '1px dashed',
                  borderColor: 'divider',
                  color: 'text.secondary',
                }}
              >
                <Typography variant="caption">No tickets in this stage on this page</Typography>
              </Box>
            ) : (
              <Stack spacing={1.25}>
                {items.map((t) => (
                  <BoardCard key={t.id} ticket={t} accent={col.color} />
                ))}
              </Stack>
            )}
          </Paper>
        );
      })}
    </Box>
  );
}

export default memo(TicketBoard);
