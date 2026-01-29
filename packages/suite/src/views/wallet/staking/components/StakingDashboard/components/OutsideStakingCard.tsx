import { Translation } from '@suite/intl';
import { NetworkSymbol, getDisplaySymbol } from '@suite-common/wallet-config';
import { Card, Column, H3, IconCircle, Paragraph, Row } from '@trezor/components';
import { spacings } from '@trezor/theme';

import { DashboardSection } from 'src/components/dashboard';

type OutsideStakingCardProps = {
    symbol: NetworkSymbol;
};

export const OutsideStakingCard = ({ symbol }: OutsideStakingCardProps) => {
    const displaySymbol = getDisplaySymbol(symbol);

    return (
        <DashboardSection data-testid="@wallet/staking/outside-staking-card">
            <Card paddingType="large">
                <Row alignItems="start" gap={spacings.md}>
                    <IconCircle name="puzzlePiece" variant="primary" size={44} />
                    <Column gap={spacings.xs}>
                        <H3>
                            <Translation id="TR_OUTSIDE_STAKING_CARD_TITLE" />
                        </H3>
                        <Paragraph variant="tertiary" maxWidth={700}>
                            <Translation
                                id="TR_OUTSIDE_STAKING_CARD_TEXT"
                                values={{ amount: '100', displaySymbol, fiat: '$1,000' }}
                            />
                        </Paragraph>
                    </Column>
                </Row>
            </Card>
        </DashboardSection>
    );
};
