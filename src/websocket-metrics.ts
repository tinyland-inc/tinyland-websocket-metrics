/**
 * WebSocket Metrics Collector
 *
 * Tracks WebSocket connection metrics for Prometheus.
 * Container-first design: metrics exposed via /api/metrics endpoint.
 */

import type { PathMetrics, WebSocketMetrics } from './types.js';

export class WebSocketMetricsCollector {
	private metrics: WebSocketMetrics = {
		activeConnections: 0,
		totalConnections: 0,
		totalDisconnections: 0,
		messagesSent: 0,
		messagesReceived: 0,
		errors: 0,
		reconnections: 0,
		byPath: new Map(),
	};

	trackConnection(path: string): void {
		this.metrics.activeConnections++;
		this.metrics.totalConnections++;
		const pathMetrics: PathMetrics = this.metrics.byPath.get(path) || {
			connections: 0,
			messages: 0,
		};
		pathMetrics.connections++;
		this.metrics.byPath.set(path, pathMetrics);
	}

	trackDisconnection(_path: string): void {
		this.metrics.activeConnections = Math.max(0, this.metrics.activeConnections - 1);
		this.metrics.totalDisconnections++;
	}

	trackMessageSent(path: string): void {
		this.metrics.messagesSent++;
		const pathMetrics = this.metrics.byPath.get(path);
		if (pathMetrics) {
			pathMetrics.messages++;
		}
	}

	trackMessageReceived(path: string): void {
		this.metrics.messagesReceived++;
		const pathMetrics = this.metrics.byPath.get(path);
		if (pathMetrics) {
			pathMetrics.messages++;
		}
	}

	trackError(_path: string): void {
		this.metrics.errors++;
	}

	trackReconnection(_path: string): void {
		this.metrics.reconnections++;
	}

	getMetrics(): WebSocketMetrics {
		return { ...this.metrics, byPath: new Map(this.metrics.byPath) };
	}

	exportPrometheus(): string {
		const lines: string[] = [];

		lines.push('# HELP websocket_active_connections Number of active WebSocket connections');
		lines.push('# TYPE websocket_active_connections gauge');
		lines.push(`websocket_active_connections ${this.metrics.activeConnections}`);

		lines.push('# HELP websocket_total_connections Total number of WebSocket connections');
		lines.push('# TYPE websocket_total_connections counter');
		lines.push(`websocket_total_connections ${this.metrics.totalConnections}`);

		lines.push(
			'# HELP websocket_total_disconnections Total number of WebSocket disconnections'
		);
		lines.push('# TYPE websocket_total_disconnections counter');
		lines.push(`websocket_total_disconnections ${this.metrics.totalDisconnections}`);

		lines.push('# HELP websocket_messages_sent_total Total number of messages sent');
		lines.push('# TYPE websocket_messages_sent_total counter');
		lines.push(`websocket_messages_sent_total ${this.metrics.messagesSent}`);

		lines.push('# HELP websocket_messages_received_total Total number of messages received');
		lines.push('# TYPE websocket_messages_received_total counter');
		lines.push(`websocket_messages_received_total ${this.metrics.messagesReceived}`);

		lines.push('# HELP websocket_errors_total Total number of WebSocket errors');
		lines.push('# TYPE websocket_errors_total counter');
		lines.push(`websocket_errors_total ${this.metrics.errors}`);

		lines.push('# HELP websocket_reconnections_total Total number of WebSocket reconnections');
		lines.push('# TYPE websocket_reconnections_total counter');
		lines.push(`websocket_reconnections_total ${this.metrics.reconnections}`);

		for (const [path, pathMetrics] of this.metrics.byPath.entries()) {
			lines.push(`websocket_path_connections{path="${path}"} ${pathMetrics.connections}`);
			lines.push(`websocket_path_messages{path="${path}"} ${pathMetrics.messages}`);
		}

		return lines.join('\n') + '\n';
	}

	reset(): void {
		this.metrics = {
			activeConnections: 0,
			totalConnections: 0,
			totalDisconnections: 0,
			messagesSent: 0,
			messagesReceived: 0,
			errors: 0,
			reconnections: 0,
			byPath: new Map(),
		};
	}
}
