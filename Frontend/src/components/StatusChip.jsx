import { Box, Chip } from '@mui/material';
import { useTheme } from '@mui/material/styles';

const LIGHT_STYLES = {
  PENDING_ASSIGNMENT: { bg: '#fffbeb', color: '#b45309', border: '#fde68a', dot: '#f59e0b' },
  PENDING_ASSESSMENT: { bg: '#f0f9ff', color: '#0369a1', border: '#bae6fd', dot: '#0ea5e9' },
  PENDING_POC_REVIEW: { bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe', dot: '#8b5cf6' },
  RESOLVED: { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0', dot: '#10b981' },
};

const DARK_STYLES = {
  PENDING_ASSIGNMENT: { bg: 'rgba(245, 158, 11, 0.14)', color: '#fbbf24', border: 'rgba(245, 158, 11, 0.35)', dot: '#f59e0b' },
  PENDING_ASSESSMENT: { bg: 'rgba(14, 165, 233, 0.14)', color: '#38bdf8', border: 'rgba(14, 165, 233, 0.35)', dot: '#0ea5e9' },
  PENDING_POC_REVIEW: { bg: 'rgba(139, 92, 246, 0.16)', color: '#c4b5fd', border: 'rgba(139, 92, 246, 0.38)', dot: '#a78bfa' },
  RESOLVED: { bg: 'rgba(16, 185, 129, 0.14)', color: '#34d399', border: 'rgba(16, 185, 129, 0.35)', dot: '#10b981' },
};

export default function StatusChip({ status, label }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const map = isDark ? DARK_STYLES : LIGHT_STYLES;
  const s = map[status] || {
    bg: isDark ? '#1e293b' : '#f1f5f9',
    color: isDark ? '#cbd5e1' : '#334155',
    border: isDark ? '#334155' : '#cbd5e1',
    dot: '#64748b',
  };

  return (
    <Chip
      size="small"
      icon={
        <Box
          component="span"
          sx={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            bgcolor: s.dot,
            ml: 1,
            mr: -0.25,
            flexShrink: 0,
          }}
        />
      }
      label={label}
      sx={{
        bgcolor: s.bg,
        color: s.color,
        border: '1px solid',
        borderColor: s.border,
        fontWeight: 600,
        fontSize: '0.75rem',
        height: 26,
        '& .MuiChip-label': { px: 1.1 },
      }}
    />
  );
}
