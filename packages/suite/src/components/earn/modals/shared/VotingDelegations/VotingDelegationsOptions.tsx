import React, { useState } from 'react';
import { useDispatch } from 'react-redux';

import { Translation, type TranslationKey, useTranslation } from '@suite/intl';
import {
    type VotingDelegationOption,
    selectVotingDelegationOption,
    stakeActions,
} from '@suite-common/wallet-core';
import { type Account } from '@suite-common/wallet-types';
import { convertDrepIdToCip129, validateCardanoDrep } from '@suite-common/wallet-utils';
import { Column, Icon, Input, Radio, Text } from '@trezor/components';
import { CheckIcon } from '@trezor/icons';

import { useSelector } from 'src/hooks/suite';

export const VOTING_OPTION_LABELS = {
    everstake: 'TR_STAKING_DELEGATE_TO_EVERSTAKE',
    another_drep: 'TR_STAKING_DELEGATE_TO_ANOTHER_DREP',
    current: 'TR_STAKING_KEEP_CURRENT_DELEGATION',
} as const satisfies Record<VotingDelegationOption['type'], TranslationKey>;

const VOTING_OPTION_KEYS = ['everstake', 'another_drep'] as const;

const VOTING_OPTION_KEYS_WITH_CURRENT = ['current', ...VOTING_OPTION_KEYS] as const;

export interface VotingDelegationsOptionsProps {
    account: Account;
    hasTitle?: boolean;
    hasKeepCurrentOption?: boolean;
}

export const VotingDelegationsOptions = ({
    account,
    hasTitle = false,
    hasKeepCurrentOption = false,
}: VotingDelegationsOptionsProps) => {
    const [convertedDrepId, setConvertedDrepId] = useState<string | null>(null);
    const dispatch = useDispatch();
    const { translationString } = useTranslation();
    const selectedVotingDelegation = useSelector(state =>
        selectVotingDelegationOption(state, account.key),
    );

    if (account.networkType !== 'cardano') return null;

    // Derived rather than kept in state: the store is the only place a DRep id lives, so a selection
    // cleared or seeded from elsewhere cannot leave a stale error behind.
    const hasError =
        selectedVotingDelegation.type === 'another_drep' &&
        selectedVotingDelegation.drepId !== '' &&
        !validateCardanoDrep(selectedVotingDelegation.drepId);

    const hasConvertedDrepId =
        selectedVotingDelegation.type === 'another_drep' &&
        convertedDrepId === selectedVotingDelegation.drepId;

    const handleOptionSelect = (type: VotingDelegationOption['type']) => {
        switch (type) {
            case 'everstake':
                dispatch(
                    stakeActions.setAccountVotingDelegation({
                        accountKey: account.key,
                        option: { type: 'everstake' },
                    }),
                );
                break;

            case 'another_drep':
                dispatch(
                    stakeActions.setAccountVotingDelegation({
                        accountKey: account.key,
                        option: { type: 'another_drep', drepId: '' },
                    }),
                );
                break;

            case 'current':
                dispatch(
                    stakeActions.setAccountVotingDelegation({
                        accountKey: account.key,
                        option: { type: 'current' },
                    }),
                );
                break;
        }
    };

    const handleDrepIdChange = (value: string) => {
        const cip129DrepId = convertDrepIdToCip129(value);

        setConvertedDrepId(cip129DrepId);

        dispatch(
            stakeActions.setAccountVotingDelegation({
                accountKey: account.key,
                option: { type: 'another_drep', drepId: cip129DrepId ?? value },
            }),
        );
    };

    const getDrepIdBottomText = () => {
        if (hasError) {
            return <Translation id="TR_STAKING_INVALID_DREP_ID" />;
        }

        if (hasConvertedDrepId) {
            return <Translation id="TR_STAKING_DREP_ID_CONVERTED" />;
        }

        return null;
    };

    const optionKeys = hasKeepCurrentOption ? VOTING_OPTION_KEYS_WITH_CURRENT : VOTING_OPTION_KEYS;

    return (
        <Column gap={8}>
            {hasTitle && (
                <Text intent="neutral" priority="secondary" typographyStyle="body-sm">
                    <Translation id="TR_STAKE_CHANGE_DELEGATE" />
                </Text>
            )}
            <Column gap={16} padding={8}>
                {optionKeys.map(key => (
                    <React.Fragment key={key}>
                        <Radio
                            isChecked={selectedVotingDelegation.type === key}
                            onChange={() => handleOptionSelect(key)}
                        >
                            <Translation id={VOTING_OPTION_LABELS[key]} />
                        </Radio>
                        {selectedVotingDelegation.type === 'another_drep' &&
                            key === 'another_drep' && (
                                <Input
                                    placeholder={translationString('TR_STAKING_DREP_ID')}
                                    value={selectedVotingDelegation.drepId}
                                    inputMode="text"
                                    hasError={hasError}
                                    bottomText={getDrepIdBottomText()}
                                    bottomTextIconComponent={
                                        hasConvertedDrepId ? (
                                            <Icon as={CheckIcon} size={16} isDisabled={true} />
                                        ) : undefined
                                    }
                                    onChange={e => handleDrepIdChange(e.target.value)}
                                />
                            )}
                    </React.Fragment>
                ))}
            </Column>
            <Text
                intent="neutral"
                priority="secondary"
                typographyStyle="body-sm"
                margin={{ top: 8 }}
            >
                <Translation id="TR_STAKING_DELEGATION_INFO_TEXT" />
            </Text>
        </Column>
    );
};
