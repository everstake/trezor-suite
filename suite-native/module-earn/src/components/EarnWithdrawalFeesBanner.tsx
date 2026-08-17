import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

import { type NetworkSymbol, getNetwork } from '@suite-common/wallet-config';
import { type AccountsRootState, selectAccountByKey } from '@suite-common/wallet-core';
import { type AccountKey } from '@suite-common/wallet-types';
import {
    type StakeWithdrawalReserveState,
    formatNetworkAmount,
    getStakeWithdrawalReserveState,
    getStakingLimitsByNetworkSymbol,
} from '@suite-common/wallet-utils';
import { type AlertBoxIntent, BannerInline } from '@suite-native/atoms';
import { useField } from '@suite-native/forms';
import { Translation, type TxKeyPath } from '@suite-native/intl';

import { useEarnSelectedPrecomposedTransaction } from '../hooks/useEarnSelectedPrecomposedTransaction';

type EarnWithdrawalFeesBannerProps = {
    accountKey: AccountKey;
    symbol: NetworkSymbol;
    isMaxAmountSelected: boolean;
};

const MESSAGE_ID_BY_RESERVE_STATE = {
    recommendedReserve: 'earn.earnFormScreen.withdrawalFeesRecommendation',
    reserveLeft: 'earn.earnFormScreen.withdrawalFeesReserveLeft',
    smallReserveLeft: 'earn.earnFormScreen.withdrawalFeesSmallReserveLeft',
} satisfies Record<StakeWithdrawalReserveState, TxKeyPath>;

// Staking max spends into the reserve on purpose, so it reports what is left instead of warning.
const INTENT_BY_RESERVE_STATE = {
    recommendedReserve: 'warning',
    reserveLeft: 'info',
    smallReserveLeft: 'info',
} satisfies Record<StakeWithdrawalReserveState, AlertBoxIntent>;

export const EarnWithdrawalFeesBanner = ({
    accountKey,
    symbol,
    isMaxAmountSelected,
}: EarnWithdrawalFeesBannerProps) => {
    const account = useSelector((state: AccountsRootState) =>
        selectAccountByKey(state, accountKey),
    );
    const { value: amountValue, hasError } = useField({ name: 'amount' });
    const precomposedTransaction = useEarnSelectedPrecomposedTransaction('stake', accountKey);

    const composedFee = precomposedTransaction
        ? formatNetworkAmount(precomposedTransaction.fee, symbol)
        : undefined;

    // Every recompose drops the selected fee level until the new one arrives. Reading a fee of 0
    // for those renders moves the reserve threshold and makes the banner blink, so the last known
    // fee is kept until it is replaced.
    const [lastKnownFee, setLastKnownFee] = useState('0');
    useEffect(() => {
        if (composedFee !== undefined) {
            setLastKnownFee(composedFee);
        }
    }, [composedFee]);

    const limits = getStakingLimitsByNetworkSymbol(symbol);

    if (!limits || !account || hasError) return null;

    const reserveState = getStakeWithdrawalReserveState({
        balance: formatNetworkAmount(account.availableBalance, symbol),
        amount: amountValue,
        fee: composedFee ?? lastKnownFee,
        symbol,
        isMaxAmountSelected,
    });

    if (!reserveState) return null;

    const { displaySymbol } = getNetwork(symbol);

    return (
        <BannerInline
            intent={INTENT_BY_RESERVE_STATE[reserveState]}
            title={
                <Translation
                    id={MESSAGE_ID_BY_RESERVE_STATE[reserveState]}
                    values={{
                        amount: limits.MIN_FOR_WITHDRAWALS.toString(),
                        displaySymbol,
                    }}
                />
            }
        />
    );
};
