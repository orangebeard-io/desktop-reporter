import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function NotesEditor({ initial = '', onSave }: { initial?: string; onSave: (notes: string) => void }) {
  const [notes, setNotes] = useState(initial);
  return (
    <div>
      <textarea
        className="w-full h-40 border rounded-md p-2 text-sm bg-background"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes (not rendered as markdown)"
      />
      <div className="pt-2">
        <Button variant="outline" onClick={() => onSave(notes)}>Save Notes</Button>
      </div>
    </div>
  );
}