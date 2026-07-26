import { redirect } from 'next/navigation';

/** The root path sends visitors to the console; the middleware gates access. */
export default function RootPage() {
  redirect('/hosted-zones');
}
