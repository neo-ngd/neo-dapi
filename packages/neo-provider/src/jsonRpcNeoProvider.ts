import { EventEmitter } from 'events';
import { JsonRpcNotification, JsonRpcProxy } from '@neongd/json-rpc';
import {
  INeoProvider,
  ProviderAccount,
  ProviderEvent,
  ProviderListener,
  ProviderMessage,
  ProviderNetwork,
  ProviderRpcError,
  RequestArguments,
} from './types';

export * from './types';

export class JsonRpcNeoProvider implements INeoProvider {
  private events = new EventEmitter();

  constructor(public proxy: JsonRpcProxy) {
    this.registerEventListeners();
  }

  async enable(): Promise<ProviderAccount> {
    return this.request({ method: 'getAccount' });
  }

  on(event: 'connect', listener: () => void): void;
  on(event: 'disconnect', listener: (error: ProviderRpcError) => void): void;
  on(event: 'message', listener: (message: ProviderMessage) => void): void;
  on(event: 'networkChanged', listener: (network: ProviderNetwork) => void): void;
  on(event: 'accountChanged', listener: (account: ProviderAccount) => void): void;
  on(event: ProviderEvent, listener: ProviderListener): void {
    this.events.on(event, listener);
  }

  once(event: 'connect', listener: () => void): void;
  once(event: 'disconnect', listener: (error: ProviderRpcError) => void): void;
  once(event: 'message', listener: (message: ProviderMessage) => void): void;
  once(event: 'networkChanged', listener: (network: ProviderNetwork) => void): void;
  once(event: 'accountChanged', listener: (account: ProviderAccount) => void): void;
  once(event: ProviderEvent, listener: ProviderListener): void {
    this.events.once(event, listener);
  }

  removeListener(event: string, listener: any): void {
    this.events.removeListener(event, listener);
  }

  request<R = any, P = any>(args: RequestArguments<P>): Promise<R> {
    return this.proxy.request<R, P>(args);
  }

  private registerEventListeners() {
    this.proxy.on('disconnect', () => {
      this.proxy.connect();
    });
    this.proxy.on('notification', (notification: JsonRpcNotification) =>
      this.onNotification(notification),
    );
  }

  private onNotification(notification: JsonRpcNotification) {
    const providerEvents = ['connect', 'disconnect', 'message', 'networkChanged', 'accountChanged'];
    if (providerEvents.includes(notification.method)) {
      this.events.emit(notification.method, notification.params);
    }
  }
}
