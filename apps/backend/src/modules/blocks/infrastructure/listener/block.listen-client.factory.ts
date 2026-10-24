import { Client } from 'pg';
import type { BlockListenClientFactory } from '../../types/block.live.types';

/** A `pg` connection with TCP keepalive on, so the system probes a socket that a network device dropped silently. */
export const createPgListenClient: BlockListenClientFactory = (connectionString, keepAliveInitialDelayMs) => {
  const client = new Client({
    connectionString,
    keepAlive: true,
    keepAliveInitialDelayMillis: keepAliveInitialDelayMs,
  });
  return {
    connect: () => client.connect(),
    end: () => client.end(),
    onEnd: (handler) => {
      client.on('end', handler);
    },
    onError: (handler) => {
      client.on('error', handler);
    },
    onNotification: (handler) => {
      client.on('notification', (message) => {
        handler(
          message.payload === undefined
            ? { channel: message.channel }
            : { channel: message.channel, payload: message.payload },
        );
      });
    },
    query: (text, values) => client.query(text, values === undefined ? undefined : [...values]),
  };
};
