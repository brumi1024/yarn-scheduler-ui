import type { Route } from './+types/node-labels';

export function meta(_args: Route.MetaArgs) {
  return [
    { title: 'Node Labels - YARN Scheduler UI' },
    {
      name: 'description',
      content: 'Manage node labels and partition configurations for YARN cluster',
    },
  ];
}
