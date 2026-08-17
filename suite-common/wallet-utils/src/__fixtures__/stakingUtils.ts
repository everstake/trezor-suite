import { type NetworkSymbol, type NetworkType } from '@suite-common/wallet-config';
import { UNSTAKING_ETH_PERIOD } from '@suite-common/wallet-constants';
import { SOLANA_EPOCH_DAYS } from '@trezor/network-solana/constants';

import { type StakeWithdrawalReserveState } from '../stakingUtils';

type GetUnstakingPeriodInDaysFixture = {
    description: string;
    args: {
        networkType?: NetworkType;
        withdrawTime?: number;
        exitTime?: number;
    };
    result: number;
};

export const getUnstakingPeriodInDaysFixture: GetUnstakingPeriodInDaysFixture[] = [
    {
        description: 'should return correct unstaking period in days for ETH',
        args: {
            networkType: 'ethereum',
            withdrawTime: 604800,
            exitTime: 259200,
        },
        result: 10,
    },
    {
        description:
            'should return default unstaking period when withdrawTime is not valid for ETH',
        args: {
            withdrawTime: undefined,
        },
        result: UNSTAKING_ETH_PERIOD,
    },
    {
        description: 'should return Solana epoch duration for SOL',
        args: {
            networkType: 'solana',
        },
        result: SOLANA_EPOCH_DAYS,
    },
    {
        description: 'should return default ETH period when exitTime is missing',
        args: {
            networkType: 'ethereum',
            withdrawTime: 604800,
            exitTime: undefined,
        },
        result: UNSTAKING_ETH_PERIOD,
    },
    {
        description: 'should return default ETH period when both times are undefined',
        args: {
            networkType: 'ethereum',
            withdrawTime: undefined,
            exitTime: undefined,
        },
        result: UNSTAKING_ETH_PERIOD,
    },
    {
        description: 'should default to ETH period when network and times are missing',
        args: {},
        result: UNSTAKING_ETH_PERIOD,
    },
    {
        description:
            'should calculate unstaking period when network is undefined but times are valid',
        args: {
            withdrawTime: 172800,
            exitTime: 86400,
        },
        result: 3,
    },
    {
        description: 'should return 0 when both times are 0',
        args: {
            networkType: 'ethereum',
            withdrawTime: 0,
            exitTime: 0,
        },
        result: 0,
    },
];

type GetMaxStakeAmountFixture = {
    description: string;
    args: {
        balance: string;
        symbol: NetworkSymbol | undefined;
    };
    result: string;
};

export const getMaxStakeAmountFixture: GetMaxStakeAmountFixture[] = [
    {
        description:
            'SOL: reserves the withdrawal amount (0.02), not just the fee buffer, when the balance is well above the staking minimum',
        args: { balance: '5', symbol: 'sol' },
        result: '4.98',
    },
    {
        description:
            'SOL: takes the fee-buffer-only branch because balance minus the fee buffer (0.005) does not exceed MIN_BALANCE_FOR_STAKING (1.02)',
        args: { balance: '1.01', symbol: 'sol' },
        result: '1.005',
    },
    {
        description:
            'SOL: at the exact fee-buffer branch boundary (balance minus the fee buffer equals MIN_BALANCE_FOR_STAKING), still takes the fee-buffer-only branch',
        args: { balance: '1.025', symbol: 'sol' },
        result: '1.02',
    },
    {
        description:
            'SOL: one cent above the boundary, switches to the withdrawal-reserve branch; this is a known non-monotonic step inherited from desktop (max amount drops from 1.02 to 1.006 as balance rises), not something this shared helper introduces',
        args: { balance: '1.026', symbol: 'sol' },
        result: '1.006',
    },
    {
        description: 'SOL: caps the result at the protocol maximum stake amount',
        args: { balance: '10000005', symbol: 'sol' },
        result: '10000000',
    },
    {
        description:
            'SOL: never returns a negative amount when the balance is below the fee buffer',
        args: { balance: '0.001', symbol: 'sol' },
        result: '0',
    },
    {
        description:
            'ETH: withdrawal reserve equals the fee buffer (both 0.005), so max leaves 0.005 regardless of the branch',
        args: { balance: '5', symbol: 'eth' },
        result: '4.995',
    },
    {
        description: 'returns 0 (fails safe, reserves everything) for a non-staking network symbol',
        args: { balance: '5', symbol: 'btc' },
        result: '0',
    },
    {
        description: 'TRX: below the withdrawal-branch threshold, reserves the full fee buffer (5)',
        args: { balance: '6', symbol: 'trx' },
        result: '1',
    },
    {
        description:
            'TRX: just above the threshold, reserves only the withdrawal amount (0.01) instead of the 5 TRX fee buffer, a steep cliff inherited from desktop',
        args: { balance: '6.02', symbol: 'trx' },
        result: '6.01',
    },
    {
        description:
            'ADA: withdrawal reserve is 0, so once above the fee buffer the max amount is the full balance',
        args: { balance: '5', symbol: 'ada' },
        result: '5',
    },
    {
        description:
            'ADA: never returns a negative amount when the balance is below the fee buffer',
        args: { balance: '0.001', symbol: 'ada' },
        result: '0',
    },
];

type GetStakeWithdrawalReserveStateFixture = {
    description: string;
    args: {
        balance: string;
        amount: string;
        fee: string;
        symbol: NetworkSymbol | undefined;
        isMaxAmountSelected: boolean;
    };
    result: StakeWithdrawalReserveState | null;
};

export const getStakeWithdrawalReserveStateFixture: GetStakeWithdrawalReserveStateFixture[] = [
    {
        description:
            'SOL: staking max on a 5 balance leaves exactly the 0.02 withdrawal reserve, so it confirms the reserve instead of staying silent',
        args: {
            balance: '5',
            amount: '4.98',
            fee: '0.000005',
            symbol: 'sol',
            isMaxAmountSelected: true,
        },
        result: 'reserveLeft',
    },
    {
        description:
            'SOL: the same max amount typed by hand only recommends the reserve, because the fee pushes the remainder below 0.02',
        args: {
            balance: '5',
            amount: '4.98',
            fee: '0.000005',
            symbol: 'sol',
            isMaxAmountSelected: false,
        },
        result: 'recommendedReserve',
    },
    {
        description: 'SOL: a manually entered amount that eats into the 0.02 reserve is flagged',
        args: {
            balance: '5',
            amount: '4.99',
            fee: '0.000005',
            symbol: 'sol',
            isMaxAmountSelected: false,
        },
        result: 'recommendedReserve',
    },
    {
        description:
            'SOL: a manually entered amount that leaves the reserve plus the fee is not flagged',
        args: {
            balance: '5',
            amount: '4.9',
            fee: '0.000005',
            symbol: 'sol',
            isMaxAmountSelected: false,
        },
        result: null,
    },
    {
        description:
            'SOL: an amount exceeding the fee-adjusted balance is left to the form validation, not the reserve banner',
        args: {
            balance: '5',
            amount: '5',
            fee: '0.000005',
            symbol: 'sol',
            isMaxAmountSelected: false,
        },
        result: null,
    },
    {
        description:
            'SOL: an amount below the staking minimum cannot be submitted, so the reserve banner stays hidden',
        args: {
            balance: '1.005',
            amount: '0.999',
            fee: '0.000005',
            symbol: 'sol',
            isMaxAmountSelected: false,
        },
        result: null,
    },
    {
        description:
            'SOL: staking max on a balance too small for the withdrawal-reserve branch reports the smaller leftover',
        args: {
            balance: '1.01',
            amount: '1.005',
            fee: '0.000005',
            symbol: 'sol',
            isMaxAmountSelected: true,
        },
        result: 'smallReserveLeft',
    },
    {
        description:
            'SOL: an unavailable fee falls back to a fee of 0 instead of hiding the banner',
        args: {
            balance: '5',
            amount: '4.99',
            fee: '',
            symbol: 'sol',
            isMaxAmountSelected: false,
        },
        result: 'recommendedReserve',
    },
    {
        description: 'SOL: an empty amount has nothing to compare against',
        args: {
            balance: '5',
            amount: '',
            fee: '0.000005',
            symbol: 'sol',
            isMaxAmountSelected: true,
        },
        result: null,
    },
    {
        description:
            'ETH: staking max leaves the 0.005 withdrawal reserve, matching the desktop e2e expectation',
        args: {
            balance: '5',
            amount: '4.995',
            fee: '0.0004',
            symbol: 'eth',
            isMaxAmountSelected: true,
        },
        result: 'reserveLeft',
    },
    {
        description: 'ADA: has no withdrawal reserve, so the messaging is skipped entirely',
        args: {
            balance: '5',
            amount: '5',
            fee: '0.17',
            symbol: 'ada',
            isMaxAmountSelected: true,
        },
        result: null,
    },
    {
        description: 'returns null for a non-staking network symbol',
        args: {
            balance: '5',
            amount: '1',
            fee: '0.0001',
            symbol: 'btc',
            isMaxAmountSelected: true,
        },
        result: null,
    },
];
