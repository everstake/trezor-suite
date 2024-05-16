import { parseConnectSettings } from '../../data/connectSettings';
import { DataManager } from '../../data/DataManager';
import { DeviceList } from '../DeviceList';
import {
    AbstractApiTransport,
    UsbApi,
    SessionsClient,
    SessionsBackground,
} from '@trezor/transport';

class TestTransport extends AbstractApiTransport {
    name = 'TestTransport' as any;
}

// mock of navigator.usb
const createTransportApi = (override = {}) =>
    ({
        chunkSize: 0,
        enumerate: () => {
            return Promise.resolve({ success: true, payload: [{ path: '1' }] });
        },
        on: () => {},
        off: () => {},
        openDevice: (path: string) => {
            return Promise.resolve({ success: true, payload: [{ path }] });
        },
        closeDevice: () => {
            return Promise.resolve({ success: true });
        },
        write: () => {
            return Promise.resolve({ success: true });
        },
        read: () => {
            return Promise.resolve({
                success: true,
                payload: Buffer.from('3f232300110000000c1002180020006000aa010154', 'hex'), // partial proto.Features
                // payload: Buffer.from('3f23230002000000060a046d656f77', 'hex'), // proto.Success
            });
        },
        ...override,
    }) as unknown as UsbApi;

const createTestTransport = (apiMethods = {}) => {
    const { signal } = new AbortController();
    const sessionsBackground = new SessionsBackground({ signal });
    const sessionsClient = new SessionsClient({
        requestFn: params => sessionsBackground.handleMessage(params),
        registerBackgroundCallbacks: onDescriptorsCallback => {
            sessionsBackground.on('descriptors', descriptors => {
                onDescriptorsCallback(descriptors);
            });
        },
    });

    const transport = new TestTransport({
        api: createTransportApi(apiMethods),
        sessionsClient,
        signal,
    });

    return transport;
};

const getDeviceListParams = (
    params: Partial<ConstructorParameters<typeof DeviceList>[0]>,
): ConstructorParameters<typeof DeviceList>[0] => {
    const { debug, transports, priority, pendingTransportEvent } = parseConnectSettings({});

    const messages = DataManager.getProtobufMessages();

    return {
        debug,
        transports,
        priority,
        pendingTransportEvent,
        messages,
        ...params,
    };
};

const createDeviceList = (deviceListParams: ConstructorParameters<typeof DeviceList>[0]) => {
    const list = new DeviceList(deviceListParams);
    const eventsSpy = jest.fn();
    (
        [
            'transport-start',
            'transport-error',
            'device-changed',
            'device-connect',
            'device-connect_unacquired',
            'device-acquired',
            'device-released',
            'device-disconnect',
        ] as const
    ).forEach(event => {
        list.on(event, data => eventsSpy(event, data));
    });

    return {
        list,
        eventsSpy,
    };
};

describe('DeviceList', () => {
    beforeAll(async () => {
        // todo: I don't get it. If we pass empty messages: {} (see getDeviceListParams), tests behave differently.
        await DataManager.load({
            ...parseConnectSettings({}),
        });
    });
    it('constructor throws error on unknown transport (string)', () => {
        const params = getDeviceListParams({
            // @ts-expect-error
            transports: ['FooBarTransport'],
        });

        expect(() => {
            new DeviceList(params);
        }).toThrow('unexpected type: FooBarTransport');
    });

    it('constructor throws error on unknown transport (class)', () => {
        expect(() => {
            new DeviceList(
                getDeviceListParams({
                    // @ts-expect-error
                    transports: [{}, () => {}, [], String, 1, 'meow-non-existent'],
                }),
            );
        }).toThrow('DeviceList.init: transports[] of unexpected type');
    });

    it('constructor accepts transports in form of transport class', () => {
        expect(() => {
            new DeviceList(getDeviceListParams({ transports: [TestTransport] }));
        }).not.toThrow();
    });

    it('.init() throws async error from transport.init()', async () => {
        const transport = createTestTransport();
        jest.spyOn(transport, 'init').mockImplementation(() => ({
            promise: Promise.resolve({
                success: false,
                error: 'unexpected error',
                message: '',
            } as const),
            abort: () => {},
        }));

        const { list, eventsSpy } = createDeviceList(
            getDeviceListParams({ transports: [transport] }),
        );

        list.init();
        // transport-error is not emitted yet because list.init is not awaited
        expect(eventsSpy).toHaveBeenCalledTimes(0);
        await list.waitForTransportFirstEvent();
        expect(eventsSpy).toHaveBeenCalledTimes(1);
        expect(list.transport.name).toBe('TestTransport');

        list.dispose();
    });

    it('.init() throws async error from transport.enumerate()', async () => {
        const transport = createTestTransport();
        jest.spyOn(transport, 'enumerate').mockImplementation(() => ({
            promise: Promise.resolve({
                success: false,
                error: 'unexpected error',
                message: '',
            } as const),
            abort: () => {},
        }));

        const { list, eventsSpy } = createDeviceList(
            getDeviceListParams({ transports: [transport] }),
        );

        list.init();
        // transport-error is not emitted yet because list.init is not awaited
        expect(eventsSpy).toHaveBeenCalledTimes(0);
        await list.waitForTransportFirstEvent();
        expect(eventsSpy).toHaveBeenCalledTimes(1);
        expect(eventsSpy.mock.calls[0][0]).toEqual('transport-error');

        list.dispose();
    });

    it('.init() with pendingTransportEvent (unacquired device)', async () => {
        const transport = createTestTransport({
            openDevice: () => Promise.resolve({ success: false, error: 'wrong previous session' }),
        });

        const { list, eventsSpy } = createDeviceList(
            getDeviceListParams({ transports: [transport] }),
        );

        list.init();
        await list.waitForTransportFirstEvent();

        const events = eventsSpy.mock.calls.map(call => call[0]);
        expect(events).toEqual(['device-connect_unacquired', 'transport-start']);

        list.dispose();
    });

    it('.init() with pendingTransportEvent (disconnected device)', async () => {
        const transport = createTestTransport({
            openDevice: () => Promise.resolve({ success: false, error: 'device not found' }),
        });

        const { list, eventsSpy } = createDeviceList(
            getDeviceListParams({ transports: [transport] }),
        );

        list.init();
        const transportFirstEvent = list.waitForTransportFirstEvent();

        // NOTE: this behavior is wrong, if device creation fails DeviceList shouldn't wait 10 secs.
        jest.useFakeTimers();
        // move 9 sec forward
        await jest.advanceTimersByTimeAsync(9 * 1000);
        // no events yet
        expect(eventsSpy).toHaveBeenCalledTimes(0);
        // move 2 sec forward
        await jest.advanceTimersByTimeAsync(2 * 1000);
        // promise should be resolved by now
        await transportFirstEvent;
        jest.useRealTimers();

        expect(eventsSpy).toHaveBeenCalledTimes(1);
        expect(eventsSpy.mock.calls[0][0]).toEqual('transport-start');

        list.dispose();
    });

    it('.init() with pendingTransportEvent (unreadable device)', async () => {
        const transport = createTestTransport({
            read: () => {
                return Promise.resolve({
                    success: true,
                    payload: Buffer.from('3f23230002000000060a046d656f77', 'hex'), // proto.Success
                });
            },
        });

        const { list, eventsSpy } = createDeviceList(
            getDeviceListParams({ transports: [transport] }),
        );

        list.init();
        await list.waitForTransportFirstEvent();

        const events = eventsSpy.mock.calls.map(call => call[0]);
        expect(events).toEqual([
            'device-changed',
            'device-acquired',
            'device-connect_unacquired',
            'transport-start',
        ]);

        list.dispose();
    });

    it('.init() with pendingTransportEvent (multiple acquired devices)', async () => {
        const transport = createTestTransport({
            enumerate: () => {
                return { success: true, payload: [{ path: '1' }, { path: '2' }, { path: '3' }] };
            },
        });
        const { list, eventsSpy } = createDeviceList(
            getDeviceListParams({ transports: [transport] }),
        );

        list.init();
        await list.waitForTransportFirstEvent();

        // NOTE: this behavior is wrong
        const events = eventsSpy.mock.calls.map(call => call[0]);
        expect(events).toEqual([
            'device-changed', // path 1
            'device-acquired', // path 1
            'device-connect_unacquired', // path 2
            'device-connect_unacquired', // path 3
            'device-changed', // path 2
            'device-acquired', // path 2
            'device-connect', // path 1
            'transport-start',
        ]);

        list.dispose();
    });

    it('.init() with pendingTransportEvent (device acquired after retry)', async () => {
        let openTries = 0;
        const transport = createTestTransport({
            openDevice: (path: string) => {
                if (openTries < 1) {
                    openTries++;

                    return { success: false, error: 'totally unexpected' };
                }

                return { success: true, payload: [{ path }] };
            },
        });

        const { list, eventsSpy } = createDeviceList(
            getDeviceListParams({ transports: [transport] }),
        );

        // NOTE: this behavior is wrong
        jest.useFakeTimers();
        list.init();
        const transportFirstEvent = list.waitForTransportFirstEvent();
        await jest.advanceTimersByTimeAsync(6 * 1000); // TODO: this is wrong
        await transportFirstEvent;
        jest.useRealTimers();

        expect(eventsSpy).toHaveBeenCalledTimes(8);
        const events = eventsSpy.mock.calls.map(call => call[0]);
        expect(events).toEqual([
            'device-changed',
            'device-acquired',
            'device-changed',
            'device-acquired',
            'device-changed',
            'device-released',
            'device-connect',
            'transport-start',
        ]);

        list.dispose();
    });

    it('.init() without pendingTransportEvent (device connected after start)', async () => {
        const transport = createTestTransport();

        const { list, eventsSpy } = createDeviceList(
            getDeviceListParams({ transports: [transport], pendingTransportEvent: false }),
        );

        list.init();
        await list.waitForTransportFirstEvent();
        // transport start emitted almost immediately (after first enumerate)
        expect(eventsSpy).toHaveBeenCalledTimes(1);

        // wait for device-connect event
        await new Promise(resolve => list.on('device-connect', resolve));

        const events = eventsSpy.mock.calls.map(call => call[0]);
        expect(events).toEqual([
            'transport-start',
            'device-changed',
            'device-acquired',
            'device-changed',
            'device-released',
            'device-connect',
        ]);

        list.dispose();
    });

    it('multiple device connected after .init()', async () => {
        let inChangeCallback = (..._args: any[]) => {};
        const transport = createTestTransport({
            enumerate: () => {
                return { success: true, payload: [] };
            },
            on: (eventName: string, callback: typeof inChangeCallback) => {
                if (eventName === 'transport-interface-change') {
                    inChangeCallback = callback;
                }
            },
        });

        const { list, eventsSpy } = createDeviceList(
            getDeviceListParams({ transports: [transport] }),
        );

        list.init();
        await list.waitForTransportFirstEvent();

        inChangeCallback([{ path: '1' }, { path: '2' }, { path: '3' }]);

        // wait for device-connect
        await new Promise(resolve => {
            list.on('device-connect', resolve);
        });

        // NOTE: this behavior is wrong
        const events = eventsSpy.mock.calls.map(call => call[0]);
        expect(events).toEqual([
            'transport-start',
            'device-changed', // path 1
            'device-acquired', // path 1
            'device-connect_unacquired', // path 2
            'device-connect_unacquired', // path 3
            'device-connect', // path 1
        ]);

        list.dispose();
    });
});
