import { UseCoinmarketProps } from 'src/types/coinmarket/coinmarket';
import { CoinmarketOffersContext } from 'src/hooks/wallet/coinmarket/offers/useCoinmarketCommonOffers';
import { CoinmarketFormContext } from 'src/hooks/wallet/coinmarket/form/useCoinmarketCommonForm';
import { useCoinmarketSellForm } from 'src/hooks/wallet/coinmarket/form/useCoinmarketSellForm';
import { CoinmarketFooter } from 'src/views/wallet/coinmarket/common';
import { CoinmarketOffers } from 'src/views/wallet/coinmarket/common/CoinmarketOffers/CoinmarketOffers';
import { CoinmarketContainer } from 'src/views/wallet/coinmarket/common/CoinmarketContainer';

const CoinmarketSellOffersComponent = ({ selectedAccount }: UseCoinmarketProps) => {
    const coinmarketSellFormContextValues = useCoinmarketSellForm({
        selectedAccount,
        pageType: 'offers',
    });

    // CoinmarketOffersContext.Provider is temporary FIX
    return (
        <CoinmarketFormContext.Provider value={coinmarketSellFormContextValues}>
            <CoinmarketOffersContext.Provider value={coinmarketSellFormContextValues}>
                <CoinmarketOffers />
                <CoinmarketFooter />
            </CoinmarketOffersContext.Provider>
        </CoinmarketFormContext.Provider>
    );
};
export const CoinmarketSellOffers = () => (
    <CoinmarketContainer
        title="TR_NAV_SELL"
        backRoute="wallet-coinmarket-sell"
        SectionComponent={CoinmarketSellOffersComponent}
    />
);
