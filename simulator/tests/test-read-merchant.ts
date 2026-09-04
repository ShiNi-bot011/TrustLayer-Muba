import { getMerchantObject } from '../src/suiClient.ts';
import { DEMO_MERCHANT_OBJECT_ID } from '../src/config.ts';

async function main() {
    console.log('Reading Demo Merchant:', DEMO_MERCHANT_OBJECT_ID);

    const result = await getMerchantObject(
        DEMO_MERCHANT_OBJECT_ID
    );

    console.log('=== RAW MERCHANT OBJECT ===');
    console.dir(result, { depth: null });
}

main().catch((error) => {
    console.error('\n❌ Error reading Merchant object:');
    console.error(error);
    process.exit(1);
});