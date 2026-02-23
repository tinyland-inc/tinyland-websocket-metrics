export type { WebSocketMetrics, PathMetrics } from './types.js';
export { WebSocketMetricsCollector } from './websocket-metrics.js';

import { WebSocketMetricsCollector } from './websocket-metrics.js';


export const websocketMetrics = new WebSocketMetricsCollector();
