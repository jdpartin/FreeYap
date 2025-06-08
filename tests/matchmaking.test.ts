import io from 'socket.io-client';

describe('Matchmaking System', () => 
{
    let socket1: any;
    let socket2: any;
    const serverUrl = 'http://localhost:3000';
    const testTopic = 'gaming';
    const chatMode = 'text';

    beforeAll(async () => 
    {
        // Give the server time to start if needed
        await new Promise(resolve => setTimeout(resolve, 1000));
    });

    afterEach(async () => 
    {
        // Clean up sockets after each test
        if (socket1 && socket1.connected) 
        {
            socket1.disconnect();
        }
        if (socket2 && socket2.connected) 
        {
            socket2.disconnect();
        }
    });

    test('two users with same topic should match', async () => 
    {
        // Create two socket connections
        socket1 = io(serverUrl);
        socket2 = io(serverUrl);

        // Wait for both sockets to connect
        await Promise.all([
            new Promise(resolve => socket1.on('connect', resolve)),
            new Promise(resolve => socket2.on('connect', resolve))
        ]);

        // Set up match found listeners
        const matchPromise1 = new Promise(resolve => 
        {
            socket1.on('match-found', (data: any) => 
            {
                expect(data.socketId).toBe(socket1.id);
                expect(data.matchedSocketId).toBe(socket2.id);
                resolve(data);
            });
        });

        const matchPromise2 = new Promise(resolve => 
        {
            socket2.on('match-found', (data: any) => 
            {
                expect(data.socketId).toBe(socket2.id);
                expect(data.matchedSocketId).toBe(socket1.id);
                resolve(data);
            });
        });

        // First user joins queue
        const response1 = await fetch(`${serverUrl}/api/matchmaking/join-queue`, 
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                socketId: socket1.id,
                mode: chatMode,
                gore: false,
                nudity: false,
                ipHash: 'test-hash-1',
                topics: [testTopic]
            })
        });

        expect(response1.ok).toBe(true);

        // Second user joins queue with same topic
        const response2 = await fetch(`${serverUrl}/api/matchmaking/join-queue`, 
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                socketId: socket2.id,
                mode: chatMode,
                gore: false,
                nudity: false,
                ipHash: 'test-hash-2',
                topics: [testTopic]
            })
        });

        expect(response2.ok).toBe(true);

        // Wait for both users to receive match notifications
        await Promise.all([matchPromise1, matchPromise2]);
    }, 15000); // 15 second timeout to account for potential delays
});
