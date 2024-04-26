import { Button, Icon, variables, Warning } from '@trezor/components';
import { Translation } from 'src/components/suite';
import styled, { useTheme } from 'styled-components';
import { spacingsPx } from '@trezor/theme';
import { useDispatch, useSelector } from '../../../../../../hooks/suite';
import { selectSuiteFlags } from '../../../../../../reducers/suite/suiteReducer';
import { setFlag } from '../../../../../../actions/suite/suiteActions';

const StyledWarning = styled(Warning)`
    justify-content: space-between;
    font-weight: ${variables.FONT_WEIGHT.BOLD};
    font-size: ${variables.FONT_SIZE.NORMAL};
`;

const FlexRow = styled.div`
    display: flex;
    align-content: space-between;
    gap: ${spacingsPx.sm};
`;

interface InstantStakeBannerProps {
    instantlyStakedAmount: number;
    symbol?: string;
    daysToAddToPool?: number;
    remainingAmount?: number;
}

export const InstantStakeBanner = ({
    daysToAddToPool,
    instantlyStakedAmount,
    remainingAmount,
    symbol,
}: InstantStakeBannerProps) => {
    const theme = useTheme();
    const { instantStakeBannerClosed } = useSelector(selectSuiteFlags);
    const dispatch = useDispatch();

    const closeBanner = () => {
        dispatch(setFlag('instantStakeBannerClosed', true));
    };

    if (instantStakeBannerClosed) return null;

    return (
        <StyledWarning variant="info">
            <FlexRow>
                <Icon icon="LIGHTNING" size={24} color={theme.iconAlertBlue} />
                {daysToAddToPool && daysToAddToPool > 0 ? (
                    <Translation
                        id="TR_STAKE_INSTANTLY_STAKED_WITH_DAYS"
                        values={{
                            stakedAmount: instantlyStakedAmount,
                            remainingAmount,
                            symbol,
                            days: daysToAddToPool,
                        }}
                    />
                ) : (
                    <Translation
                        id="TR_STAKE_INSTANTLY_STAKED"
                        values={{
                            amount: instantlyStakedAmount,
                            symbol,
                        }}
                    />
                )}
            </FlexRow>

            <Button variant="tertiary" onClick={closeBanner}>
                <Translation id="TR_GOT_IT" />
            </Button>
        </StyledWarning>
    );
};
