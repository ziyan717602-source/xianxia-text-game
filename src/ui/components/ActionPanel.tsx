import { useState } from 'react';
import { Action } from '../../game/types';
import { ACTIONS } from '../../content/actions';
import { formatActionInfo, ACTION_GROUP_ORDER, ACTION_GROUP_LABELS } from '../constants';

interface ActionGroupSectionProps {
  group: string;
  label: string;
  actions: Action[];
  onAction: (id: string) => void;
  disabled: boolean;
  defaultOpen: boolean;
}

function ActionGroupSection({ group, label, actions, onAction, disabled, defaultOpen }: ActionGroupSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  if (actions.length === 0) return null;
  return (
    <div className="action-group" data-group={group}>
      <button
        className="action-group-header"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span>{label}</span>
        <span className="action-group-count">{actions.length}</span>
        <span className="action-group-toggle">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="action-group-body">
          {actions.map((action) => (
            <button
              className="action-button"
              key={action.id}
              onClick={() => onAction(action.id)}
              disabled={disabled}
            >
              <span>{action.name}</span>
              {formatActionInfo(action) && (
                <span style={{fontSize: '0.75em', opacity: 0.7, display: 'block'}}>{formatActionInfo(action)}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface ActionPanelProps {
  availableActionIds: string[];
  onAction: (id: string) => void;
  disabled: boolean;
}

export function ActionPanel({ availableActionIds, onAction, disabled }: ActionPanelProps) {
  return (
    <div className="action-list">
      {availableActionIds.length === 0 ? (
        <p className="muted">此地暂时无事可做。</p>
      ) : (
        (() => {
          const resolvedActions = availableActionIds
            .map((id) => ACTIONS[id])
            .filter((a): a is Action => !!a);
          const grouped = new Map<NonNullable<Action['actionGroup']>, Action[]>();
          const ungrouped: Action[] = [];
          for (const action of resolvedActions) {
            const g = action.actionGroup;
            if (g) {
              if (!grouped.has(g)) grouped.set(g, []);
              grouped.get(g)!.push(action);
            } else {
              ungrouped.push(action);
            }
          }
          return (
            <>
              {ACTION_GROUP_ORDER.map((g) => {
                if (!g) return null;
                const actions = grouped.get(g);
                if (!actions || actions.length === 0) return null;
                return (
                  <ActionGroupSection
                    key={g}
                    group={g}
                    label={ACTION_GROUP_LABELS[g]}
                    actions={actions}
                    onAction={onAction}
                    disabled={disabled}
                    defaultOpen={g === 'basic'}
                  />
                );
              })}
              {ungrouped.length > 0 && (
                <ActionGroupSection
                  group="other"
                  label="其他"
                  actions={ungrouped}
                  onAction={onAction}
                  disabled={disabled}
                  defaultOpen={false}
                />
              )}
            </>
          );
        })()
      )}
    </div>
  );
}
