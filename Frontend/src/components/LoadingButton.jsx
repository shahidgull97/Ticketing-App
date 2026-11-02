import { Button, CircularProgress } from '@mui/material';

/** Button that is disabled and shows a spinner while `loading`, preventing duplicate submissions. */
export default function LoadingButton({ loading = false, disabled, children, startIcon, ...props }) {
  return (
    <Button
      {...props}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      startIcon={loading ? <CircularProgress size={16} color="inherit" /> : startIcon}
    >
      {children}
    </Button>
  );
}

