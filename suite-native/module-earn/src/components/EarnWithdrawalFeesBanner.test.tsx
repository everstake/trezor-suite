import { combineReducers } from '@reduxjs/toolkit';

import { extraDependenciesCommonMock } from '@suite-common/test-utils';
import { type Account, type PrecomposedTransactionFinal } from '@suite-common/wallet-types';
import { mockAccountKey } from '@suite-common/wallet-types/mocks';
import { Form, useForm } from '@suite-native/forms';
import { getTranslation } from '@suite-native/intl';
import {
    type TestStore,
    act,
    createLightStore,
    createStaticReducer,
    renderHookWithStoreProvider,
    renderWithStoreProvider,
} from '@suite-native/test-utils-store';
import {
    prepareSendFormReducer,
    transactionManagementActions,
} from '@suite-native/transaction-management';

import { type EarnFormValues, earnFormValidationSchema } from '../earnFormSchema';
import { EarnWithdrawalFeesBanner } from './EarnWithdrawalFeesBanner';

const SOL_DESCRIPTOR = 'ETxHeBBcuw9Yu4dGuP3oXrD12V5RECvmi8ogQ9PkjyVF';
const SOL_ACCOUNT_KEY = mockAccountKey({ symbol: 'sol', descriptor: SOL_DESCRIPTOR });

// Lamports, so 5 SOL of available balance and a 0.000005 SOL fee. Staking max on that balance
// leaves exactly the 0.02 SOL withdrawal reserve.
const AVAILABLE_BALANCE = '5000000000';
const MAX_AMOUNT = '4.98';
const FEE = '5000';

// A 0.001 SOL fee moves the reserve threshold far enough to tell a composed fee apart from a
// missing one: 4.9795 sits inside the reserve only while the fee is counted in.
const RECOMPOSE_FEE = '1000000';
const AMOUNT_COVERED_ONLY_WITH_FEE = '4.9795';

const buildSolAccount = (availableBalance = AVAILABLE_BALANCE): Account =>
    ({
        key: SOL_ACCOUNT_KEY,
        descriptor: SOL_DESCRIPTOR,
        symbol: 'sol',
        networkType: 'solana',
        availableBalance,
        formattedBalance: '5',
        misc: {},
    }) as unknown as Account;

const buildFeeLevel = (fee: string): PrecomposedTransactionFinal =>
    ({
        type: 'final',
        fee,
        totalSpent: '0',
        bytes: 0,
        inputs: [],
        outputs: [],
        outputsPermutation: [],
    }) as unknown as PrecomposedTransactionFinal;

// Static slices are enough to read from, but the recompose test has to dispatch into the send
// slice, so that one gets the real reducer.
const createStoreWithSendSlice = () =>
    createLightStore({
        reducer: {
            discreetMode: createStaticReducer({ isActive: false }),
            locale: createStaticReducer({ systemLocaleCode: 'en', appLocaleCode: 'system' }),
            wallet: combineReducers({
                settings: createStaticReducer({
                    localCurrency: 'usd',
                    bitcoinAmountUnit: 0,
                    addressDisplayType: 'chunked',
                }),
                accounts: createStaticReducer([buildSolAccount()]),
                formDrafts: createStaticReducer({}),
                send: prepareSendFormReducer(extraDependenciesCommonMock),
            }),
        },
    });

type RenderBannerParams = {
    amount: string;
    isMaxAmountSelected: boolean;
    availableBalance?: string;
    store?: TestStore;
};

const renderBanner = ({
    amount,
    isMaxAmountSelected,
    availableBalance,
    store,
}: RenderBannerParams) => {
    const preloadedState = {
        wallet: {
            accounts: [buildSolAccount(availableBalance)],
            formDrafts: {},
            send: { feeLevels: { normal: buildFeeLevel(FEE) } },
        },
    };

    const { result } = renderHookWithStoreProvider(
        () =>
            useForm<EarnFormValues>({
                validation: earnFormValidationSchema,
                mode: 'onTouched',
                defaultValues: { amount, fiat: '' },
            }),
        { preloadedState },
    );

    return renderWithStoreProvider(
        <EarnWithdrawalFeesBanner
            accountKey={SOL_ACCOUNT_KEY}
            symbol="sol"
            isMaxAmountSelected={isMaxAmountSelected}
        />,
        {
            preloadedState,
            store,
            wrapper: ({ children }) => <Form form={result.current}>{children}</Form>,
        },
    );
};

describe('EarnWithdrawalFeesBanner', () => {
    it('confirms the left-over reserve when the amount comes from staking max', () => {
        const { getByText } = renderBanner({ amount: MAX_AMOUNT, isMaxAmountSelected: true });

        expect(
            getByText(
                getTranslation('earn.earnFormScreen.withdrawalFeesReserveLeft', {
                    amount: '0.02',
                    displaySymbol: 'SOL',
                }),
            ),
        ).toBeTruthy();
    });

    it('reports a smaller left-over reserve when the balance is too small to reserve the full amount', () => {
        const { getByText } = renderBanner({
            amount: '1.005',
            isMaxAmountSelected: true,
            availableBalance: '1010000000',
        });

        expect(
            getByText(
                getTranslation('earn.earnFormScreen.withdrawalFeesSmallReserveLeft', {
                    displaySymbol: 'SOL',
                }),
            ),
        ).toBeTruthy();
    });

    it('recommends the reserve for a manually entered amount that eats into it', () => {
        const { getByText } = renderBanner({ amount: '4.99', isMaxAmountSelected: false });

        expect(
            getByText(
                getTranslation('earn.earnFormScreen.withdrawalFeesRecommendation', {
                    amount: '0.02',
                    displaySymbol: 'SOL',
                }),
            ),
        ).toBeTruthy();
    });

    it('renders nothing for a manually entered amount that leaves the reserve and the fee', () => {
        const { toJSON } = renderBanner({ amount: '4.9', isMaxAmountSelected: false });

        expect(toJSON()).toBeNull();
    });

    it('renders nothing when no amount is entered yet', () => {
        const { toJSON } = renderBanner({ amount: '', isMaxAmountSelected: false });

        expect(toJSON()).toBeNull();
    });

    it('renders nothing for an amount below the staking minimum, before it is validated', () => {
        const { toJSON } = renderBanner({
            amount: '0.999',
            isMaxAmountSelected: false,
            availableBalance: '1005000000',
        });

        expect(toJSON()).toBeNull();
    });

    it('keeps the last known fee while the transaction is being recomposed', () => {
        const store = createStoreWithSendSlice();
        store.dispatch(
            transactionManagementActions.storeFeeLevels({
                feeLevels: { normal: buildFeeLevel(RECOMPOSE_FEE) },
            }),
        );

        const { getByText } = renderBanner({
            amount: AMOUNT_COVERED_ONLY_WITH_FEE,
            isMaxAmountSelected: false,
            store,
        });

        const recommendation = getTranslation('earn.earnFormScreen.withdrawalFeesRecommendation', {
            amount: '0.02',
            displaySymbol: 'SOL',
        });

        expect(getByText(recommendation)).toBeTruthy();

        act(() => {
            store.dispatch(transactionManagementActions.storeFeeLevels({ feeLevels: {} }));
        });

        expect(getByText(recommendation)).toBeTruthy();
    });
});
