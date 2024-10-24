import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { CommonActions, useNavigation } from '@react-navigation/core';
import { FlashList } from '@shopify/flash-list';

import {
    selectFilterKnownTokens,
    TokenDefinitionsRootState,
} from '@suite-common/token-definitions';
import { networks, NetworkSymbol } from '@suite-common/wallet-config';
import {
    AccountsRootState,
    PORTFOLIO_TRACKER_DEVICE_STATE,
    selectAccountsByNetworkAndDeviceState,
} from '@suite-common/wallet-core';
import { TokenAddress, TokenSymbol } from '@suite-common/wallet-types';
import { AccountFormValues, useAccountLabelForm } from '@suite-native/accounts';
import { analytics, EventType } from '@suite-native/analytics';
import { Box, Button, Divider, Text } from '@suite-native/atoms';
import { Form } from '@suite-native/forms';
import {
    AccountsImportStackParamList,
    AccountsImportStackRoutes,
    HomeStackRoutes,
    RootStackParamList,
    RootStackRoutes,
    StackToStackCompositeNavigationProps,
} from '@suite-native/navigation';
import { AccountInfo, TokenInfo } from '@trezor/connect';
import { prepareNativeStyle, useNativeStyles } from '@trezor/styles';

import { importAccountThunk } from '../accountsImportThunks';
import { useShowImportError } from '../useShowImportError';
import { AccountImportOverview } from './AccountImportOverview';
import { TokenInfoCard } from './TokenInfoCard';

type AccountImportSummaryFormProps = {
    networkSymbol: NetworkSymbol;
    accountInfo: AccountInfo;
};

type NavigationProp = StackToStackCompositeNavigationProps<
    AccountsImportStackParamList,
    AccountsImportStackRoutes.AccountImportLoading,
    RootStackParamList
>;

const confirmButtonStyle = prepareNativeStyle(utils => ({
    marginBottom: utils.spacings.sp8,
}));

export const AccountImportSummaryForm = ({
    networkSymbol,
    accountInfo,
}: AccountImportSummaryFormProps) => {
    const dispatch = useDispatch();
    const { applyStyle } = useNativeStyles();
    const navigation = useNavigation<NavigationProp>();
    const showImportError = useShowImportError(networkSymbol, navigation);

    const knownTokens = useSelector((state: TokenDefinitionsRootState) =>
        selectFilterKnownTokens(state, networkSymbol, accountInfo.tokens ?? []),
    );

    const deviceNetworkAccounts = useSelector((state: AccountsRootState) =>
        selectAccountsByNetworkAndDeviceState(state, PORTFOLIO_TRACKER_DEVICE_STATE, networkSymbol),
    );

    const defaultAccountLabel = `${networks[networkSymbol].name} #${
        deviceNetworkAccounts.length + 1
    }`;

    const form = useAccountLabelForm(defaultAccountLabel);
    const {
        handleSubmit,
        formState: { errors },
    } = form;

    const handleImportAccount = handleSubmit(async ({ accountLabel }: AccountFormValues) => {
        try {
            await dispatch(
                importAccountThunk({
                    accountInfo,
                    accountLabel,
                    coin: networkSymbol,
                }),
            ).unwrap();

            analytics.report({
                type: EventType.AssetsSync,
                payload: {
                    assetSymbol: networkSymbol,
                    tokenSymbols: knownTokens.map(token => token.symbol as TokenSymbol),
                    tokenAddresses: knownTokens.map(token => token.contract as TokenAddress),
                },
            });

            navigation.dispatch(
                CommonActions.reset({
                    index: 0,
                    routes: [
                        {
                            name: RootStackRoutes.AppTabs,
                            params: {
                                screen: HomeStackRoutes.Home,
                            },
                        },
                    ],
                }),
            );
        } catch {
            showImportError();
        }
    });

    const renderItem = useCallback(
        ({ item }: { item: TokenInfo }) => (
            <Box marginBottom="sp8">
                <TokenInfoCard
                    networkSymbol={networkSymbol}
                    symbol={item.symbol as TokenSymbol}
                    balance={item.balance}
                    decimals={item.decimals}
                    name={item.name}
                    contract={item.contract as TokenAddress}
                />
            </Box>
        ),
        [networkSymbol],
    );

    return (
        <Form form={form}>
            <FlashList
                data={knownTokens}
                renderItem={renderItem}
                ListEmptyComponent={null}
                ListHeaderComponent={
                    <>
                        <AccountImportOverview
                            balance={accountInfo.availableBalance}
                            networkSymbol={networkSymbol}
                        />
                        {knownTokens.length > 0 && (
                            <Box marginTop="sp16" marginBottom="sp8">
                                <Text variant="titleSmall">Tokens: </Text>
                            </Box>
                        )}
                    </>
                }
                ListFooterComponent={
                    <>
                        <Divider marginHorizontal="sp32" marginTop="sp24" />
                        <Box marginHorizontal="sp16" marginTop="sp24">
                            <Button
                                testID="@account-import/coin-synced/confirm-button"
                                onPress={handleImportAccount}
                                size="large"
                                style={applyStyle(confirmButtonStyle)}
                                isDisabled={!!errors.accountLabel}
                            >
                                Confirm
                            </Button>
                        </Box>
                    </>
                }
                estimatedItemSize={115}
            />
        </Form>
    );
};
