import { sc } from '@cityofzion/neon-js';
import {
  getStandardError,
  IJsonRpcTransport,
  JsonRpcTransport,
  RpcError,
  StandardErrorCodes,
} from '@neongd/json-rpc';
import {
  GetAccountResult,
  GetApplicationLogParams,
  GetApplicationLogResult,
  GetBlockCountResult,
  GetBlockParams,
  GetBlockResult,
  GetNep17BalancesParams,
  GetNep17BalancesResult,
  GetNetworksResult,
  GetProviderResult,
  GetPublicKeyResult,
  GetStorageParams,
  GetStorageResult,
  GetTransactionParams,
  GetTransactionResult,
  INeoDapi,
  InvokeMultiParams,
  InvokeMultiResult,
  InvokeParams,
  InvokeReadMultiParams,
  InvokeReadMultiResult,
  InvokeReadParams,
  InvokeReadResult,
  InvokeResult,
  Signer,
  Transaction,
} from '.';

export class NeoDapiNodeAdapter implements INeoDapi {
  protected transport: IJsonRpcTransport;

  constructor(nodeUrl: string) {
    this.transport = new JsonRpcTransport(nodeUrl);
  }

  getProvider(): Promise<GetProviderResult> {
    throw new RpcError(getStandardError(StandardErrorCodes.MethodNotFound));
  }

  getAccount(): Promise<GetAccountResult> {
    throw new RpcError(getStandardError(StandardErrorCodes.MethodNotFound));
  }

  getPublicKey(): Promise<GetPublicKeyResult> {
    throw new RpcError(getStandardError(StandardErrorCodes.MethodNotFound));
  }

  getNetworks(): Promise<GetNetworksResult> {
    throw new RpcError(getStandardError(StandardErrorCodes.MethodNotFound));
  }

  async getNep17Balances(params: GetNep17BalancesParams): Promise<GetNep17BalancesResult> {
    const result = await this.transport.request({
      method: 'getnep17balances',
      params: [params.address],
    });
    const balanceMap = result.balance.reduce(
      (acc: any, cur: any) => Object.assign(acc, { [cur.assethash]: cur }),
      {} as any,
    );
    const assetHashes =
      params.assetHashes ?? result.balance.map((balance: any) => balance.assethash);

    return assetHashes.map((assetHash: string) => ({
      assetHash,
      amount: balanceMap[assetHash]?.amount ?? '0',
    }));
  }

  async getBlockCount(): Promise<GetBlockCountResult> {
    const result = await this.transport.request({
      method: 'getblockcount',
      params: [],
    });
    return result;
  }

  async getBlock(params: GetBlockParams): Promise<GetBlockResult> {
    const result = await this.transport.request({
      method: 'getblock',
      params: [params.blockIndex, true],
    });
    return {
      hash: result.hash,
      size: result.size,
      version: result.version,
      previousBlockHash: result.previousblockhash,
      merkleRoot: result.merkleroot,
      time: result.time,
      index: result.index,
      primary: result.primary,
      nextConsensus: result.nextconsensus,
      witnesses: result.witnesses,
      tx: result.tx.map(this.deserializeTransaction.bind(this)),
      confirmations: result.confirmations,
      nextBlockHash: result.nextblockhash,
    };
  }

  async getTransaction(params: GetTransactionParams): Promise<GetTransactionResult> {
    const result = await this.transport.request({
      method: 'getrawtransaction',
      params: [params.txid, true],
    });
    return this.deserializeTransaction(result);
  }

  async getApplicationLog(params: GetApplicationLogParams): Promise<GetApplicationLogResult> {
    const result = await this.transport.request({
      method: 'getapplicationlog',
      params: [params.txid],
    });
    return {
      txid: result.txid,
      executions: result.executions.map((execution: any) => ({
        trigger: execution.trigger,
        vmState: execution.vmstate,
        gasConsumed: execution.gasconsumed,
        stack: execution.stack,
        exception: execution.exception,
        notifications: execution.notifications.map((notification: any) => ({
          contract: notification.contract,
          eventName: notification.eventname,
          state: notification.state,
        })),
      })),
    };
  }

  async getStorage(params: GetStorageParams): Promise<GetStorageResult> {
    const result = await this.transport.request({
      method: 'getstorage',
      params: [params.scriptHash, params.key],
    });
    return result;
  }

  async invokeRead(params: InvokeReadParams): Promise<InvokeReadResult> {
    const result = await this.transport.request({
      method: 'invokefunction',
      params: [
        params.scriptHash,
        params.operation,
        params.args ?? [],
        (params.signers ?? []).map(this.serializeSigner.bind(this)),
      ],
    });
    return {
      script: result.script,
      state: result.state,
      gasConsumed: result.gasconsumed,
      stack: result.stack,
    };
  }

  async invokeReadMulti(params: InvokeReadMultiParams): Promise<InvokeReadMultiResult> {
    const script = sc.createScript(...params.invokeArgs);
    const base64Script = Buffer.from(script, 'hex').toString('base64');
    const result = await this.transport.request({
      method: 'invokescript',
      params: [base64Script, (params.signers ?? []).map(this.serializeSigner.bind(this))],
    });
    return {
      script: result.script,
      state: result.state,
      gasConsumed: result.gasconsumed,
      stack: result.stack,
    };
  }

  invoke(_params: InvokeParams): Promise<InvokeResult> {
    throw getStandardError(StandardErrorCodes.MethodNotFound);
  }

  invokeMulti(_params: InvokeMultiParams): Promise<InvokeMultiResult> {
    throw getStandardError(StandardErrorCodes.MethodNotFound);
  }

  private deserializeTransaction(transation: any): Transaction {
    return {
      hash: transation.hash,
      size: transation.size,
      version: transation.version,
      nonce: transation.nonce,
      sender: transation.sender,
      systemFee: transation.sysfee,
      networkFee: transation.netfee,
      validUntilBlock: transation.validuntilblock,
      signers: transation.signers.map(this.deserializeSigner.bind(this)),
      attributes: transation.attributes,
      script: transation.script,
      witnesses: transation.witnesses,
      blockHash: transation.blockhash,
      confirmations: transation.confirmations,
      blockTime: transation.blocktime,
    };
  }

  private deserializeSigner(signer: any): Signer {
    return {
      account: signer.account,
      scopes: signer.scopes,
      allowedContracts: signer.allowedcontracts,
      allowedGroups: signer.allowedgroups,
    };
  }

  private serializeSigner(signer: Signer): any {
    return {
      account: signer.account,
      scopes: signer.scopes,
      allowedcontracts: signer.allowedContracts,
      allowedgroups: signer.allowedGroups,
    };
  }
}
