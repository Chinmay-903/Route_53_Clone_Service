import { redirect } from 'next/navigation';

/**
 * The records route.
 *
 * Records live in a tab on the zone detail page, matching the console. This
 * route exists so a deep link to `/records` still lands somewhere sensible
 * rather than 404-ing.
 */
export default async function RecordsPage({
  params,
}: {
  params: Promise<{ zoneId: string }>;
}) {
  const { zoneId } = await params;
  redirect(`/hosted-zones/${zoneId}`);
}
