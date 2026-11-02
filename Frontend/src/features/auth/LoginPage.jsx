import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Box,
  ButtonBase,
  Divider,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import AssignmentTurnedInOutlinedIcon from '@mui/icons-material/AssignmentTurnedInOutlined';
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded';
import BoltRoundedIcon from '@mui/icons-material/BoltRounded';
import EqualizerRoundedIcon from '@mui/icons-material/EqualizerRounded';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import { parseApiError } from '../../api/http';
import LoadingButton from '../../components/LoadingButton';
import useSubmitGuard from '../../hooks/useSubmitGuard';
import { avatarColorFor, useColorMode } from '../../theme';
import { initials } from '../../utils/format';
import { useAuth } from './AuthContext';
import { useDemoAccounts } from './AccountSwitcher';

function DotGrid({ sx }) {
  return (
    <Box
      aria-hidden
      sx={{
        position: 'absolute',
        width: 110,
        height: 70,
        backgroundImage: 'radial-gradient(#cbd5e1 1.75px, transparent 1.75px)',
        backgroundSize: '18px 18px',
        opacity: 0.7,
        pointerEvents: 'none',
        ...sx,
      }}
    />
  );
}

/** Architectural SVG illustration of a modern illuminated office building at dusk. */
function BuildingIllustration() {
  return (
    <Box sx={{ position: 'relative', width: '100%', height: 220, my: 1 }}>
      <Box
        component="svg"
        viewBox="0 0 380 210"
        sx={{ width: '100%', height: '100%', overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="skyGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="bldgFront" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#4f46e5" />
            <stop offset="100%" stopColor="#1e1b4b" />
          </linearGradient>
          <linearGradient id="bldgSide" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#312e81" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
          <linearGradient id="warmWindow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fde68a" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
          <linearGradient id="coolWindow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e0e7ff" />
            <stop offset="100%" stopColor="#818cf8" />
          </linearGradient>
        </defs>

        <ellipse cx="195" cy="145" rx="150" ry="60" fill="url(#skyGlow)" />
        <path
          d="M 65 95 Q 190 12 315 95"
          fill="none"
          stroke="rgba(165, 180, 252, 0.28)"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />

        <rect x="38" y="95" width="32" height="80" rx="2" fill="rgba(30, 27, 75, 0.7)" />
        <rect x="75" y="110" width="24" height="65" rx="2" fill="rgba(30, 27, 75, 0.55)" />
        <rect x="295" y="90" width="35" height="85" rx="2" fill="rgba(30, 27, 75, 0.65)" />
        <rect x="334" y="112" width="22" height="63" rx="2" fill="rgba(30, 27, 75, 0.5)" />

        <polygon points="88,108 188,68 188,175 88,175" fill="url(#bldgFront)" stroke="#818cf8" strokeOpacity="0.35" />
        <polygon points="188,68 292,104 292,175 188,175" fill="url(#bldgSide)" stroke="#6366f1" strokeOpacity="0.3" />
        <polyline points="85,108 188,66 295,104" fill="none" stroke="#a5b4fc" strokeWidth="2.5" strokeLinecap="round" />

        <polygon points="102,113 135,100 135,126 102,134" fill="url(#coolWindow)" opacity="0.85" />
        <polygon points="143,97 178,83 178,115 143,124" fill="url(#coolWindow)" opacity="0.92" />
        <polygon points="198,84 236,97 236,124 198,115" fill="url(#coolWindow)" opacity="0.7" />
        <polygon points="244,100 278,112 278,134 244,126" fill="url(#coolWindow)" opacity="0.55" />

        <polygon points="104,142 178,125 178,174 104,174" fill="url(#warmWindow)" opacity="0.92" />
        <polygon points="198,125 258,140 258,174 198,174" fill="url(#warmWindow)" opacity="0.82" />
        <polygon points="150,132 238,132 246,139 142,139" fill="#e0e7ff" />

        <line x1="128" y1="136" x2="128" y2="174" stroke="#1e1b4b" strokeWidth="1.5" />
        <line x1="154" y1="131" x2="154" y2="174" stroke="#1e1b4b" strokeWidth="1.5" />
        <line x1="220" y1="131" x2="220" y2="174" stroke="#1e1b4b" strokeWidth="1.5" />
        <line x1="242" y1="136" x2="242" y2="174" stroke="#1e1b4b" strokeWidth="1.5" />

        <circle cx="72" cy="162" r="12" fill="#1e3a5f" />
        <circle cx="82" cy="166" r="9" fill="#2563eb" opacity="0.45" />
        <circle cx="305" cy="163" r="11" fill="#1e3a5f" />
        <circle cx="294" cy="167" r="8" fill="#3b82f6" opacity="0.4" />

        <ellipse cx="190" cy="182" rx="145" ry="14" fill="rgba(251, 191, 36, 0.16)" />
        <line x1="35" y1="175" x2="345" y2="175" stroke="#818cf8" strokeOpacity="0.4" strokeWidth="1.5" />
      </Box>

      {[
        { icon: <BuildOutlinedIcon sx={{ fontSize: 19 }} />, left: '16%', top: 34 },
        { icon: <AssignmentTurnedInOutlinedIcon sx={{ fontSize: 19 }} />, left: '46%', top: 6 },
        { icon: <NotificationsNoneRoundedIcon sx={{ fontSize: 20 }} />, left: '75%', top: 38 },
      ].map((b, idx) => (
        <Box
          key={idx}
          sx={{
            position: 'absolute',
            left: b.left,
            top: b.top,
            width: 40,
            height: 40,
            borderRadius: 2.5,
            display: 'grid',
            placeItems: 'center',
            color: '#ffffff',
            bgcolor: 'rgba(99, 102, 241, 0.28)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(165, 180, 252, 0.38)',
            boxShadow: '0 8px 20px rgba(15, 23, 42, 0.35)',
          }}
        >
          {b.icon}
        </Box>
      ))}
    </Box>
  );
}

export default function LoginPage() {
  const { user, login } = useAuth();
  const { mode, toggleColorMode } = useColorMode();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const navigate = useNavigate();
  const location = useLocation();
  const { data: demo } = useDemoAccounts();
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState(false);

  const attempt = async (username, password) => {
    setError('');
    try {
      await login(username, password);
      navigate(location.state?.from || '/', { replace: true });
    } catch (e) {
      const info = parseApiError(e);
      setError(info.status === 401 ? 'Incorrect username or password.' : info.message);
    }
  };
  const [submit, submitting] = useSubmitGuard(attempt);

  if (user) return <Navigate to="/" replace />;

  const missing = { username: !form.username.trim(), password: !form.password };
  const onSubmit = (e) => {
    e.preventDefault();
    setTouched(true);
    if (missing.username || missing.password) return;
    submit(form.username.trim(), form.password);
  };

  return (
    <Box
      component="main"
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        p: { xs: 2, sm: 3, md: 4 },
        position: 'relative',
        overflow: 'hidden',
        background: isDark
          ? 'linear-gradient(135deg, #070b19 0%, #0f172a 50%, #090d1f 100%)'
          : 'linear-gradient(135deg, #eef2ff 0%, #f5f7ff 50%, #e0e7ff 100%)',
      }}
    >
      {/* Top-right Dark/Light Mode Switcher */}
      <Tooltip title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} arrow>
        <IconButton
          onClick={toggleColorMode}
          aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          sx={{
            position: 'fixed',
            top: 20,
            right: 20,
            zIndex: 10,
            bgcolor: isDark ? 'rgba(30, 41, 59, 0.85)' : 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(8px)',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
          }}
        >
          {mode === 'dark' ? (
            <LightModeOutlinedIcon sx={{ color: '#fbbf24' }} />
          ) : (
            <DarkModeOutlinedIcon sx={{ color: '#475569' }} />
          )}
        </IconButton>
      </Tooltip>

      {/* Decorative background purple circles & dot grids */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          top: -120,
          right: -90,
          width: 420,
          height: 420,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.85) 0%, rgba(79, 70, 229, 0.65) 60%, transparent 72%)',
          pointerEvents: 'none',
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          bottom: -140,
          left: -100,
          width: 380,
          height: 380,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.75) 0%, rgba(129, 140, 248, 0.35) 65%, transparent 75%)',
          pointerEvents: 'none',
        }}
      />
      <DotGrid sx={{ top: 36, left: 48 }} />
      <DotGrid sx={{ bottom: 36, right: 48 }} />

      {/* Main Split-Screen Card */}
      <Paper
        elevation={0}
        sx={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: 1280,
          borderRadius: 5,
          overflow: 'hidden',
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '46% 54%' },
          boxShadow: isDark
            ? '0 30px 70px -15px rgba(0, 0, 0, 0.65)'
            : '0 30px 70px -15px rgba(30, 27, 75, 0.25), 0 10px 25px -10px rgba(30, 27, 75, 0.12)',
          border: '1px solid',
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255, 255, 255, 0.8)',
          bgcolor: 'background.paper',
        }}
      >
        {/* LEFT PANEL: Dark Navy / Indigo Brand Showcase */}
        <Box
          sx={{
            p: { xs: 3.5, sm: 5.5 },
            color: '#ffffff',
            background: 'linear-gradient(160deg, #151944 0%, #1e1b54 52%, #13163b 100%)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3.5 }}>
              <Box
                sx={{
                  width: 42,
                  height: 42,
                  borderRadius: 2.5,
                  display: 'grid',
                  placeItems: 'center',
                  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                  boxShadow: '0 8px 20px rgba(99, 102, 241, 0.45)',
                }}
              >
                <ConfirmationNumberOutlinedIcon sx={{ color: '#fff', fontSize: 23 }} aria-hidden />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.02em' }}>
                Facility <Box component="span" sx={{ color: '#818cf8' }}>Tickets</Box>
              </Typography>
            </Stack>

            <Typography
              variant="h4"
              sx={{
                fontWeight: 800,
                fontSize: { xs: '1.65rem', sm: '1.9rem' },
                lineHeight: 1.2,
                letterSpacing: '-0.025em',
                mb: 1.25,
              }}
            >
              Report. Track. <Box component="span" sx={{ color: '#818cf8' }}>Resolve.</Box>
            </Typography>

            <Typography variant="body2" sx={{ color: 'rgba(226, 232, 240, 0.78)', lineHeight: 1.6, maxWidth: 420 }}>
              Raise facility issues, track their progress and get them resolved quickly.
            </Typography>
          </Box>

          <BuildingIllustration />

          <Stack spacing={1.2} sx={{ position: 'relative', zIndex: 1, pt: 1 }}>
            {[
              { icon: <BoltRoundedIcon sx={{ fontSize: 18, color: '#a5b4fc' }} />, text: 'Quick Ticket Creation' },
              { icon: <EqualizerRoundedIcon sx={{ fontSize: 18, color: '#a5b4fc' }} />, text: 'Real-time Tracking' },
              { icon: <VerifiedUserOutlinedIcon sx={{ fontSize: 18, color: '#a5b4fc' }} />, text: 'Reliable Support' },
            ].map((item) => (
              <Stack key={item.text} direction="row" alignItems="center" spacing={1.25}>
                {item.icon}
                <Typography variant="body2" sx={{ color: 'rgba(241, 245, 249, 0.9)', fontWeight: 500, fontSize: '0.84rem' }}>
                  {item.text}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Box>

        {/* RIGHT PANEL: Sign-In Form + Demo Accounts Grid */}
        <Box
          sx={{
            p: { xs: 3.5, sm: 6 },
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            bgcolor: 'background.paper',
          }}
        >
          <Typography variant="h4" component="h1" sx={{ fontWeight: 800, fontSize: '1.75rem', color: 'text.primary', mb: 0.5 }}>
            Welcome Back 👋
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Sign in to your Facility Tickets account
          </Typography>

          {error && (
            <Alert severity="error" role="alert" sx={{ mb: 2, borderRadius: 2.5 }}>
              {error}
            </Alert>
          )}

          <Stack component="form" spacing={2} onSubmit={onSubmit} noValidate>
            <TextField
              fullWidth
              placeholder="Username *"
              value={form.username}
              autoComplete="username"
              required
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              error={touched && missing.username}
              helperText={touched && missing.username ? 'Username is required' : ''}
              inputProps={{ 'aria-label': 'Username' }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: isDark ? '#0f172a' : '#f8fafc',
                  borderRadius: 2.5,
                },
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonOutlineRoundedIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                },
              }}
            />

            <TextField
              fullWidth
              placeholder="Password *"
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              autoComplete="current-password"
              required
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              error={touched && missing.password}
              helperText={touched && missing.password ? 'Password is required' : ''}
              inputProps={{ 'aria-label': 'Password' }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: isDark ? '#0f172a' : '#f8fafc',
                  borderRadius: 2.5,
                },
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlinedIcon sx={{ color: 'text.secondary', fontSize: 19 }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setShowPassword((s) => !s)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        edge="end"
                      >
                        {showPassword ? (
                          <VisibilityOffOutlinedIcon sx={{ fontSize: 19, color: 'text.secondary' }} />
                        ) : (
                          <VisibilityOutlinedIcon sx={{ fontSize: 19, color: 'text.secondary' }} />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />

            <LoadingButton
              type="submit"
              variant="contained"
              size="large"
              loading={submitting}
              endIcon={<ArrowForwardRoundedIcon />}
              sx={{
                py: 1.35,
                borderRadius: 2.5,
                fontSize: '0.95rem',
                background: 'linear-gradient(90deg, #5b4eff 0%, #4338ca 100%)',
                boxShadow: '0 8px 20px -4px rgba(79, 70, 229, 0.45)',
              }}
            >
              Sign In
            </LoadingButton>
          </Stack>

          {demo?.enabled && (
            <>
              <Divider sx={{ my: 2.5, color: 'text.secondary', fontSize: '0.75rem', fontWeight: 600 }}>
                OR
              </Divider>

              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary', mb: 1.25 }}>
                Demo Accounts
              </Typography>

              <Box
                sx={{
                  display: 'grid',
                  gap: 1.1,
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                  maxHeight: 225,
                  overflowY: 'auto',
                  pr: 0.5,
                }}
              >
                {demo.accounts.map((a) => {
                  const c = avatarColorFor(a.name);
                  return (
                    <ButtonBase
                      key={a.username}
                      disabled={submitting}
                      onClick={() => submit(a.username, demo.password)}
                      sx={{
                        p: 1,
                        px: 1.25,
                        borderRadius: 3,
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: isDark ? '#0f172a' : '#f8fafc',
                        textAlign: 'left',
                        justifyContent: 'flex-start',
                        gap: 1.25,
                        transition: 'all 0.15s ease',
                        '&:hover': {
                          bgcolor: isDark ? '#1e293b' : '#eef2ff',
                          borderColor: 'primary.main',
                          transform: 'translateY(-1px)',
                          boxShadow: '0 4px 12px rgba(79, 70, 229, 0.15)',
                        },
                      }}
                    >
                      <Avatar
                        sx={{
                          width: 34,
                          height: 34,
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          bgcolor: c.bg,
                          color: c.fg,
                        }}
                      >
                        {initials(a.name)}
                      </Avatar>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="body2" noWrap sx={{ fontWeight: 700, fontSize: '0.82rem', color: 'text.primary', lineHeight: 1.25 }}>
                          {a.name}
                        </Typography>
                        <Typography variant="caption" noWrap sx={{ color: 'text.secondary', display: 'block', fontSize: '0.72rem', lineHeight: 1.2 }}>
                          {a.designation}
                        </Typography>
                      </Box>
                    </ButtonBase>
                  );
                })}
              </Box>
            </>
          )}

          <Stack direction="row" justifyContent="center" alignItems="center" spacing={0.6} sx={{ mt: 2.5 }}>
            <HelpOutlineRoundedIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Need help?{' '}
              <Box component="span" sx={{ color: 'primary.main', fontWeight: 700 }}>
                Contact Support
              </Box>
            </Typography>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}
