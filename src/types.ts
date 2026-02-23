


export interface PathMetrics {
	connections: number;
	messages: number;
}




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
