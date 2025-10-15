// WebSocket Test Component - Add this to any page to test connection
'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { getCookie } from '@/utils/cookies';

export default function WebSocketTest() {
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [logs, setLogs] = useState<string[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(`[WebSocket Test] ${message}`);
  };

  useEffect(() => {
    const token = getCookie('token');
    
    if (!token) {
      addLog('❌ No token found - cannot connect to WebSocket');
      return;
    }

    addLog('🔌 Attempting to connect to WebSocket server...');
    addLog(`📍 API URL: ${process.env.NEXT_PUBLIC_API_URL}`);
    addLog(`🔑 Token length: ${token.length}`);

    const newSocket = io(process.env.NEXT_PUBLIC_API_URL!, {
      auth: { token },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    newSocket.on('connect', () => {
      addLog('✅ Socket connected successfully');
      setConnectionStatus('Connected');
      
      // Test emit
      newSocket.emit('request_unread_count');
      addLog('📤 Sent request_unread_count event');
    });

    newSocket.on('connect_error', (error) => {
      addLog(`❌ Connection error: ${error.message}`);
      setConnectionStatus('Connection Error');
    });

    newSocket.on('disconnect', (reason) => {
      addLog(`⚠️ Disconnected: ${reason}`);
      setConnectionStatus('Disconnected');
    });

    newSocket.on('reconnect', (attemptNumber) => {
      addLog(`🔄 Reconnected after ${attemptNumber} attempts`);
      setConnectionStatus('Reconnected');
    });

    newSocket.on('notification', (notification) => {
      addLog(`📱 Notification received: ${JSON.stringify(notification)}`);
    });

    newSocket.on('unread_count_updated', (data) => {
      addLog(`📊 Unread count updated: ${data.count}`);
    });

    setSocket(newSocket);

    return () => {
      addLog('🔌 Cleaning up WebSocket connection');
      newSocket.disconnect();
    };
  }, []);

  const testConnection = () => {
    if (socket && socket.connected) {
      socket.emit('request_unread_count');
      addLog('📤 Manual test: Sent request_unread_count');
    } else {
      addLog('❌ Cannot test: Socket not connected');
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div style={{ 
      position: 'fixed', 
      top: '10px', 
      right: '10px', 
      background: 'white', 
      border: '1px solid #ccc',
      padding: '15px',
      borderRadius: '8px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      maxWidth: '400px',
      maxHeight: '300px',
      zIndex: 1000,
      fontFamily: 'monospace',
      fontSize: '12px'
    }}>
      <h3 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>WebSocket Test</h3>
      <div style={{ marginBottom: '10px' }}>
        Status: <span style={{ 
          color: connectionStatus === 'Connected' || connectionStatus === 'Reconnected' ? 'green' : 
                connectionStatus === 'Connection Error' ? 'red' : 'orange'
        }}>
          {connectionStatus}
        </span>
      </div>
      
      <div style={{ marginBottom: '10px' }}>
        <button onClick={testConnection} style={{ marginRight: '5px', padding: '5px 10px' }}>
          Test Connection
        </button>
        <button onClick={clearLogs} style={{ padding: '5px 10px' }}>
          Clear Logs
        </button>
      </div>

      <div style={{ 
        maxHeight: '150px', 
        overflowY: 'auto', 
        border: '1px solid #eee',
        padding: '5px',
        backgroundColor: '#f9f9f9'
      }}>
        {logs.map((log, index) => (
          <div key={index} style={{ marginBottom: '2px' }}>
            {log}
          </div>
        ))}
      </div>
    </div>
  );
}