import '@suite-common/test-utils/globalOverrides';

import { screen } from '@testing-library/react';

import { configureMockStore } from '@suite-common/test-utils';
import { asNetworkSymbol } from '@suite-common/wallet-config';
import { CARDANO_EVERSTAKE_DREP } from '@suite-common/wallet-constants';
import { type Account } from '@suite-common/wallet-types';

import { renderWithProviders } from 'src/support/test-utils/hooksHelper';

import { CurrentDelegate } from './CurrentDelegate';
import { mockInitialAppState } from '../../../../../../../mocks/mockInitialAppState';

const EVERSTAKE_DREP_CIP105 = 'drep1ectemlv45xsnvenfgkhwsxncfvxev4qllj7x5w6vlfc7kmd9zcs';

const cardanoAccountVotingFor = (drepId: string): Account =>
    ({
        key: 'ada-account-key',
        index: 0,
        symbol: asNetworkSymbol('ada'),
        networkType: 'cardano',
        misc: { staking: { isActive: true, drep: { drep_id: drepId } } },
    }) as unknown as Account;

const renderCurrentDelegate = (drepId: string) => {
    const store = configureMockStore({
        extra: undefined,
        preloadedState: mockInitialAppState,
        serializableCheck: { ignoredActions: [] },
    });

    renderWithProviders(store, {}, <CurrentDelegate account={cardanoAccountVotingFor(drepId)} />);
};

describe('CurrentDelegate', () => {
    it.each([
        ['CIP-129', CARDANO_EVERSTAKE_DREP.bech32],
        ['legacy', EVERSTAKE_DREP_CIP105],
    ])('names the provider behind the Everstake DRep reported in its %s spelling', (_, drepId) => {
        renderCurrentDelegate(drepId);

        expect(screen.getByText('Everstake')).toBeInTheDocument();
        expect(screen.getByText(CARDANO_EVERSTAKE_DREP.bech32)).toBeInTheDocument();
    });

    it('passes through a DRep id that is not a convertible bech32', () => {
        renderCurrentDelegate('drep_always_abstain');

        expect(screen.getByText('drep_always_abstain')).toBeInTheDocument();
    });
});
