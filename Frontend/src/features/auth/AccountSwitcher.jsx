import { useState } from 'react';
import { Avatar, Box, Button, Chip, Divider, ListItemAvatar, ListItemText, ListSubheader, Menu, MenuItem } from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import CheckIcon from '@mui/icons-material/Check';
import { useQuery } from '@tanstack/react-query';
import { authApi } from '../../api/endpoints';
import { parseApiError } from '../../api/http';
import { useAuth } from './AuthContext';
import { useNotify } from '../../components/NotifyProvider';
import { avatarColorFor } from '../../theme';
import { initials } from '../../utils/format';

const ROLE_LABELS = {
  CLIENT: 'Clients',
  FACILITY_MANAGER: 'Facility Managers',
  DEPARTMENT_POC: 'Department POCs',
  WORKER: 'Workers / Technicians',
};

export function useDemoAccounts() {
  return useQuery({ queryKey: ['demo-accounts'], queryFn: authApi.demoAccounts, staleTime: Infinity });
}

/** Switch between seeded accounts. Each switch is a regular username/password JWT login. */
export default function AccountSwitcher() {
  const { user, login } = useAuth();
  const notify = useNotify();
  const { data } = useDemoAccounts();
  const [anchor, setAnchor] = useState(null);

  if (!data?.enabled) return null;

  const switchTo = async (username) => {
    setAnchor(null);
    if (username === user.username) return;
    try {
      await login(username, data.password);
    } catch (e) {
      notify(parseApiError(e).message, 'error');
    }
  };

  const groups = Object.keys(ROLE_LABELS).map((role) => ({
    role,
    accounts: data.accounts.filter((a) => a.role === role),
  }));

  return (
    <>
      <Button
        color="inherit"
        startIcon={<SwapHorizIcon />}
        onClick={(e) => setAnchor(e.currentTarget)}
        aria-haspopup="menu"
        aria-label="Switch account"
        aria-expanded={Boolean(anchor)}
        sx={{
          minWidth: 0,
          color: '#f8fafc',
          bgcolor: 'rgba(99, 102, 241, 0.22)',
          border: '1px solid rgba(129, 140, 248, 0.35)',
          '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.35)' },
          '& .MuiButton-startIcon': { mr: { xs: 0, sm: 0.75 }, ml: { xs: 0, sm: -0.25 } },
        }}
      >
        <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Switch account</Box>
      </Button>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        slotProps={{
          paper: {
            sx: {
              maxHeight: 460,
              minWidth: 280,
              borderRadius: 3,
              mt: 1,
              boxShadow: '0 20px 35px -10px rgba(15, 23, 42, 0.22)',
              border: '1px solid #e2e8f0',
            },
          },
        }}
      >
        {groups.flatMap(({ role, accounts }, i) => [
          i > 0 && <Divider key={`d-${role}`} sx={{ my: 0.5 }} />,
          <ListSubheader
            key={role}
            sx={{
              lineHeight: '30px',
              fontSize: '0.7rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'text.secondary',
              bgcolor: 'background.paper',
            }}
          >
            {ROLE_LABELS[role]}
          </ListSubheader>,
          ...accounts.map((a) => {
            const c = avatarColorFor(a.name);
            const active = a.username === user.username;
            return (
              <MenuItem
                key={a.username}
                selected={active}
                onClick={() => switchTo(a.username)}
                sx={{ py: 0.85, px: 2, mx: 0.75, borderRadius: 1.5 }}
              >
                <ListItemAvatar sx={{ minWidth: 38 }}>
                  <Avatar sx={{ width: 28, height: 28, fontSize: '0.72rem', fontWeight: 700, bgcolor: c.bg, color: c.fg }}>
                    {initials(a.name)}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={a.name}
                  secondary={a.designation}
                  primaryTypographyProps={{ fontWeight: active ? 700 : 600, fontSize: '0.86rem' }}
                  secondaryTypographyProps={{ fontSize: '0.74rem' }}
                />
                {active && <CheckIcon fontSize="small" color="primary" sx={{ ml: 1 }} />}
              </MenuItem>
            );
          }),
        ])}
      </Menu>
    </>
  );
}
