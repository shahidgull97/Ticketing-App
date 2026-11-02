import { useEffect, useState } from 'react';
import {
  Badge, Box, Button, Chip, Collapse, FormControl, IconButton, InputAdornment, InputLabel, Menu, MenuItem, Paper, Select, Stack, TextField,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import FilterListIcon from '@mui/icons-material/FilterList';
import SortIcon from '@mui/icons-material/Sort';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { useFilterOptions } from './hooks';

const FILTERS = [
  { key: 'client', label: 'Client', options: 'clients' },
  { key: 'department', label: 'Department', options: 'departments' },
  { key: 'facility_manager', label: 'Facility Manager', options: 'facility_managers' },
  { key: 'status', label: 'Status', options: 'statuses' },
];
export const SORTS = [
  { value: '-created_at', label: 'Newest first' },
  { value: 'created_at', label: 'Oldest first' },
];

function useDebounced(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/** Search + Filters + Sort bar. State lives in the URL (owned by the page); this is purely controlled. */
export default function TicketFilters({ params, onChange }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortAnchor, setSortAnchor] = useState(null);
  const [searchText, setSearchText] = useState(params.search || '');
  const debouncedSearch = useDebounced(searchText);
  const { data: options } = useFilterOptions();

  useEffect(() => {
    if (debouncedSearch !== (params.search || '')) onChange({ search: debouncedSearch });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const activeCount = FILTERS.filter((f) => params[f.key]).length;
  const sort = SORTS.find((s) => s.value === params.ordering) || SORTS[0];

  return (
    <Stack spacing={1.5}>
      <Paper
        variant="outlined"
        sx={{
          p: 0.75,
          px: 1.25,
          borderRadius: 2.5,
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'stretch', sm: 'center' },
          gap: 1.25,
        }}
      >
        <TextField
          fullWidth
          size="small"
          type="search"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Search tickets by issue (e.g. AC not cooling, Lift, Wi-Fi)..."
          inputProps={{ 'aria-label': 'Search tickets by issue' }}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc',
              '& fieldset': { borderColor: 'transparent' },
              '&:hover fieldset': { borderColor: 'divider' },
              '&.Mui-focused': { bgcolor: 'background.paper' },
            },
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
              endAdornment: searchText ? (
                <InputAdornment position="end">
                  <IconButton size="small" aria-label="Clear search" onClick={() => setSearchText('')}>
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null,
            },
          }}
        />
        <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
          <Badge color="primary" badgeContent={activeCount} invisible={!activeCount}>
            <Button
              variant={filtersOpen || activeCount ? 'contained' : 'outlined'}
              color={filtersOpen || activeCount ? 'primary' : 'inherit'}
              startIcon={<FilterListIcon />}
              onClick={() => setFiltersOpen((o) => !o)}
              aria-expanded={filtersOpen}
              aria-controls="ticket-filters"
              sx={{ whiteSpace: 'nowrap' }}
            >
              Filters
            </Button>
          </Badge>
          <Button
            variant="outlined"
            startIcon={<SortIcon />}
            onClick={(e) => setSortAnchor(e.currentTarget)}
            aria-haspopup="menu"
            sx={{ whiteSpace: 'nowrap', minWidth: 145 }}
          >
            {sort.label}
          </Button>
          <Menu anchorEl={sortAnchor} open={Boolean(sortAnchor)} onClose={() => setSortAnchor(null)}>
            {SORTS.map((s) => (
              <MenuItem
                key={s.value}
                selected={s.value === sort.value}
                onClick={() => {
                  setSortAnchor(null);
                  onChange({ ordering: s.value });
                }}
              >
                {s.label}
              </MenuItem>
            ))}
          </Menu>
        </Stack>
      </Paper>

      <Collapse in={filtersOpen} unmountOnExit id="ticket-filters">
        <Paper variant="outlined" sx={{ p: 2.25, borderRadius: 2.5, bgcolor: 'background.paper' }}>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' } }}>
            {FILTERS.map((f) => (
              <FormControl key={f.key} size="small" fullWidth>
                <InputLabel id={`filter-${f.key}`}>{f.label}</InputLabel>
                <Select
                  labelId={`filter-${f.key}`}
                  label={f.label}
                  value={params[f.key] || ''}
                  onChange={(e) => onChange({ [f.key]: e.target.value })}
                >
                  <MenuItem value="">All</MenuItem>
                  {(options?.[f.options] || []).map((o) => (
                    <MenuItem key={o.id} value={String(o.id)}>{o.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            ))}
          </Box>
          {activeCount > 0 && (
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 1.75 }}>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {FILTERS.filter((f) => params[f.key]).map((f) => {
                  const opt = (options?.[f.options] || []).find((o) => String(o.id) === String(params[f.key]));
                  return (
                    <Chip
                      key={f.key}
                      size="small"
                      label={`${f.label}: ${opt?.name || params[f.key]}`}
                      onDelete={() => onChange({ [f.key]: '' })}
                    />
                  );
                })}
              </Stack>
              <Button size="small" onClick={() => onChange(Object.fromEntries(FILTERS.map((f) => [f.key, ''])))}>
                Clear filters
              </Button>
            </Stack>
          )}
        </Paper>
      </Collapse>
    </Stack>
  );
}
