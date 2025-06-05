class MatchmakingAPIClient
{
    constructor()
    {
        this.baseUrl = '/api/matchmaking';
    }

    async joinQueue(socketId, mode, gore, nudity, ipHash, topics = [])
    {
        try
        {
            const response = await fetch(`${this.baseUrl}/join-queue`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ socketId, mode, nudity, gore, ipHash, topics })
            });

            if (!response.ok)
            {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Joined queue:', data);
        }
        catch (error)
        {
            console.error('Error joining queue:', error);
        }
    }

    async leaveQueue(socketId)
    {
        try
        {
            const response = await fetch(`${this.baseUrl}/leave-queue`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ socketId })
            });

            if (!response.ok)
            {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Left queue:', data);
        }
        catch (error)
        {
            console.error('Error leaving queue:', error);
        }
    }

    async delayedMatchmaking(socketId, mode, gore, nudity, ipHash, topics = [])
    {
        try
        {
            const response = await fetch(`${this.baseUrl}/delayed-matchmaking`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ socketId, mode, gore, nudity, ipHash, topics })
            });

            if (!response.ok)
            {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Delayed matchmaking:', data);
        }
        catch (error)
        {
            console.error('Error in delayed matchmaking:', error);
        }
    }

    async blockUser(sourceIp, blockedIp)
    {
        try
        {
            const response = await fetch(`${this.baseUrl}/block-user`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ sourceIp, blockedIp })
            });

            if (!response.ok)
            {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('User blocked:', data);
            return data;
        }
        catch (error)
        {
            console.error('Error blocking user:', error);
            throw error;
        }
    }
}