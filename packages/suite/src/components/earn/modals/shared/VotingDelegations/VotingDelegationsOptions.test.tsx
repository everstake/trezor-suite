import '@suite-common/test-utils/globalOverrides';

import { type UnknownAction } from '@reduxjs/toolkit';
import { fireEvent, screen } from '@testing-library/react';

import { configureMockStore } from '@suite-common/test-utils';
import { asNetworkSymbol } from '@suite-common/wallet-config';
import { stakeActions, stakeInitialState } from '@suite-common/wallet-core';
import { type Account, type AccountKey } from '@suite-common/wallet-types';

import { renderWithProviders } from 'src/support/test-utils/hooksHelper';

import { VotingDelegationsOptions } from './VotingDelegationsOptions';
import { mockInitialAppState } from '../../../../../../mocks/mockInitialAppState';

jest.mock('@suite/intl', () => ({
    ...jest.requireActual('@suite/intl'),
    Translation: ({ id }: { id: string }) => <span>{id}</span>,
}));

const LEGACY_SCRIPT_DREP_ID = 'drep_script1g2d3y3skgr806wj2ryhhc5ca3akx6vmppde87jq7kgknj5wf0ec';
const CIP129_SCRIPT_DREP_ID = 'drep1ydpfkyjxzeqvalf6fgvj7lznrk8kcmfnvy9hyl6gr6ez6wgsjaelx';

const ACCOUNT_KEY = 'ada-account-key' as AccountKey;

const cardanoAccount = {
    key: ACCOUNT_KEY,
    index: 0,
    symbol: asNetworkSymbol('ada'),
    networkType: 'cardano',
} as unknown as Account;

const votingDelegationReducer = (state: any, action: UnknownAction) => {
    if (!stakeActions.setAccountVotingDelegation.match(action)) return state;

    return {
        ...state,
        wallet: {
            ...state.wallet,
            stake: { ...state.wallet.stake, votingDelegation: action.payload },
        },
    };
};

const renderDrepIdInput = () => {
    const store = configureMockStore({
        extra: undefined,
        reducer: votingDelegationReducer,
        preloadedState: {
            ...mockInitialAppState,
            wallet: {
                ...mockInitialAppState.wallet,
                stake: {
                    ...stakeInitialState,
                    votingDelegation: {
                        accountKey: ACCOUNT_KEY,
                        option: { type: 'another_drep', drepId: '' },
                    },
                },
            },
        },
        serializableCheck: { ignoredActions: [] },
    });

    renderWithProviders(store, {}, <VotingDelegationsOptions account={cardanoAccount} />);

    return screen.getByRole('textbox');
};

describe('VotingDelegationsOptions', () => {
    it('rewrites a legacy DRep id to its CIP-129 form and says so', () => {
        const input = renderDrepIdInput();

        fireEvent.change(input, { target: { value: LEGACY_SCRIPT_DREP_ID } });

        expect(input).toHaveValue(CIP129_SCRIPT_DREP_ID);
        expect(screen.getByText('TR_STAKING_DREP_ID_CONVERTED')).toBeInTheDocument();
    });

    it('keeps an id that is already CIP-129 and shows no notice', () => {
        const input = renderDrepIdInput();

        fireEvent.change(input, { target: { value: CIP129_SCRIPT_DREP_ID } });

        expect(input).toHaveValue(CIP129_SCRIPT_DREP_ID);
        expect(screen.queryByText('TR_STAKING_DREP_ID_CONVERTED')).not.toBeInTheDocument();
    });

    it('drops the notice once the converted id is edited again', () => {
        const input = renderDrepIdInput();

        fireEvent.change(input, { target: { value: LEGACY_SCRIPT_DREP_ID } });
        fireEvent.change(input, { target: { value: `${CIP129_SCRIPT_DREP_ID}x` } });

        expect(screen.queryByText('TR_STAKING_DREP_ID_CONVERTED')).not.toBeInTheDocument();
        expect(screen.getByText('TR_STAKING_INVALID_DREP_ID')).toBeInTheDocument();
    });

    it('reports a value that is not a DRep id as invalid', () => {
        const input = renderDrepIdInput();

        fireEvent.change(input, { target: { value: 'not-a-drep' } });

        expect(input).toHaveValue('not-a-drep');
        expect(screen.getByText('TR_STAKING_INVALID_DREP_ID')).toBeInTheDocument();
    });
});
