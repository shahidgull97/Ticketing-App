import { useMemo, useState } from 'react';
import { Avatar, Box, Chip, Paper, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { avatarColorFor } from '../../theme';
import { formatDateTime, initials } from '../../utils/format';

const VERBS = {
  CREATED: ['created', 'the ticket.'],
  AUTO_ASSIGNED: ['auto-assigned', 'the ticket.'],
  WORKER_ASSIGNED: ['assigned', 'technician.'],
  DEPARTMENT_CHANGED: ['changed', 'department.'],
  ASSESSMENT_SUBMITTED: ['changed status', 'of the ticket.'],
  RESOLVED: ['marked resolved', 'the ticket.'],
};
const VERB_COLOR = {
  CREATED: '#ef4444',
  AUTO_ASSIGNED: '#a78bfa',
  WORKER_ASSIGNED: '#6366f1',
  DEPARTMENT_CHANGED: '#f59e0b',
  ASSESSMENT_SUBMITTED: '#38bdf8',
  RESOLVED: '#10b981',
};

function ActivityItem({ item, isLast }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { actor } = item;
  const who = actor.designation ? `${actor.name} (${actor.designation})` : actor.name;
  const [verb, rest] = VERBS[item.type] || [];
  const c = actor.name === 'System' ? { bg: 'rgba(139, 92, 246, 0.2)', fg: '#a78bfa' } : avatarColorFor(actor.name);

  return (
    <Box component="li" sx={{ display: 'flex', gap: 1.75, alignItems: 'flex-start', position: 'relative', pb: isLast ? 0 : 2.5 }}>
      {!isLast && (
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            left: 17,
            top: 36,
            bottom: 0,
            width: 2,
            bgcolor: 'divider',
          }}
        />
      )}
      <Avatar
        sx={{
          width: 36,
          height: 36,
          fontSize: '0.78rem',
          fontWeight: 700,
          bgcolor: c.bg,
          color: c.fg,
          border: '2px solid',
          borderColor: 'background.paper',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.15)',
          zIndex: 1,
        }}
        aria-hidden
      >
        {actor.name === 'System' ? 'S' : initials(actor.name)}
      </Avatar>

      <Box sx={{ minWidth: 0, flex: 1, pt: 0.25 }}>
        <Stack direction="row" alignItems="baseline" justifyContent="space-between" flexWrap="wrap" gap={1}>
          <Typography variant="body2" component="div" sx={{ lineHeight: 1.4 }}>
            <Box component="strong" sx={{ color: 'text.primary', fontWeight: 700 }}>{who}</Box>{' '}
            {item.is_comment ? (
              <Box component="span" sx={{ color: 'text.secondary' }}>commented</Box>
            ) : (
              <>
                <Box component="strong" sx={{ color: VERB_COLOR[item.type] || 'primary.main', fontWeight: 700 }}>
                  {verb}
                </Box>{' '}
                <Box component="span" sx={{ color: 'text.secondary' }}>{rest}</Box>
              </>
            )}
          </Typography>
          <Typography
            component="time"
            variant="caption"
            color="text.secondary"
            dateTime={item.created_at}
            sx={{
              bgcolor: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc',
              px: 1,
              py: 0.25,
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider',
              fontWeight: 500,
            }}
          >
            {formatDateTime(item.created_at)}
          </Typography>
        </Stack>

        {!item.is_comment && item.from_value && (
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            flexWrap="wrap"
            useFlexGap
            sx={{
              mt: 0.85,
              px: 1.25,
              py: 0.65,
              borderRadius: 2,
              bgcolor: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc',
              border: '1px solid',
              borderColor: 'divider',
              display: 'inline-flex',
            }}
          >
            <Chip
              size="small"
              label="History"
              sx={{
                height: 20,
                fontSize: '0.68rem',
                fontWeight: 700,
                bgcolor: isDark ? '#334155' : '#e2e8f0',
                color: 'text.primary',
              }}
            />
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem' }}>
              {item.from_value}
            </Typography>
            <ArrowForwardIcon sx={{ fontSize: 15, color: 'text.secondary' }} aria-label="to" />
            <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary', fontSize: '0.82rem' }}>
              {item.to_value}
            </Typography>
          </Stack>
        )}

        {item.message && (
          <Paper
            variant="outlined"
            sx={{
              mt: 1,
              p: 1.25,
              px: 1.5,
              borderRadius: 2,
              bgcolor: isDark ? 'rgba(255,255,255,0.03)' : item.is_comment ? '#ffffff' : '#f8fafc',
              borderColor: 'divider',
              whiteSpace: 'pre-wrap',
              overflowWrap: 'anywhere',
            }}
          >
            <Typography variant="body2" sx={{ color: 'text.primary' }}>{item.message}</Typography>
          </Paper>
        )}
      </Box>
    </Box>
  );
}

export default function ActivityTimeline({ activities }) {
  const [filter, setFilter] = useState('all');
  const shown = useMemo(
    () => activities.filter((a) => (filter === 'all' ? true : filter === 'comments' ? a.is_comment : !a.is_comment)),
    [activities, filter],
  );
  return (
    <Paper component="section" variant="outlined" sx={{ p: { xs: 2, sm: 2.75 }, borderRadius: 3 }} aria-labelledby="activity-title">
      <Stack direction="row" alignItems="center" spacing={1.25} flexWrap="wrap" useFlexGap sx={{ mb: 2.5 }}>
        <Typography id="activity-title" variant="overline" component="h2" sx={{ fontWeight: 800, letterSpacing: '0.08em', color: 'text.primary' }}>
          Activity
        </Typography>
        <Chip size="small" label={`${activities.length} events`} sx={{ height: 22, fontSize: '0.72rem' }} />
        <ToggleButtonGroup
          exclusive
          size="small"
          value={filter}
          aria-label="Filter activity"
          onChange={(_, v) => v && setFilter(v)}
          sx={{ ml: 'auto' }}
        >
          <ToggleButton value="all">All</ToggleButton>
          <ToggleButton value="actions">Actions</ToggleButton>
          <ToggleButton value="comments">Comments</ToggleButton>
        </ToggleButtonGroup>
      </Stack>
      {shown.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
          {filter === 'comments' ? 'No comments yet.' : 'No activity to show.'}
        </Typography>
      ) : (
        <Box component="ol" sx={{ listStyle: 'none', p: 0, m: 0 }}>
          {shown.map((a, idx) => (
            <ActivityItem key={a.id} item={a} isLast={idx === shown.length - 1} />
          ))}
        </Box>
      )}
    </Paper>
  );
}
