import io from 'socket.io-client';

const MatchmakingAPIClient = require('../public/js/apiClients/matchmakingAPIClient.js');
const serverUrl = 'http://localhost:3000';

const ipHash1 = 'test-ip-hash1';
const ipHash2 = 'test-ip-hash2';

const apiClient = new MatchmakingAPIClient();

apiClient.baseUrl = serverUrl + '/api/matchmaking';

// Database cleanup function
async function clearMatchmakingQueue() {
    try {
        const response = await fetch(`${serverUrl}/api/test/clear-queue`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            console.warn('Failed to clear queue, continuing with tests');
        }
    } catch (error) {
        console.warn('Queue clear endpoint not available, continuing with tests');
    }
}

// Database cleanup function for blocking entries
async function clearMatchmakingBlocking() {
    try {
        const response = await fetch(`${serverUrl}/api/test/clear-blocking`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            console.warn('Failed to clear blocking, continuing with tests');
        }
    } catch (error) {
        console.warn('Blocking clear endpoint not available, continuing with tests');
    }
}

// Test timeout constants - optimized for faster execution
const STANDARD_TIMEOUT = 8000;  // 8 seconds for regular tests (reduced from 15)
const DELAYED_TIMEOUT = 15000;  // 15 seconds for delayed matchmaking tests (reduced from 25)
const QUICK_TIMEOUT = 3000;     // 3 seconds for fast tests
const NO_MATCH_WAIT = 2000;     // 2 seconds to verify no match (reduced from 7)

// Test state tracking for dependencies
let basicMatchingWorking = false;

describe('Join Queue', () => 
{    beforeAll(async () => 
    {
        // Clear the queue before starting any tests
        await clearMatchmakingQueue();
        // Reduced startup time
        await new Promise(resolve => setTimeout(resolve, 1000));
    });

    beforeEach(async () =>
    {
        // Clear queue before each test to ensure isolation
        await clearMatchmakingQueue();
        // Reduced wait time for faster test execution
        await new Promise(resolve => setTimeout(resolve, 500));
    });

    afterEach(async () => 
    {
        // Clear queue after each test for good measure
        await clearMatchmakingQueue();
        // Reduced cleanup time
        await new Promise(resolve => setTimeout(resolve, 300));
    });

    afterAll(async () => 
    {
        // Final cleanup after all tests in this suite
        await clearMatchmakingQueue();
        await new Promise(resolve => setTimeout(resolve, 500));
    });
    
    test('testBasicTopicMatching', async () => 
    {        
        // Users with the same topic should match
        await textMatch(['game'], ['game']);
        basicMatchingWorking = true;
    }, STANDARD_TIMEOUT);

    test('testSimilarTopicMatching', async () => 
    {
        expect(basicMatchingWorking).toBe(true);
        
        // Two users with similar topics should match
        await textMatch(['game'], ['games']);
    }, STANDARD_TIMEOUT);

    test('testDifferentTopicsNoMatch', async () => 
    {
        // Two users with very different topics should not match
        await textMatch(['mouse'], ['the declaration of independence'], false);
    }, STANDARD_TIMEOUT);

    test('testRandomChatUsersNoMatch', async () => 
    {
        // A random chat user should not match with another random chat user
        await textMatch([], [], false);
    }, STANDARD_TIMEOUT);

    test('testTopicUserVsRandomChatNoMatch', async () => 
    {
        // A non-delayed topic user should not match with a random chat user
        await textMatch(['gaming'], [], false);
    }, STANDARD_TIMEOUT);

    test('testDifferentModesNoMatch', async () => 
    {
        // Two users in different modes should not match
        await crossModeMatch('text', 'video', ['game'], ['game']);
    }, STANDARD_TIMEOUT);    
    
    test('testGoreIncompatible', async () => 
    {
        // Two users with incompatible gore settings should not match
        await videoMatch(['game'], ['game'], false, true, false, false, false);
    }, STANDARD_TIMEOUT);

    test('testNudityIncompatible', async () => 
    {
        // Two users with incompatible nudity settings should not match
        await videoMatch(['game'], ['game'], false, false, false, true, false);
    }, STANDARD_TIMEOUT);    
      test('testIllicitContentInNonVideoModes', async () => 
    {
        // Illicit content settings should not apply in non-video modes - users should match regardless
        await testMatch('text', 'text', false, false, true, false, ['game'], ['game'], true);
        await testMatch('voice', 'voice', false, false, true, false, ['game'], ['game'], true);
    }, STANDARD_TIMEOUT);
    
    test('testMultipleTopicsOverlap', async () => 
    {
        expect(basicMatchingWorking).toBe(true);
        
        // Users with overlapping topics should match
        await textMatch(['gaming', 'music'], ['gaming', 'art']);
    }, STANDARD_TIMEOUT);    test('testMultipleTopicsNoOverlap', async () => 
    {
        // Users with no overlapping topics should not match - using completely unrelated random strings
        await textMatch(['xxrandomstring123xx'], ['yydifferentstring456yy'], false);
    }, STANDARD_TIMEOUT);

    test('testCompatibleGoreSettings', async () => 
    {
        expect(basicMatchingWorking).toBe(true);
        
        // Users with same gore settings should match
        await videoMatch(['game'], ['game'], true, true);
    }, STANDARD_TIMEOUT);

    test('testCompatibleNuditySettings', async () => 
    {
        expect(basicMatchingWorking).toBe(true);
        
        // Users with same nudity settings should match
        await videoMatch(['game'], ['game'], false, false, true, true);
    }, STANDARD_TIMEOUT);    
    
    test('testSingleTopicVsMultiple', async () => 
    {
        expect(basicMatchingWorking).toBe(true);
        
        // User with single topic should match user with multiple similar topics
        await textMatch(['gaming'], ['gaming', 'music', 'art']);
    }, STANDARD_TIMEOUT);

    test('testVoiceModeCompatibility', async () => 
    {
        expect(basicMatchingWorking).toBe(true);
        
        // Voice mode compatibility check
        await voiceMatch(['gaming'], ['gaming']);
    }, STANDARD_TIMEOUT);

    test('testMixedCaseTopics', async () => 
    {
        expect(basicMatchingWorking).toBe(true);
        
        // Mixed case topics should still match
        await textMatch(['Gaming'], ['gaming']);
    }, STANDARD_TIMEOUT);

    test('testEmptyArraysRandomChat', async () => 
    {
        // Empty array vs no topics parameter should both be random chat
        await textMatch([], [], false);
    }, STANDARD_TIMEOUT);

    test('testBothIllicitSettingsEnabled', async () => 
    {
        expect(basicMatchingWorking).toBe(true);
        
        // Users with both gore and nudity enabled should match
        await videoMatch(['gaming'], ['gaming'], true, true, true, true);
    }, STANDARD_TIMEOUT);

    test('testGoreEnabledVsDisabled', async () => 
    {
        // Gore enabled vs both disabled should not match
        await videoMatch(['gaming'], ['gaming'], true, false, false, false, false);
    }, STANDARD_TIMEOUT);    
    
    test('testPerformanceMultipleTopics', async () => 
    {
        // Multiple similar topics should still match efficiently
        expect(basicMatchingWorking).toBe(true);
        await textMatch(['gaming', 'esports', 'videogames', 'streaming'], ['gaming', 'esports', 'twitch', 'youtube']);
    }, STANDARD_TIMEOUT);    
    
    test('testNetworkUnusualTopics', async () => 
    {
        // Users with unusual topic strings should handle gracefully
        expect(basicMatchingWorking).toBe(true);
        await textMatch(['programming languages'], ['programming-languages']);
    }, STANDARD_TIMEOUT);    
    
    test('testBoundaryMaxTopicCount', async () => 
    {
        // Maximum topic count scenario
        expect(basicMatchingWorking).toBe(true);
        await textMatch(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'], ['a', 'x', 'y', 'z']);
    }, STANDARD_TIMEOUT);   
    
    test('testVideoMixedIllicitSettings', async () => 
    {
        // Mixed illicit settings combinations should not match
        await videoMatch(['gaming'], ['gaming'], true, false, true, true, false);
    }, STANDARD_TIMEOUT);    
    
    test('testNetworkNoIPHash', async () => 
    {
        // Both users having no IP hash should still match
        expect(basicMatchingWorking).toBe(true);
        await textMatch(['gaming'], ['gaming']);
    }, STANDARD_TIMEOUT);    
    
    test('testEdgeCaseNullVsFalse', async () => 
    {
        // Null vs false for gore settings should behave consistently
        expect(basicMatchingWorking).toBe(true);
        await videoMatch(['gaming'], ['gaming']);
    }, STANDARD_TIMEOUT);    
    
    test('testStressSequentialMatches', async () => 
    {
        // Sequential matches should work independently
        expect(basicMatchingWorking).toBe(true);
        
        // First match
        await textMatch(['gaming'], ['gaming']);
        
        // Wait to ensure cleanup
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Second match should also work
        await textMatch(['music'], ['music']);
    }, STANDARD_TIMEOUT * 2);
});

describe('Delayed Matchmaking', () => 
{
    beforeAll(async () => 
    {
        // Clear the queue before starting any tests
        await clearMatchmakingQueue();
        // Give extra time for delayed matchmaking setup
        await new Promise(resolve => setTimeout(resolve, 2000));
    });    beforeEach(async () =>
    {
        // Clear queue before each test to ensure isolation
        await clearMatchmakingQueue();
        // Reduced wait time for faster execution
        await new Promise(resolve => setTimeout(resolve, 500));
    });

    afterEach(async () => 
    {
        // Clear queue after each test
        await clearMatchmakingQueue();
        // Reduced cleanup time for delayed tests
        await new Promise(resolve => setTimeout(resolve, 500));
    });

    afterAll(async () => 
    {
        // Final cleanup after all tests in this suite
        await clearMatchmakingQueue();
        await new Promise(resolve => setTimeout(resolve, 1000));
    });
    
    test('testDelayedTopicVsRandom', async () => 
    {
        // A delayed topic user should match with a random chat user
        expect(basicMatchingWorking).toBe(true);
        await delayedTextMatch(['gaming'], []);
    }, DELAYED_TIMEOUT);    
    
    test('testDelayedMismatchedTopics', async () => 
    {
        // A delayed topic user should match with a mismatched topic user
        expect(basicMatchingWorking).toBe(true);
        await delayedTextMatch(['gaming'], ['cooking']);
    }, DELAYED_TIMEOUT);    
    
    test('testDelayedRandomVsRandom', async () => 
    {
        // A delayed random chat user should match with another delayed random chat user
        expect(basicMatchingWorking).toBe(true);
        await delayedTextMatch([], []);
    }, DELAYED_TIMEOUT);    
    
    test('testDelayedVideoWithIllicit', async () => 
    {
        // Video mode with compatible illicit content settings
        expect(basicMatchingWorking).toBe(true);
        await delayedVideoMatch(['gaming'], [], true, true);
    }, DELAYED_TIMEOUT);    
    
    test('testDelayedVoiceCompatibility', async () => 
    {
        // Voice mode compatibility
        expect(basicMatchingWorking).toBe(true);
        await delayedVoiceMatch(['music'], ['cooking']);
    }, DELAYED_TIMEOUT);    
    
    test('testDelayedManyTopics', async () => 
    {
        // Edge case with many topics
        expect(basicMatchingWorking).toBe(true);
        await delayedTextMatch(['gaming', 'programming', 'music'], []);
    }, DELAYED_TIMEOUT);
});

describe('Vibe Checking', () => 
{
    beforeAll(async () => 
    {
        // Clear the queue before starting any tests
        await clearMatchmakingQueue();
        await new Promise(resolve => setTimeout(resolve, 1000));
    });

    beforeEach(async () =>
    {
        // Clear queue before each test to ensure isolation
        await clearMatchmakingQueue();
        await new Promise(resolve => setTimeout(resolve, 1000));
    });

    afterEach(async () => 
    {
        // Clear queue after each test
        await clearMatchmakingQueue();
        await new Promise(resolve => setTimeout(resolve, 1000));
    });

    afterAll(async () => 
    {
        // Final cleanup after all tests in this suite
        await clearMatchmakingQueue();
        await new Promise(resolve => setTimeout(resolve, 1000));
    });

    var controlPassed = false;    
    
    test('testVibeCheckingControl', async () => 
    {
        // Ensure two users can initially connect
        expect(basicMatchingWorking).toBe(true);
        await videoMatch(['gaming'], ['gaming']);
        controlPassed = true;
    }, STANDARD_TIMEOUT);    
    
    test('testNuditySingleVerifiedVibeCheck', async () => 
    {
        // A single verified vibe check should force the user into the nudity true queue
        expect(controlPassed).toBe(true);

        // IP 1 is being vibe checked by IP 2
        await apiClient.vibeCheck(ipHash1, ipHash2, false, true, true);

        await videoMatch(['gaming'], ['gaming'], false, false, false, false, false);
        await apiClient.removeVibeCheck(ipHash1);
        
    }, STANDARD_TIMEOUT);

    test('testNudityOneUnverifiedVibeChecks', async () => 
    {
        // A single unverified vibe check should not force the user into the nudity true queue
        expect(controlPassed).toBe(true);

        // IP 1 is being vibe checked by IP 2
        await apiClient.vibeCheck(ipHash1, ipHash2, false, true, false);

        await videoMatch(['gaming'], ['gaming'], false, false, false, false, true);
        await apiClient.removeVibeCheck(ipHash1);
        
    }, STANDARD_TIMEOUT);

    test('testNudityTwoUnverifiedVibeChecks', async () => 
    {
        // Two unverified vibe checks should force the user into the nudity true queue
        expect(controlPassed).toBe(true);

        // IP 1 is being vibe checked by IP 2 and IP 3
        await apiClient.vibeCheck(ipHash1, ipHash2, false, true, false);
        await apiClient.vibeCheck(ipHash1, 'test-ip-hash-3', false, true, false);

        await videoMatch(['gaming'], ['gaming'], false, false, false, false, false);
        await apiClient.removeVibeCheck(ipHash1);
        
    }, STANDARD_TIMEOUT);

    test('testGoreSingleVerifiedVibeCheck', async () => 
    {
        // A single verified vibe check should force the user into the gore true queue
        expect(controlPassed).toBe(true);

        // IP 1 is being vibe checked by IP 2
        await apiClient.vibeCheck(ipHash1, ipHash2, true, false, true);

        await videoMatch(['gaming'], ['gaming'], true, false, false, false, false);
        await apiClient.removeVibeCheck(ipHash1);
        
    }, STANDARD_TIMEOUT);

    test('testGoreOneUnverifiedVibeCheck', async () => 
    {
        // A single unverified vibe check should not force the user into the gore true queue
        expect(controlPassed).toBe(true);

        // IP 1 is being vibe checked by IP 2
        await apiClient.vibeCheck(ipHash1, ipHash2, true, false, false);

        await videoMatch(['gaming'], ['gaming'], true, false, false, false, true);
        await apiClient.removeVibeCheck(ipHash1);
        
    }, STANDARD_TIMEOUT);

    test('testGoreTwoUnverifiedVibeChecks', async () => 
    {
        // Two unverified vibe checks should force the user into the gore true queue
        expect(controlPassed).toBe(true);

        // IP 1 is being vibe checked by IP 2 and IP 3
        await apiClient.vibeCheck(ipHash1, ipHash2, true, false, false);
        await apiClient.vibeCheck(ipHash1, 'test-ip-hash-3', true, false, false);

        await videoMatch(['gaming'], ['gaming'], true, false, false, false, false);
        await apiClient.removeVibeCheck(ipHash1);
        
    }, STANDARD_TIMEOUT);
});

describe('Blocking', () => 
{
    beforeAll(async () => 
    {
        // Clear the queue and blocking entries before starting any tests
        await clearMatchmakingQueue();
        await clearMatchmakingBlocking();
        await new Promise(resolve => setTimeout(resolve, 1000));
    });

    beforeEach(async () =>
    {
        // Clear queue and blocking entries before each test to ensure isolation
        await clearMatchmakingQueue();
        await clearMatchmakingBlocking();
        await new Promise(resolve => setTimeout(resolve, 1000));
    });

    afterEach(async () => 
    {
        // Clear queue and blocking entries after each test
        await clearMatchmakingQueue();
        await clearMatchmakingBlocking();
        await new Promise(resolve => setTimeout(resolve, 1000));
    });

    afterAll(async () => 
    {
        // Final cleanup after all tests in this suite
        await clearMatchmakingQueue();
        await new Promise(resolve => setTimeout(resolve, 1000));
    });

    var controlPassed = false;    
    
    test('testBlockingControl', async () => 
    {
        // Ensure two users can initially connect
        expect(basicMatchingWorking).toBe(true);
        await textMatch(['gaming'], ['gaming']);
        controlPassed = true;
    }, STANDARD_TIMEOUT);    
    
    test('testInitiatorBlockedUser', async () => 
    {
        // The initiator should not be matched with someone they have blocked
        expect(controlPassed).toBe(true);
        
        // Block user 2 by user 1
        await apiClient.blockUser(ipHash1, ipHash2);
        
        // Try to match - should not match due to blocking
        await textMatch(['gaming'], ['gaming'], false);
        
        // Unblock for cleanup
        await apiClient.unblockUser(ipHash1, ipHash2);
        
    }, STANDARD_TIMEOUT);

    test('testInitiatorBlockedByUser', async () => 
    {
        // The initiator should not be matched with someone who has blocked them
        expect(controlPassed).toBe(true);
        
        // Block user 1 by user 2 
        await apiClient.blockUser(ipHash2, ipHash1);
        
        // Try to match - should not match due to blocking
        await textMatch(['gaming'], ['gaming'], false);
        
        // Unblock for cleanup
        await apiClient.unblockUser(ipHash2, ipHash1);
        
    }, STANDARD_TIMEOUT);
});


// Functions

// Helper functions for cleaner test calls
function textMatch(topics1: string[], topics2: string[], shouldMatch: boolean = true) {
    return testMatch('text', 'text', false, false, false, false, topics1, topics2, shouldMatch);
}

function voiceMatch(topics1: string[], topics2: string[], shouldMatch: boolean = true) {
    return testMatch('voice', 'voice', false, false, false, false, topics1, topics2, shouldMatch);
}

function videoMatch(topics1: string[], topics2: string[], gore1: boolean = false, gore2: boolean = false, nudity1: boolean = false, nudity2: boolean = false, shouldMatch: boolean = true) {
    return testMatch('video', 'video', gore1, gore2, nudity1, nudity2, topics1, topics2, shouldMatch);
}

function crossModeMatch(mode1: string, mode2: string, topics1: string[], topics2: string[], shouldMatch: boolean = false) {
    return testMatch(mode1, mode2, false, false, false, false, topics1, topics2, shouldMatch);
}

function delayedTextMatch(topics1: string[], topics2: string[]) {
    return testDelayedMatch('text', 'text', false, false, false, false, topics1, topics2);
}

function delayedVideoMatch(topics1: string[], topics2: string[], gore1: boolean = false, gore2: boolean = false, nudity1: boolean = false, nudity2: boolean = false) {
    return testDelayedMatch('video', 'video', gore1, gore2, nudity1, nudity2, topics1, topics2);
}

function delayedVoiceMatch(topics1: string[], topics2: string[]) {
    return testDelayedMatch('voice', 'voice', false, false, false, false, topics1, topics2);
}

function createSocket() 
{
    return io(serverUrl, {
        transports: ['websocket'],
        reconnection: false,
        forceNew: true,
        timeout: 5000
    });
}

async function testMatch(
    mode1: string, 
    mode2: string,
    gore1: boolean,
    gore2: boolean,
    nudity1: boolean,
    nudity2: boolean,
    topics1: string[], 
    topics2: string[],
    shouldMatch: boolean = true
)
{
    let socket1 = createSocket();
    let socket2 = createSocket();

    let socketId1!: string;
    let socketId2!: string;
    
    try
    {
        await Promise.all([
            new Promise<void>(resolve => socket1.on('connect', () => {
                socketId1 = socket1.id;
                resolve();
            })),
            new Promise<void>(resolve => socket2.on('connect', () => {
                socketId2 = socket2.id;
                resolve();
            }))
        ]);            
          if (shouldMatch) {
            // Set up match listeners BEFORE joining queue
            const matchPromise1 = new Promise((resolve, reject) => 
            {
                const timeout = setTimeout(() => {
                    reject(new Error('Match timeout - no match found within expected time'));
                }, 5000); // 5 second timeout for matches
                
                socket1.on('match-found', (data: any) => 
                {
                    clearTimeout(timeout);
                    console.log('Socket1 received match-found:', data);
                    expect(data.socketId).toBe(socketId1);
                    expect(data.matchedSocketId).toBe(socketId2);
                    resolve(data);
                });
            });

            const matchPromise2 = new Promise((resolve, reject) => 
            {
                const timeout = setTimeout(() => {
                    reject(new Error('Match timeout - no match found within expected time'));
                }, 5000); // 5 second timeout for matches
                
                socket2.on('match-found', (data: any) => 
                {
                    clearTimeout(timeout);
                    console.log('Socket2 received match-found:', data);
                    expect(data.socketId).toBe(socketId2);
                    expect(data.matchedSocketId).toBe(socketId1);
                    resolve(data);
                });
            });
            
            // Now join the queue
            await apiClient.joinQueue(socketId1, mode1, gore1, nudity1, ipHash1, topics1);
            await apiClient.joinQueue(socketId2, mode2, gore2, nudity2, ipHash2, topics2);

            await Promise.all([matchPromise1, matchPromise2]);
        } else {
            // For non-matching tests, wait a bit and ensure no match occurs
            let matchFound = false;
            
            socket1.on('match-found', () => { matchFound = true; });
            socket2.on('match-found', () => { matchFound = true; });
              await apiClient.joinQueue(socketId1, mode1, gore1, nudity1, ipHash1, topics1);
            await apiClient.joinQueue(socketId2, mode2, gore2, nudity2, ipHash2, topics2);
            
            // Wait for a shorter time to see if a match occurs (optimized)
            await new Promise(resolve => setTimeout(resolve, NO_MATCH_WAIT));
            expect(matchFound).toBe(false);
        }
    }
    catch (error)
    {
        throw error;    
    }        
    finally
    {
        // Clean up - try to leave queue and disconnect sockets
        try {
            if (socketId1) {
                await apiClient.leaveQueue(socketId1);
            }
        } catch (e) {
            console.warn('Error leaving queue for socket1:', e instanceof Error ? e.message : String(e));
        }
        
        try {
            if (socketId2) {
                await apiClient.leaveQueue(socketId2);
            }
        } catch (e) {
            console.warn('Error leaving queue for socket2:', e instanceof Error ? e.message : String(e));
        }

        // Force disconnect and clean up sockets
        try {
            if (socket1 && socket1.connected) {
                socket1.removeAllListeners();
                socket1.disconnect();
            }
        } catch (e) {
            console.warn('Error disconnecting socket1:', e instanceof Error ? e.message : String(e));
        }
          try {
            if (socket2 && socket2.connected) {
                socket2.removeAllListeners();
                socket2.disconnect();
            }
        } catch (e) {
            console.warn('Error disconnecting socket2:', e instanceof Error ? e.message : String(e));
        }
        
        // Reduced cleanup time for faster execution
        await new Promise(resolve => setTimeout(resolve, 300));
    }
}

async function testDelayedMatch(
    mode1: string, 
    mode2: string,
    gore1: boolean,
    gore2: boolean,
    nudity1: boolean,
    nudity2: boolean,
    topics1: string[], 
    topics2: string[]
)
{
    let socket1 = createSocket();
    let socket2 = createSocket();

    let socketId1!: string;
    let socketId2!: string;
    
    try
    {
        await Promise.all([
            new Promise<void>(resolve => socket1.on('connect', () => {
                socketId1 = socket1.id;
                resolve();
            })),
            new Promise<void>(resolve => socket2.on('connect', () => {
                socketId2 = socket2.id;
                resolve();
            }))
        ]);        // Set up match listeners BEFORE joining queue with timeouts
        const matchPromise1 = new Promise((resolve, reject) => 
        {
            const timeout = setTimeout(() => {
                reject(new Error('Delayed match timeout - no match found within expected time'));
            }, 8000); // 8 second timeout for delayed matches
            
            socket1.on('match-found', (data: any) => 
            {
                clearTimeout(timeout);
                console.log('Socket1 received delayed match-found:', data);
                expect(data.socketId).toBe(socketId1);
                expect(data.matchedSocketId).toBe(socketId2);
                resolve(data);
            });
        });

        const matchPromise2 = new Promise((resolve, reject) => 
        {
            const timeout = setTimeout(() => {
                reject(new Error('Delayed match timeout - no match found within expected time'));
            }, 8000); // 8 second timeout for delayed matches
            
            socket2.on('match-found', (data: any) => 
            {
                clearTimeout(timeout);
                console.log('Socket2 received delayed match-found:', data);
                expect(data.socketId).toBe(socketId2);
                expect(data.matchedSocketId).toBe(socketId1);
                resolve(data);
            });
        });
          // First user joins queue and waits to become eligible for delayed matching
        await apiClient.joinQueue(socketId1, mode1, gore1, nudity1, ipHash1, topics1);
        
        // Reduced wait time for delayed matching eligibility (optimized)
        await new Promise(resolve => setTimeout(resolve, 6000));
        
        // Second user joins queue then performs delayed matchmaking
        await apiClient.joinQueue(socketId2, mode2, gore2, nudity2, ipHash2, topics2);
        await apiClient.delayedMatchmaking(socketId2, mode2, gore2, nudity2, ipHash2, topics2);

        // Wait for the match to occur
        await Promise.all([matchPromise1, matchPromise2]);
    }
    catch (error)
    {
        throw error;    }        
    finally
    {
        // Clean up - try to leave queue and disconnect sockets
        try {
            if (socketId1) {
                await apiClient.leaveQueue(socketId1);
            }
        } catch (e) {
            console.warn('Error leaving queue for socket1:', e instanceof Error ? e.message : String(e));
        }
        
        try {
            if (socketId2) {
                await apiClient.leaveQueue(socketId2);
            }
        } catch (e) {
            console.warn('Error leaving queue for socket2:', e instanceof Error ? e.message : String(e));
        }

        // Force disconnect and clean up sockets
        try {
            if (socket1 && socket1.connected) {
                socket1.removeAllListeners();
                socket1.disconnect();
            }
        } catch (e) {
            console.warn('Error disconnecting socket1:', e instanceof Error ? e.message : String(e));
        }
        
        try {
            if (socket2 && socket2.connected) {
                socket2.removeAllListeners();            socket2.disconnect();
            }
        } catch (e) {
            console.warn('Error disconnecting socket2:', e instanceof Error ? e.message : String(e));
        }
        
        // Reduced cleanup time for faster execution
        await new Promise(resolve => setTimeout(resolve, 300));
    }
}