import { people, permissionsFor } from '@sgp/mock-data';
import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';

export interface FolderOption {
  id: string;
  label: string;
}

type SaveAs = { kind: 'shared' } | { kind: 'personal' };

const height = { height: 'var(--sgp-row-compact)' };

function SavePageDialog({
  mode,
  defaultName,
  folders,
  defaultFolderId,
  levelLabel,
  onSave,
  onClose,
}: {
  mode: SaveAs;
  defaultName: string;
  folders: FolderOption[];
  defaultFolderId: string;
  levelLabel: string;
  onSave: (name: string, folderId: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(defaultName);
  const [folderId, setFolderId] = useState(defaultFolderId);
  const personal = mode.kind === 'personal';
  const submit = () => name.trim() && onSave(name.trim(), folderId);
  const field = 'flex items-center gap-3 text-sm';
  const input =
    'min-w-0 flex-1 rounded-md border border-line-strong bg-surface-sunken px-2 text-sm text-fg outline-none focus:border-accent';
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-canvas/60 pt-24" onMouseDown={onClose}>
      <form
        role="dialog"
        aria-label={personal ? 'Save into My Pages' : 'Save as new page'}
        className="flex w-[28rem] flex-col gap-3 rounded-lg border border-line-strong bg-surface-raised p-4"
        style={{ boxShadow: 'var(--sgp-shadow-overlay)' }}
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <div className="flex items-center">
          <h2 className="text-lg font-semibold">{personal ? 'Save into My Pages' : 'Save as new page'}</h2>
          <button type="button" className="ml-auto text-fg-subtle hover:text-fg" aria-label="Close" onClick={onClose}>
            <Icon name="x" />
          </button>
        </div>
        <p className="text-sm text-fg-muted">
          {personal
            ? 'A personal copy with your changes. Only you can see it; the original page stays as it was.'
            : 'A new shared page with your changes. The original page stays as it was.'}
        </p>
        <label className={field}>
          <span className="w-16 text-fg-subtle">Name</span>
          <input autoFocus aria-label="Page name" value={name} onChange={(e) => setName(e.target.value)} className={input} style={height} />
        </label>
        <label className={field}>
          <span className="w-16 text-fg-subtle">Folder</span>
          {personal ? (
            <span className="flex items-center gap-1.5 text-fg">
              <Icon name="user" className="text-fg-subtle" /> Personal, in {levelLabel}
            </span>
          ) : (
            <select aria-label="Folder" value={folderId} onChange={(e) => setFolderId(e.target.value)} className={input} style={height}>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          )}
        </label>
        <div className="mt-1 flex justify-end gap-2">
          <button type="button" className="rounded-md border border-line-strong px-3 text-sm hover:bg-row-hover" style={height} onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim()}
            className="rounded-md bg-accent px-3 text-sm font-medium text-fg-inverse hover:bg-accent-hover disabled:opacity-50"
            style={height}
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
}

/**
 * The Page icon at the top right of a page. It turns dirty as soon as the user changes the layout
 * (columns, widths, view, sizes); the menu offers only the actions the viewer's permissions allow.
 */
export function PageMenu({
  pageName,
  shared,
  ownerId,
  viewerId,
  changes,
  levelLabel,
  folders,
  defaultFolderId,
  onRevert,
  onSave,
  onSaveAs,
  onSaveToMyPages,
}: {
  pageName: string;
  shared: boolean;
  ownerId: string;
  viewerId: string;
  changes: string[];
  levelLabel: string;
  folders: FolderOption[];
  defaultFolderId: string;
  onRevert: () => void;
  onSave: () => void;
  onSaveAs: (name: string, folderId: string) => void;
  onSaveToMyPages: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState<SaveAs | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const dirty = changes.length > 0;
  const perms = permissionsFor(viewerId);
  const viewer = people.find((p) => p.id === viewerId);
  const canSave = shared ? perms.createsSharedPages : ownerId === viewerId;
  const canSaveAs = perms.createsSharedPages;

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent && event.key !== 'Escape') return;
      if (event instanceof MouseEvent && ref.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    window.addEventListener('mousedown', close);
    window.addEventListener('keydown', close);
    return () => {
      window.removeEventListener('mousedown', close);
      window.removeEventListener('keydown', close);
    };
  }, [open]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 2500);
    return () => clearTimeout(timer);
  }, [notice]);

  const act = (run: () => void, message: string) => {
    run();
    setOpen(false);
    setNotice(message);
  };

  const item =
    'flex w-full items-start gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-row-hover disabled:opacity-40 disabled:hover:bg-transparent';

  return (
    <div ref={ref} className="relative flex items-center gap-2">
      {notice && (
        <span role="status" className="flex items-center gap-1 text-xs text-success">
          <Icon name="check" size={12} /> {notice}
        </span>
      )}
      <button
        aria-label={dirty ? 'Page has unsaved changes' : 'Page saved'}
        aria-haspopup="menu"
        aria-expanded={open}
        title={dirty ? 'Unsaved changes. Click for options.' : 'No unsaved changes'}
        onClick={() => setOpen(!open)}
        className={`relative flex items-center gap-1.5 rounded-md border px-2 text-sm ${
          dirty ? 'border-warning text-fg' : 'border-line-strong text-fg-muted hover:text-fg'
        } ${open ? 'bg-row-hover' : 'hover:bg-row-hover'}`}
        style={height}
      >
        <Icon name={dirty ? 'file-pen-line' : 'file-check'} className={dirty ? 'text-warning' : ''} />
        Page
        {dirty && <span className="size-1.5 rounded-full bg-warning" aria-hidden />}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Page options"
          className="absolute top-full right-0 z-40 mt-1 flex w-72 flex-col rounded-md border border-line-strong bg-surface-raised p-1 text-fg"
          style={{ boxShadow: 'var(--sgp-shadow-overlay)' }}
        >
          <div className="px-2 pt-1.5 pb-2">
            <div className="flex items-center gap-1.5 text-sm font-semibold">
              <Icon name={shared ? 'file' : 'user'} size={13} className="text-fg-subtle" />
              {pageName}
              <span className="text-xs font-normal text-fg-subtle">{shared ? 'Shared page' : 'Personal page'}</span>
            </div>
            {dirty ? (
              <ul className="mt-1 flex flex-col gap-0.5 text-xs text-fg-muted" aria-label="Unsaved changes">
                <li className="text-warning">Unsaved changes</li>
                {changes.map((c) => (
                  <li key={c} className="truncate">
                    {c}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-xs text-fg-subtle">No unsaved changes</p>
            )}
          </div>
          <div className="border-t border-line pt-1" />
          <button role="menuitem" className={item} disabled={!dirty} onClick={() => act(onRevert, 'Reverted')}>
            <Icon name="undo-2" className="mt-0.5 shrink-0 text-fg-subtle" />
            <span className="flex flex-col">
              Revert
              <span className="text-xs text-fg-subtle">Go back to the saved page</span>
            </span>
          </button>
          {canSave && (
            <button role="menuitem" className={item} disabled={!dirty} onClick={() => act(onSave, 'Saved')}>
              <Icon name="save" className="mt-0.5 shrink-0 text-fg-subtle" />
              <span className="flex flex-col">
                Save
                <span className="text-xs text-fg-subtle">{shared ? 'Update this page for everyone who uses it' : 'Update your page'}</span>
              </span>
            </button>
          )}
          {canSaveAs && (
            <button
              role="menuitem"
              className={item}
              onClick={() => {
                setOpen(false);
                setDialog({ kind: 'shared' });
              }}
            >
              <Icon name="file-plus" className="mt-0.5 shrink-0 text-fg-subtle" />
              <span className="flex flex-col">
                Save as new page
                <span className="text-xs text-fg-subtle">A new shared page in {levelLabel}</span>
              </span>
            </button>
          )}
          <button
            role="menuitem"
            className={item}
            onClick={() => {
              setOpen(false);
              setDialog({ kind: 'personal' });
            }}
          >
            <Icon name="user" className="mt-0.5 shrink-0 text-fg-subtle" />
            <span className="flex flex-col">
              Save into My Pages
              <span className="text-xs text-fg-subtle">A personal copy only you can see</span>
            </span>
          </button>
          <p className="mt-1 border-t border-line px-2 pt-1.5 pb-1 text-xs text-fg-subtle">
            Options follow your permissions ({perms.setNames.join(', ') || 'none'}). Viewing as {viewer?.name ?? viewerId}.
          </p>
        </div>
      )}

      {dialog && (
        <SavePageDialog
          mode={dialog}
          defaultName={dialog.kind === 'personal' ? `My ${pageName.toLowerCase()}` : `${pageName} copy`}
          folders={folders}
          defaultFolderId={defaultFolderId}
          levelLabel={levelLabel}
          onClose={() => setDialog(null)}
          onSave={(name, folderId) => {
            setDialog(null);
            if (dialog.kind === 'personal') {
              onSaveToMyPages(name);
              setNotice(`Saved "${name}" into My Pages`);
            } else {
              onSaveAs(name, folderId);
              setNotice(`Saved "${name}"`);
            }
          }}
        />
      )}
    </div>
  );
}
