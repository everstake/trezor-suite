import { D } from '@mobily/ts-belt';

import { NetworkSymbol } from '@suite-common/wallet-config';
import { GeneralPrecomposedLevels } from '@suite-common/wallet-types';
import { Card, VStack } from '@suite-native/atoms';

import { FeeOption } from './FeeOption';
import { NativeSupportedFeeLevel } from '../types';

export const FeeOptionsList = ({
    feeLevels,
    networkSymbol,
}: {
    feeLevels: GeneralPrecomposedLevels;
    networkSymbol: NetworkSymbol;
}) => {
    // Remove custom fee level from the list. It is not supported in the first version of the send flow.
    const predefinedFeeLevels = D.filterWithKey(feeLevels, key => key !== 'custom');

    return (
        <Card>
            <VStack spacing="extraLarge">
                {Object.entries(predefinedFeeLevels).map(([feeKey, feeLevel]) => (
                    <FeeOption
                        key={feeKey}
                        feeKey={feeKey as NativeSupportedFeeLevel}
                        feeLevel={feeLevel}
                        networkSymbol={networkSymbol}
                    />
                ))}
            </VStack>
        </Card>
    );
};