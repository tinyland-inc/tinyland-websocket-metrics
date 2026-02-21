export type { WebSocketMetrics, PathMetrics } from './types.js';
export { WebSocketMetricsCollector } from './websocket-metrics.js';

import { WebSocketMetricsCollector } from './websocket-metrics.js';

/** Default singleton instance for application-wide metrics collection. */
export const websocketMetrics = new WebSocketMetricsCollector();
