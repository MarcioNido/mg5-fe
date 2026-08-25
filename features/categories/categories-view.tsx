'use client';

import AddRounded from '@mui/icons-material/AddRounded';
import CategoryRounded from '@mui/icons-material/CategoryRounded';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import EditRounded from '@mui/icons-material/EditRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMemo, useRef, useState } from 'react';

import { useTenant } from '@/features/tenants/tenant-context';
import { ApiError } from '@/lib/api/error';
import { messageFromError } from '@/lib/api/ui-error';

import { CategoryFormDialog } from './category-form-dialog';
import { buildCategoryHierarchy, categoryPath, type CategoryNode } from './helpers';
import { deleteCategory } from './service';
import { categoryTypeLabels, type Category, type CategoryType } from './types';
import { useCategories } from './use-categories';

export function CategoriesView() { const { selectedSlug } = useTenant(); return <CategoriesTenantView key={selectedSlug ?? 'no-tenant'} tenantSlug={selectedSlug} />; }

function CategoryTree({ nodes, categories, onEdit, onDelete, depth = 0 }: { nodes: CategoryNode[]; categories: Category[]; onEdit: (category: Category) => void; onDelete: (category: Category) => void; depth?: number }) {
  return <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0 }}>
    {nodes.map(({ category, children }) => <Box component="li" key={category.id} sx={{ ml: { xs: Math.min(depth, 2) * 1.25, sm: depth * 3 }, mt: 1.25 }}>
      <Card variant="outlined"><CardContent sx={{ py: '12px !important', px: { xs: 1.5, sm: 2 } }}><Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
        <Box minWidth={0}><Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap><Typography fontWeight={700}>{category.name}</Typography><Chip size="small" label={categoryTypeLabels[category.type as CategoryType] ?? category.type} /></Stack>{depth > 0 && <Typography variant="caption" color="text.secondary">{categoryPath(category, categories)}</Typography>}</Box>
        <Stack direction="row"><IconButton aria-label={`Edit ${category.name}`} onClick={() => onEdit(category)}><EditRounded /></IconButton><IconButton color="error" aria-label={`Delete ${category.name}`} onClick={() => onDelete(category)}><DeleteOutlineRounded /></IconButton></Stack>
      </Stack></CardContent></Card>
      {children.length > 0 && <CategoryTree nodes={children} categories={categories} onEdit={onEdit} onDelete={onDelete} depth={depth + 1} />}
    </Box>)}
  </Box>;
}

function CategoriesTenantView({ tenantSlug }: { tenantSlug: string | null }) {
  const { categories, loading, error, retry, refresh } = useCategories(tenantSlug);
  const tree = useMemo(() => buildCategoryHierarchy(categories), [categories]);
  const [formOpen, setFormOpen] = useState(false); const [editing, setEditing] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null); const [deleteError, setDeleteError] = useState<string | null>(null); const [deleteBusy, setDeleteBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null); const deleteLock = useRef(false);
  const openCreate = () => { setEditing(null); setFormOpen(true); }; const openEdit = (category: Category) => { setEditing(category); setFormOpen(true); };
  const confirmDelete = async () => {
    if (!tenantSlug || !deleting || deleteLock.current) return;
    deleteLock.current = true; setDeleteBusy(true); setDeleteError(null);
    try { await deleteCategory(tenantSlug, deleting.id); setDeleting(null); setNotice('Category deleted.'); refresh(); }
    catch (reason) { setDeleteError(reason instanceof ApiError && reason.status === 422 && reason.validationErrors?.category?.[0] ? reason.validationErrors.category[0] : messageFromError(reason, 'Unable to delete this category.')); }
    finally { deleteLock.current = false; setDeleteBusy(false); }
  };
  return <Stack spacing={3}>
    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} gap={2}><Box><Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap><Typography variant="h4">Categories</Typography>{!loading && !error && tenantSlug && <Chip size="small" label={`${categories.length} total`} />}</Stack><Typography color="text.secondary" mt={0.75}>Categories organize transactions for practical management reporting.</Typography></Box><Button variant="contained" startIcon={<AddRounded />} onClick={openCreate} disabled={!tenantSlug || loading || Boolean(error)}>Add category</Button></Stack>
    {!tenantSlug && <Alert severity="info">Choose Personal or Clinic to manage its categories.</Alert>}
    {error && <Alert severity="error" action={<Button color="inherit" onClick={retry}>Retry</Button>}>{error}</Alert>}
    {loading && <Stack alignItems="center" py={8}><CircularProgress aria-label="Loading categories" /></Stack>}
    {!loading && !error && tenantSlug && categories.length === 0 && <Card variant="outlined"><CardContent><Stack alignItems="center" textAlign="center" py={6} spacing={1.5}><CategoryRounded color="disabled" sx={{ fontSize: 48 }} /><Typography variant="h6">No categories yet</Typography><Typography color="text.secondary">Add a category to begin organizing management reports.</Typography><Button variant="contained" startIcon={<AddRounded />} onClick={openCreate}>Add category</Button></Stack></CardContent></Card>}
    {!loading && !error && categories.length > 0 && <Box component="section" aria-label="Category hierarchy"><CategoryTree nodes={tree} categories={categories} onEdit={openEdit} onDelete={(category) => { setDeleteError(null); setDeleting(category); }} /></Box>}
    {formOpen && tenantSlug && <CategoryFormDialog key={`${tenantSlug}-${editing?.id ?? 'new'}`} open category={editing} categories={categories} tenantSlug={tenantSlug} onClose={() => { setFormOpen(false); setEditing(null); }} onSaved={(message) => { setNotice(message); refresh(); }} />}
    <Dialog open={Boolean(deleting)} onClose={() => { if (!deleteBusy) setDeleting(null); }} aria-labelledby="delete-category-title"><DialogTitle id="delete-category-title">Delete {deleting?.name}?</DialogTitle><DialogContent><Stack spacing={2}><Typography>This is allowed only when the category is unused. Deletion does not cascade, so child categories must be removed from the bottom up.</Typography>{deleteError && <Alert severity="error">{deleteError}</Alert>}</Stack></DialogContent><DialogActions><Button color="inherit" onClick={() => setDeleting(null)} disabled={deleteBusy}>Cancel</Button><Button color="error" variant="contained" onClick={confirmDelete} disabled={deleteBusy}>{deleteBusy ? 'Deleting…' : 'Delete category'}</Button></DialogActions></Dialog>
    <Snackbar open={Boolean(notice)} autoHideDuration={6000} onClose={() => setNotice(null)}><Alert severity="success" variant="filled" onClose={() => setNotice(null)}>{notice}</Alert></Snackbar>
  </Stack>;
}

