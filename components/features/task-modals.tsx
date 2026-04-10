'use client'
import { useState } from 'react'
import { Button, Input, Select, Label, Modal } from '@/components/ui'
import { useAddChecklistItem, useUpdateChecklistItem } from '@/hooks/use-data'
import type { LocalChecklistItem } from '@/types'

export const TASK_CATEGORIES = ['VENUE','CATERING','ATTIRE','PHOTOGRAPHY','MUSIC','TRANSPORT','LEGAL','INVITATIONS','DECORATIONS','MEDIA','DECOR','CEREMONY','RECEPTION','LOGISTICS','OTHER']

export type TaskItem = LocalChecklistItem & { isFinalCheck?: boolean; assignedToName?: string; eventId?: string }

export function TaskModal({ weddingId, item, eventId, onClose }: Readonly<{
  weddingId: string; item?: TaskItem; eventId?: string; onClose: () => void
}>) {
  const add = useAddChecklistItem(weddingId)
  const update = useUpdateChecklistItem(weddingId)
  const [form, setForm] = useState({
    title: item?.title ?? '',
    description: item?.description ?? '',
    category: item?.category ?? 'CEREMONY',
    dueDate: item?.dueDate ? new Date(item.dueDate).toISOString().split('T')[0] : '',
    priority: String(item?.priority ?? 2),
    assignedToName: item?.assignedToName ?? '',
    isFinalCheck: item?.isFinalCheck ?? false,
  })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!form.title.trim()) return
    const payload = {
      weddingId,
      title: form.title.trim(),
      description: form.description || undefined,
      category: form.category,
      dueDate: form.dueDate ? new Date(form.dueDate).getTime() : undefined,
      priority: Number.parseInt(form.priority),
      assignedToName: form.assignedToName || undefined,
      isFinalCheck: form.isFinalCheck,
      order: item?.order ?? 0,
      isChecked: item?.isChecked ?? false,
      eventId: item?.eventId ?? eventId,
    }
    if (item) {
      await update.mutateAsync({ ...payload, id: item.id, currentVersion: item.version })
    } else {
      await add.mutateAsync(payload)
    }
    onClose()
  }

  const isPending = add.isPending || update.isPending

  return (
    <Modal onClose={onClose} title={item ? 'Edit task' : 'Add task'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="task-title">Task *</Label>
          <Input id="task-title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Book the venue" required />
        </div>
        <div>
          <Label htmlFor="task-cat">Category</Label>
          <Select id="task-cat" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
            {TASK_CATEGORIES.map(c => <option key={c} value={c}>{c.replaceAll('_', ' ')}</option>)}
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="task-priority">Priority</Label>
            <Select id="task-priority" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
              <option value="1">High</option>
              <option value="2">Medium</option>
              <option value="3">Low</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="task-due">Due date</Label>
            <Input id="task-due" type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
          </div>
        </div>
        <div>
          <Label htmlFor="task-assignee">Assigned to</Label>
          <Input id="task-assignee" value={form.assignedToName} onChange={e => setForm(f => ({ ...f, assignedToName: e.target.value }))} placeholder="e.g. Bride's aunt" />
        </div>
        <div>
          <Label htmlFor="task-notes">Notes</Label>
          <Input id="task-notes" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Additional details" />
        </div>
        <label className="flex items-center gap-2 text-sm text-zinc-600 cursor-pointer">
          <input type="checkbox" checked={form.isFinalCheck} onChange={e => setForm(f => ({ ...f, isFinalCheck: e.target.checked }))} className="rounded" />
          Mark as final check item
        </label>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" className="flex-1" disabled={isPending}>
            {isPending ? (item ? 'Saving…' : 'Adding…') : (item ? 'Save' : 'Add task')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
