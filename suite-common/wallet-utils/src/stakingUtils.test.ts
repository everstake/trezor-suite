import {
    getMaxStakeAmountFixture,
    getStakeWithdrawalReserveStateFixture,
    getUnstakingPeriodInDaysFixture,
} from './__fixtures__/stakingUtils';
import {
    getMaxStakeAmount,
    getStakeWithdrawalReserveState,
    getUnstakingPeriodInDays,
} from './stakingUtils';

describe('getUnstakingPeriodInDays', () => {
    getUnstakingPeriodInDaysFixture.forEach(test => {
        it(test.description, () => {
            const result = getUnstakingPeriodInDays(test.args.networkType, {
                withdrawTime: test.args.withdrawTime,
                exitTime: test.args.exitTime,
            });
            expect(result).toEqual(test.result);
        });
    });
});

describe('getMaxStakeAmount', () => {
    getMaxStakeAmountFixture.forEach(test => {
        it(test.description, () => {
            const result = getMaxStakeAmount({
                balance: test.args.balance,
                symbol: test.args.symbol,
            });
            expect(result).toEqual(test.result);
        });
    });
});

describe('getStakeWithdrawalReserveState', () => {
    getStakeWithdrawalReserveStateFixture.forEach(test => {
        it(test.description, () => {
            const result = getStakeWithdrawalReserveState(test.args);
            expect(result).toEqual(test.result);
        });
    });

    it('confirms the reserve for every max amount `getMaxStakeAmount` can produce', () => {
        const balances = ['1.01', '1.026', '2.833565275', '5', '10000005'];

        balances.forEach(balance => {
            const state = getStakeWithdrawalReserveState({
                balance,
                amount: getMaxStakeAmount({ balance, symbol: 'sol' }),
                fee: '0.002296785',
                symbol: 'sol',
                isMaxAmountSelected: true,
            });

            expect(state).not.toBeNull();
        });
    });
});
