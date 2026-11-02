import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, FormControl, FormControlLabel,
  FormHelperText, FormLabel, InputLabel, MenuItem, Paper, Radio, RadioGroup, Select, Stack, TextField, ToggleButton,
  ToggleButtonGroup, Typography,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import { parseApiError } from '../../api/http';
import LoadingButton from '../../components/LoadingButton';
import { useNotify } from '../../components/NotifyProvider';
import useSubmitGuard from '../../hooks/useSubmitGuard';
import {
  useAssignWorker, useChangeDepartment, useDepartments, useResolve, useSubmitAssessment, useWorkers,
} from './hooks';

/** Shared plumbing: runs an action once at a time, shows API validation errors under the right fields. */
function useActionForm(run) {
  const [error, setError] = useState(null);
  const [submit, submitting] = useSubmitGuard(async (...args) => {
    setError(null);
    try {
      await run(...args);
    } catch (e) {
      setError(parseApiError(e));
    }
  });
  const fieldError = (name) => error?.details?.[name]?.[0] || '';
  const general = error && !Object.keys(error.details).length ? error.message : '';
  return { submit, submitting, fieldError, general, setError };
}

function AssignWorkerForm({ ticket }) {
  const notify = useNotify();
  const workers = useWorkers();
  const mutation = useAssignWorker(ticket.id);
  const [worker, setWorker] = useState('');
  const [touched, setTouched] = useState(false);
  const form = useActionForm(async () => {
    setTouched(true);
    if (!worker) return;
    await mutation.mutateAsync(worker);
    notify('Worker assigned.');
  });
  const missing = touched && !worker;
  return (
    <Stack component="form" noValidate spacing={2} onSubmit={(e) => { e.preventDefault(); form.submit(); }}>
      {form.general && <Alert severity="error" role="alert">{form.general}</Alert>}
      <FormControl size="small" required error={missing || Boolean(form.fieldError('worker'))} fullWidth>
        <InputLabel id="assign-worker-label">Select worker</InputLabel>
        <Select labelId="assign-worker-label" label="Select worker" value={worker} onChange={(e) => setWorker(e.target.value)}>
          {(workers.data || []).map((w) => <MenuItem key={w.id} value={w.id}>{w.name} ({w.designation})</MenuItem>)}
        </Select>
        <FormHelperText>
          {missing ? 'Select a worker.' : form.fieldError('worker') || (workers.isError ? 'Could not load workers.' : workers.data?.length === 0 ? 'No workers in this department.' : ' ')}
        </FormHelperText>
      </FormControl>
      <Typography variant="body2" color="text.secondary" component="ol" sx={{ m: 0, pl: 2.5 }}>
        <li>Current Assignee(s) field will be updated.</li>
        <li>An ACTIVITY will be added.</li>
        <li>The Assigned Worker will start seeing the ticket.</li>
      </Typography>
      <LoadingButton type="submit" variant="contained" color="success" loading={form.submitting} sx={{ alignSelf: 'flex-start' }}>OK</LoadingButton>
    </Stack>
  );
}

function ChangeDepartmentForm({ ticket }) {
  const notify = useNotify();
  const navigate = useNavigate();
  const departments = useDepartments();
  const mutation = useChangeDepartment(ticket.id);
  const [department, setDepartment] = useState('');
  const [note, setNote] = useState('');
  const [touched, setTouched] = useState(false);
  const form = useActionForm(async () => {
    setTouched(true);
    if (!department || !note.trim()) return;
    await mutation.mutateAsync({ department, note: note.trim() });
    notify('Ticket forwarded to the new department.');
    navigate('/'); // the ticket now belongs to another department's POC
  });
  const options = (departments.data || []).filter((d) => d.id !== ticket.department.id);
  return (
    <Stack component="form" noValidate spacing={2} onSubmit={(e) => { e.preventDefault(); form.submit(); }}>
      {form.general && <Alert severity="error" role="alert">{form.general}</Alert>}
      <FormControl size="small" required fullWidth error={(touched && !department) || Boolean(form.fieldError('department'))}>
        <InputLabel id="change-dept-label">Select department</InputLabel>
        <Select labelId="change-dept-label" label="Select department" value={department} onChange={(e) => setDepartment(e.target.value)}>
          {options.map((d) => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
        </Select>
        <FormHelperText>{touched && !department ? 'Select a department.' : form.fieldError('department') || ' '}</FormHelperText>
      </FormControl>
      <TextField
        size="small" required multiline minRows={2} label="Add forwarding note" value={note}
        onChange={(e) => setNote(e.target.value)} inputProps={{ maxLength: 1000 }}
        error={(touched && !note.trim()) || Boolean(form.fieldError('note'))}
        helperText={touched && !note.trim() ? 'A forwarding note is required.' : form.fieldError('note')}
      />
      <Typography variant="body2" color="text.secondary" component="ol" sx={{ m: 0, pl: 2.5 }}>
        <li>Current Assignee(s) field will be updated.</li>
        <li>An ACTIVITY will be added.</li>
        <li>The new Department POC will start seeing the ticket.</li>
      </Typography>
      <LoadingButton type="submit" variant="contained" color="success" loading={form.submitting} sx={{ alignSelf: 'flex-start' }}>OK</LoadingButton>
    </Stack>
  );
}

const OUTCOMES = [
  { value: 'FULLY_RESOLVED', label: 'Mark Fully Resolved', help: 'The issue has been fully resolved. No further action is needed.', note: false },
  { value: 'PARTIALLY_RESOLVED', label: 'Mark Partially Resolved', help: "I've resolved my part of the issue. But, it also involves another Department/Worker's scope.", note: true },
  { value: 'SUGGEST_CHANGE', label: 'Suggest Department/Worker Change', help: 'The issue is outside my scope. Please assign it to the correct Department/Worker.', note: true },
];

function AssessmentForm({ ticket }) {
  const notify = useNotify();
  const mutation = useSubmitAssessment(ticket.id);
  const [outcome, setOutcome] = useState('');
  const [note, setNote] = useState('');
  const [touched, setTouched] = useState(false);
  const selected = OUTCOMES.find((o) => o.value === outcome);
  const noteMissing = selected?.note && !note.trim();
  const form = useActionForm(async () => {
    setTouched(true);
    if (!outcome || noteMissing) return;
    await mutation.mutateAsync({ outcome, note: note.trim() });
    notify('Assessment submitted.');
  });
  return (
    <Stack component="form" noValidate spacing={1.5} onSubmit={(e) => { e.preventDefault(); form.submit(); }}>
      {form.general && <Alert severity="error" role="alert">{form.general}</Alert>}
      <FormControl error={(touched && !outcome) || Boolean(form.fieldError('outcome'))}>
        <FormLabel id="assessment-label">You have been assigned this ticket. Take action.</FormLabel>
        <RadioGroup aria-labelledby="assessment-label" value={outcome} onChange={(e) => setOutcome(e.target.value)}>
          {OUTCOMES.map((o) => (
            <Paper key={o.value} variant="outlined" sx={{ px: 1.5, py: 0.5, mt: 1, borderColor: outcome === o.value ? 'primary.main' : undefined }}>
              <FormControlLabel
                value={o.value} control={<Radio />} sx={{ alignItems: 'flex-start', m: 0, width: '100%' }}
                label={<><Typography sx={{ fontWeight: 600 }}>{o.label}</Typography><Typography variant="caption" color="text.secondary">{o.help}</Typography></>}
              />
            </Paper>
          ))}
        </RadioGroup>
        <FormHelperText>{touched && !outcome ? 'Choose one of the options.' : form.fieldError('outcome')}</FormHelperText>
      </FormControl>
      {selected && (
        <TextField
          size="small" multiline minRows={2} label={selected.note ? 'Note (required)' : 'Note (optional)'} value={note}
          required={selected.note} onChange={(e) => setNote(e.target.value)} inputProps={{ maxLength: 1000 }}
          error={(touched && noteMissing) || Boolean(form.fieldError('note'))}
          helperText={touched && noteMissing ? 'A note is required for this option.' : form.fieldError('note')}
        />
      )}
      <LoadingButton type="submit" variant="contained" color="success" loading={form.submitting} sx={{ alignSelf: 'center', minWidth: 120 }}>Submit</LoadingButton>
    </Stack>
  );
}

function ResolveButton({ ticket }) {
  const notify = useNotify();
  const [open, setOpen] = useState(false);
  const mutation = useResolve(ticket.id);
  const form = useActionForm(async () => {
    await mutation.mutateAsync();
    setOpen(false);
    notify('Ticket marked as resolved.');
  });
  return (
    <>
      <Button variant="outlined" startIcon={<CheckIcon />} onClick={() => setOpen(true)}>Mark Resolved</Button>
      <Dialog open={open} onClose={form.submitting ? undefined : () => setOpen(false)} aria-labelledby="resolve-title">
        <DialogTitle id="resolve-title">Mark ticket as resolved?</DialogTitle>
        <DialogContent>
          <DialogContentText>This closes the ticket for everyone. This can't be undone.</DialogContentText>
          {form.general && <Alert severity="error" role="alert" sx={{ mt: 2 }}>{form.general}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={form.submitting}>Cancel</Button>
          <LoadingButton variant="contained" color="success" loading={form.submitting} onClick={() => form.submit()}>Mark Resolved</LoadingButton>
        </DialogActions>
      </Dialog>
    </>
  );
}

/** The wireframe's CTA area. What is rendered comes from `ticket.available_actions` (decided by the API). */
export default function ActionPanel({ ticket, justCreated }) {
  const actions = ticket.available_actions;
  const canRoute = actions.includes('assign_worker');
  const canAssess = actions.includes('submit_assessment');
  const canResolve = actions.includes('resolve');
  const [mode, setMode] = useState('');
  const [assessOpen, setAssessOpen] = useState(false);

  if (!canRoute && !canAssess && !canResolve && !justCreated) return null;

  const message = canRoute
    ? 'A new ticket has been assigned to you. Review it and take the next action.'
    : canAssess
      ? 'You have been assigned this ticket. Take action.'
      : canResolve && justCreated
        ? 'Ticket created successfully. If the issue is resolved, you can mark it as resolved.'
        : canResolve
          ? 'If the issue no longer persists, you can mark it as resolved.'
          : justCreated
            ? 'Ticket created successfully.'
            : '';

  return (
    <Stack spacing={1.5} sx={{ mt: 1.5 }}>
      {message && <Alert severity="info" icon={false} role="status" sx={{ justifyContent: 'center', textAlign: 'center' }}>{message}</Alert>}
      <Stack alignItems="center">
        {canRoute && (
          <ToggleButtonGroup exclusive size="small" value={mode} onChange={(_, v) => setMode(v || '')} aria-label="Ticket actions">
            <ToggleButton value="assign">Assign Worker</ToggleButton>
            <ToggleButton value="department">Change Department</ToggleButton>
          </ToggleButtonGroup>
        )}
        {canAssess && (
          <Button variant={assessOpen ? 'contained' : 'outlined'} onClick={() => setAssessOpen((o) => !o)} aria-expanded={assessOpen}>
            Submit Assessment
          </Button>
        )}
        {canResolve && <ResolveButton ticket={ticket} />}
      </Stack>
      {canRoute && mode === 'assign' && <Paper variant="outlined" sx={{ p: 2 }}><AssignWorkerForm ticket={ticket} /></Paper>}
      {canRoute && mode === 'department' && <Paper variant="outlined" sx={{ p: 2 }}><ChangeDepartmentForm ticket={ticket} /></Paper>}
      {canAssess && assessOpen && <Paper variant="outlined" sx={{ p: 2 }}><AssessmentForm ticket={ticket} /></Paper>}
    </Stack>
  );
}

