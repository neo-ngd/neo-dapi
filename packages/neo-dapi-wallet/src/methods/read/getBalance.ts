interface BalanceRequest {
  address: string;
  assets?: string[];
}

export interface GetBalanceParams {
  params: BalanceRequest | BalanceRequest[];
  network?: string;
}

interface Balance {
  assetHash: string;
  amount: string;
}

export interface GetBalanceResult {
  [address: string]: Balance[];
}
