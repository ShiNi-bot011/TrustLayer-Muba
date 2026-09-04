import { 
    seedHealthyHistory,
    triggerTrueFitnessScenario,
    trigger1FitScenario,
} from '../src/scenarios.ts';

import {
    buildUpdateHealthScoreTx,
    buildInitiateSlashTx,
    buildSubmitCounterEvidenceTx,
    buildDepositBondTx,
    buildRegisterMerchantTx,
} from '../src/suiTransaction.ts';

import { executeOracleTransaction,} from '../src/suiClient.ts';
import { 
    DEMO_MERCHANT_OBJECT_ID,
    DEMO_BOND_MIST,
    DEMO_REVENUE_MIST,
} from '../src/config.ts';

export async function seedHealthyHistoryOnChain() {

    console.log('\n=================================');
    console.log('DEMO: SEED HEALTHY HISTORY');
    console.log('=================================');

    const scenario = seedHealthyHistory(
        '0xDEMO_MERCHANT_A'
    );

    console.log(`Health Score: ${scenario.newHealthScore}`);
    console.log(`Recommended Status: ${scenario.recommendedStatus}`);

    const tx = buildUpdateHealthScoreTx(
        DEMO_MERCHANT_OBJECT_ID,
        scenario.newHealthScore,
        DEMO_REVENUE_MIST
    );

    console.log('✓ Transaction built');

    const result = await executeOracleTransaction(tx);

    console.log('✓ Transaction submitted');

    console.dir(result, { depth: null });

    return {
        scenario,
        transaction: result,
    };
}

export async function triggerTrueFitnessOnChain() {

    console.log('\n=================================');
    console.log('DEMO: TRIGGER TRUE FITNESS');
    console.log('=================================');

    // 1. Run Simulator
    const scenario = triggerTrueFitnessScenario(
        '0xDEMO_MERCHANT_A'
    );

    console.log(`Health Score: ${scenario.newHealthScore}`);
    console.log(`Recommended Status: ${scenario.recommendedStatus}`);
    console.log(`Reason Code: ${scenario.reasonCode}`);

    // 2. Update health score on Sui
    const healthTx = buildUpdateHealthScoreTx(
        DEMO_MERCHANT_OBJECT_ID,
        scenario.newHealthScore,
        0
    );

    console.log('\nUpdating health score...');

    const healthResult = await executeOracleTransaction(healthTx);
    
    console.log('✓ Health score updated');

    // 3. Initiate 
    if(scenario.reasonCode === undefined){
        throw new Error(`Cannot initiate slash: scenario "${scenario.scenarioName}" has no reasonCode.`)
    }
    const slashTx = buildInitiateSlashTx(
        DEMO_MERCHANT_OBJECT_ID,
        scenario.reasonCode
    );

    console.log('\nInitiating slash...');

    const slashResult = await executeOracleTransaction(slashTx);

    console.log('✓ Slash initiated');

    return {
        scenario,
        healthTransaction: healthResult,
        slashTransaction: slashResult,
    };
}

export async function trigger1FitOnChain() {

    console.log('\n=================================');
    console.log('DEMO: TRIGGER 1FIT');
    console.log('=================================');

    // 1. Run simulator
    const scenario = trigger1FitScenario(
        '0xDEMO_MERCHANT_B'
    );

    console.log(`Health Score: ${scenario.newHealthScore}`);
    console.log(`Recommended Status: ${scenario.recommendedStatus}`);
    console.log(`Reason Code: ${scenario.reasonCode}`);

    console.log('\nSimulated trailing 30d prepaid revenue: 2 SUI');

    // 2. Update score + real revenue on Sui
    const healthTx = buildUpdateHealthScoreTx(
        DEMO_MERCHANT_OBJECT_ID,
        scenario.newHealthScore,
        DEMO_REVENUE_MIST
    );

    console.log('\nUpdating health score and revenue...');

    const healthResult =
        await executeOracleTransaction(healthTx);

    if (healthResult.$kind === 'FailedTransaction') {
        console.error('❌ Health score update failed');
        console.dir(
            healthResult.FailedTransaction.status,
            { depth: null }
        );
        return healthResult;
    }

    console.log('✓ Health score updated');
    console.log('✓ Trailing revenue updated to 10 SUI');

    // 3. Validate slash reason
    if (scenario.reasonCode === undefined) {
        throw new Error(
            'Cannot initiate slash: 1Fit scenario has no reasonCode.'
        );
    }

    // 4. Initiate slash
    const slashTx = buildInitiateSlashTx(
        DEMO_MERCHANT_OBJECT_ID,
        scenario.reasonCode
    );

    console.log('\nInitiating slash for promo spike...');

    const slashResult =
        await executeOracleTransaction(slashTx);

    if (slashResult.$kind === 'FailedTransaction') {
        console.error('❌ Slash transaction failed');
        console.dir(
            slashResult.FailedTransaction.status,
            { depth: null }
        );

        return {
            scenario,
            healthTransaction: healthResult,
            slashTransaction: slashResult,
        };
    }

    console.log('✓ 1Fit slash initiated');

    console.log('\nExpected risk calculation:');
    console.log('Revenue: 2 SUI');
    console.log(`Health Score: ${scenario.newHealthScore}`);

    const risk = 100 - scenario.newHealthScore;

    console.log(`Risk: ${risk}%`);

    const requiredBondSui = Math.max(2 * risk / 100, 0.5);

    console.log(`Required Bond: ${requiredBondSui} SUI`);

    return {
        scenario,
        healthTransaction: healthResult,
        slashTransaction: slashResult,
    };
}

export async function submitCounterEvidenceOnChain() {

    console.log('\n=================================');
    console.log('DEMO: SUBMIT COUNTER-EVIDENCE');
    console.log('=================================');

    const evidenceHash =
        '0xDEMO_FAKE_REFUND_TX_HASH';

    console.log(`Evidence: ${evidenceHash}`);

    const tx = buildSubmitCounterEvidenceTx(
        DEMO_MERCHANT_OBJECT_ID,
        evidenceHash
    );

    console.log('✓ Transaction built');

    const result = await executeOracleTransaction(tx);

    if (result.$kind === 'FailedTransaction') {
        console.error('❌ Counter-evidence transaction failed');
        console.dir(result.FailedTransaction.status, { depth: null });
        return result;
    }

    console.log('✓ Counter-evidence submitted');
    console.dir(result, { depth: null });

    return result;
}

export async function depositDemoBondOnChain() {

    console.log('\n=================================');
    console.log('DEMO: DEPOSIT BOND');
    console.log('=================================');

    console.log('Depositing: 1.5 SUI');

    const tx = buildDepositBondTx(
        DEMO_MERCHANT_OBJECT_ID,
        DEMO_BOND_MIST
    );

    console.log('✓ Deposit transaction built');

    const result = await executeOracleTransaction(tx);

    if (result.$kind === 'FailedTransaction') {

        console.error('❌ Bond deposit failed');

        console.dir(
            result.FailedTransaction.status,
            { depth: null }
        );

        return result;
    }

    console.log('✓ 1.5 SUI bond deposited');

    return result;
}

async function main() {
    await submitCounterEvidenceOnChain();
}

main().catch((error) => {
    console.error('\n❌ Demo action failed:');
    console.error(error);
    process.exit(1);
});

export async function registerNewDemoMerchant() {

    console.log('\n=================================');
    console.log('DEMO: REGISTER NEW MERCHANT');
    console.log('=================================');

    const tx = buildRegisterMerchantTx(
        'Merchant B - Fresh Demo',
        90
    );

    console.log('✓ Registration transaction built');

    const result = await executeOracleTransaction(tx);

    if (result.$kind === 'FailedTransaction') {
        console.error('❌ Merchant registration failed');
        console.dir(
            result.FailedTransaction.status,
            { depth: null }
        );
        return result;
    }

    console.log('✓ New merchant registered');
    console.dir(result, { depth: null });

    return result;
}