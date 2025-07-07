import type { Route } from './+types/home';

export function meta(_args: Route.MetaArgs) {
  return [
    { title: 'YARN Capacity Scheduler UI' },
    { name: 'description', content: 'YARN Capacity Scheduler' },
  ];
}
