import styled from 'styled-components';
import { Button } from '@trezor/components';
import { isZero } from '@suite-common/wallet-utils';
import { Translation } from 'src/components/suite';
import { useStakeEthFormContext } from 'src/hooks/wallet/useStakeEthForm';
import { AvailableBalance } from '../AvailableBalance';
import { FormFractionButtons } from 'src/components/suite/FormFractionButtons';
import { Inputs } from './Inputs';
import { Fees } from './Fees';
import { ConfirmStakeEthModal } from './ConfirmStakeEthModal';

const Body = styled.div`
    margin-bottom: 26px;
`;

const InputsWrapper = styled.div`
    margin-top: 16px;
    margin-bottom: 22px;
`;

const ButtonsWrapper = styled.div`
    margin-top: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
`;

export const StakeEthForm = () => {
    const {
        account,
        onSubmit,
        handleSubmit,
        formState: { errors, isSubmitting, isDirty },
        isComposing,
        setRatioAmount,
        setMax,
        watch,
        clearForm,
        isConfirmModalOpen,
        closeConfirmModal,
        signTx,
    } = useStakeEthFormContext();
    const { formattedBalance, symbol } = account;
    const hasValues = Boolean(watch('fiatInput') || watch('cryptoInput'));
    // used instead of formState.isValid, which is sometimes returning false even if there are no errors
    const formIsValid = Object.keys(errors).length === 0;
    const areFractionButtonsDisabled = isZero(account.formattedBalance);

    return (
        <>
            {isConfirmModalOpen && (
                <ConfirmStakeEthModal onConfirm={signTx} onCancel={closeConfirmModal} />
            )}

            <form onSubmit={handleSubmit(onSubmit)}>
                <Body>
                    <AvailableBalance formattedBalance={formattedBalance} symbol={symbol} />

                    <ButtonsWrapper>
                        <FormFractionButtons
                            isDisabled={areFractionButtonsDisabled}
                            setRatioAmount={setRatioAmount}
                            setMax={setMax}
                        />

                        {isDirty && (
                            <Button type="button" variant="tertiary" onClick={clearForm}>
                                <Translation id="TR_CLEAR_ALL" />
                            </Button>
                        )}
                    </ButtonsWrapper>

                    <InputsWrapper>
                        <Inputs />
                    </InputsWrapper>

                    <Fees />
                </Body>

                <Button
                    fullWidth
                    isDisabled={!(formIsValid && hasValues) || isSubmitting}
                    isLoading={isComposing || isSubmitting}
                    onClick={handleSubmit(onSubmit)}
                >
                    <Translation id="TR_CONTINUE" />
                </Button>
            </form>
        </>
    );
};
