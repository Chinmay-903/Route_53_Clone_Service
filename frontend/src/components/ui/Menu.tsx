'use client';

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { Check } from 'lucide-react';

import { cn } from '@/lib/cn';

/**
 * Dropdown menu, tooltip, and the keyboard-hint glyph.
 *
 * Grouped in one module because all three are thin styling layers over Radix
 * with no state of their own — splitting them into three files would be three
 * imports for what is one visual decision.
 */

const menuSurface = [
  'z-50 min-w-[11rem] overflow-hidden rounded-xl border border-line',
  'bg-surface-overlay p-1.5 shadow-xl pop-surface',
];

const menuItem = [
  'flex cursor-pointer select-none items-center gap-2 rounded-lg px-2.5 py-1.5',
  'text-base text-ink-secondary outline-none transition-colors duration-100',
  'data-[highlighted]:bg-brand-wash data-[highlighted]:text-ink',
  'data-[disabled]:pointer-events-none data-[disabled]:opacity-45',
  '[&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-ink-faint',
  'data-[highlighted]:[&_svg]:text-brand',
];

export interface MenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  /** Styles the row as destructive and reddens its icon. */
  danger?: boolean;
  /** Draws a separator above this item. */
  separatorBefore?: boolean;
  /** Secondary text pinned to the right, usually a shortcut. */
  hint?: string;
}

export function Menu({
  trigger,
  items,
  onSelect,
  align = 'end',
  label,
}: {
  trigger: React.ReactNode;
  items: MenuItem[];
  onSelect: (id: string) => void;
  align?: 'start' | 'center' | 'end';
  label?: string;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild aria-label={label}>
        {trigger}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align={align} sideOffset={6} className={cn(menuSurface)}>
          {items.map((item) => (
            <div key={item.id}>
              {item.separatorBefore && (
                <DropdownMenu.Separator className="my-1.5 h-px bg-line" />
              )}
              <DropdownMenu.Item
                disabled={item.disabled}
                onSelect={() => onSelect(item.id)}
                className={cn(
                  menuItem,
                  item.danger && [
                    'text-danger data-[highlighted]:bg-danger-wash data-[highlighted]:text-danger',
                    '[&_svg]:text-danger data-[highlighted]:[&_svg]:text-danger',
                  ],
                )}
              >
                {item.icon}
                <span className="flex-1">{item.label}</span>
                {item.hint && (
                  <span className="font-mono text-2xs text-ink-faint">{item.hint}</span>
                )}
              </DropdownMenu.Item>
            </div>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/** A menu of toggles, used by the table's column picker. */
export function CheckboxMenu({
  trigger,
  items,
  onToggle,
  align = 'end',
  header,
  footer,
}: {
  trigger: React.ReactNode;
  items: { id: string; label: string; checked: boolean; disabled?: boolean }[];
  onToggle: (id: string, checked: boolean) => void;
  align?: 'start' | 'center' | 'end';
  header?: string;
  footer?: React.ReactNode;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align={align} sideOffset={6} className={cn(menuSurface, 'min-w-56')}>
          {header && (
            <DropdownMenu.Label className="px-2.5 py-1.5 text-2xs font-semibold uppercase tracking-wider text-ink-faint">
              {header}
            </DropdownMenu.Label>
          )}
          {items.map((item) => (
            <DropdownMenu.CheckboxItem
              key={item.id}
              checked={item.checked}
              disabled={item.disabled}
              // Radix closes the menu on select by default, which would make
              // choosing four columns take four trips through the trigger.
              onSelect={(event) => event.preventDefault()}
              onCheckedChange={(checked) => onToggle(item.id, checked === true)}
              className={cn(menuItem, 'pl-2.5')}
            >
              <span
                className={cn(
                  'flex size-4 shrink-0 items-center justify-center rounded-[5px] border transition-colors',
                  item.checked
                    ? 'border-brand bg-brand text-brand-contrast'
                    : 'border-line-strong bg-surface',
                )}
                aria-hidden="true"
              >
                {item.checked && <Check className="!size-3 !text-current" strokeWidth={3} />}
              </span>
              <span className="flex-1">{item.label}</span>
            </DropdownMenu.CheckboxItem>
          ))}
          {footer && (
            <>
              <DropdownMenu.Separator className="my-1.5 h-px bg-line" />
              <div className="px-1 pb-0.5">{footer}</div>
            </>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/**
 * Wraps the application once so tooltips share a delay group.
 *
 * `skipDelayDuration` is what makes a row of icon buttons feel right: the first
 * tooltip waits, and moving to the next one within the skip window shows
 * immediately rather than making the user wait again at every stop.
 */
export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return (
    <TooltipPrimitive.Provider delayDuration={400} skipDelayDuration={300}>
      {children}
    </TooltipPrimitive.Provider>
  );
}

export function Tooltip({
  content,
  children,
  side = 'top',
  align = 'center',
  hint,
}: {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  /** A keyboard shortcut shown beside the label. */
  hint?: string;
}) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          align={align}
          sideOffset={8}
          className={cn(
            'pop-surface z-50 flex items-center gap-2 rounded-lg px-2.5 py-1.5',
            'bg-ink text-xs font-medium text-canvas shadow-lg',
            'max-w-64',
          )}
        >
          {content}
          {hint && (
            <span className="rounded border border-canvas/25 px-1 font-mono text-2xs text-canvas/70">
              {hint}
            </span>
          )}
          <TooltipPrimitive.Arrow className="fill-[var(--text)]" width={10} height={5} />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

/**
 * A keyboard key.
 *
 * Rendered as `<kbd>` rather than a styled span, so assistive technology
 * announces it as key input rather than reading "slash" as punctuation.
 */
export function Kbd({
  children,
  className,
  tone = 'default',
}: {
  children: React.ReactNode;
  className?: string;
  tone?: 'default' | 'inverse';
}) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded border px-1.5',
        'font-mono text-2xs font-medium leading-none',
        tone === 'inverse'
          ? 'border-canvas/25 bg-canvas/10 text-canvas/80'
          : 'border-line-strong bg-surface-inset text-ink-muted',
        className,
      )}
    >
      {children}
    </kbd>
  );
}
