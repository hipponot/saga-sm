'use client';

import { useState, useEffect } from 'react';
import { getApiUrl } from '../../src/config/client-config';
import { useApiUrl } from '../../src/context/api-url-context';
import styles from './page.module.css';

interface PingEvent {
  id: string;
  name: string;
  channel: string;
  payload: {
    message: string;
    timestamp: string;
  };
  timestamp: string;
}

interface PongResponse {
  id: string;
  name: string;
  channel: string;
  payload: {
    reply: string;
    originalMessage: string;
    timestamp: string;
  };
  timestamp: string;
}

interface EventHistory {
  id: string;
  type: 'ping' | 'pong';
  timestamp: string;
  message: string;
  eventId: string;
}

interface PerformanceStats {
  totalEvents: number;
  pingEvents: number;
  pongEvents: number;
  averageResponseTime: number;
  successRate: number;
  lastActivity: string;
}

interface RealPingResult {
  success: boolean;
  pingEvent: PingEvent;
  message: string;
  pubsubResult?: any;
}

interface RealPongEvent {
  id: string;
  name: string;
  channel: string;
  payload: {
    reply: string;
    originalMessage: string;
    timestamp: string;
  };
  timestamp: string;
  correlationId?: string;
}

// Real tRPC Ping/Pong Section Component
function RealPingPongSection() {
  const { apiUrl } = useApiUrl();
  const [realPingMessage, setRealPingMessage] = useState('Hello from real tRPC client!');
  const [realPingResponse, setRealPingResponse] = useState<RealPingResult | null>(null);
  const [realPongEvents, setRealPongEvents] = useState<RealPongEvent[]>([]);
  const [isRealPinging, setIsRealPinging] = useState(false);
  const [realPingError, setRealPingError] = useState('');

  const sendRealPing = async () => {
    if (!realPingMessage.trim()) return;

    setIsRealPinging(true);
    setRealPingError('');
    setRealPingResponse(null);

    try {
      // Call the real tRPC pubsub ping endpoint
      const response = await fetch(`${apiUrl}/trpc/pubsub.ping`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: realPingMessage,
          timestamp: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error.message || 'Failed to send ping');
      }

      // Extract the result data
      const pingResult: RealPingResult = {
        success: result.result?.success || false,
        pingEvent: {
          id: result.result?.eventId || crypto.randomUUID(),
          name: 'ping:message',
          channel: 'pingpong',
          payload: {
            message: realPingMessage,
            timestamp: new Date().toISOString()
          },
          timestamp: new Date().toISOString()
        },
        message: result.result?.message || 'Ping sent successfully',
        pubsubResult: result.result
      };

      setRealPingResponse(pingResult);

      // Check if we got emitted events (including automatic pong response)
      const emittedEvents = result.result?.emittedEvents || [];

      if (emittedEvents.length > 0) {
        // Add any pong responses from the emitted events
        const pongEvents = emittedEvents
          .filter((event: any) => event.name === 'pong:response')
          .map((event: any) => ({
            id: event.id,
            name: event.name,
            channel: event.channel,
            payload: {
              reply: event.payload.reply || `Pong: ${realPingMessage}`,
              originalMessage: event.payload.originalMessage || realPingMessage,
              timestamp: event.payload.timestamp || event.timestamp
            },
            timestamp: event.timestamp,
            correlationId: event.correlationId || pingResult.pingEvent.id
          }));

        if (pongEvents.length > 0) {
          setRealPongEvents(prev => [...pongEvents, ...prev.slice(0, 9 - pongEvents.length)]);
        }
      }

    } catch (err) {
      setRealPingError(err instanceof Error ? err.message : 'Failed to send ping');
    } finally {
      setIsRealPinging(false);
    }
  };

  const clearRealResults = () => {
    setRealPingResponse(null);
    setRealPongEvents([]);
    setRealPingError('');
  };

  return (
    <div className={styles.section}>
      {/* Input and Controls */}
      <div className={styles.grid}>
        <div>
          <label className={styles.label}>
            Ping Message
          </label>
          <input
            type="text"
            value={realPingMessage}
            onChange={(e) => setRealPingMessage(e.target.value)}
            placeholder="Enter your real ping message..."
            className={styles.input}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className={styles.buttonGroup}>
        <button
          onClick={sendRealPing}
          disabled={isRealPinging}
          className={`${styles.button} ${styles.buttonPrimary}`}
        >
          {isRealPinging ? 'Sending Real Ping...' : 'Send Real Ping'}
        </button>
        <button
          onClick={clearRealResults}
          className={`${styles.button} ${styles.buttonSecondary}`}
        >
          Clear Results
        </button>
      </div>

      {/* Real Ping Response */}
      {realPingResponse && (
        <div className={styles.responseBox}>
          <h3 className={styles.responseTitle}>Immediate Ping Response</h3>
          <div className={styles.responseContent}>
            <div><strong>Status:</strong> {realPingResponse.success ? 'Success' : 'Failed'}</div>
            <div><strong>Message:</strong> {realPingResponse.message}</div>
            <div><strong>Event ID:</strong> {realPingResponse.pingEvent.id}</div>
            <div><strong>Timestamp:</strong> {new Date(realPingResponse.pingEvent.timestamp).toLocaleString()}</div>
            {realPingResponse.pubsubResult && (
              <div className={styles.pubsubResult}>
                <strong>PubSub Result:</strong>
                <pre className={styles.codeBlock}>
                  {JSON.stringify(realPingResponse.pubsubResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Real Pong Events */}
      {realPongEvents.length > 0 && (
        <div className={styles.pongEvents}>
          <h3 className={styles.pongEventsTitle}>
            Received Pong Events ({realPongEvents.length})
          </h3>
          <div className={styles.pongEventsList}>
            {realPongEvents.map((pongEvent) => (
              <div key={pongEvent.id} className={styles.pongEvent}>
                <div className={styles.pongEventMessage}>{pongEvent.payload.reply}</div>
                <div className={styles.pongEventMeta}>
                  <span className={styles.pongEventTag}>ID: {pongEvent.id.slice(0, 8)}...</span>
                  {pongEvent.correlationId && (
                    <span className={styles.pongEventTag}>Corr: {pongEvent.correlationId.slice(0, 8)}...</span>
                  )}
                  <span className={styles.pongEventTag}>{new Date(pongEvent.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Display */}
      {realPingError && (
        <div className={styles.errorBox}>
          <div className={styles.errorIcon}>
            <svg className={styles.errorIcon} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className={styles.errorContent}>
            <h3 className={styles.errorTitle}>Real Ping Error</h3>
            <div className={styles.errorMessage}>{realPingError}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TRPCAPIPage() {
  // Use dynamic API URL context
  const { apiUrl, trpcBasePath } = useApiUrl();

  // Enhanced testing state
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [eventHistory, setEventHistory] = useState<EventHistory[]>([]);
  const [performanceStats, setPerformanceStats] = useState<PerformanceStats>({
    totalEvents: 0,
    pingEvents: 0,
    pongEvents: 0,
    averageResponseTime: 0,
    successRate: 100,
    lastActivity: new Date().toISOString()
  });

  useEffect(() => {
    // Check connection status on mount
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      setConnectionStatus('connecting');
      const response = await fetch(`${apiUrl}/trpc/pubsub.getServiceStatus`);
      if (response.ok) {
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('disconnected');
      }
    } catch (error) {
      setConnectionStatus('disconnected');
    }
  };

  const testConnection = async () => {
    await checkConnectionStatus();
  };

  const clearConnectionStatus = () => {
    setConnectionStatus('disconnected');
  };

  const exportEvents = () => {
    const dataStr = JSON.stringify(eventHistory, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `example-events-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div>
          <h1 className={styles.title}>
            🎯 Example API Test Center
          </h1>
          <p className={styles.subtitle}>
            Comprehensive testing interface for the Example Management tRPC API
          </p>


          {/* Navigation */}
          <div className={styles.section}>
            <div className={styles.connectionStatusRow}>
              <h2 className={styles.sectionTitle}>🔧 Testing Tools</h2>
              <div className={styles.connectionControlsRow}>
                <a
                  href="/trpc-api/endpoints"
                  className={`${styles.button} ${styles.buttonPrimary}`}
                  style={{
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  🧪 Endpoint Tester
                </a>
              </div>
            </div>
            <div className={styles.infoBox}>
              <p className={styles.infoText}>
                <strong className={styles.infoTextStrong}>Endpoint Tester:</strong> Use the endpoint tester
                to try all Example Management tRPC API endpoints with dropdown selection, code generation, and response inspection.
                Perfect for testing example endpoints with both cURL and tRPC client modes.
              </p>
            </div>
          </div>
        </div>

        {/* API Configuration Info */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>🔗 Current API Configuration</h2>
          <div className={styles.infoBox}>
            <div style={{ fontFamily: 'var(--font-geist-mono, monospace)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
              <div><strong>API URL:</strong> <span style={{ color: '#3b82f6' }}>{apiUrl}</span></div>
              <div><strong>tRPC Path:</strong> <span style={{ color: '#10b981' }}>{trpcBasePath}</span></div>
              <div><strong>Full tRPC URL:</strong> <span style={{ color: '#6b7280' }}>{apiUrl}{trpcBasePath}</span></div>
            </div>
            <p className={styles.infoText}>
              💡 <strong>Tip:</strong> Use the <strong>🔗</strong> button in the top-right corner to edit API configuration.
            </p>
          </div>
        </div>

        {/* Connection Status */}
        <div className={styles.section}>
          <div className={styles.connectionStatus}>
            <div className={styles.connectionStatusRow}>
              <div className={styles.connectionInfo}>
                <div className={`${styles.statusIndicator} ${connectionStatus === 'connected' ? styles.statusConnected :
                  connectionStatus === 'connecting' ? styles.statusConnecting : styles.statusDisconnected
                  }`} />
                <span className={styles.statusText}>
                  📡 Connection Status: {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
                </span>
              </div>
              <div className={styles.connectionControls}>
                <div className={styles.connectionControlsRow}>
                  <button
                    onClick={testConnection}
                    disabled={connectionStatus === 'connecting'}
                    className={`${styles.button} ${styles.buttonPrimary}`}
                  >
                    {connectionStatus === 'connecting' ? 'Testing...' : 'Test Connection'}
                  </button>
                  <button
                    onClick={clearConnectionStatus}
                    disabled={connectionStatus === 'disconnected'}
                    className={`${styles.button} ${styles.buttonSecondary}`}
                  >
                    Clear Status
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* tRPC API Testing Demo */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            🎯 Example API Testing Demo
          </h2>
          <div className={styles.infoBox}>
            <p className={styles.infoText}>
              <strong className={styles.infoTextStrong}>Example API Demo:</strong> This section demonstrates the Example Management API connectivity.
              When you test the API, it checks the health endpoint and shows the connection status
              that gets displayed in the events section below.
            </p>
          </div>
          <RealPingPongSection />
        </div>

        {/* Live Event Stream */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>📥 Live Event Stream</h2>
          <div className={styles.terminalBox}>
            {eventHistory.length === 0 ? (
              <div className={styles.terminalEmpty}>No events yet. Test the API to see the live stream!</div>
            ) : (
              eventHistory.map((event) => (
                <div key={event.id} className={styles.terminalEvent}>
                  <span className={styles.terminalTimestamp}>[{new Date(event.timestamp).toLocaleTimeString()}]</span>
                  <span className={`${styles.terminalId} ${event.type === 'ping' ? styles.terminalPing : styles.terminalPong}`}>
                    {event.type === 'ping' ? '📤' : '📥'} {event.type.toUpperCase()}
                  </span>
                  <span>{event.message}</span>
                  <span className={styles.terminalId}>(ID: {event.eventId.slice(0, 8)}...)</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Event History & Statistics */}
        <div className={styles.section}>
          <div className={styles.connectionStatusRow}>
            <h2 className={styles.sectionTitle}>📊 Event History & Statistics</h2>
            <button
              onClick={exportEvents}
              disabled={eventHistory.length === 0}
              className={`${styles.button} ${styles.buttonPrimary}`}
            >
              Export Events
            </button>
          </div>

          <div className={styles.statsGrid}>
            <div className={`${styles.statCard} ${styles.statCardBlue}`}>
              <div className={`${styles.statValue} ${styles.statValueBlue}`}>{performanceStats.totalEvents}</div>
              <div className={`${styles.statLabel} ${styles.statLabelBlue}`}>Total Events</div>
            </div>
            <div className={`${styles.statCard} ${styles.statCardGreen}`}>
              <div className={`${styles.statValue} ${styles.statValueGreen}`}>{performanceStats.pingEvents}</div>
              <div className={`${styles.statLabel} ${styles.statLabelGreen}`}>API Tests</div>
            </div>
            <div className={`${styles.statCard} ${styles.statCardPurple}`}>
              <div className={`${styles.statValue} ${styles.statValuePurple}`}>{performanceStats.pongEvents}</div>
              <div className={`${styles.statLabel} ${styles.statLabelPurple}`}>Responses</div>
            </div>
            <div className={`${styles.statCard} ${styles.statCardYellow}`}>
              <div className={`${styles.statValue} ${styles.statValueYellow}`}>{performanceStats.averageResponseTime}ms</div>
              <div className={`${styles.statLabel} ${styles.statLabelYellow}`}>Avg Response</div>
            </div>
            <div className={`${styles.statCard} ${styles.statCardEmerald}`}>
              <div className={`${styles.statValue} ${styles.statValueEmerald}`}>{performanceStats.successRate}%</div>
              <div className={`${styles.statLabel} ${styles.statLabelEmerald}`}>Success Rate</div>
            </div>
            <div className={`${styles.statCard} ${styles.statCardGray}`}>
              <div className={`${styles.statValue} ${styles.statValueGray}`}>
                {new Date(performanceStats.lastActivity).toLocaleTimeString()}
              </div>
              <div className={`${styles.statLabel} ${styles.statLabelGray}`}>Last Activity</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}