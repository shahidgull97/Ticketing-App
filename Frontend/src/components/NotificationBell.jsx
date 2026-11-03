import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Avatar, Badge, Box, Button, Chip, Divider, IconButton, List, ListItemButton, Popover, Stack, Tooltip, Typography,
} from '@mui/material';
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded';
import DoneAllRoundedIcon from '@mui/icons-material/DoneAllRounded';
import { useMarkNotificationsRead, useNotifications } from '../features/tickets/hooks';
import { avatarColorFor } from '../theme';
import { formatDateTime, initials, relativeTime } from '../utils/format';

export default function NotificationBell() {
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();
  const { data } = useNotifications();
  const markRead = useMarkNotificationsRead();

  const items = data?.results || [];
  const unreadCount = data?.unread_count || 0;
  const open = Boolean(anchorEl);

  const handleItemClick = (n) => {
    if (!n.is_read) {
      markRead.mutate(n.id);
    }
    setAnchorEl(null);
    navigate(`/tickets/${n.ticket_id}`);
  };

  const handleMarkAllRead = () => {
    markRead.mutate(undefined);
  };

  return (
    <>
      <Tooltip title="Notifications (Celery Worker)" arrow>
        <IconButton
          onClick={(e) => setAnchorEl(e.currentTarget)}
          aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ''}`}
          size="small"
          sx={{
            color: '#e2e8f0',
            bgcolor: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 2,
            p: 0.85,
            '&:hover': { bgcolor: 'rgba(255,255,255,0.14)' },
          }}
        >
          <Badge
            badgeContent={unreadCount}
            color="error"
            max={99}
            sx={{
              '& .MuiBadge-badge': {
                fontSize: '0.65rem',
                fontWeight: 700,
                minWidth: 17,
                height: 17,
                px: 0.4,
              },
            }}
          >
            <NotificationsNoneRoundedIcon sx={{ fontSize: 19, color: unreadCount > 0 ? '#38bdf8' : '#cbd5e1' }} />
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              mt: 1,
              width: { xs: 330, sm: 390 },
              maxHeight: 480,
              borderRadius: 2.5,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              border: '1px solid',
              borderColor: 'divider',
            },
          },
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ px: 2, py: 1.5, bgcolor: 'background.default' }}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Notifications
            </Typography>
            {unreadCount > 0 && (
              <Chip
                size="small"
                label={`${unreadCount} new`}
                color="primary"
                sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700 }}
              />
            )}
          </Stack>
          {unreadCount > 0 && (
            <Button
              size="small"
              startIcon={<DoneAllRoundedIcon sx={{ fontSize: 15 }} />}
              onClick={handleMarkAllRead}
              disabled={markRead.isPending}
              sx={{ fontSize: '0.73rem', py: 0.25, px: 1 }}
            >
              Mark all read
            </Button>
          )}
        </Stack>

        <Divider />

        {items.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <NotificationsNoneRoundedIcon sx={{ fontSize: 36, color: 'text.disabled', mb: 0.75 }} />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              No notifications yet
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Ticket updates processed by the Celery worker will appear here.
            </Typography>
          </Box>
        ) : (
          <List disablePadding sx={{ overflowY: 'auto', flex: 1 }}>
            {items.map((n, idx) => (
              <Box key={n.id}>
                {idx > 0 && <Divider component="li" />}
                <ListItemButton
                  onClick={() => handleItemClick(n)}
                  alignItems="flex-start"
                  sx={{
                    px: 2,
                    py: 1.35,
                    gap: 1.35,
                    bgcolor: n.is_read ? 'transparent' : 'action.hover',
                  }}
                >
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      fontSize: '0.73rem',
                      fontWeight: 700,
                      bgcolor: avatarColorFor(n.actor_name),
                      color: '#fff',
                      mt: 0.25,
                    }}
                  >
                    {initials(n.actor_name)}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ mb: 0.35 }}>
                      <Chip
                        size="small"
                        label={n.ticket_number}
                        sx={{
                          height: 19,
                          fontSize: '0.67rem',
                          fontWeight: 700,
                          fontFamily: '"JetBrains Mono", monospace',
                        }}
                      />
                      <Stack direction="row" alignItems="center" spacing={0.75}>
                        <Tooltip title={formatDateTime(n.created_at)}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                            {relativeTime(n.created_at)}
                          </Typography>
                        </Tooltip>
                        {!n.is_read && (
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              bgcolor: 'primary.main',
                              flexShrink: 0,
                            }}
                          />
                        )}
                      </Stack>
                    </Stack>
                    <Typography
                      variant="body2"
                      sx={{
                        fontSize: '0.8rem',
                        fontWeight: n.is_read ? 500 : 600,
                        lineHeight: 1.35,
                        color: 'text.primary',
                      }}
                    >
                      {n.message}
                    </Typography>
                  </Box>
                </ListItemButton>
              </Box>
            ))}
          </List>
        )}
      </Popover>
    </>
  );
}

