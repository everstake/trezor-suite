import styled from 'styled-components';

import { NetworkSymbol } from '@suite-common/wallet-config';
import { isTestnet } from '@suite-common/wallet-utils';
import { CoinLogo, H1, H3, Icon, useTheme } from '@trezor/components';

import { Account } from 'src/types/wallet';
import {
    Ticker,
    FiatValue,
    AccountLabeling,
    AppNavigationPanel,
    FormattedCryptoAmount,
    MetadataLabeling,
    AmountUnitSwitchWrapper,
    SkeletonCircle,
    SkeletonRectangle,
    SkeletonStack,
    StakeAmountWrapper,
} from 'src/components/suite';
import { useSelector } from 'src/hooks/suite';
import { AccountNavigation } from './AccountNavigation';
import { selectLabelingDataForSelectedAccount } from 'src/reducers/suite/metadataReducer';
import { STAKE_SYMBOLS } from 'src/constants/suite/staking';
import { selectSelectedAccountAutocompoundBalance } from 'src/reducers/wallet/selectedAccountReducer';

const Balance = styled(H1)`
    height: 32px;
    white-space: nowrap;
    margin-left: 8px;
`;

const FiatBalanceWrapper = styled(H3)`
    height: 24px;
    color: ${({ theme }) => theme.TYPE_LIGHT_GREY};
    margin-left: 1ch;
`;

const AmountsWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

interface AccountTopPanelSkeletonProps {
    animate?: boolean;
    account?: Account;
    symbol?: NetworkSymbol;
}

const AccountTopPanelSkeleton = ({ animate, account, symbol }: AccountTopPanelSkeletonProps) => (
    <AppNavigationPanel
        maxWidth="small"
        title={
            account ? (
                <AccountLabeling account={account} />
            ) : (
                <SkeletonRectangle width="260px" height="34px" animate={animate} />
            )
        }
        navigation={<AccountNavigation />}
    >
        <SkeletonStack alignItems="center">
            {symbol ? <CoinLogo size={24} symbol={symbol} /> : <SkeletonCircle size="24px" />}

            <Balance noMargin>
                <SkeletonRectangle width="160px" height="32px" animate={animate} />
            </Balance>
        </SkeletonStack>
    </AppNavigationPanel>
);

export const AccountTopPanel = () => {
    const theme = useTheme();
    const { account, loader, status } = useSelector(state => state.wallet.selectedAccount);
    const selectedAccountLabels = useSelector(selectLabelingDataForSelectedAccount);
    const autocompoundBalance = useSelector(selectSelectedAccountAutocompoundBalance);

    if (status !== 'loaded' || !account) {
        return (
            <AccountTopPanelSkeleton
                animate={loader === 'account-loading'}
                account={account}
                symbol={account?.symbol}
            />
        );
    }

    const { symbol, formattedBalance } = account;
    const isStakeShown = STAKE_SYMBOLS.includes(symbol);

    return (
        <AppNavigationPanel
            maxWidth="small"
            title={
                <MetadataLabeling
                    defaultVisibleValue={<AccountLabeling account={account} />}
                    payload={{
                        type: 'accountLabel',
                        entityKey: account.key,
                        defaultValue: account.path,
                        value: selectedAccountLabels.accountLabel,
                    }}
                />
            }
            navigation={<AccountNavigation />}
            titleContent={() =>
                !isTestnet(symbol) ? <Ticker symbol={symbol} tooltipPos="bottom" /> : undefined
            }
        >
            <AmountsWrapper>
                <AmountUnitSwitchWrapper symbol={symbol}>
                    <CoinLogo size={24} symbol={symbol} />

                    <Balance noMargin>
                        <FormattedCryptoAmount value={formattedBalance} symbol={symbol} />
                    </Balance>

                    <FiatValue
                        amount={account.formattedBalance}
                        symbol={symbol}
                        showApproximationIndicator
                    >
                        {({ value }) =>
                            value ? <FiatBalanceWrapper noMargin>{value}</FiatBalanceWrapper> : null
                        }
                    </FiatValue>
                </AmountUnitSwitchWrapper>

                {isStakeShown && (
                    <StakeAmountWrapper>
                        <Icon icon="PIGGY_BANK" color={theme.TYPE_DARK_GREY} size={24} />

                        <Balance noMargin>
                            <FormattedCryptoAmount value={autocompoundBalance} symbol={symbol} />
                        </Balance>

                        <FiatValue
                            amount={autocompoundBalance}
                            symbol={symbol}
                            showApproximationIndicator
                        >
                            {({ value }) =>
                                value ? (
                                    <FiatBalanceWrapper noMargin>{value}</FiatBalanceWrapper>
                                ) : null
                            }
                        </FiatValue>
                    </StakeAmountWrapper>
                )}
            </AmountsWrapper>
        </AppNavigationPanel>
    );
};
