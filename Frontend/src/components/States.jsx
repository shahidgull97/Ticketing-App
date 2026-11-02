import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import { parseApiError } from '../api/http';

/** Error panel with retry. Chooses a friendly message by status (403 permission, 404, network, 5xx). */
export function ErrorState({ error, onRetry, title }) {
  const info = parseApiError(error);
  const heading =
    title ||
    (info.status === 403
      ? "You don't have access to this"
      : info.status === 404
        ? 'Not found'
        : info.status === 0
          ? "You're offline"
          : 'Something went wrong');
  return (
    <Alert
      severity={info.status === 403 || info.status === 404 ? 'warning' : 'error'}
      role="alert"
      action={onRetry && info.status !== 403 && info.status !== 404 ? <Button color="inherit" size="small" onClick={onRetry}>Retry</Button> : null}
    >
      <strong>{heading}.</strong> {info.message}
    </Alert>
  );
}

export function EmptyState({ title, message, action }) {
  return (
    <Stack alignItems="center" spacing={1} sx={{ py: 8, px: 2, textAlign: 'center' }}>
      <InboxOutlinedIcon sx={{ fontSize: 48, color: 'text.disabled' }} aria-hidden />
      <Typography variant="h6" component="h2">{title}</Typography>
      {message && <Typography color="text.secondary">{message}</Typography>}
      {action && <Box sx={{ pt: 1 }}>{action}</Box>}
    </Stack>
  );
}

