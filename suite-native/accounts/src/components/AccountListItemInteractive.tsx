import { useSelector } from 'react-redux';

import { AccountsRootState, FiatRatesRootState } from '@suite-common/wallet-core';
import { Box, Card, HStack, RoundedIcon, Text, VStack } from '@suite-native/atoms';
import {
    CryptoAmountFormatter,
    CryptoToFiatAmountFormatter,
    FiatAmountFormatter,
} from '@suite-native/formatters';
import {
    calculateCryptoBalance,
    getAccountEverstakeStakingPool,
    getAccountTotalStakingBalance,
    getAccountTotalStakingBalanceWei,
} from '@suite-common/wallet-utils';
import { SettingsSliceRootState } from '@suite-native/settings';
import { isCoinWithTokens, selectAccountHasAnyTokensWithFiatRates } from '@suite-native/tokens';
import { prepareNativeStyle, useNativeStyles } from '@trezor/styles';
import { Translation } from '@suite-native/intl';

import { selectAccountFiatBalance } from '../selectors';
import { OnSelectAccount } from '../types';
import { AccountListItem, AccountListItemProps } from './AccountListItem';
import { TokenList } from './TokenList';
import { AccountListItemBase } from './AccountListItemBase';

interface AccountListItemInteractiveProps extends AccountListItemProps {
    onSelectAccount: OnSelectAccount;
    hideTokens?: boolean;
}

const separatorStyle = prepareNativeStyle(utils => ({
    borderBottomWidth: 1,
    borderBottomColor: utils.colors.borderElevation1,
}));

export const AccountListItemInteractive = ({
    account,
    onSelectAccount,
    hideTokens = false,
}: AccountListItemInteractiveProps) => {
    const { applyStyle } = useNativeStyles();
    const hasAnyTokensWithFiatRates = useSelector(
        (state: SettingsSliceRootState & FiatRatesRootState & AccountsRootState) =>
            selectAccountHasAnyTokensWithFiatRates(state, account.key),
    );
    const doesCoinSupportTokens = isCoinWithTokens(account.symbol);

    const fiatBalance = useSelector(
        (state: AccountsRootState & FiatRatesRootState & SettingsSliceRootState) =>
            selectAccountFiatBalance(state, account.key),
    );
    const cryptoBalance = calculateCryptoBalance(account);

    const stakingBalanceFormatted = getAccountTotalStakingBalance(account);
    const stakingBalance = getAccountTotalStakingBalanceWei(account);

    const isAccountWithStaking = !!getAccountEverstakeStakingPool(account);
    const shouldShowTokens = doesCoinSupportTokens && !hideTokens;
    const shouldShowHeading = shouldShowTokens || isAccountWithStaking;
    const showSeparator = hasAnyTokensWithFiatRates && shouldShowTokens;

    return (
        <Box>
            {shouldShowHeading && (
                <HStack alignItems="center" justifyContent="space-between" marginBottom="medium">
                    <Text variant="highlight">{account.accountLabel}</Text>

                    {(hasAnyTokensWithFiatRates || isAccountWithStaking) && (
                        <VStack spacing={0} alignItems="flex-end">
                            <FiatAmountFormatter
                                numberOfLines={1}
                                adjustsFontSizeToFit
                                value={fiatBalance}
                            />
                            <CryptoAmountFormatter
                                value={cryptoBalance}
                                network={account.symbol}
                                isBalance={false}
                                numberOfLines={1}
                                adjustsFontSizeToFit
                            />
                        </VStack>
                    )}
                </HStack>
            )}
            <Card noPadding>
                <AccountListItem
                    key={account.key}
                    account={account}
                    hideTokens={hideTokens}
                    onPress={() =>
                        onSelectAccount({
                            account,
                            hasAnyTokensWithFiatRates,
                        })
                    }
                />

                {isAccountWithStaking && (
                    <>
                        <Box style={applyStyle(separatorStyle)} />
                        <AccountListItemBase
                            onPress={() =>
                                onSelectAccount({
                                    account,
                                    hasAnyTokensWithFiatRates: false,
                                    hasStaking: true,
                                })
                            }
                            icon={<RoundedIcon name="piggyBankFilled" color="textSubdued" />}
                            title={
                                <Text>
                                    <Translation id="accountList.staking" />
                                </Text>
                            }
                            mainValue={
                                <CryptoToFiatAmountFormatter
                                    value={stakingBalance}
                                    network={account.symbol}
                                />
                            }
                            secondaryValue={
                                <CryptoAmountFormatter
                                    value={stakingBalanceFormatted}
                                    network={account.symbol}
                                    decimals={8}
                                />
                            }
                        />
                    </>
                )}

                {showSeparator && <Box style={applyStyle(separatorStyle)} />}
                {shouldShowTokens && (
                    <TokenList account={account} onSelectAccount={onSelectAccount} />
                )}
            </Card>
        </Box>
    );
};
