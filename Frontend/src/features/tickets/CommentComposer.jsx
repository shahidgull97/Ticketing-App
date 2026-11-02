import { useState } from 'react';
import { Alert, Paper, Stack, TextField } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import SendIcon from '@mui/icons-material/Send';
import { parseApiError } from '../../api/http';
import LoadingButton from '../../components/LoadingButton';
import useSubmitGuard from '../../hooks/useSubmitGuard';
import { useAddComment } from './hooks';

const MAX = 2000;

/** Sticky-at-bottom comment box. */
export default function CommentComposer({ ticketId, disabled }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const addComment = useAddComment(ticketId);

  const post = async () => {
    const value = text.trim();
    if (!value) return setError('Write a comment before posting.');
    if (value.length > MAX) return setError(`Comment must be ${MAX} characters or fewer.`);
    setError('');
    try {
      await addComment.mutateAsync(value);
      setText('');
    } catch (e) {
      setError(parseApiError(e).message);
    }
  };
  const [guardedPost, posting] = useSubmitGuard(post);

  if (disabled) {
    return (
      <Alert severity="info" sx={{ position: 'sticky', bottom: 12, zIndex: 5, borderRadius: 2.5 }}>
        This ticket is resolved. Commenting is closed.
      </Alert>
    );
  }
  return (
    <Paper
      component="form"
      noValidate
      elevation={0}
      onSubmit={(e) => {
        e.preventDefault();
        guardedPost();
      }}
      sx={{
        position: 'sticky',
        bottom: 12,
        zIndex: 5,
        p: 1.5,
        borderRadius: 3,
        bgcolor: isDark ? 'rgba(17, 24, 39, 0.94)' : 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: isDark ? '0 12px 30px -8px rgba(0, 0, 0, 0.55)' : '0 12px 30px -8px rgba(15, 23, 42, 0.14)',
      }}
    >
      <Stack direction="row" spacing={1.25} alignItems="flex-start">
        <TextField
          fullWidth
          size="small"
          multiline
          maxRows={4}
          placeholder="Write a comment... (Ctrl+Enter to post)"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (error) setError('');
          }}
          inputProps={{ 'aria-label': 'Write a comment' }}
          error={Boolean(error)}
          helperText={error || (text.length > MAX - 200 ? `${text.length}/${MAX}` : undefined)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              guardedPost();
            }
          }}
        />
        <LoadingButton
          type="submit"
          variant="contained"
          endIcon={<SendIcon fontSize="small" />}
          loading={posting}
          disabled={!text.trim()}
          sx={{ px: 2.5, py: 1 }}
        >
          Post
        </LoadingButton>
      </Stack>
    </Paper>
  );
}
