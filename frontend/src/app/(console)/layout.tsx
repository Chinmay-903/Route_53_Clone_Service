import { ConsoleShell } from '@/components/shell/ConsoleShell';

/**
 * Layout for every authenticated console page.
 *
 * Passing `children` into `ConsoleShell` is what bridges the App Router's
 * nested-layout model and Cloudscape's `AppLayout`, which takes its content as
 * a prop rather than rendering children.
 *
 * Note there is no Suspense boundary here. One placed at this level is created
 * on the server, handed through the client shell, and finally assigned to a
 * prop — and in that arrangement it never resolves, leaving every page showing
 * its fallback forever. Pages that read URL state own their own boundary
 * instead, on the client side of the divide where it behaves normally.
 */
export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return <ConsoleShell>{children}</ConsoleShell>;
}
