export enum MethodName {
  GetAccount = 'getAccount',
  GetApplicationLog = 'getApplicationLog',
  GetBalance = 'getBalance',
  GetBlock = 'getBlock',
  GetBlockCount = 'getBlockCount',
  GetNetworks = 'getNetworks',
  GetProvider = 'getProvider',
  GetPublicKey = 'getPublicKey',
  GetStorage = 'getStorage',
  GetTransaction = 'getTransaction',
  InvokeRead = 'invokeRead',
  InvokeReadMulti = 'invokeReadMulti',
  Invoke = 'invoke',
  InvokeMulti = 'invokeMulti',
}

export enum ArgumentDataType {
  Any = 'Any',
  Boolean = 'Boolean',
  Integer = 'Integer',
  ByteArray = 'ByteArray',
  String = 'String',
  Hash160 = 'Hash160',
  Hash256 = 'Hash256',
  PublicKey = 'PublicKey',
  Signature = 'Signature',
  Array = 'Array',
  Map = 'Map',
  InteropInterface = 'InteropInterface',
  Void = 'Void',
}

export interface Argument {
  type: ArgumentDataType;
  value: any;
}

export interface Signer {
  account: string;
  scopes: string;
  allowedContracts?: string[];
  allowedGroups?: string[];
}

export interface TransactionAttribute {
  usage: string;
  data: string;
}

export interface Witness {
  invocation: string;
  verification: string;
}

export interface Transaction {
  hash: string;
  size: number;
  version: number;
  nonce: number;
  sender: string;
  systemFee: string;
  networkFee: string;
  validUntilBlock: number;
  signers: Signer[];
  attributes: TransactionAttribute[];
  script: string;
  witnesses: Witness[];
  blockHash: string;
  confirmations: number;
  blockTime: number;
}

export interface Block {
  hash: string;
  size: number;
  version: number;
  previousBlockHash: string;
  merkleRoot: string;
  time: number;
  index: number;
  primary: number;
  nextConsensus: string;
  witnesses: Witness[];
  tx: Transaction[];
  confirmations: number;
  nextBlockHash: string;
}
