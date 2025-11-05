import type { Route } from './+types/global-settings';

export function meta(_args: Route.MetaArgs) {
  return [
    { title: 'Global Settings - YARN Scheduler UI' },
    { name: 'description', content: 'Configure scheduler-wide capacity settings and properties' },
  ];
}
