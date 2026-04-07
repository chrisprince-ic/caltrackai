import { Redirect } from 'expo-router';

/** App entry `/` must not resolve to the tab home — send users to onboarding first. */
export default function Index() {
  return <Redirect href="/welcome" />;
}
