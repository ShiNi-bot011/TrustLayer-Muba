import { createDAppKit } from '@mysten/dapp-kit-react'
import { SuiGrpcClient } from '@mysten/sui/grpc'
import { DEMO_NETWORK, SUI_GRPC_URL } from './lib/demoConfig'

export const dAppKit = createDAppKit({
  networks: [DEMO_NETWORK],
  defaultNetwork: DEMO_NETWORK,
  createClient: (network) => new SuiGrpcClient({ network, baseUrl: SUI_GRPC_URL }),
})

declare module '@mysten/dapp-kit-react' {
  interface Register {
    dAppKit: typeof dAppKit
  }
}
