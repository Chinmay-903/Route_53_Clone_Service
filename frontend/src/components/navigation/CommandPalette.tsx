'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Command } from 'cmdk';
import {
  ArrowRight,
  CornerDownLeft,
  Globe,
  Keyboard,
  Moon,
  Plus,
  Search,
  Sun,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { consoleDestinations } from '@/components/navigation/navigationItems';
import { Kbd } from '@/components/ui/Menu';
import { cn } from '@/lib/cn';
import { useHostedZones } from '@/lib/queries/hosted-zones';
import { useTheme } from '@/lib/theme';

/**
 * The ⌘K palette.
 *
 * Searches three things at once: the console's own sections, the user's actual
 * hosted zones, and a handful of actions. The zones matter most — the fastest
 * route to a domain in a console with hundreds of them is typing four letters
 * of its name, not paging a table.
 *
 * Zones are fetched only while the palette is open. Loading them with the shell
 * would put a request on every page load for a feature most visits never use.
 */
export function CommandPalette({
  open,
  onOpenChange,
  onShowShortcuts,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShowShortcuts: () => void;
}) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [search, setSearch] = useState('');

  const destinations = useMemo(consoleDestinations, []);

  const zonesQuery = useHostedZones({
    search: search.trim() || undefined,
    sort: 'name',
    order: 'asc',
    limit: 6,
    offset: 0,
  });

  // Clearing on close rather than on open: clearing on open runs while the
  // panel is animating in, which shows the previous query for a frame.
  useEffect(() => {
    if (!open) setSearch('');
  }, [open]);

  function run(action: () => void) {
    onOpenChange(false);
    action();
  }

  const zones = open ? (zonesQuery.data?.items ?? []) : [];

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            'fixed inset-0 z-[90] bg-[rgb(6_8_16/0.5)] backdrop-blur-[3px]',
            'data-[state=open]:animate-[fade-in_180ms_var(--ease-out)]',
            'data-[state=closed]:animate-[fade-out_120ms_var(--ease-in-out)_forwards]',
          )}
        />

        <Dialog.Content
          className={cn(
            // Sits above centre rather than at it: a panel that grows downward
            // from a fixed top edge does not jump as results filter.
            'fixed left-1/2 top-[12vh] z-[95] w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2',
            'overflow-hidden rounded-2xl border border-line bg-surface-overlay shadow-xl',
            'data-[state=open]:animate-[palette-in_240ms_var(--ease-out)]',
            'data-[state=closed]:animate-[fade-out_120ms_var(--ease-in-out)_forwards]',
          )}
        >
          <VisuallyHidden>
            <Dialog.Title>Command palette</Dialog.Title>
            <Dialog.Description>
              Search console sections, hosted zones, and actions.
            </Dialog.Description>
          </VisuallyHidden>

          <Command
            // Filtering is disabled for the zone group, which is filtered by the
            // API. Leaving cmdk's own matcher on would filter the server's
            // results a second time against the same string and hide anything
            // the server matched on a field the label does not show.
            shouldFilter={false}
            loop
            className="flex flex-col"
          >
            <div className="flex items-center gap-2.5 border-b border-line px-4">
              <Search className="size-4 shrink-0 text-ink-faint" aria-hidden="true" />
              <Command.Input
                value={search}
                onValueChange={setSearch}
                placeholder="Search zones, sections, and actions…"
                className="h-12 flex-1 bg-transparent text-md text-ink outline-none placeholder:text-ink-faint"
              />
              <Kbd>Esc</Kbd>
            </div>

            <Command.List className="max-h-[min(24rem,50vh)] overflow-y-auto p-2">
              <Command.Empty className="px-3 py-10 text-center text-base text-ink-muted">
                No matches for &ldquo;{search}&rdquo;.
              </Command.Empty>

              {zones.length > 0 && (
                <Group heading="Hosted zones">
                  {zones.map((zone) => (
                    <Item
                      key={zone.id}
                      value={`zone-${zone.id}`}
                      icon={<Globe />}
                      onSelect={() => run(() => router.push(`/hosted-zones/${zone.id}`))}
                      trailing={
                        <span className="text-2xs tabular-nums text-ink-faint">
                          {zone.record_count} records
                        </span>
                      }
                    >
                      {zone.name}
                    </Item>
                  ))}
                </Group>
              )}

              <Group heading="Actions">
                <Item
                  value="action-create-zone"
                  icon={<Plus />}
                  onSelect={() => run(() => router.push('/hosted-zones/create'))}
                  trailing={<Kbd>g c</Kbd>}
                  hidden={!matches('create hosted zone new', search)}
                >
                  Create hosted zone
                </Item>
                <Item
                  value="action-theme"
                  icon={theme === 'dark' ? <Sun /> : <Moon />}
                  onSelect={() => run(toggleTheme)}
                  trailing={<Kbd>⇧D</Kbd>}
                  hidden={!matches('theme dark light appearance mode', search)}
                >
                  Switch to {theme === 'dark' ? 'light' : 'dark'} mode
                </Item>
                <Item
                  value="action-shortcuts"
                  icon={<Keyboard />}
                  onSelect={() => run(onShowShortcuts)}
                  trailing={<Kbd>?</Kbd>}
                  hidden={!matches('keyboard shortcuts help keys', search)}
                >
                  Keyboard shortcuts
                </Item>
              </Group>

              <Group heading="Go to">
                {destinations
                  .filter((destination) =>
                    matches(`${destination.label} ${destination.group ?? ''}`, search),
                  )
                  .map((destination) => {
                    const Icon = destination.icon;
                    return (
                      <Item
                        key={destination.href}
                        value={`go-${destination.href}`}
                        icon={<Icon />}
                        onSelect={() => run(() => router.push(destination.href))}
                        trailing={
                          destination.group && (
                            <span className="text-2xs text-ink-faint">{destination.group}</span>
                          )
                        }
                      >
                        {destination.label}
                      </Item>
                    );
                  })}
              </Group>
            </Command.List>

            <footer className="flex items-center justify-between gap-3 border-t border-line bg-surface-muted px-3.5 py-2">
              <span className="flex items-center gap-1.5 text-2xs text-ink-faint">
                <ArrowRight className="size-3 rotate-90" aria-hidden="true" />
                <ArrowRight className="size-3 -rotate-90" aria-hidden="true" />
                to navigate
              </span>
              <span className="flex items-center gap-1.5 text-2xs text-ink-faint">
                <CornerDownLeft className="size-3" aria-hidden="true" />
                to select
              </span>
            </footer>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/**
 * Substring match across a haystack of keywords.
 *
 * Hand-rolled because cmdk's own filter is switched off for the zone group, and
 * running two different matchers in one list would rank the static entries by
 * fuzzy score and the zones by nothing.
 */
function matches(haystack: string, query: string): boolean {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return true;
  return trimmed.split(/\s+/).every((term) => haystack.toLowerCase().includes(term));
}

function Group({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <Command.Group
      heading={heading}
      className={cn(
        'mb-1 last:mb-0',
        '[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2',
        '[&_[cmdk-group-heading]]:text-2xs [&_[cmdk-group-heading]]:font-semibold',
        '[&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider',
        '[&_[cmdk-group-heading]]:text-ink-faint',
        // A group whose items are all hidden would otherwise leave its heading
        // floating above nothing.
        '[&:not(:has([cmdk-item]))]:hidden',
      )}
    >
      {children}
    </Command.Group>
  );
}

function Item({
  value,
  icon,
  children,
  onSelect,
  trailing,
  hidden,
}: {
  value: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onSelect: () => void;
  trailing?: React.ReactNode;
  hidden?: boolean;
}) {
  if (hidden) return null;

  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className={cn(
        'flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2',
        'text-base text-ink-secondary transition-colors duration-100',
        'data-[selected=true]:bg-brand-wash data-[selected=true]:text-ink',
        '[&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-ink-faint',
        'data-[selected=true]:[&_svg]:text-brand',
      )}
    >
      {icon}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {trailing}
    </Command.Item>
  );
}
