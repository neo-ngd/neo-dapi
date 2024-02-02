import { Buffer } from 'buffer';
import { Lock } from 'async-await-mutex-lock';
import { w3cwebsocket as WebSocket } from 'websocket';
import { parse, stringify } from '../utils/json';
import { Expand } from '../utils/typeUtils';
import { Logger, Payload } from '../utils/types';
import { isPayload, isWebSocketUrl } from '../utils/validators';
import { AbstractConnection } from './AbstractConnection';

export type WebSocketConnectionOptions = Expand<{
  logger?: Logger;
}>;

export class WebSocketConnection extends AbstractConnection {
  private socket: WebSocket | null = null;
  private lock = new Lock();

  constructor(public url: string, private options: WebSocketConnectionOptions = {}) {
    super();
    if (!isWebSocketUrl(url)) {
      throw new Error(`Provided URL is not compatible with WebSocket connection: ${url}`);
    }
  }

  get connected(): boolean {
    return this.socket != null;
  }

  public async open(): Promise<void> {
    await this.lock.acquire();
    try {
      if (this.connected) {
        return;
      }
      this.socket = await new Promise<WebSocket>((resolve, reject) => {
        const socket = new WebSocket(this.url);
        socket.onopen = () => resolve(socket);
        socket.onerror = error => reject(error);
      });
      this.socket.onclose = () => this.close();
      this.socket.onerror = error => this.onError(error);
      this.socket.onmessage = event => this.onMessage(event.data);
      this.events.emit('open');
    } finally {
      this.lock.release();
    }
  }

  public async close(): Promise<void> {
    await this.lock.acquire();
    try {
      if (!this.connected) {
        return;
      }
      if (this.socket != null) {
        this.socket.onopen = () => undefined;
        this.socket.onclose = () => undefined;
        this.socket.onerror = () => undefined;
        this.socket.onmessage = () => undefined;
        this.socket.close();
      }
      this.socket = null;
      this.events.emit('close');
    } catch {
      this.lock.release();
    }
  }

  public async send(payload: Payload, _context?: unknown): Promise<void> {
    if (this.socket == null) {
      throw Error('Socket is not inited');
    }
    if (this.options.logger != null) {
      this.options.logger.info(`sending: ${stringify(payload)}`);
    }
    this.socket.send(stringify(payload));
  }

  private onError(error: Error) {
    if (this.options.logger != null) {
      this.options.logger.error('error', error);
    }
    this.events.emit('error', error);
  }

  private onMessage(data: string | Buffer | ArrayBuffer) {
    const payload = parse(data.toString(), null);
    if (this.options.logger != null) {
      this.options.logger.info(`received: ${data.toString()}`);
    }
    if (isPayload(payload)) {
      this.events.emit('payload', payload);
    }
  }
}
