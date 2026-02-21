import { describe, it, expect, beforeEach } from 'vitest';
import {
	WebSocketMetricsCollector,
	websocketMetrics,
	type WebSocketMetrics,
	type PathMetrics,
} from '../src/index.js';

describe('WebSocketMetricsCollector', () => {
	let collector: WebSocketMetricsCollector;

	beforeEach(() => {
		collector = new WebSocketMetricsCollector();
	});

	// ---------------------------------------------------------------
	// Constructor / Initial State
	// ---------------------------------------------------------------
	describe('constructor', () => {
		it('should create a fresh instance', () => {
			expect(collector).toBeInstanceOf(WebSocketMetricsCollector);
		});

		it('should start with zero activeConnections', () => {
			expect(collector.getMetrics().activeConnections).toBe(0);
		});

		it('should start with zero totalConnections', () => {
			expect(collector.getMetrics().totalConnections).toBe(0);
		});

		it('should start with zero totalDisconnections', () => {
			expect(collector.getMetrics().totalDisconnections).toBe(0);
		});

		it('should start with zero messagesSent', () => {
			expect(collector.getMetrics().messagesSent).toBe(0);
		});

		it('should start with zero messagesReceived', () => {
			expect(collector.getMetrics().messagesReceived).toBe(0);
		});

		it('should start with zero errors', () => {
			expect(collector.getMetrics().errors).toBe(0);
		});

		it('should start with zero reconnections', () => {
			expect(collector.getMetrics().reconnections).toBe(0);
		});

		it('should start with an empty byPath map', () => {
			expect(collector.getMetrics().byPath.size).toBe(0);
		});

		it('should create independent instances', () => {
			const a = new WebSocketMetricsCollector();
			const b = new WebSocketMetricsCollector();
			a.trackConnection('/ws');
			expect(a.getMetrics().totalConnections).toBe(1);
			expect(b.getMetrics().totalConnections).toBe(0);
		});
	});

	// ---------------------------------------------------------------
	// trackConnection
	// ---------------------------------------------------------------
	describe('trackConnection', () => {
		it('should increment activeConnections', () => {
			collector.trackConnection('/ws');
			expect(collector.getMetrics().activeConnections).toBe(1);
		});

		it('should increment totalConnections', () => {
			collector.trackConnection('/ws');
			expect(collector.getMetrics().totalConnections).toBe(1);
		});

		it('should increment activeConnections for each call', () => {
			collector.trackConnection('/ws');
			collector.trackConnection('/ws');
			collector.trackConnection('/ws');
			expect(collector.getMetrics().activeConnections).toBe(3);
		});

		it('should increment totalConnections for each call', () => {
			collector.trackConnection('/ws');
			collector.trackConnection('/ws');
			expect(collector.getMetrics().totalConnections).toBe(2);
		});

		it('should create a per-path metrics entry', () => {
			collector.trackConnection('/chat');
			expect(collector.getMetrics().byPath.has('/chat')).toBe(true);
		});

		it('should set path connections to 1 on first connection', () => {
			collector.trackConnection('/chat');
			expect(collector.getMetrics().byPath.get('/chat')?.connections).toBe(1);
		});

		it('should set path messages to 0 on first connection', () => {
			collector.trackConnection('/chat');
			expect(collector.getMetrics().byPath.get('/chat')?.messages).toBe(0);
		});

		it('should increment existing path connections', () => {
			collector.trackConnection('/chat');
			collector.trackConnection('/chat');
			expect(collector.getMetrics().byPath.get('/chat')?.connections).toBe(2);
		});

		it('should track connections across different paths independently', () => {
			collector.trackConnection('/chat');
			collector.trackConnection('/notifications');
			expect(collector.getMetrics().byPath.get('/chat')?.connections).toBe(1);
			expect(collector.getMetrics().byPath.get('/notifications')?.connections).toBe(1);
		});

		it('should increment totalConnections across different paths', () => {
			collector.trackConnection('/chat');
			collector.trackConnection('/notifications');
			expect(collector.getMetrics().totalConnections).toBe(2);
		});

		it('should handle empty string path', () => {
			collector.trackConnection('');
			expect(collector.getMetrics().byPath.has('')).toBe(true);
			expect(collector.getMetrics().activeConnections).toBe(1);
		});

		it('should handle paths with special characters', () => {
			collector.trackConnection('/ws?token=abc&room=123');
			expect(collector.getMetrics().byPath.has('/ws?token=abc&room=123')).toBe(true);
		});
	});

	// ---------------------------------------------------------------
	// trackDisconnection
	// ---------------------------------------------------------------
	describe('trackDisconnection', () => {
		it('should decrement activeConnections', () => {
			collector.trackConnection('/ws');
			collector.trackDisconnection('/ws');
			expect(collector.getMetrics().activeConnections).toBe(0);
		});

		it('should increment totalDisconnections', () => {
			collector.trackConnection('/ws');
			collector.trackDisconnection('/ws');
			expect(collector.getMetrics().totalDisconnections).toBe(1);
		});

		it('should never go below zero activeConnections', () => {
			collector.trackDisconnection('/ws');
			expect(collector.getMetrics().activeConnections).toBe(0);
		});

		it('should still increment totalDisconnections even if activeConnections is zero', () => {
			collector.trackDisconnection('/ws');
			expect(collector.getMetrics().totalDisconnections).toBe(1);
		});

		it('should never go below zero after multiple disconnections without connections', () => {
			collector.trackDisconnection('/ws');
			collector.trackDisconnection('/ws');
			collector.trackDisconnection('/ws');
			expect(collector.getMetrics().activeConnections).toBe(0);
		});

		it('should correctly decrement with multiple connections then disconnections', () => {
			collector.trackConnection('/ws');
			collector.trackConnection('/ws');
			collector.trackConnection('/ws');
			collector.trackDisconnection('/ws');
			expect(collector.getMetrics().activeConnections).toBe(2);
		});

		it('should track totalDisconnections across multiple calls', () => {
			collector.trackConnection('/ws');
			collector.trackConnection('/ws');
			collector.trackDisconnection('/ws');
			collector.trackDisconnection('/ws');
			expect(collector.getMetrics().totalDisconnections).toBe(2);
		});

		it('should not affect totalConnections', () => {
			collector.trackConnection('/ws');
			collector.trackDisconnection('/ws');
			expect(collector.getMetrics().totalConnections).toBe(1);
		});
	});

	// ---------------------------------------------------------------
	// trackMessageSent
	// ---------------------------------------------------------------
	describe('trackMessageSent', () => {
		it('should increment messagesSent counter', () => {
			collector.trackMessageSent('/ws');
			expect(collector.getMetrics().messagesSent).toBe(1);
		});

		it('should increment messagesSent for each call', () => {
			collector.trackMessageSent('/ws');
			collector.trackMessageSent('/ws');
			collector.trackMessageSent('/ws');
			expect(collector.getMetrics().messagesSent).toBe(3);
		});

		it('should increment path messages if path exists', () => {
			collector.trackConnection('/ws');
			collector.trackMessageSent('/ws');
			expect(collector.getMetrics().byPath.get('/ws')?.messages).toBe(1);
		});

		it('should increment path messages multiple times', () => {
			collector.trackConnection('/ws');
			collector.trackMessageSent('/ws');
			collector.trackMessageSent('/ws');
			expect(collector.getMetrics().byPath.get('/ws')?.messages).toBe(2);
		});

		it('should not create a path entry if path does not exist', () => {
			collector.trackMessageSent('/unknown');
			expect(collector.getMetrics().byPath.has('/unknown')).toBe(false);
		});

		it('should still increment global messagesSent even if path does not exist', () => {
			collector.trackMessageSent('/unknown');
			expect(collector.getMetrics().messagesSent).toBe(1);
		});

		it('should not affect messagesReceived', () => {
			collector.trackMessageSent('/ws');
			expect(collector.getMetrics().messagesReceived).toBe(0);
		});

		it('should increment correct path messages when multiple paths exist', () => {
			collector.trackConnection('/chat');
			collector.trackConnection('/notifications');
			collector.trackMessageSent('/chat');
			expect(collector.getMetrics().byPath.get('/chat')?.messages).toBe(1);
			expect(collector.getMetrics().byPath.get('/notifications')?.messages).toBe(0);
		});
	});

	// ---------------------------------------------------------------
	// trackMessageReceived
	// ---------------------------------------------------------------
	describe('trackMessageReceived', () => {
		it('should increment messagesReceived counter', () => {
			collector.trackMessageReceived('/ws');
			expect(collector.getMetrics().messagesReceived).toBe(1);
		});

		it('should increment messagesReceived for each call', () => {
			collector.trackMessageReceived('/ws');
			collector.trackMessageReceived('/ws');
			expect(collector.getMetrics().messagesReceived).toBe(2);
		});

		it('should increment path messages if path exists', () => {
			collector.trackConnection('/ws');
			collector.trackMessageReceived('/ws');
			expect(collector.getMetrics().byPath.get('/ws')?.messages).toBe(1);
		});

		it('should increment path messages multiple times', () => {
			collector.trackConnection('/ws');
			collector.trackMessageReceived('/ws');
			collector.trackMessageReceived('/ws');
			collector.trackMessageReceived('/ws');
			expect(collector.getMetrics().byPath.get('/ws')?.messages).toBe(3);
		});

		it('should not create a path entry if path does not exist', () => {
			collector.trackMessageReceived('/unknown');
			expect(collector.getMetrics().byPath.has('/unknown')).toBe(false);
		});

		it('should still increment global messagesReceived even if path does not exist', () => {
			collector.trackMessageReceived('/unknown');
			expect(collector.getMetrics().messagesReceived).toBe(1);
		});

		it('should not affect messagesSent', () => {
			collector.trackMessageReceived('/ws');
			expect(collector.getMetrics().messagesSent).toBe(0);
		});

		it('should share path messages counter with trackMessageSent', () => {
			collector.trackConnection('/ws');
			collector.trackMessageSent('/ws');
			collector.trackMessageReceived('/ws');
			expect(collector.getMetrics().byPath.get('/ws')?.messages).toBe(2);
		});
	});

	// ---------------------------------------------------------------
	// trackError
	// ---------------------------------------------------------------
	describe('trackError', () => {
		it('should increment errors counter', () => {
			collector.trackError('/ws');
			expect(collector.getMetrics().errors).toBe(1);
		});

		it('should increment errors for each call', () => {
			collector.trackError('/ws');
			collector.trackError('/ws');
			collector.trackError('/ws');
			expect(collector.getMetrics().errors).toBe(3);
		});

		it('should not affect other counters', () => {
			collector.trackError('/ws');
			const m = collector.getMetrics();
			expect(m.activeConnections).toBe(0);
			expect(m.totalConnections).toBe(0);
			expect(m.messagesSent).toBe(0);
			expect(m.messagesReceived).toBe(0);
			expect(m.reconnections).toBe(0);
		});

		it('should increment errors regardless of path existence', () => {
			collector.trackError('/nonexistent');
			expect(collector.getMetrics().errors).toBe(1);
		});
	});

	// ---------------------------------------------------------------
	// trackReconnection
	// ---------------------------------------------------------------
	describe('trackReconnection', () => {
		it('should increment reconnections counter', () => {
			collector.trackReconnection('/ws');
			expect(collector.getMetrics().reconnections).toBe(1);
		});

		it('should increment reconnections for each call', () => {
			collector.trackReconnection('/ws');
			collector.trackReconnection('/ws');
			expect(collector.getMetrics().reconnections).toBe(2);
		});

		it('should not affect other counters', () => {
			collector.trackReconnection('/ws');
			const m = collector.getMetrics();
			expect(m.activeConnections).toBe(0);
			expect(m.totalConnections).toBe(0);
			expect(m.errors).toBe(0);
		});

		it('should increment reconnections regardless of path existence', () => {
			collector.trackReconnection('/nonexistent');
			expect(collector.getMetrics().reconnections).toBe(1);
		});
	});

	// ---------------------------------------------------------------
	// getMetrics (immutability / copy semantics)
	// ---------------------------------------------------------------
	describe('getMetrics', () => {
		it('should return a copy of the metrics', () => {
			collector.trackConnection('/ws');
			const metrics = collector.getMetrics();
			metrics.activeConnections = 999;
			expect(collector.getMetrics().activeConnections).toBe(1);
		});

		it('should return a new byPath map (not same reference)', () => {
			collector.trackConnection('/ws');
			const metrics = collector.getMetrics();
			expect(metrics.byPath).not.toBe(collector.getMetrics().byPath);
		});

		it('should not be affected by mutations to the returned byPath map', () => {
			collector.trackConnection('/ws');
			const metrics = collector.getMetrics();
			metrics.byPath.delete('/ws');
			expect(collector.getMetrics().byPath.has('/ws')).toBe(true);
		});

		it('should not be affected by adding entries to the returned byPath map', () => {
			const metrics = collector.getMetrics();
			metrics.byPath.set('/injected', { connections: 100, messages: 200 });
			expect(collector.getMetrics().byPath.has('/injected')).toBe(false);
		});

		it('should return all fields accurately', () => {
			collector.trackConnection('/ws');
			collector.trackMessageSent('/ws');
			collector.trackMessageReceived('/ws');
			collector.trackError('/ws');
			collector.trackReconnection('/ws');
			const m = collector.getMetrics();
			expect(m.activeConnections).toBe(1);
			expect(m.totalConnections).toBe(1);
			expect(m.totalDisconnections).toBe(0);
			expect(m.messagesSent).toBe(1);
			expect(m.messagesReceived).toBe(1);
			expect(m.errors).toBe(1);
			expect(m.reconnections).toBe(1);
		});

		it('should return correct byPath data for multiple paths', () => {
			collector.trackConnection('/a');
			collector.trackConnection('/b');
			collector.trackConnection('/a');
			const m = collector.getMetrics();
			expect(m.byPath.get('/a')?.connections).toBe(2);
			expect(m.byPath.get('/b')?.connections).toBe(1);
		});

		it('should return distinct map instances on successive calls', () => {
			collector.trackConnection('/ws');
			const m1 = collector.getMetrics();
			const m2 = collector.getMetrics();
			expect(m1.byPath).not.toBe(m2.byPath);
		});

		it('mutating returned totalConnections should not affect internal state', () => {
			collector.trackConnection('/ws');
			const m = collector.getMetrics();
			m.totalConnections = 0;
			expect(collector.getMetrics().totalConnections).toBe(1);
		});
	});

	// ---------------------------------------------------------------
	// exportPrometheus
	// ---------------------------------------------------------------
	describe('exportPrometheus', () => {
		it('should contain HELP line for websocket_active_connections', () => {
			const output = collector.exportPrometheus();
			expect(output).toContain(
				'# HELP websocket_active_connections Number of active WebSocket connections'
			);
		});

		it('should contain TYPE line for websocket_active_connections as gauge', () => {
			const output = collector.exportPrometheus();
			expect(output).toContain('# TYPE websocket_active_connections gauge');
		});

		it('should contain HELP line for websocket_total_connections', () => {
			const output = collector.exportPrometheus();
			expect(output).toContain(
				'# HELP websocket_total_connections Total number of WebSocket connections'
			);
		});

		it('should contain TYPE line for websocket_total_connections as counter', () => {
			const output = collector.exportPrometheus();
			expect(output).toContain('# TYPE websocket_total_connections counter');
		});

		it('should contain HELP line for websocket_total_disconnections', () => {
			const output = collector.exportPrometheus();
			expect(output).toContain(
				'# HELP websocket_total_disconnections Total number of WebSocket disconnections'
			);
		});

		it('should contain TYPE line for websocket_total_disconnections as counter', () => {
			const output = collector.exportPrometheus();
			expect(output).toContain('# TYPE websocket_total_disconnections counter');
		});

		it('should contain HELP line for websocket_messages_sent_total', () => {
			const output = collector.exportPrometheus();
			expect(output).toContain(
				'# HELP websocket_messages_sent_total Total number of messages sent'
			);
		});

		it('should contain TYPE line for websocket_messages_sent_total as counter', () => {
			const output = collector.exportPrometheus();
			expect(output).toContain('# TYPE websocket_messages_sent_total counter');
		});

		it('should contain HELP line for websocket_messages_received_total', () => {
			const output = collector.exportPrometheus();
			expect(output).toContain(
				'# HELP websocket_messages_received_total Total number of messages received'
			);
		});

		it('should contain TYPE line for websocket_messages_received_total as counter', () => {
			const output = collector.exportPrometheus();
			expect(output).toContain('# TYPE websocket_messages_received_total counter');
		});

		it('should contain HELP line for websocket_errors_total', () => {
			const output = collector.exportPrometheus();
			expect(output).toContain(
				'# HELP websocket_errors_total Total number of WebSocket errors'
			);
		});

		it('should contain TYPE line for websocket_errors_total as counter', () => {
			const output = collector.exportPrometheus();
			expect(output).toContain('# TYPE websocket_errors_total counter');
		});

		it('should contain HELP line for websocket_reconnections_total', () => {
			const output = collector.exportPrometheus();
			expect(output).toContain(
				'# HELP websocket_reconnections_total Total number of WebSocket reconnections'
			);
		});

		it('should contain TYPE line for websocket_reconnections_total as counter', () => {
			const output = collector.exportPrometheus();
			expect(output).toContain('# TYPE websocket_reconnections_total counter');
		});

		it('should contain correct value for activeConnections', () => {
			collector.trackConnection('/ws');
			const output = collector.exportPrometheus();
			expect(output).toContain('websocket_active_connections 1');
		});

		it('should contain correct value for totalConnections', () => {
			collector.trackConnection('/ws');
			collector.trackConnection('/ws');
			const output = collector.exportPrometheus();
			expect(output).toContain('websocket_total_connections 2');
		});

		it('should contain correct value for totalDisconnections', () => {
			collector.trackConnection('/ws');
			collector.trackDisconnection('/ws');
			const output = collector.exportPrometheus();
			expect(output).toContain('websocket_total_disconnections 1');
		});

		it('should contain correct value for messagesSent', () => {
			collector.trackMessageSent('/ws');
			const output = collector.exportPrometheus();
			expect(output).toContain('websocket_messages_sent_total 1');
		});

		it('should contain correct value for messagesReceived', () => {
			collector.trackMessageReceived('/ws');
			collector.trackMessageReceived('/ws');
			const output = collector.exportPrometheus();
			expect(output).toContain('websocket_messages_received_total 2');
		});

		it('should contain correct value for errors', () => {
			collector.trackError('/ws');
			collector.trackError('/ws');
			collector.trackError('/ws');
			const output = collector.exportPrometheus();
			expect(output).toContain('websocket_errors_total 3');
		});

		it('should contain correct value for reconnections', () => {
			collector.trackReconnection('/ws');
			const output = collector.exportPrometheus();
			expect(output).toContain('websocket_reconnections_total 1');
		});

		it('should include per-path connection metrics', () => {
			collector.trackConnection('/chat');
			const output = collector.exportPrometheus();
			expect(output).toContain('websocket_path_connections{path="/chat"} 1');
		});

		it('should include per-path message metrics', () => {
			collector.trackConnection('/chat');
			collector.trackMessageSent('/chat');
			const output = collector.exportPrometheus();
			expect(output).toContain('websocket_path_messages{path="/chat"} 1');
		});

		it('should include metrics for multiple paths', () => {
			collector.trackConnection('/chat');
			collector.trackConnection('/notifications');
			const output = collector.exportPrometheus();
			expect(output).toContain('websocket_path_connections{path="/chat"} 1');
			expect(output).toContain('websocket_path_connections{path="/notifications"} 1');
		});

		it('should end with a newline', () => {
			const output = collector.exportPrometheus();
			expect(output.endsWith('\n')).toBe(true);
		});

		it('should output zero values for fresh collector', () => {
			const output = collector.exportPrometheus();
			expect(output).toContain('websocket_active_connections 0');
			expect(output).toContain('websocket_total_connections 0');
			expect(output).toContain('websocket_messages_sent_total 0');
			expect(output).toContain('websocket_errors_total 0');
		});

		it('should not contain path metrics when no paths are tracked', () => {
			const output = collector.exportPrometheus();
			expect(output).not.toContain('websocket_path_connections');
			expect(output).not.toContain('websocket_path_messages');
		});
	});

	// ---------------------------------------------------------------
	// reset
	// ---------------------------------------------------------------
	describe('reset', () => {
		it('should zero activeConnections', () => {
			collector.trackConnection('/ws');
			collector.reset();
			expect(collector.getMetrics().activeConnections).toBe(0);
		});

		it('should zero totalConnections', () => {
			collector.trackConnection('/ws');
			collector.reset();
			expect(collector.getMetrics().totalConnections).toBe(0);
		});

		it('should zero totalDisconnections', () => {
			collector.trackConnection('/ws');
			collector.trackDisconnection('/ws');
			collector.reset();
			expect(collector.getMetrics().totalDisconnections).toBe(0);
		});

		it('should zero messagesSent', () => {
			collector.trackMessageSent('/ws');
			collector.reset();
			expect(collector.getMetrics().messagesSent).toBe(0);
		});

		it('should zero messagesReceived', () => {
			collector.trackMessageReceived('/ws');
			collector.reset();
			expect(collector.getMetrics().messagesReceived).toBe(0);
		});

		it('should zero errors', () => {
			collector.trackError('/ws');
			collector.reset();
			expect(collector.getMetrics().errors).toBe(0);
		});

		it('should zero reconnections', () => {
			collector.trackReconnection('/ws');
			collector.reset();
			expect(collector.getMetrics().reconnections).toBe(0);
		});

		it('should clear byPath map', () => {
			collector.trackConnection('/chat');
			collector.trackConnection('/notifications');
			collector.reset();
			expect(collector.getMetrics().byPath.size).toBe(0);
		});

		it('should allow tracking after reset', () => {
			collector.trackConnection('/ws');
			collector.reset();
			collector.trackConnection('/ws');
			expect(collector.getMetrics().totalConnections).toBe(1);
			expect(collector.getMetrics().activeConnections).toBe(1);
		});

		it('should produce clean Prometheus output after reset', () => {
			collector.trackConnection('/ws');
			collector.trackMessageSent('/ws');
			collector.trackError('/ws');
			collector.reset();
			const output = collector.exportPrometheus();
			expect(output).toContain('websocket_active_connections 0');
			expect(output).toContain('websocket_total_connections 0');
			expect(output).toContain('websocket_messages_sent_total 0');
			expect(output).toContain('websocket_errors_total 0');
			expect(output).not.toContain('websocket_path_connections');
		});
	});

	// ---------------------------------------------------------------
	// Complex sequences
	// ---------------------------------------------------------------
	describe('complex sequences', () => {
		it('should handle multiple connections and disconnections in sequence', () => {
			collector.trackConnection('/ws');
			collector.trackConnection('/ws');
			collector.trackConnection('/ws');
			collector.trackDisconnection('/ws');
			collector.trackDisconnection('/ws');
			expect(collector.getMetrics().activeConnections).toBe(1);
			expect(collector.getMetrics().totalConnections).toBe(3);
			expect(collector.getMetrics().totalDisconnections).toBe(2);
		});

		it('should handle interleaved operations on multiple paths', () => {
			collector.trackConnection('/chat');
			collector.trackConnection('/notifications');
			collector.trackMessageSent('/chat');
			collector.trackMessageReceived('/notifications');
			collector.trackConnection('/chat');
			collector.trackMessageSent('/chat');
			collector.trackDisconnection('/chat');

			const m = collector.getMetrics();
			expect(m.activeConnections).toBe(2);
			expect(m.totalConnections).toBe(3);
			expect(m.totalDisconnections).toBe(1);
			expect(m.messagesSent).toBe(2);
			expect(m.messagesReceived).toBe(1);
			expect(m.byPath.get('/chat')?.connections).toBe(2);
			expect(m.byPath.get('/chat')?.messages).toBe(2);
			expect(m.byPath.get('/notifications')?.connections).toBe(1);
			expect(m.byPath.get('/notifications')?.messages).toBe(1);
		});

		it('should handle disconnect before connect (edge case)', () => {
			collector.trackDisconnection('/ws');
			expect(collector.getMetrics().activeConnections).toBe(0);
			expect(collector.getMetrics().totalDisconnections).toBe(1);
		});

		it('should handle message on unknown path (no path entry created)', () => {
			collector.trackMessageSent('/unknown');
			collector.trackMessageReceived('/unknown');
			expect(collector.getMetrics().byPath.has('/unknown')).toBe(false);
			expect(collector.getMetrics().messagesSent).toBe(1);
			expect(collector.getMetrics().messagesReceived).toBe(1);
		});

		it('should handle rapid connect/disconnect cycles', () => {
			for (let i = 0; i < 100; i++) {
				collector.trackConnection('/ws');
				collector.trackDisconnection('/ws');
			}
			expect(collector.getMetrics().activeConnections).toBe(0);
			expect(collector.getMetrics().totalConnections).toBe(100);
			expect(collector.getMetrics().totalDisconnections).toBe(100);
		});

		it('should handle many different paths', () => {
			for (let i = 0; i < 50; i++) {
				collector.trackConnection(`/ws/${i}`);
			}
			expect(collector.getMetrics().byPath.size).toBe(50);
			expect(collector.getMetrics().activeConnections).toBe(50);
			expect(collector.getMetrics().totalConnections).toBe(50);
		});

		it('should handle full lifecycle: connect, messages, error, reconnect, disconnect', () => {
			collector.trackConnection('/ws');
			collector.trackMessageSent('/ws');
			collector.trackMessageReceived('/ws');
			collector.trackError('/ws');
			collector.trackDisconnection('/ws');
			collector.trackReconnection('/ws');
			collector.trackConnection('/ws');
			collector.trackMessageSent('/ws');
			collector.trackDisconnection('/ws');

			const m = collector.getMetrics();
			expect(m.activeConnections).toBe(0);
			expect(m.totalConnections).toBe(2);
			expect(m.totalDisconnections).toBe(2);
			expect(m.messagesSent).toBe(2);
			expect(m.messagesReceived).toBe(1);
			expect(m.errors).toBe(1);
			expect(m.reconnections).toBe(1);
			expect(m.byPath.get('/ws')?.connections).toBe(2);
			expect(m.byPath.get('/ws')?.messages).toBe(3);
		});

		it('should produce accurate Prometheus output after mixed operations', () => {
			collector.trackConnection('/api/ws');
			collector.trackConnection('/api/ws');
			collector.trackMessageSent('/api/ws');
			collector.trackError('/api/ws');
			collector.trackDisconnection('/api/ws');

			const output = collector.exportPrometheus();
			expect(output).toContain('websocket_active_connections 1');
			expect(output).toContain('websocket_total_connections 2');
			expect(output).toContain('websocket_total_disconnections 1');
			expect(output).toContain('websocket_messages_sent_total 1');
			expect(output).toContain('websocket_errors_total 1');
			expect(output).toContain('websocket_path_connections{path="/api/ws"} 2');
			expect(output).toContain('websocket_path_messages{path="/api/ws"} 1');
		});
	});

	// ---------------------------------------------------------------
	// Singleton export
	// ---------------------------------------------------------------
	describe('singleton export', () => {
		it('should export websocketMetrics as a WebSocketMetricsCollector instance', () => {
			expect(websocketMetrics).toBeInstanceOf(WebSocketMetricsCollector);
		});

		it('should be functional (trackConnection works)', () => {
			const before = websocketMetrics.getMetrics().totalConnections;
			websocketMetrics.trackConnection('/singleton-test');
			const after = websocketMetrics.getMetrics().totalConnections;
			expect(after).toBe(before + 1);
			// Clean up
			websocketMetrics.reset();
		});

		it('should be functional (exportPrometheus works)', () => {
			websocketMetrics.reset();
			const output = websocketMetrics.exportPrometheus();
			expect(output).toContain('websocket_active_connections 0');
		});

		it('should be functional (reset works)', () => {
			websocketMetrics.trackConnection('/test');
			websocketMetrics.reset();
			expect(websocketMetrics.getMetrics().totalConnections).toBe(0);
		});
	});

	// ---------------------------------------------------------------
	// Type exports
	// ---------------------------------------------------------------
	describe('type exports', () => {
		it('should allow creating a WebSocketMetrics-shaped object', () => {
			const m: WebSocketMetrics = {
				activeConnections: 0,
				totalConnections: 0,
				totalDisconnections: 0,
				messagesSent: 0,
				messagesReceived: 0,
				errors: 0,
				reconnections: 0,
				byPath: new Map(),
			};
			expect(m.activeConnections).toBe(0);
		});

		it('should allow creating a PathMetrics-shaped object', () => {
			const p: PathMetrics = { connections: 5, messages: 10 };
			expect(p.connections).toBe(5);
			expect(p.messages).toBe(10);
		});
	});
});
