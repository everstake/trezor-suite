import { type Account } from '@suite-common/wallet-types';
import { mockAccountKey } from '@suite-common/wallet-types/mocks';
import { Form, useForm } from '@suite-native/forms';
import {
    renderHookWithStoreProvider,
    renderWithStoreProvider,
} from '@suite-native/test-utils-store';

import { type EarnFormValues, earnFormValidationSchema } from '../earnFormSchema';
import { EarnMaxButton } from './EarnMaxButton';

const SOL_DESCRIPTOR = 'ETxHeBBcuw9Yu4dGuP3oXrD12V5RECvmi8ogQ9PkjyVF';
const SOL_ACCOUNT_KEY = mockAccountKey({ symbol: 'sol', descriptor: SOL_DESCRIPTOR });

// Lamports, so 5 SOL of available balance. Staking max keeps the 0.02 SOL withdrawal reserve.
const AVAILABLE_BALANCE = '5000000000';
const MAX_AMOUNT = '4.98';

const solAccount = {
    key: SOL_ACCOUNT_KEY,
    descriptor: SOL_DESCRIPTOR,
    symbol: 'sol',
    networkType: 'solana',
    availableBalance: AVAILABLE_BALANCE,
    formattedBalance: '5',
    misc: {},
} as unknown as Account;

type RenderMaxButtonParams = {
    amount: string;
    isChecked: boolean;
};

const renderMaxButton = ({ amount, isChecked }: RenderMaxButtonParams) => {
    const onChange = jest.fn();
    const preloadedState = { wallet: { accounts: [solAccount] } };

    const { result } = renderHookWithStoreProvider(
        () =>
            useForm<EarnFormValues>({
                validation: earnFormValidationSchema,
                mode: 'onTouched',
                defaultValues: { amount, fiat: '' },
            }),
        { preloadedState },
    );

    renderWithStoreProvider(
        <EarnMaxButton
            accountKey={SOL_ACCOUNT_KEY}
            symbol="sol"
            isChecked={isChecked}
            onChange={onChange}
        />,
        {
            preloadedState,
            wrapper: ({ children }) => <Form form={result.current}>{children}</Form>,
        },
    );

    return { onChange };
};

describe('EarnMaxButton', () => {
    it('stays checked while the amount is the max amount', () => {
        const { onChange } = renderMaxButton({ amount: MAX_AMOUNT, isChecked: true });

        expect(onChange).not.toHaveBeenCalled();
    });

    it('unchecks itself when something else rewrites the amount', () => {
        const { onChange } = renderMaxButton({ amount: '1', isChecked: true });

        expect(onChange).toHaveBeenCalledWith(false);
    });

    it('unchecks itself when the amount is cleared', () => {
        const { onChange } = renderMaxButton({ amount: '', isChecked: true });

        expect(onChange).toHaveBeenCalledWith(false);
    });

    it('leaves an unchecked switch alone', () => {
        const { onChange } = renderMaxButton({ amount: '1', isChecked: false });

        expect(onChange).not.toHaveBeenCalled();
    });
});
