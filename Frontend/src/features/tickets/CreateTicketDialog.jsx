import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert, Autocomplete, Box, Checkbox, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, FormHelperText, InputLabel, ListItemText, MenuItem, Select, Stack, TextField, Typography, useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { parseApiError } from '../../api/http';
import LoadingButton from '../../components/LoadingButton';
import { ErrorState } from '../../components/States';
import { useNotify } from '../../components/NotifyProvider';
import useSubmitGuard from '../../hooks/useSubmitGuard';
import { useClients, useCreateTicket, useIssues, useQuickIssues } from './hooks';

const ALL = '__all__';

/** Pure client-side validation, mirrored by the API. Exported for tests. */
export function validateTicketForm({ clientId, issues, floorIds, needsFloors, description }) {
  const errors = {};
  if (!clientId) errors.client = 'Select a client.';
  if (!issues.length) errors.issues = 'Select at least one issue.';
  else if (new Set(issues.map((i) => i.department_id)).size > 1) {
    errors.issues = 'Selected issues belong to different departments. Raise them as separate tickets.';
  }
  if (needsFloors && !floorIds.length) errors.floors = 'Select at least one floor.';
  if (description.length > 2000) errors.description = 'Description must be 2000 characters or fewer.';
  return errors;
}

export default function CreateTicketDialog({ open, onClose }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const notify = useNotify();
  const clientsQuery = useClients();
  const issuesQuery = useIssues();
  const createTicket = useCreateTicket();

  const [clientId, setClientId] = useState('');
  const [issues, setIssues] = useState([]);
  const [floorIds, setFloorIds] = useState([]);
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState(null);

  const clients = clientsQuery.data || [];
  const allIssues = issuesQuery.data || [];
  const effectiveClientId = clientId || (clients.length === 1 ? clients[0].id : '');
  const client = clients.find((c) => c.id === effectiveClientId);
  const needsFloors = (client?.floors.length || 0) > 1;
  const quick = useQuickIssues(effectiveClientId);

  const clientErrors = useMemo(
    () => validateTicketForm({ clientId: effectiveClientId, issues, floorIds, needsFloors, description }),
    [effectiveClientId, issues, floorIds, needsFloors, description],
  );
  const serverFields = serverError?.details || {};
  const fieldError = (name) => (submitted && clientErrors[name]) || serverFields[name]?.[0] || '';

  const department = issues[0]?.department_id;
  const issueOptions = department ? allIssues.filter((i) => i.department_id === department) : allIssues;

  const clearServer = () => serverError && setServerError(null);
  const pickClient = (id) => {
    setClientId(id);
    setFloorIds([]);
    clearServer();
  };
  const toggleQuick = (issue) => {
    clearServer();
    setIssues((cur) => {
      if (cur.some((i) => i.id === issue.id)) return cur.filter((i) => i.id !== issue.id);
      return cur.length && cur[0].department_id !== issue.department_id ? [issue] : [...cur, issue];
    });
  };

  const submit = async () => {
    setSubmitted(true);
    setServerError(null);
    if (Object.keys(clientErrors).length) return;
    try {
      const ticket = await createTicket.mutateAsync({
        client: effectiveClientId,
        issues: issues.map((i) => i.id),
        floors: needsFloors ? floorIds : client.floors.map((f) => f.id),
        description: description.trim(),
      });
      notify('Ticket created successfully.');
      onClose();
      navigate(`/tickets/${ticket.id}`, { state: { created: true } });
    } catch (e) {
      setServerError(parseApiError(e));
    }
  };
  const [guardedSubmit, submitting] = useSubmitGuard(submit);

  const loadingLookups = clientsQuery.isLoading || issuesQuery.isLoading;
  const lookupError = clientsQuery.error || issuesQuery.error;

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} fullScreen={fullScreen} fullWidth maxWidth="sm" aria-labelledby="create-ticket-title">
      <Box component="form" noValidate onSubmit={(e) => { e.preventDefault(); guardedSubmit(); }}>
        <DialogTitle id="create-ticket-title">Create New Ticket</DialogTitle>
        <DialogContent dividers>
          {loadingLookups ? (
            <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress aria-label="Loading form" /></Stack>
          ) : lookupError ? (
            <ErrorState error={lookupError} onRetry={() => { clientsQuery.refetch(); issuesQuery.refetch(); }} />
          ) : clients.length === 0 ? (
            <Alert severity="warning">You are not mapped to any client, so you can't raise tickets.</Alert>
          ) : (
            <Stack spacing={2.5} sx={{ pt: 0.5 }}>
              {serverError && !Object.keys(serverFields).length && (
                <Alert severity="error" role="alert">{serverError.message}</Alert>
              )}
              {serverError && serverFields.non_field_errors && (
                <Alert severity="error" role="alert">{serverFields.non_field_errors.join(' ')}</Alert>
              )}

              {clients.length > 1 && (
                <FormControl required fullWidth error={Boolean(fieldError('client'))}>
                  <InputLabel id="ticket-client-label">Client</InputLabel>
                  <Select
                    labelId="ticket-client-label" label="Client" value={effectiveClientId}
                    onChange={(e) => pickClient(e.target.value)}
                  >
                    {clients.map((c) => <MenuItem key={c.id} value={c.id}>{c.label}</MenuItem>)}
                  </Select>
                  <FormHelperText>{fieldError('client')}</FormHelperText>
                </FormControl>
              )}

              <Box role="group" aria-labelledby="quick-issues-title" sx={{ bgcolor: 'action.hover', borderRadius: 2, p: 1.5, textAlign: 'center' }}>
                <Typography id="quick-issues-title" variant="subtitle2">Quick Issues <Typography component="span" variant="caption" color="text.secondary">- tap to autofill</Typography></Typography>
                <Stack direction="row" flexWrap="wrap" gap={1} justifyContent="center" sx={{ mt: 1, minHeight: 32 }}>
                  {quick.isLoading && effectiveClientId ? <CircularProgress size={20} aria-label="Loading quick issues" /> : null}
                  {(quick.data || []).map((q) => {
                    const on = issues.some((i) => i.id === q.id);
                    return (
                      <Chip
                        key={q.id} label={q.name} clickable color={on ? 'primary' : 'default'} variant={on ? 'filled' : 'outlined'}
                        onClick={() => toggleQuick(q)} aria-pressed={on}
                      />
                    );
                  })}
                  {!effectiveClientId && <Typography variant="caption" color="text.secondary">Select a client to see quick issues.</Typography>}
                </Stack>
              </Box>

              <Autocomplete
                multiple disableCloseOnSelect options={issueOptions} value={issues}
                getOptionLabel={(o) => o.name} isOptionEqualToValue={(a, b) => a.id === b.id}
                onChange={(_, value) => { setIssues(value); clearServer(); }}
                renderOption={(props, o) => {
                  const { key, ...rest } = props;
                  return <li key={key} {...rest}><ListItemText primary={o.name} secondary={o.department} /></li>;
                }}
                renderInput={(params) => (
                  <TextField
                    {...params} required label="Issue(s)" placeholder={issues.length ? '' : 'Type or search issue'}
                    error={Boolean(fieldError('issues'))} helperText={fieldError('issues') || (department ? 'Only issues from the same department can be combined.' : ' ')}
                  />
                )}
              />

              {needsFloors && (
                <FormControl required fullWidth error={Boolean(fieldError('floors'))}>
                  <InputLabel id="ticket-floors-label">Floor(s)</InputLabel>
                  <Select
                    labelId="ticket-floors-label" label="Floor(s)" multiple value={floorIds}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFloorIds(v.includes(ALL) ? (floorIds.length === client.floors.length ? [] : client.floors.map((f) => f.id)) : v);
                      clearServer();
                    }}
                    renderValue={(sel) => (sel.length === client.floors.length ? 'All Floors' : client.floors.filter((f) => sel.includes(f.id)).map((f) => f.label).join(', '))}
                  >
                    <MenuItem value={ALL}>
                      <Checkbox checked={floorIds.length === client.floors.length} indeterminate={floorIds.length > 0 && floorIds.length < client.floors.length} />
                      <ListItemText primary="All Floors" />
                    </MenuItem>
                    {client.floors.map((f) => (
                      <MenuItem key={f.id} value={f.id}>
                        <Checkbox checked={floorIds.includes(f.id)} />
                        <ListItemText primary={f.label} />
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>{fieldError('floors') || 'Your office has multiple floors - please select where the issue is.'}</FormHelperText>
                </FormControl>
              )}

              <TextField
                label="Description" placeholder="Describe the issue (optional)" multiline minRows={3} fullWidth
                value={description} onChange={(e) => { setDescription(e.target.value); clearServer(); }}
                error={Boolean(fieldError('description'))}
                helperText={fieldError('description') || `${description.length}/2000`}
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <LoadingButton color="error" variant="contained" onClick={onClose} disabled={submitting}>Cancel</LoadingButton>
          <LoadingButton type="submit" color="success" variant="contained" loading={submitting} disabled={loadingLookups || Boolean(lookupError) || clients.length === 0}>
            Submit
          </LoadingButton>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

