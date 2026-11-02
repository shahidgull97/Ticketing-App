import { memo } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Avatar, Box, Button, Chip, Divider, Paper, Stack, Tooltip, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import ScheduleIcon from '@mui/icons-material/Schedule';
import BusinessIcon from '@mui/icons-material/Business';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import PriorityHighRoundedIcon from '@mui/icons-material/PriorityHighRounded';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import StatusChip from '../../components/StatusChip';
import { avatarColorFor } from '../../theme';
import { formatDateTime, initials } from '../../utils/format';

const ACCENT_BORDER = {
  PENDING_ASSIGNMENT: '#f59e0b',
  PENDING_ASSESSMENT: '#0ea5e9',
  PENDING_POC_REVIEW: '#8b5cf6',
  RESOLVED: '#10b981',
};

const DEPT_COLORS = {
  Technical: '#3b82f6',
  IT: '#10b981',
  Housekeeping: '#d946ef',
  Electrical: '#f59e0b',
};

export function PersonPill({ person, compact = false }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const c = avatarColorFor(person.name);
  return (
    <Tooltip title={`${person.name} (${person.designation})`} arrow>
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.65,
          px: compact ? 0.85 : 1,
          py: 0.3,
          borderRadius: 1.5,
          bgcolor: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc',
          border: '1px solid',
          borderColor: 'divider',
          maxWidth: '100%',
        }}
      >
        <Avatar
          sx={{
            width: 19,
            height: 19,
            fontSize: '0.62rem',
            fontWeight: 700,
            bgcolor: c.bg,
            color: c.fg,
          }}
        >
          {initials(person.name)}
        </Avatar>
        <Typography
          variant="caption"
          noWrap
          sx={{ fontWeight: 600, color: 'text.primary', lineHeight: 1.2, fontSize: compact ? '0.72rem' : '0.75rem' }}
        >
          {person.name} ({person.designation})
        </Typography>
      </Box>
    </Tooltip>
  );
}

/** Full summary block used in the sticky header on the Ticket Detail page. */
function TicketSummary({ ticket, action, headingLevel = 'h2' }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const deptColor = DEPT_COLORS[ticket.department?.name] || '#64748b';

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5} flexWrap="wrap" useFlexGap>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack direction="row" alignItems="center" spacing={0.85} flexWrap="wrap" useFlexGap sx={{ mb: 0.6 }}>
            <Chip
              size="small"
              label={ticket.number}
              sx={{
                height: 22,
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                fontWeight: 700,
                fontSize: '0.72rem',
                bgcolor: isDark ? 'rgba(99, 102, 241, 0.16)' : '#eef2ff',
                color: isDark ? '#a5b4fc' : '#4338ca',
                border: '1px solid',
                borderColor: isDark ? 'rgba(99, 102, 241, 0.35)' : '#c7d2fe',
              }}
            />
            <Chip
              size="small"
              label={ticket.department.name}
              sx={{
                height: 22,
                fontSize: '0.71rem',
                fontWeight: 700,
                bgcolor: alpha(deptColor, isDark ? 0.16 : 0.1),
                color: deptColor,
                border: '1px solid',
                borderColor: alpha(deptColor, 0.3),
              }}
            />
            {ticket.facility_manager && (
              <Chip
                size="small"
                icon={<BusinessIcon sx={{ fontSize: '13px !important' }} />}
                label={`FM: ${ticket.facility_manager.name}`}
                sx={{
                  height: 22,
                  fontSize: '0.71rem',
                  fontWeight: 600,
                  bgcolor: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc',
                  color: 'text.secondary',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              />
            )}
          </Stack>

          <Typography variant="subtitle1" component={headingLevel} sx={{ fontWeight: 700, fontSize: '1.05rem', lineHeight: 1.35, color: 'text.primary' }}>
            {ticket.title}
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, mt: 0.35, fontWeight: 500, fontSize: '0.84rem' }}
          >
            <LocationOnOutlinedIcon sx={{ fontSize: 16, color: 'primary.main' }} aria-hidden />
            {ticket.client.label}; {ticket.floors}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <StatusChip status={ticket.status} label={ticket.status_label} />
          {ticket.action_required && (
            <Chip
              size="small"
              icon={<PriorityHighRoundedIcon sx={{ fontSize: '14px !important', color: '#ef4444 !important' }} />}
              label="Action Required"
              sx={{
                height: 26,
                bgcolor: alpha('#ef4444', isDark ? 0.16 : 0.1),
                color: isDark ? '#f87171' : '#dc2626',
                border: '1px solid',
                borderColor: alpha('#ef4444', 0.35),
                fontWeight: 700,
                fontSize: '0.73rem',
              }}
            />
          )}
          {action}
        </Stack>
      </Stack>

      <Divider sx={{ my: 1.25, borderStyle: 'dashed' }} />

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', md: 'center' }}
        spacing={1}
        color="text.secondary"
      >
        <Typography variant="caption" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.6, color: 'text.secondary', fontSize: '0.77rem' }}>
          <ScheduleIcon sx={{ fontSize: 15, color: 'text.secondary' }} aria-hidden />
          <span>
            Created {formatDateTime(ticket.created_at)}{' '}
            <Box component="strong" sx={{ color: 'text.primary', fontWeight: 600 }}>
              {ticket.created_by.name} ({ticket.created_by.designation})
            </Box>
          </span>
        </Typography>

        <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem', mr: 0.25 }}>
            Current Assignee(s)
          </Typography>
          {ticket.assignees.length ? (
            ticket.assignees.map((a) => <PersonPill key={a.id} person={a} />)
          ) : (
            <Chip size="small" label="Unassigned" sx={{ height: 22, fontSize: '0.72rem' }} />
          )}
        </Stack>
      </Stack>
    </Box>
  );
}

/**
 * High-density Jira/Linear-style horizontal row card for the List View.
 */
function TicketCard({ ticket }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const accent = ACCENT_BORDER[ticket.status] || '#6366f1';
  const deptColor = DEPT_COLORS[ticket.department?.name] || '#64748b';

  return (
    <Paper
      component="article"
      variant="outlined"
      aria-label={`${ticket.number} ${ticket.title}`}
      sx={{
        px: { xs: 2, md: 2.5 },
        py: { xs: 1.5, md: 1.4 },
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 2.25,
        transition: 'background-color 0.14s ease, border-color 0.14s ease, box-shadow 0.14s ease',
        '&::before': {
          content: '""',
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          bgcolor: ticket.action_required ? '#ef4444' : accent,
        },
        '&:hover': {
          bgcolor: isDark ? '#1e293b' : '#fafbff',
          borderColor: isDark ? '#475569' : '#94a3b8',
          boxShadow: isDark ? '0 4px 14px -4px rgba(0, 0, 0, 0.4)' : '0 4px 14px -4px rgba(15, 23, 42, 0.08)',
        },
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            md: 'minmax(260px, 2.2fr) minmax(170px, 1.1fr) minmax(220px, 1.6fr) auto',
          },
          alignItems: 'center',
          gap: { xs: 1.25, md: 2 },
        }}
      >
        {/* Col 1: Key + Issue Title + Location + Created Meta */}
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 0.35 }}>
            <Chip
              size="small"
              label={ticket.number}
              sx={{
                height: 20,
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                fontWeight: 700,
                fontSize: '0.7rem',
                bgcolor: isDark ? 'rgba(99, 102, 241, 0.16)' : '#eef2ff',
                color: isDark ? '#a5b4fc' : '#4338ca',
                border: '1px solid',
                borderColor: isDark ? 'rgba(99, 102, 241, 0.35)' : '#c7d2fe',
              }}
            />
            <Typography
              variant="subtitle2"
              component="h2"
              noWrap
              sx={{ fontWeight: 700, fontSize: '0.95rem', color: 'text.primary', maxWidth: '100%' }}
            >
              {ticket.title}
            </Typography>
            {ticket.action_required && (
              <Chip
                size="small"
                icon={<PriorityHighRoundedIcon sx={{ fontSize: '13px !important', color: '#ef4444 !important' }} />}
                label="Action Required"
                sx={{
                  height: 20,
                  bgcolor: alpha('#ef4444', isDark ? 0.16 : 0.1),
                  color: isDark ? '#f87171' : '#dc2626',
                  border: '1px solid',
                  borderColor: alpha('#ef4444', 0.35),
                  fontWeight: 700,
                  fontSize: '0.68rem',
                }}
              />
            )}
          </Stack>

          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap color="text.secondary">
            <Typography variant="caption" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.35, fontWeight: 600, color: 'text.primary' }}>
              <LocationOnOutlinedIcon sx={{ fontSize: 14, color: 'primary.main' }} aria-hidden />
              {ticket.client.label}; {ticket.floors}
            </Typography>
            <Typography variant="caption" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4, color: 'text.secondary' }}>
              <ScheduleIcon sx={{ fontSize: 13 }} aria-hidden />
              Created {formatDateTime(ticket.created_at)} {ticket.created_by.name} ({ticket.created_by.designation})
            </Typography>
          </Stack>
        </Box>

        {/* Col 2: Department + Facility Manager */}
        <Stack direction={{ xs: 'row', md: 'column' }} spacing={0.5} alignItems="flex-start">
          <Chip
            size="small"
            label={ticket.department.name}
            sx={{
              height: 21,
              fontSize: '0.7rem',
              fontWeight: 700,
              bgcolor: alpha(deptColor, isDark ? 0.16 : 0.1),
              color: deptColor,
              border: '1px solid',
              borderColor: alpha(deptColor, 0.3),
            }}
          />
          {ticket.facility_manager && (
            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'flex', alignItems: 'center', gap: 0.4, fontSize: '0.72rem' }}>
              <PersonOutlineRoundedIcon sx={{ fontSize: 13 }} aria-hidden />
              FM: {ticket.facility_manager.name}
            </Typography>
          )}
        </Stack>

        {/* Col 3: Current Assignee(s) */}
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="caption"
            sx={{ display: { xs: 'inline', md: 'block' }, mr: 0.75, mb: 0.35, color: 'text.secondary', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}
          >
            Current Assignee(s)
          </Typography>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
            {ticket.assignees.length ? (
              ticket.assignees.map((a) => <PersonPill key={a.id} person={a} compact />)
            ) : (
              <Chip size="small" label="Unassigned" sx={{ height: 20, fontSize: '0.7rem' }} />
            )}
          </Stack>
        </Box>

        {/* Col 4: Status Badge + View Action */}
        <Stack direction="row" spacing={1} alignItems="center" justifyContent={{ xs: 'space-between', md: 'flex-end' }}>
          <StatusChip status={ticket.status} label={ticket.status_label} />
          <Button
            component={RouterLink}
            to={`/tickets/${ticket.id}`}
            variant="contained"
            color="success"
            size="small"
            endIcon={<ArrowForwardRoundedIcon sx={{ fontSize: '15px !important' }} />}
            sx={{ px: 1.5, py: 0.55, whiteSpace: 'nowrap' }}
          >
            View
          </Button>
        </Stack>
      </Box>
    </Paper>
  );
}

export { TicketSummary };
export default memo(TicketCard);
