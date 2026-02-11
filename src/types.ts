/**
 * Per-path WebSocket metrics tracking connections and messages for a specific endpoint.
 */
export interface PathMetrics {
	connections: number;
	messages: number;
}

/**
 * Aggregate WebSocket metrics across all connections and paths.
 */
export interface WebSocketMetrics {
	activeConnections: number;
	totalConnections: number;
	totalDisconnections: number;
	messagesSent: number;
	messagesReceived: number;
	errors: number;
	reconnections: number;
	byPath: Map<string, PathMetrics>;
}
