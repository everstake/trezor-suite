import { TouchableOpacity } from 'react-native';
import { useState } from 'react';

import { Icon } from '@suite-native/icons';
import { ScanQRBottomSheet } from '@suite-native/qr-code';
import { Translation } from '@suite-native/intl';
import { useNativeStyles } from '@trezor/styles';

type QrCodeBottomSheetIconProps = {
    onCodeScanned: (data: string) => void;
};

export const QrCodeBottomSheetIcon = ({ onCodeScanned }: QrCodeBottomSheetIconProps) => {
    const { utils } = useNativeStyles();
    const [isVisible, setIsVisible] = useState(false);

    const toggleBottomSheet = () => {
        setIsVisible(prevState => !prevState);
    };

    return (
        <>
            <TouchableOpacity onPress={toggleBottomSheet} hitSlop={utils.spacings.sp8}>
                <Icon name="qrCode" size="large" />
            </TouchableOpacity>

            <ScanQRBottomSheet
                title={<Translation id="moduleSend.outputs.recipients.addressQrLabel" />}
                isVisible={isVisible}
                onCodeScanned={onCodeScanned}
                onClose={toggleBottomSheet}
            />
        </>
    );
};
