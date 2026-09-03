export const DEMO_NETWORK = 'testnet' as const

export const SUI_GRPC_URL = 'https://fullnode.testnet.sui.io:443'
export const SUI_JSON_RPC_URL =
  import.meta.env.VITE_SUI_JSON_RPC_URL || 'https://sui-testnet-rpc.publicnode.com'

export const PACKAGE_ID =
  '0x88f8473000a36652045c2253e4e2b0b9c6d93fa44fda61943580f2918ee07475'

export const AUTHORIZED_DEMO_WALLET =
  '0xa32b2a83afd2dc19c759d7b7db1f7c23a4abecd02279cb6cf7d73dbc74516210'

export const MERCHANT_OBJECT_IDS = {
  'Merchant A': '0x77b343276131947ae93218ae7d36e34ef3576c8cc9dc9377401af7c34e6e445e',
  'Merchant B': '0x49aba03938aa9d99d5a9b090db555d3f31ab672a2dceb1406f4a3bad4233abca',
} as const

export const CLOCK_OBJECT_ID = '0x6'

export const ENABLE_EXPLICIT_MOCK_DATA = import.meta.env.VITE_ENABLE_MOCK_DATA === 'true'

export function transactionExplorerUrl(digest: string): string {
  return `https://testnet.suivision.xyz/txblock/${digest}`
}

export function objectExplorerUrl(objectId: string): string {
  return `https://testnet.suivision.xyz/object/${objectId}`
}
