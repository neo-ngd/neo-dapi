import { parse, stringify } from '../utils/json';
import { Expand } from '../utils/typeUtils';
import { Logger, Payload } from '../utils/types';
import { isPayload } from '../utils/validators';
import { AbstractConnection } from './AbstractConnection';

export type PostMessageConnectionOptions = Expand<{
  logger?: Logger;
}>;

export type PostMessage = (message: string) => void;

export type MessageListener = (message: string) => void;

export type Disposer = () => void;

export type AddMessageListener = (listener: MessageListener) => Disposer | void;

export class PostMessageConnection extends AbstractConnection {
  private disposer: Disposer | null = null;

  connected = false;

  constructor(
    private postMessage: PostMessage,
    private addMessageListener: AddMessageListener,
    private options: PostMessageConnectionOptions = {},
  ) {
    super();
  }

  async open(): Promise<void> {
    if (this.connected) {
      return;
    }
    this.disposer = this.addMessageListener(this.onMessage.bind(this)) ?? null;
    this.connected = true;
    this.events.emit('open');
  }

  async close(): Promise<void> {
    if (!this.connected) {
      return;
    }
    this.disposer?.();
    this.disposer = null;
    this.connected = false;
    this.events.emit('close');
  }

  async send(payload: Payload, _context?: unknown): Promise<void> {
    if (this.options.logger) {
      this.options.logger.info(`sending: ${stringify(payload)}`);
    }
    this.postMessage(stringify(payload));
  }

  private onMessage(message: string) {
    const payload = parse(message, null);
    if (this.options.logger) {
      this.options.logger.info(`received: ${message}`);
    }
    if (isPayload(payload)) {
      this.events.emit('payload', payload);
    }
  }
}
