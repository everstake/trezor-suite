import { bech32 } from '@scure/base';

import { type AdaPools } from '@suite-common/earn-staking-api';
import {
    CARDANO_EVERSTAKE_DREP,
    CARDANO_EVERSTAKE_STAKING_POOL,
    EVERSTAKE_POOLS,
    FIVE_BINARIES_POOLS,
} from '@suite-common/wallet-constants';

// Real Everstake pools; saturations mirror the live endpoint values of 2026-08-01.
const [eve6, eve7, eve8] = EVERSTAKE_POOLS as [string, string, string];
const EVE6_SATURATION = 80.77;
const EVE7_SATURATION = 76.42;
const EVE8_SATURATION = 62.64;

// A decodable pool id that is intentionally NOT in EVERSTAKE_POOLS.
const apiOnlyPool = bech32.encode('pool', bech32.toWords(new Uint8Array(28).fill(7)));

const pool = (id: string, saturation: number): AdaPools['pools'][number] => ({
    id,
    saturation,
    apy: 2.5,
});

const livePools = [
    pool(eve6, EVE6_SATURATION),
    pool(eve7, EVE7_SATURATION),
    pool(eve8, EVE8_SATURATION),
];

export const selectBestCardanoPool = [
    {
        description: 'no pool data (endpoint down) falls back to the hardcoded pool',
        pools: undefined,
        result: CARDANO_EVERSTAKE_STAKING_POOL.bech32,
    },
    {
        description: 'empty pool list falls back to the hardcoded pool',
        pools: [],
        result: CARDANO_EVERSTAKE_STAKING_POOL.bech32,
    },
    {
        description: 'least saturated pool is picked (live situation: EVE8)',
        pools: livePools,
        result: eve8,
    },
    {
        description: 'does not rely on the API ordering',
        pools: [
            pool(eve8, EVE8_SATURATION),
            pool(eve6, EVE6_SATURATION),
            pool(eve7, EVE7_SATURATION),
        ],
        result: eve8,
    },
    {
        description: 'all pools nearly full still yield the least saturated one',
        pools: [pool(eve6, 100), pool(eve7, 97.3), pool(eve8, 98.1)],
        result: eve7,
    },
    {
        description: 'single pool is picked',
        pools: [pool(eve6, EVE6_SATURATION)],
        result: eve6,
    },
];

export const selectBestCardanoPoolWithCurrentPool = [
    ...EVERSTAKE_POOLS.map((everstakePoolId, index) => ({
        description: `hardcoded Everstake pool [${index}] is kept even without any pool data`,
        pools: undefined,
        currentPoolId: everstakePoolId,
        result: everstakePoolId,
    })),
    {
        description: 'pool listed only by the endpoint is kept',
        pools: [pool(apiOnlyPool, 95.2), pool(eve8, EVE8_SATURATION)],
        currentPoolId: apiOnlyPool,
        result: apiOnlyPool,
    },
    {
        description: 'foreign pool is moved to the least saturated Everstake pool',
        pools: livePools,
        currentPoolId: 'pool1foreignforeignforeignforeignforeignforeignfore',
        result: eve8,
    },
    {
        description: 'foreign pool without pool data is moved to the hardcoded pool',
        pools: [],
        currentPoolId: 'pool1foreignforeignforeignforeignforeignforeignfore',
        result: CARDANO_EVERSTAKE_STAKING_POOL.bech32,
    },
    {
        description: 'account without delegation gets the least saturated pool',
        pools: livePools,
        currentPoolId: null,
        result: eve8,
    },
];

const cardanoAccount = (poolId?: string) => ({
    networkType: 'cardano',
    misc: { staking: { poolId } },
});

const [everstakePool] = EVERSTAKE_POOLS as [string];
const [fiveBinariesPool] = FIVE_BINARIES_POOLS as [string];
const foreignPool = 'pool1foreignforeignforeignforeignforeignforeignfore';
const fetchedPools = [pool(everstakePool, EVE6_SATURATION)];

export const isCardanoStakedWithEverstake = [
    {
        description: 'hardcoded Everstake pool without any pool data',
        account: cardanoAccount(everstakePool),
        pools: [],
        result: true,
    },
    {
        description: 'pool present only in the fetched list',
        account: cardanoAccount('pool1listedbyapi'),
        pools: [pool('pool1listedbyapi', 50)],
        result: true,
    },
    {
        description: 'foreign pool with pool data available',
        account: cardanoAccount(foreignPool),
        pools: fetchedPools,
        result: false,
    },
    {
        description: 'account without delegation',
        account: cardanoAccount(undefined),
        pools: fetchedPools,
        result: false,
    },
    {
        description: 'non-cardano account',
        account: { networkType: 'ethereum' },
        pools: fetchedPools,
        result: false,
    },
];

export const isCardanoStakedOutsideEverstake = [
    {
        description: 'foreign pool with pool data available',
        account: cardanoAccount(foreignPool),
        pools: fetchedPools,
        result: true,
    },
    {
        description: 'hardcoded Everstake pool with pool data available',
        account: cardanoAccount(everstakePool),
        pools: fetchedPools,
        result: false,
    },
    {
        description: 'hardcoded Everstake pool without pool data',
        account: cardanoAccount(everstakePool),
        pools: [],
        result: false,
    },
    {
        description: 'foreign pool without pool data (EVERSTAKE_POOLS is the complete set)',
        account: cardanoAccount(foreignPool),
        pools: [],
        result: true,
    },
    {
        description: 'Five Binaries pool without pool data',
        account: cardanoAccount(fiveBinariesPool),
        pools: [],
        result: true,
    },
    {
        description: 'Five Binaries pool with pool data available',
        account: cardanoAccount(fiveBinariesPool),
        pools: fetchedPools,
        result: true,
    },
    {
        description: 'account without delegation',
        account: cardanoAccount(undefined),
        pools: [],
        result: false,
    },
];

export const isCardanoStakedWithFiveBinaries = [
    {
        description: 'Five Binaries pool',
        account: cardanoAccount(fiveBinariesPool),
        result: true,
    },
    {
        description: 'Everstake pool',
        account: cardanoAccount(everstakePool),
        result: false,
    },
    {
        description: 'account without delegation',
        account: cardanoAccount(undefined),
        result: false,
    },
];

const cardanoAccountWithDrep = (drep: { drep_id: string } | null, isActive = true) => ({
    networkType: 'cardano',
    misc: { staking: { poolId: everstakePool, drep, isActive } },
});

export const hasCardanoLiveVoteDelegation = [
    {
        description: 'registered account voting for a DRep',
        account: cardanoAccountWithDrep({ drep_id: CARDANO_EVERSTAKE_DREP.bech32 }),
        result: true,
    },
    {
        description: 'registered account with no vote delegation',
        account: cardanoAccountWithDrep(null),
        result: false,
    },
    {
        description: 'unregistered account, whose reported DRep is stale',
        account: cardanoAccountWithDrep({ drep_id: CARDANO_EVERSTAKE_DREP.bech32 }, false),
        result: false,
    },
    {
        description: 'non-cardano account',
        account: { networkType: 'ethereum' },
        result: false,
    },
];

const SCRIPT_HASH_DREP_CIP105 = 'drep_script1g2d3y3skgr806wj2ryhhc5ca3akx6vmppde87jq7kgknj5wf0ec';
const SCRIPT_HASH_DREP_CIP129 = 'drep1ydpfkyjxzeqvalf6fgvj7lznrk8kcmfnvy9hyl6gr6ez6wgsjaelx';

const KEY_HASH_DREP_CIP105 = 'drep1ectemlv45xsnvenfgkhwsxncfvxev4qllj7x5w6vlfc7kmd9zcs';

const UNKNOWN_HEADER_DREP = bech32.encode(
    'drep',
    bech32.toWords(Uint8Array.from([0x21, ...new Uint8Array(28).fill(9)])),
);

export const convertDrepIdToCip129 = [
    {
        description: 'legacy script hash id gets the 0x23 header and the plain drep prefix',
        drepId: SCRIPT_HASH_DREP_CIP105,
        result: SCRIPT_HASH_DREP_CIP129,
    },
    {
        description: 'legacy key hash id gets the 0x22 header',
        drepId: KEY_HASH_DREP_CIP105,
        result: CARDANO_EVERSTAKE_DREP.bech32,
    },
    {
        description: 'uppercase legacy id converts to the canonical lowercase form',
        drepId: SCRIPT_HASH_DREP_CIP105.toUpperCase(),
        result: SCRIPT_HASH_DREP_CIP129,
    },
    {
        description: 'id already in CIP-129 has nothing to convert',
        drepId: CARDANO_EVERSTAKE_DREP.bech32,
        result: null,
    },
    {
        description: 'uppercase CIP-129 id is canonicalized to lowercase',
        drepId: CARDANO_EVERSTAKE_DREP.bech32.toUpperCase(),
        result: CARDANO_EVERSTAKE_DREP.bech32,
    },
    {
        description: 'raw hex is not a bech32 id',
        drepId: CARDANO_EVERSTAKE_DREP.hex,
        result: null,
    },
    {
        description: 'empty string',
        drepId: '',
        result: null,
    },
    {
        description: 'not a DRep id at all',
        drepId: 'not-a-drep',
        result: null,
    },
    {
        description: 'pool id is bech32 but not a DRep',
        drepId: CARDANO_EVERSTAKE_STAKING_POOL.bech32,
        result: null,
    },
    {
        description: 'id whose checksum does not hold',
        drepId: `${SCRIPT_HASH_DREP_CIP105.slice(0, -1)}q`,
        result: null,
    },
];

export const validateCardanoDrep = [
    {
        description: 'legacy key hash id',
        drepId: KEY_HASH_DREP_CIP105,
        result: true,
    },
    {
        description: 'legacy script hash id',
        drepId: SCRIPT_HASH_DREP_CIP105,
        result: true,
    },
    {
        description: 'CIP-129 id',
        drepId: CARDANO_EVERSTAKE_DREP.bech32,
        result: true,
    },
    {
        description: 'CIP-129 id carrying a header byte that has no DRep type',
        drepId: UNKNOWN_HEADER_DREP,
        result: false,
    },
    {
        description: 'drep_script prefix with a 29-byte CIP-129 payload',
        drepId: bech32.encode(
            'drep_script',
            bech32.toWords(Uint8Array.from([0x23, ...new Uint8Array(28).fill(9)])),
        ),
        result: false,
    },
    {
        description: 'empty string',
        drepId: '',
        result: false,
    },
    {
        description: 'raw hex',
        drepId: CARDANO_EVERSTAKE_DREP.hex,
        result: false,
    },
];

export const convertDrepIdToCip129PreservesCertificate = [
    { description: 'script hash', drepId: SCRIPT_HASH_DREP_CIP105 },
    { description: 'key hash', drepId: KEY_HASH_DREP_CIP105 },
];

export const getCardanoAccountDrepId = [
    {
        description: 'legacy key hash id is reported in CIP-129',
        account: cardanoAccountWithDrep({ drep_id: KEY_HASH_DREP_CIP105 }),
        result: CARDANO_EVERSTAKE_DREP.bech32,
    },
    {
        description: 'legacy script hash id is reported in CIP-129',
        account: cardanoAccountWithDrep({ drep_id: SCRIPT_HASH_DREP_CIP105 }),
        result: SCRIPT_HASH_DREP_CIP129,
    },
    {
        description: 'id already in CIP-129 is reported unchanged',
        account: cardanoAccountWithDrep({ drep_id: CARDANO_EVERSTAKE_DREP.bech32 }),
        result: CARDANO_EVERSTAKE_DREP.bech32,
    },
    {
        description: 'uppercase id is reported in the canonical lowercase form',
        account: cardanoAccountWithDrep({
            drep_id: CARDANO_EVERSTAKE_DREP.bech32.toUpperCase(),
        }),
        result: CARDANO_EVERSTAKE_DREP.bech32,
    },
    {
        description: 'id Suite cannot parse is passed through rather than hidden',
        account: cardanoAccountWithDrep({ drep_id: 'drep_of_a_format_suite_does_not_know' }),
        result: 'drep_of_a_format_suite_does_not_know',
    },
    {
        description: 'account with no vote delegation',
        account: cardanoAccountWithDrep(null),
        result: null,
    },
    {
        description: 'non-cardano account',
        account: { networkType: 'ethereum' },
        result: null,
    },
];
