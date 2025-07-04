import type { Route } from './+types/home';

export function meta(_args: Route.MetaArgs) {
  return [
    { title: 'YARN Scheduler UI' },
    { name: 'description', content: 'YARN Capacity Scheduler' },
  ];
}
