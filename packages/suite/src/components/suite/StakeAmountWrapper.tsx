import { ReactNode } from 'react';
import styled from 'styled-components';
import { Tooltip, TOOLTIP_DELAY_LONG } from '@trezor/components';
import { mediaQueries } from '@trezor/styles';
import { Translation } from './Translation';
import { goto } from 'src/actions/suite/routerActions';
import { useDispatch } from 'src/hooks/suite';

const Container = styled.div`
    position: relative;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    margin: -2px -12px;
    padding: 2px 12px;
    border-radius: 6px;
    transition: background 0.1s ease-in;
    cursor: pointer;

    ${mediaQueries.hover} {
        :hover {
            background: ${({ theme }) => theme.BG_GREY};
        }
    }
`;

interface StakeAmountWrapperProps {
    children: ReactNode;
}

export const StakeAmountWrapper = ({ children }: StakeAmountWrapperProps) => {
    const dispatch = useDispatch();
    const goToStakingTab = () => dispatch(goto('wallet-staking', { preserveParams: true }));

    return (
        <Tooltip
            cursor="default"
            maxWidth={200}
            delayShow={0}
            delayHide={TOOLTIP_DELAY_LONG}
            placement="top"
            interactive={false}
            hideOnClick={false}
            content={<Translation id="TR_STAKE_STAKED_AMOUNT" />}
        >
            <Container onClick={goToStakingTab}>{children}</Container>
        </Tooltip>
    );
};
