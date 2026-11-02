import { Link as RouterLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import {
  AppBar, Avatar, Box, Button, Chip, CircularProgress, Divider, IconButton, Link, Stack, Toolbar, Tooltip, Typography,
} from '@mui/material';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import AccountSwitcher from '../features/auth/AccountSwitcher';
import { useAuth } from '../features/auth/AuthContext';
import { useColorMode } from '../theme';
import { initials } from '../utils/format';

const ROLE_BADGE = {
  CLIENT: { label: 'Client Portal', bg: 'rgba(16, 185, 129, 0.16)', color: '#34d399' },
  FACILITY_MANAGER: { label: 'Facility Ops', bg: 'rgba(56, 189, 248, 0.16)', color: '#38bdf8' },
  DEPARTMENT_POC: { label: 'Department Lead', bg: 'rgba(167, 139, 250, 0.18)', color: '#c4b5fd' },
  WORKER: { label: 'Field Technician', bg: 'rgba(251, 191, 36, 0.18)', color: '#fcd34d' },
};

export default function AppLayout() {
  const { user, initialising, logout } = useAuth();
  const { mode, toggleColorMode } = useColorMode();
  const location = useLocation();

  if (initialising) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <CircularProgress aria-label="Loading application" />
      </Box>
    );
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;

  const badge = ROLE_BADGE[user.role] || ROLE_BADGE.CLIENT;

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <Link
        href="#main"
        sx={{
          position: 'absolute',
          left: -9999,
          '&:focus': { left: 8, top: 8, zIndex: 2000, bgcolor: 'background.paper', p: 1, borderRadius: 1 },
        }}
      >
        Skip to content
      </Link>

      <AppBar
        position="sticky"
        elevation={0}
        component="header"
        sx={{
          background: 'linear-gradient(90deg, #0f172a 0%, #1e1b4b 55%, #0f172a 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <Box sx={{ maxWidth: 1680, width: '100%', mx: 'auto', px: { xs: 2, sm: 3, lg: 4 } }}>
          <Toolbar disableGutters sx={{ gap: 1.25, minHeight: { xs: 56, sm: 60 } }}>
            <Stack
              component={RouterLink}
              to="/"
              direction="row"
              alignItems="center"
              spacing={1.25}
              sx={{ color: 'inherit', textDecoration: 'none', mr: 'auto' }}
            >
              <Box
                sx={{
                  width: 34,
                  height: 34,
                  borderRadius: 2,
                  display: 'grid',
                  placeItems: 'center',
                  background: 'linear-gradient(135deg, #6366f1 0%, #38bdf8 100%)',
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
                }}
              >
                <ConfirmationNumberIcon sx={{ fontSize: 19, color: '#fff' }} aria-hidden />
              </Box>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="h6" sx={{ fontSize: '1.02rem', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
                  UrbanVault Service Desk
                </Typography>
                <Chip
                  size="small"
                  label={badge.label}
                  sx={{
                    display: { xs: 'none', md: 'inline-flex' },
                    height: 22,
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    bgcolor: badge.bg,
                    color: badge.color,
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                />
              </Stack>
            </Stack>

            <Stack
              direction="row"
              alignItems="center"
              spacing={1.1}
              sx={{
                display: { xs: 'none', sm: 'flex' },
                bgcolor: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 2,
                px: 1.25,
                py: 0.45,
              }}
            >
              <Avatar
                sx={{
                  width: 28,
                  height: 28,
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  bgcolor: '#4f46e5',
                  color: '#fff',
                }}
              >
                {initials(user.name)}
              </Avatar>
              <Box sx={{ pr: 0.25 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem', lineHeight: 1.15, color: '#f8fafc' }}>
                  {user.name}
                </Typography>
                <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.68rem', display: 'block', lineHeight: 1.1 }}>
                  {user.designation}
                </Typography>
              </Box>
            </Stack>

            <Tooltip title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} arrow>
              <IconButton
                onClick={toggleColorMode}
                aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
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
                {mode === 'dark' ? (
                  <LightModeOutlinedIcon sx={{ fontSize: 19, color: '#fbbf24' }} />
                ) : (
                  <DarkModeOutlinedIcon sx={{ fontSize: 19, color: '#cbd5e1' }} />
                )}
              </IconButton>
            </Tooltip>

            <AccountSwitcher />

            <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.12)', my: 1.5, display: { xs: 'none', sm: 'block' } }} />

            <Button
              color="inherit"
              size="small"
              startIcon={<LogoutIcon />}
              onClick={logout}
              aria-label="Sign out"
              sx={{
                minWidth: 0,
                color: '#e2e8f0',
                bgcolor: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.18)', borderColor: 'rgba(239, 68, 68, 0.35)', color: '#fecaca' },
                '& .MuiButton-startIcon': { mr: { xs: 0, sm: 0.75 }, ml: { xs: 0, sm: -0.25 } },
              }}
            >
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Sign out</Box>
            </Button>
          </Toolbar>
        </Box>
      </AppBar>

      <Box
        component="main"
        id="main"
        sx={{
          maxWidth: 1680,
          width: '100%',
          mx: 'auto',
          py: { xs: 2, sm: 2.75 },
          px: { xs: 1.5, sm: 3, lg: 4 },
          flexGrow: 1,
        }}
      >
        <Box
          sx={{
            display: { xs: 'flex', sm: 'none' },
            alignItems: 'center',
            gap: 1.25,
            mb: 1.5,
            p: 1,
            borderRadius: 2,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Avatar sx={{ width: 30, height: 30, fontSize: '0.75rem', fontWeight: 700, bgcolor: 'primary.main' }}>
            {initials(user.name)}
          </Avatar>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{user.name}</Typography>
            <Typography variant="caption" color="text.secondary">{user.designation}</Typography>
          </Box>
        </Box>
        <Outlet />
      </Box>
    </Box>
  );
}
