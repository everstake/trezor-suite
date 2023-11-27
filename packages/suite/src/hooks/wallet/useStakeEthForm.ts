import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import BigNumber from 'bignumber.js';
import useDebounce from 'react-use/lib/useDebounce';

import { fromFiatCurrency, getFeeLevels, toFiatCurrency } from '@suite-common/wallet-utils';
import { isChanged } from '@suite-common/suite-utils';

import { useDispatch, useSelector, useTranslation } from 'src/hooks/suite';
import { saveComposedTransactionInfo } from 'src/actions/wallet/coinmarket/coinmarketCommonActions';
import {
    StakeEthFormState,
    UseStakeEthFormProps,
    StakeEthContextValues,
    FIAT_INPUT,
    CRYPTO_INPUT,
    OUTPUT_AMOUNT,
} from 'src/types/wallet/stakeEthForm';
import { mapTestnetSymbol } from 'src/utils/wallet/coinmarket/coinmarketUtils';
import { useFormDraft } from './useFormDraft';
import { AmountLimits } from 'src/types/wallet/coinmarketCommonTypes';

import { fromWei } from 'web3-utils';
import { useStakeEthFormDefaultValues } from './useStakeEthFormDefaultValues';
import { useCompose } from './form/useCompose';
import {
    MIN_ETH_AMOUNT_FOR_STAKING,
    MIN_ETH_FOR_WITHDRAWALS,
} from 'src/constants/suite/ethStaking';
import { selectLocalCurrency } from 'src/reducers/wallet/settingsReducer';

export const StakeEthFormContext = createContext<StakeEthContextValues | null>(null);
StakeEthFormContext.displayName = 'StakeEthFormContext';

export const useStakeEthForm = ({
    selectedAccount,
}: UseStakeEthFormProps): StakeEthContextValues => {
    const dispatch = useDispatch();

    const fiat = useSelector(state => state.wallet.fiat);
    const localCurrency = useSelector(selectLocalCurrency);
    const fees = useSelector(state => state.wallet.fees);

    const { account, network } = selectedAccount;
    const { symbol } = account;

    const symbolForFiat = mapTestnetSymbol(symbol);
    const fiatRates = fiat.coins.find(item => item.symbol === symbolForFiat);
    // TODO: Implement fee switcher
    const selectedFee = 'normal';

    const amountLimits: AmountLimits = {
        currency: symbol,
        minCrypto: MIN_ETH_AMOUNT_FOR_STAKING.toNumber(),
        maxCrypto: Number(account.formattedBalance),
    };

    const { saveDraft, getDraft, removeDraft } = useFormDraft<StakeEthFormState>('stake-eth');
    const draft = getDraft(account.key);
    const isDraft = !!draft;

    // TODO: Test address. Remove when not needed
    const to = '0x057f0F0ba2e2f818c6fD4CA4A235F068495B6654';
    const { defaultValues } = useStakeEthFormDefaultValues(to);

    const state = useMemo(() => {
        const coinFees = fees[account.symbol];
        const levels = getFeeLevels(account.networkType, coinFees);
        const feeInfo = { ...coinFees, levels };

        return {
            account,
            network,
            feeInfo,
            formValues: defaultValues,
        };
    }, [account, defaultValues, fees, network]);

    const methods = useForm<StakeEthFormState>({
        mode: 'onChange',
        defaultValues: isDraft ? draft : defaultValues,
    });

    const { register, control, formState, setValue, reset, clearErrors, getValues, setError } =
        methods;

    const values = useWatch<StakeEthFormState>({ control });

    useEffect(() => {
        if (!isChanged(defaultValues, values)) {
            removeDraft(account.key);
        }
    }, [defaultValues, values, removeDraft, account.key]);

    // react-hook-form auto register custom form fields (without HTMLElement)
    useEffect(() => {
        register('outputs');
        register('setMaxOutputId');
    }, [register]);

    // react-hook-form reset, set default values
    useEffect(() => {
        if (!isDraft && defaultValues) {
            reset(defaultValues);
        }
    }, [reset, isDraft, defaultValues]);

    const {
        isLoading: isComposing,
        composeRequest,
        composedLevels,
    } = useCompose({
        ...methods,
        state,
    });

    useDebounce(
        () => {
            if (
                formState.isDirty &&
                !formState.isValidating &&
                Object.keys(formState.errors).length === 0 &&
                !isComposing
            ) {
                saveDraft(selectedAccount.account.key, values as StakeEthFormState);
            }
        },
        200,
        [
            saveDraft,
            selectedAccount.account.key,
            values,
            formState.errors,
            formState.isDirty,
            formState.isValidating,
            isComposing,
        ],
    );

    const [isAmountForWithdrawalWarningShown, setIsAmountForWithdrawalWarningShown] =
        useState(false);
    const [isAdviceForWithdrawalWarningShown, setIsAdviceForWithdrawalWarningShown] =
        useState(false);

    // TODO: Add more extra fee to ensure tx success when staking logic is implemented
    const composedFee = useMemo(() => {
        const transactionInfo = composedLevels?.[selectedFee];
        return transactionInfo !== undefined && transactionInfo.type !== 'error'
            ? new BigNumber(fromWei(transactionInfo.fee))
            : new BigNumber('0');
    }, [composedLevels]);

    const shouldShowAdvice = useCallback(
        (amount: string, formattedBalance: string) => {
            const cryptoValue = new BigNumber(amount);
            const balance = new BigNumber(formattedBalance);
            const balanceMinusFee = balance.minus(composedFee);

            if (
                cryptoValue.gt(balanceMinusFee.minus(MIN_ETH_FOR_WITHDRAWALS)) &&
                cryptoValue.lt(balanceMinusFee) &&
                cryptoValue.gt(MIN_ETH_AMOUNT_FOR_STAKING)
            ) {
                setIsAdviceForWithdrawalWarningShown(true);
            }
        },
        [composedFee],
    );

    const onCryptoAmountChange = useCallback(
        async (amount: string) => {
            setIsAmountForWithdrawalWarningShown(false);
            setIsAdviceForWithdrawalWarningShown(false);
            if (!fiatRates || !fiatRates.current) return;

            const fiatValue = toFiatCurrency(amount, localCurrency, fiatRates.current.rates);
            setValue('setMaxOutputId', undefined, { shouldDirty: true });
            setValue(FIAT_INPUT, fiatValue || '', { shouldValidate: true });
            setValue(OUTPUT_AMOUNT, amount || '', { shouldDirty: true });
            await composeRequest(CRYPTO_INPUT);

            shouldShowAdvice(amount, account.formattedBalance);
        },
        [
            account.formattedBalance,
            composeRequest,
            fiatRates,
            localCurrency,
            setValue,
            shouldShowAdvice,
        ],
    );

    const onFiatAmountChange = useCallback(
        async (amount: string) => {
            setValue('setMaxOutputId', undefined, { shouldDirty: true });
            setIsAmountForWithdrawalWarningShown(false);
            setIsAdviceForWithdrawalWarningShown(false);
            if (!fiatRates || !fiatRates.current) return;

            const cryptoValue = fromFiatCurrency(
                amount,
                localCurrency,
                fiatRates.current.rates,
                network.decimals,
            );
            setValue(CRYPTO_INPUT, cryptoValue || '', { shouldDirty: true, shouldValidate: true });
            setValue(OUTPUT_AMOUNT, cryptoValue || '', {
                shouldDirty: true,
            });
            await composeRequest(FIAT_INPUT);

            shouldShowAdvice(cryptoValue || '', account.formattedBalance);
        },
        [
            account.formattedBalance,
            composeRequest,
            fiatRates,
            localCurrency,
            network.decimals,
            setValue,
            shouldShowAdvice,
        ],
    );

    const setRatioAmount = useCallback(
        async (divisor: number) => {
            setValue('setMaxOutputId', undefined, { shouldDirty: true });
            clearErrors([FIAT_INPUT, CRYPTO_INPUT]);
            setIsAmountForWithdrawalWarningShown(false);
            setIsAdviceForWithdrawalWarningShown(false);

            const amount = new BigNumber(account.formattedBalance)
                .dividedBy(divisor)
                .decimalPlaces(network.decimals)
                .toString();

            await onCryptoAmountChange(amount);
            setValue(CRYPTO_INPUT, amount, { shouldDirty: true, shouldValidate: true });
        },
        [account.formattedBalance, clearErrors, network.decimals, onCryptoAmountChange, setValue],
    );

    const setMax = useCallback(async () => {
        setIsAdviceForWithdrawalWarningShown(false);
        setValue('setMaxOutputId', 0, { shouldDirty: true });
        clearErrors([FIAT_INPUT, CRYPTO_INPUT]);
        await composeRequest(CRYPTO_INPUT);
        setIsAmountForWithdrawalWarningShown(true);
    }, [clearErrors, composeRequest, setValue]);

    const clearForm = useCallback(async () => {
        removeDraft(account.key);
        reset(defaultValues);
        await composeRequest(CRYPTO_INPUT);
        setIsAdviceForWithdrawalWarningShown(false);
        setIsAmountForWithdrawalWarningShown(false);
    }, [account.key, composeRequest, defaultValues, removeDraft, reset]);

    const { translationString } = useTranslation();
    useEffect(() => {
        if (!composedLevels) return;
        const values = getValues();
        const { setMaxOutputId } = values;
        const selectedFeeLevel = selectedFee;
        const composed = composedLevels[selectedFeeLevel];
        if (!composed) return;

        if (composed.type === 'final') {
            if (typeof setMaxOutputId === 'number' && composed.max) {
                const max = new BigNumber(composed.max).minus(MIN_ETH_FOR_WITHDRAWALS).toString();

                setValue(CRYPTO_INPUT, max, { shouldValidate: true, shouldDirty: true });
                clearErrors(CRYPTO_INPUT);

                const fiatValue =
                    fiatRates && fiatRates.current
                        ? toFiatCurrency(max, localCurrency, fiatRates.current.rates)
                        : '';
                setValue(FIAT_INPUT, fiatValue || '', { shouldValidate: true, shouldDirty: true });
            }

            dispatch(saveComposedTransactionInfo({ selectedFee: selectedFeeLevel, composed }));
            setValue('estimatedFeeLimit', composed.estimatedFeeLimit, { shouldDirty: true });
        }
    }, [
        clearErrors,
        composedLevels,
        dispatch,
        getValues,
        setError,
        setValue,
        selectedFee,
        translationString,
        fiatRates,
        localCurrency,
        composedFee,
        account.formattedBalance,
    ]);

    const onSubmit = () => {
        const formValues = methods.getValues();
        const fiatStringAmount = formValues.fiatInput;
        const cryptoStringAmount = formValues.cryptoInput;

        const payload = {
            fiatStringAmount,
            cryptoStringAmount,
        };

        console.log(payload);
    };

    return {
        ...methods,
        onSubmit,
        account,
        network,
        cryptoInputValue: values.cryptoInput,
        removeDraft,
        formState,
        isDraft,
        register,
        amountLimits,
        onCryptoAmountChange,
        onFiatAmountChange,
        localCurrency,
        composedLevels,
        isComposing,
        setMax,
        setRatioAmount,
        isAmountForWithdrawalWarningShown,
        isAdviceForWithdrawalWarningShown,
        selectedFee,
        clearForm,
    };
};

export const useStakeEthFormContext = () => {
    const ctx = useContext(StakeEthFormContext);
    if (ctx === null) throw Error('useStakeEthFormContext used without Context');
    return ctx;
};
