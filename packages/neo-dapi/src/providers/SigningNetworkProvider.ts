import { CONST, tx, u, wallet } from '@cityofzion/neon-core';
import { getStandardErrorResponse, RpcError, StandardErrorCodes } from '@neongd/json-rpc';
import BigNumber from 'bignumber.js';
import {
  Account,
  Argument,
  Attribute,
  Invocation,
  ProviderInformation,
  Signer,
} from '../dapis/Dapi';
import {
  addressToScriptHash,
  hexToBase64,
  invocationsToScript,
  signerToSignerJson,
  stringToHex,
} from '../utils/convertors';
import { NetworkConfig, NetworkProvider } from './NetworkProvider';
import { RequestArguments } from './Provider';

export class SigningNetworkProvider extends NetworkProvider {
  account: wallet.Account;

  constructor(
    networkConfigs: NetworkConfig[],
    defaultNetworkName: string,
    accountPrivateKey: string,
    protected accountLabel?: string,
  ) {
    super(networkConfigs, defaultNetworkName);
    this.account = new wallet.Account(accountPrivateKey);
  }

  async request<R = unknown, P = unknown>(args: RequestArguments<P>): Promise<R> {
    switch (args.method) {
      case 'getProvider':
        return this.handleGetProvider() as R;
      case 'getNetworks':
        return this.handleGetNetworks() as R;
      case 'getAccount':
        return this.handleGetAccount() as R;
      case 'invoke':
        return this.handleInvoke(args.params as any) as R;
      case 'invokeMulti':
        return this.handleInvokeMulti(args.params as any) as R;
      case 'signMessage':
        return this.handleSignMessage(args.params as any) as R;
      case 'signMessageWithoutSalt':
        return this.handleSignMessageWithoutSalt(args.params as any) as R;
      case 'signTransaction':
        return this.handleSignTransaction(args.params as any) as R;
      default:
        return super.request(args);
    }
  }

  changeAccount(accountPrivateKey: string, accountLabel?: string): void {
    this.account = new wallet.Account(accountPrivateKey);
    this.accountLabel = accountLabel;
    this.events.emit('accountChanged', this.account.address);
  }

  protected async handleGetProvider(): Promise<ProviderInformation> {
    return {
      ...(await super.handleGetProvider()),
      name: 'SigningNetworkProvider',
    };
  }

  protected async handleGetAccount(): Promise<Account> {
    return {
      address: this.account.address,
      publicKey: this.account.privateKey,
      label: this.accountLabel,
    };
  }

  protected async handleInvoke(params: {
    scriptHash: string;
    operation: string;
    args?: Argument[];
    attributes?: Attribute[];
    signers?: Signer[];
    network?: string;
    extraSystemFee?: string;
    extraNetworkFee?: string;
    broadcastOverride?: boolean;
  }): Promise<{
    txid: string;
    nodeUrl?: string;
    signedTx?: string;
  }> {
    const populateResult = await this.populateTransaction({
      invocations: [
        { scriptHash: params.scriptHash, operation: params.operation, args: params.args },
      ],
      attributes: params.attributes,
      signers: params.signers,
      network: params.network,
      extraNetworkFee: params.extraNetworkFee,
      extraSystemFee: params.extraSystemFee,
    });

    const { txid, signedTx } = await this.signTransaction(populateResult);
    if (params.broadcastOverride === true) {
      return { txid, signedTx };
    } else {
      const { nodeUrl } = await this.broadcastTransaction({
        signedTx,
        network: populateResult.network,
      });
      return { txid, nodeUrl };
    }
  }

  protected async handleInvokeMulti(params: {
    invocations: Invocation[];
    attributes?: Attribute[];
    signers?: Signer[];
    network?: string;
    extraSystemFee?: string;
    extraNetworkFee?: string;
    broadcastOverride?: boolean;
  }): Promise<{
    txid: string;
    nodeUrl?: string;
    signedTx?: string;
  }> {
    const populateResult = await this.populateTransaction({
      invocations: params.invocations,
      attributes: params.attributes,
      signers: params.signers,
      network: params.network,
      extraNetworkFee: params.extraNetworkFee,
      extraSystemFee: params.extraSystemFee,
    });

    const { txid, signedTx } = await this.signTransaction(populateResult);
    if (params.broadcastOverride === true) {
      return { txid, signedTx };
    } else {
      const { nodeUrl } = await this.broadcastTransaction({
        signedTx,
        network: populateResult.network,
      });
      return { txid, nodeUrl };
    }
  }

  protected async handleSignMessage(params: {
    message: string;
  }): Promise<{ salt: string; signature: string; publicKey: string }> {
    const salt = u.ab2hexstring(u.generateRandomArray(16));
    const publicKey = this.account.publicKey;
    const parameterHexString = stringToHex(salt + params.message);
    const lengthHex = u.num2VarInt(parameterHexString.length / 2);
    const concatenatedString = lengthHex + parameterHexString;
    const serializedTransaction = '010001f0' + concatenatedString + '0000';
    const signature = wallet.sign(serializedTransaction, this.account.privateKey);
    return { salt, signature, publicKey };
  }

  protected async handleSignMessageWithoutSalt(params: {
    message: string;
  }): Promise<{ signature: string; publicKey: string }> {
    const publicKey = this.account.publicKey;
    const parameterHexString = stringToHex(params.message);
    const lengthHex = u.num2VarInt(parameterHexString.length / 2);
    const concatenatedString = lengthHex + parameterHexString;
    const serializedTransaction = '010001f0' + concatenatedString + '0000';
    const signature = wallet.sign(serializedTransaction, this.account.privateKey);
    return { signature, publicKey };
  }

  protected async handleSignTransaction(params: {
    version: number;
    nonce: number;
    systemFee: string;
    networkFee: string;
    validUntilBlock: number;
    script: string;
    invocations?: Invocation[];
    attributes?: Attribute[];
    signers?: Signer[];
    network?: string;
  }): Promise<{ signature: string; publicKey: string }> {
    const populateResult = await this.populateTransaction(params);

    const { signature, publicKey } = await this.signTransaction(populateResult);
    return { signature, publicKey };
  }

  protected async populateTransaction(params: {
    version?: number;
    nonce?: number;
    systemFee?: string;
    networkFee?: string;
    validUntilBlock?: number;
    script?: string;
    invocations?: Invocation[];
    attributes?: Attribute[];
    signers?: Signer[];
    extraSystemFee?: string;
    extraNetworkFee?: string;
    network?: string;
  }): Promise<{
    version: number;
    nonce: number;
    systemFee: string;
    networkFee: string;
    validUntilBlock: number;
    script: string;
    attributes: Attribute[];
    signers: Signer[];
    network: string;
  }> {
    const network = this.getNetworkConfig(params.network).name;
    const transport = this.getTransport(network);

    const version = params.version ?? CONST.TX_VERSION;
    const nonce = params.nonce ?? parseInt(u.ab2hexstring(u.generateRandomArray(4)), 16);
    const validUntilBlock =
      params.validUntilBlock ??
      (await transport
        .request<number>({ method: 'getblockcount' })
        .catch(this.convertRemoteRpcError)) + 5000;

    const invocationsScript = params.invocations && invocationsToScript(params.invocations);

    let script: string;
    if (params.script != null) {
      if (invocationsScript != null && params.script !== invocationsScript) {
        throw new RpcError(
          getStandardErrorResponse(
            StandardErrorCodes.InvalidParams,
            'Script and invocations are inconsistent',
          ),
        );
      }
      script = params.script;
    } else {
      if (invocationsScript == null) {
        throw new RpcError(
          getStandardErrorResponse(
            StandardErrorCodes.InvalidParams,
            'Both script and invocations are missing from params',
          ),
        );
      }
      script = invocationsScript;
    }

    const attributes = params.attributes ?? [];
    const signers = params.signers ?? [
      { account: addressToScriptHash(this.account.address), scopes: 'CalledByEntry' },
    ];

    const { gasconsumed: estimatedSystemFee } = await transport
      .request<any>({
        method: 'invokescript',
        params: [hexToBase64(script), signers.map(signerToSignerJson)],
      })
      .catch(this.convertRemoteRpcError);

    const systemFee = new BigNumber(estimatedSystemFee)
      .times(1.01)
      .plus(params.extraSystemFee ?? 0)
      .dp(0)
      .toString();

    const fakeTx = new tx.Transaction({
      version,
      nonce,
      validUntilBlock,
      script,
      attributes: attributes.map(attribute => tx.TransactionAttribute.fromJson(attribute)),
      signers,
      witnesses: [tx.Witness.fromSignature('0'.repeat(128), this.account.publicKey)],
    });

    const { networkfee: estimatedNetworkFee } = await transport
      .request<any>({
        method: 'calculatenetworkfee',
        params: [hexToBase64(fakeTx.serialize(true))],
      })
      .catch(this.convertRemoteRpcError);

    const networkFee = new BigNumber(estimatedNetworkFee)
      .plus(params.extraNetworkFee ?? 0)
      .dp(0)
      .toString();

    return {
      version,
      nonce,
      systemFee,
      networkFee,
      validUntilBlock,
      script,
      attributes,
      signers,
      network,
    };
  }

  protected async signTransaction(params: {
    version: number;
    nonce: number;
    systemFee: string;
    networkFee: string;
    validUntilBlock: number;
    script: string;
    attributes: Attribute[];
    signers: Signer[];
    network: string;
  }): Promise<{ txid: string; signedTx: string; publicKey: string; signature: string }> {
    const networkConfig = this.getNetworkConfig(params.network);
    const transaction = new tx.Transaction({
      version: params.version,
      nonce: params.nonce,
      systemFee: params.systemFee,
      networkFee: params.networkFee,
      validUntilBlock: params.validUntilBlock,
      script: params.script,
      attributes: params.attributes.map(attribute => tx.TransactionAttribute.fromJson(attribute)),
      signers: params.signers,
    });
    const hash = transaction.hash();
    const txid = `0x${hash}`;
    const publicKey = this.account.publicKey;
    const signature = wallet.sign(
      u.num2hexstring(networkConfig.magicNumber, 4, true) + u.reverseHex(hash),
      this.account.privateKey,
    );
    transaction.addWitness(tx.Witness.fromSignature(signature, publicKey));
    const signedTx = hexToBase64(transaction.serialize(true));
    return { txid, signedTx, publicKey, signature };
  }

  protected async broadcastTransaction(params: {
    signedTx: string;
    network: string;
  }): Promise<{ nodeUrl: string }> {
    const networkConfig = this.getNetworkConfig(params.network);
    const transport = this.getTransport(params.network);
    await transport
      .request({ method: 'sendrawtransaction', params: [params.signedTx] })
      .catch(this.convertRemoteRpcError);
    return { nodeUrl: networkConfig.nodeUrl };
  }
}
