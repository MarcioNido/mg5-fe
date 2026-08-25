'use client';

import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import EditRounded from '@mui/icons-material/EditRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

import { categoryPath } from '@/features/categories/helpers';
import type { Category } from '@/features/categories/types';
import { formatDateTime } from '@/lib/format/date';

import type { Rule } from './types';

type Props = { items: Rule[]; categories: Category[]; onEdit: (rule: Rule) => void; onDelete: (rule: Rule) => void };
const scope = (rule: Rule) => rule.account?.name ?? 'All accounts';

export function RuleList({ items, categories, onEdit, onDelete }: Props) {
  return <>
    <TableContainer sx={{ display: { xs: 'none', md: 'block' } }}><Table size="small" aria-label="Automatic rules"><TableHead><TableRow><TableCell>Match text</TableCell><TableCell>Scope</TableCell><TableCell>Category</TableCell><TableCell>Created</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead><TableBody>{items.map((rule) => <TableRow key={rule.id} hover><TableCell><Typography fontWeight={700}>{rule.match_text}</Typography></TableCell><TableCell><Chip size="small" variant="outlined" label={scope(rule)} /></TableCell><TableCell>{categoryPath(rule.category, categories)}</TableCell><TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDateTime(rule.created_at)}</TableCell><TableCell align="right"><IconButton aria-label={`Edit rule ${rule.match_text}`} onClick={() => onEdit(rule)}><EditRounded /></IconButton><IconButton color="error" aria-label={`Delete rule ${rule.match_text}`} onClick={() => onDelete(rule)}><DeleteOutlineRounded /></IconButton></TableCell></TableRow>)}</TableBody></Table></TableContainer>
    <Stack spacing={1.5} sx={{ display: { xs: 'flex', md: 'none' } }} aria-label="Automatic rules mobile list">{items.map((rule) => <Card key={rule.id} variant="outlined"><CardContent><Typography fontWeight={700} sx={{ overflowWrap: 'anywhere' }}>{rule.match_text}</Typography><Stack direction="row" mt={1} mb={1}><Chip size="small" variant="outlined" label={scope(rule)} /></Stack><Typography variant="body2">{categoryPath(rule.category, categories)}</Typography><Typography variant="caption" color="text.secondary">Created {formatDateTime(rule.created_at)}</Typography><Box mt={2}><Button size="small" startIcon={<EditRounded />} onClick={() => onEdit(rule)} aria-label={`Edit rule ${rule.match_text}`}>Edit</Button><Button size="small" color="error" startIcon={<DeleteOutlineRounded />} onClick={() => onDelete(rule)} aria-label={`Delete rule ${rule.match_text}`}>Delete</Button></Box></CardContent></Card>)}</Stack>
  </>;
}

