import { Link as RouterLink, useLocation, useParams } from 'react-router-dom';
import { Avatar, Box, Button, Chip, Divider, Paper, Skeleton, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { ErrorState } from '../../components/States';
import StatusChip from '../../components/StatusChip';
import { avatarColorFor } from '../../theme';
import { formatDateTime, initials } from '../../utils/format';
import ActionPanel from './ActionPanel';
import ActivityTimeline from './ActivityTimeline';
import CommentComposer from './CommentComposer';
import { TicketSummary } from './TicketCard';
import { useTicket } from './hooks';

function MetaRow({ label, children }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ py: 1 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
        {label}
      </Typography>
      <Box sx={{ textAlign: 'right' }}>{children}</Box>
    </Stack>
  );
}

export default function TicketDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { data: ticket, isLoading, isError, error, refetch } = useTicket(id);

  return (
    <Stack spacing={2}>
      <Button
        component={RouterLink}
        to="/"
        variant="outlined"
        size="small"
        startIcon={<ArrowBackIcon />}
        sx={{ alignSelf: 'flex-start' }}
      >
        Back to tickets
      </Button>

      {isLoading ? (
        <Stack spacing={2} aria-label="Loading ticket">
          <Skeleton variant="rounded" height={140} sx={{ borderRadius: 3 }} />
          <Skeleton variant="rounded" height={240} sx={{ borderRadius: 3 }} />
        </Stack>
      ) : isError ? (
        <ErrorState error={error} onRetry={refetch} title="Could not load this ticket" />
      ) : (
        <>
          {/* Sticky section at the top (wireframe): summary + call-to-action */}
          <Paper
            component="section"
            aria-label="Ticket summary"
            sx={{
              position: 'sticky',
              top: { xs: 56, sm: 66 },
              zIndex: 10,
              p: { xs: 2, sm: 2.5 },
              borderRadius: 3,
              bgcolor: isDark ? 'rgba(17, 24, 39, 0.92)' : 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: isDark ? '0 8px 24px -6px rgba(0, 0, 0, 0.5)' : '0 8px 24px -6px rgba(15, 23, 42, 0.08)',
              maxHeight: { xs: '58vh', sm: 'none' },
              overflowY: 'auto',
            }}
          >
            <TicketSummary ticket={ticket} headingLevel="h1" />
            <ActionPanel key={ticket.status} ticket={ticket} justCreated={Boolean(location.state?.created)} />
          </Paper>

          {/* 2-Column Jira-Style Detail Body on wide screens */}
          <Box
            sx={{
              display: 'grid',
              gap: 2.5,
              gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 2.3fr) minmax(300px, 1fr)' },
              alignItems: 'flex-start',
            }}
          >
            {/* Left Main Column: Description + Activity + Sticky Comment Composer */}
            <Stack spacing={2.25}>
              <Paper component="section" variant="outlined" sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 3 }} aria-labelledby="desc-title">
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                  <DescriptionOutlinedIcon sx={{ fontSize: 18, color: 'primary.main' }} aria-hidden />
                  <Typography id="desc-title" variant="overline" component="h2" sx={{ fontWeight: 800, letterSpacing: '0.08em', color: 'text.primary' }}>
                    Issue description
                  </Typography>
                </Stack>
                <Typography
                  sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', lineHeight: 1.65 }}
                  color={ticket.description ? 'text.primary' : 'text.secondary'}
                >
                  {ticket.description || 'No description provided.'}
                </Typography>
              </Paper>

              <ActivityTimeline activities={ticket.activities} />
              <CommentComposer ticketId={ticket.id} disabled={ticket.status === 'RESOLVED'} />
            </Stack>

            {/* Right Inspector Sidebar: Jira-style Ticket Metadata & People */}
            <Paper
              component="aside"
              variant="outlined"
              sx={{
                p: 2.25,
                borderRadius: 3,
                bgcolor: 'background.paper',
              }}
            >
              <Stack direction="row" alignItems="center" spacing={0.85} sx={{ mb: 1.25 }}>
                <InfoOutlinedIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                <Typography variant="overline" sx={{ fontWeight: 800, letterSpacing: '0.08em', color: 'text.primary' }}>
                  Ticket Details
                </Typography>
              </Stack>

              <Divider sx={{ mb: 0.5 }} />

              <MetaRow label="Ticket ID">
                <Chip
                  size="small"
                  label={ticket.number}
                  sx={{
                    height: 22,
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    fontWeight: 700,
                    bgcolor: alpha('#6366f1', isDark ? 0.2 : 0.12),
                    color: isDark ? '#a5b4fc' : '#4338ca',
                  }}
                />
              </MetaRow>
              <Divider />

              <MetaRow label="Status">
                <StatusChip status={ticket.status} label={ticket.status_label} />
              </MetaRow>
              <Divider />

              <MetaRow label="Client Office">
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{ticket.client.label}</Typography>
              </MetaRow>
              <Divider />

              <MetaRow label="Affected Floor(s)">
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{ticket.floors}</Typography>
              </MetaRow>
              <Divider />

              <MetaRow label="Concerned Department">
                <Chip size="small" label={ticket.department.name} sx={{ height: 22, fontWeight: 700 }} />
              </MetaRow>
              <Divider />

              {ticket.facility_manager && (
                <>
                  <MetaRow label="Facility Manager">
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{ticket.facility_manager.name}</Typography>
                  </MetaRow>
                  <Divider />
                </>
              )}

              <MetaRow label="Reported By">
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <Avatar
                    sx={{
                      width: 22,
                      height: 22,
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      bgcolor: avatarColorFor(ticket.created_by.name).bg,
                      color: avatarColorFor(ticket.created_by.name).fg,
                    }}
                  >
                    {initials(ticket.created_by.name)}
                  </Avatar>
                  <Typography variant="caption" sx={{ fontWeight: 700 }}>
                    {ticket.created_by.name} ({ticket.created_by.designation})
                  </Typography>
                </Stack>
              </MetaRow>
              <Divider />

              <MetaRow label="Created Time">
                <Typography variant="caption" sx={{ fontWeight: 600 }}>{formatDateTime(ticket.created_at)}</Typography>
              </MetaRow>

              {ticket.resolved_at && (
                <>
                  <Divider />
                  <MetaRow label="Resolved Time">
                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'success.main' }}>
                      {formatDateTime(ticket.resolved_at)}
                    </Typography>
                  </MetaRow>
                </>
              )}
            </Paper>
          </Box>
        </>
      )}
    </Stack>
  );
}
