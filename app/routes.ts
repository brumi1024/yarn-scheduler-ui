import { 
  type RouteConfig, 
  index, 
  layout, 
  route 
} from "@react-router/dev/routes";

export default [
  layout("routes/layout.tsx", [
    index("routes/home.tsx"),
    route("queue/:queuePath", "routes/queue.tsx"),
    route("node-labels", "routes/node-labels.tsx"),
    route("global-settings", "routes/global-settings.tsx"),
  ])
] satisfies RouteConfig;

