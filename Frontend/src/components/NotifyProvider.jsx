import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Alert, Snackbar } from '@mui/material';

const NotifyContext = createContext(() => {});

/** App-wide success / error toast. Usage: const notify = useNotify(); notify('Saved'); notify('Oops', 'error'). */
export function NotifyProvider({ children }) {
  const [toast, setToast] = useState(null);
  const notify = useCallback((message, severity = 'success') => setToast({ message, severity, key: Date.now() }), []);
  const value = useMemo(() => notify, [notify]);
  return (
    <NotifyContext.Provider value={value}>
      {children}
      <Snackbar
        key={toast?.key}
        open={Boolean(toast)}
        autoHideDuration={5000}
        onClose={(_, reason) => reason !== 'clickaway' && setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast ? (
          <Alert severity={toast.severity} variant="filled" onClose={() => setToast(null)} sx={{ width: '100%' }}>
            {toast.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </NotifyContext.Provider>
  );
}

export const useNotify = () => useContext(NotifyContext);

