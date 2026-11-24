import type { View } from '@octotally/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useId } from 'react';
import { Button, Dialog, DialogClose, Icon, Input, useConfirm, useToast } from 'tailor/core';
import { Form, FormActions, FormField, FormSummary, useTailorForm } from 'tailor/forms';
import { api } from '../api';
import { keys } from '../queries';

export type ViewDialogState = { mode: 'create' } | { mode: 'edit'; view: View } | null;

interface Props {
  state: ViewDialogState;
  /** The search on the page: what a new view saves, and what an edit can take over. */
  currentQuery: string;
  onClose: () => void;
  onSaved: (view: View) => void;
  onDeleted: (view: View) => void;
}

interface Values {
  name: string;
  query: string;
}

/** Saves the search as a view, or renames, changes or deletes a view of one's own. */
export function ViewDialog({ state, currentQuery, onClose, onSaved, onDeleted }: Props) {
  const client = useQueryClient();
  const confirm = useConfirm();
  const toast = useToast();
  const formId = useId();
  const editing = state?.mode === 'edit' ? state.view : null;

  const form = useTailorForm<Values>({
    defaultValues: { name: '', query: '' },
    onSubmit: async ({ name, query }) => {
      try {
        const r = editing
          ? await api.updateView(editing.id, { name: name.trim(), query: query.trim() })
          : await api.createView(name.trim(), query.trim());
        await client.invalidateQueries({ queryKey: keys.views });
        onSaved(r.view);
        return { ok: true, message: editing ? `View ${r.view.name} saved` : `View ${r.view.name} added` };
      } catch (e) {
        return { ok: false, message: (e as Error).message };
      }
    },
  });

  // Each opening starts from the view, or from the search on the page.
  // biome-ignore lint/correctness/useExhaustiveDependencies: only a new opening resets the form.
  useEffect(() => {
    if (!state) return;
    form.reset(editing ? { name: editing.name, query: editing.query } : { name: '', query: currentQuery });
  }, [state]);

  const remove = async (view: View) => {
    const ok = await confirm({
      title: `Delete the view ${view.name}?`,
      text: 'The saved search goes away. The items stay as they are.',
      confirmLabel: 'Delete view',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.deleteView(view.id);
      await client.invalidateQueries({ queryKey: keys.views });
      toast('success', `View ${view.name} deleted`);
      onDeleted(view);
    } catch (e) {
      toast('danger', (e as Error).message, { title: 'The view was not deleted' });
    }
  };

  return (
    <Dialog
      title={editing ? 'Edit view' : 'Save as view'}
      open={state !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      footer={
        <FormActions form={form} submit={editing ? 'Save view' : 'Add view'}>
          {editing ? (
            <Button variant="danger" icon={<Icon name="bi:trash" />} onClick={() => void remove(editing)}>
              Delete
            </Button>
          ) : null}
          <DialogClose>
            <Button type="reset" form={formId}>
              Cancel
            </Button>
          </DialogClose>
        </FormActions>
      }
    >
      <Form form={form} id={formId} label={editing ? 'Edit view' : 'Save as view'}>
        <FormSummary form={form} />
        <FormField form={form} name="name" label="Name" required help="Shown in the side column.">
          {(control) => <Input {...control} autoComplete="off" />}
        </FormField>
        <FormField
          form={form}
          name="query"
          label="Search"
          help="Qualifiers such as is:open repo:owner/name label:bug updated:>7d."
        >
          {(control) => <Input {...control} autoComplete="off" />}
        </FormField>
        {editing && editing.query !== currentQuery ? (
          <Button size="sm" variant="link" onClick={() => form.setFieldValue('query', currentQuery)}>
            Use the search on the page
          </Button>
        ) : null}
      </Form>
    </Dialog>
  );
}
