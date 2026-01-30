import { useEffect, useMemo, useState } from 'react';

import { selectSolanaWalletSdkNetwork } from '@suite-common/staking-solana';
import { selectBlockchainState } from '@suite-common/wallet-core';
import { Account } from '@suite-common/wallet-types';
import { getSolanaStakingData } from '@trezor/blockchain-link/src/workers/solana/utils/stakingAccounts';
import { SolanaStakingAccount } from '@trezor/blockchain-link-types/src/solana';

import { useSelector } from 'src/hooks/suite';

type useOutsideStakingDataParams = {
    account: Account;
};

export const useOutsideStakingData = ({ account }: useOutsideStakingDataParams) => {
    const blockchain = useSelector(selectBlockchainState);
    const selectedBlockchain = blockchain[account.symbol];

    const [stakingAccounts, setStakingAccounts] = useState<SolanaStakingAccount[]>();

    useEffect(() => {
        const url = selectedBlockchain?.url;
        if (account.networkType !== 'solana' || !url) return;

        let cancelled = false;

        (async () => {
            try {
                const { connection } = selectSolanaWalletSdkNetwork(account.symbol, url);

                const { epoch } = await connection.getEpochInfo().send();
                if (cancelled) return;

                const solEpoch = Number(epoch);
                const accounts = await getSolanaStakingData(
                    connection,
                    account.descriptor,
                    solEpoch,
                    'exclude',
                );

                setStakingAccounts(accounts);
            } catch {
                if (!cancelled) setStakingAccounts(undefined);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [account.descriptor, account.networkType, account.symbol, selectedBlockchain?.url]);

    const totalStaked = useMemo(() => {
        const totalLamports = (stakingAccounts ?? []).reduce(
            (sum, { stake }) => sum + BigInt(stake ?? '0'),
            0n,
        );

        return totalLamports.toString();
    }, [stakingAccounts]);

    const hasStakingAccounts = (stakingAccounts?.length ?? 0) > 0;

    return { hasStakingAccounts, totalStaked } as const;
};
