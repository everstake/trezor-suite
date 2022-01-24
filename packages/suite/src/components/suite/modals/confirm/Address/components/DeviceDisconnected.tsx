import React from 'react';
import styled from 'styled-components';

import { P, variables } from '@trezor/components';
import { Translation, Image } from '@suite-components';

const Wrapper = styled.div`
    display: flex;
    text-align: left;
    background: ${props => props.theme.BG_GREY};
    align-items: center;
    width: 100%;
    justify-content: space-between;
`;

const Col = styled.div`
    display: flex;
    flex-direction: column;
    align-items: start;
    text-align: left;
`;

const ContentCol = styled(Col)`
    padding: 16px 24px;
`;

const ImageCol = styled(Col)`
    padding: 16px;

    @media (max-width: ${variables.SCREEN_SIZE.SM}) {
        display: none;
    }
`;

interface DeviceDisconnectedProps {
    label: string;
}

const DeviceDisconnected = ({ label, ...rest }: DeviceDisconnectedProps) => (
    <Wrapper {...rest}>
        <ContentCol>
            <P size="small">
                <Translation
                    id="TR_DEVICE_LABEL_IS_NOT_CONNECTED"
                    values={{ deviceLabel: label }}
                />
            </P>
            <P size="tiny">
                <Translation id="TR_PLEASE_CONNECT_YOUR_DEVICE" />
            </P>
        </ContentCol>
        <ImageCol>
            <Image image="UNI_ERROR" />
        </ImageCol>
    </Wrapper>
);

export default DeviceDisconnected;
