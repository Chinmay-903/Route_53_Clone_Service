import { ConsoleShell } from '@/components/layout/ConsoleShell';

/**
 * Layout for every authenticated console page.
 *
 * Note there is no Suspense boundary here. One placed at this level is created
 * on the server and handed through the client shell, and in that arrangement it
 * never resolves — leaving every page showing its fallback forever. Pages that
 * read URL state own their own boundary instead, on the client side of the
 * divide where it behaves normally.
 */
export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return <ConsoleShell>{children}</ConsoleShell>;
}
