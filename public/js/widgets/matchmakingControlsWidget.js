class MatchmakingControlsWidget
{
    constructor(webRTCConnectionManager)
    {
        this.webRTCConnectionManager = webRTCConnectionManager;

        this.skipButtonElement = document.getElementById('skip-user-button');

        window.matchmakingControlsWidget = this;

        this.webRTCConnectionManager.on(this.webRTCConnectionManager.EventTypes.CONNECTION_READY, () =>
        {
            this.#handleConnectionReady();
        });

        this.webRTCConnectionManager.on(this.webRTCConnectionManager.EventTypes.CONNECTION_CLOSED, () =>
        {
            this.skipButtonElement.disabled = true;
        });

        this.#setupUIEventListeners();
    }

    Skip()
    {
        this.webRTCConnectionManager.CloseConnection();
    }

    async #handleConnectionReady()
    {
        // Skip button count down
        let countdown = 5;

        while (countdown > 0)
        {
            this.skipButtonElement.innerHTML = countdown;
            await new Promise(resolve => setTimeout(resolve, 1000));
            countdown--;
        }

        this.skipButtonElement.innerHTML = '<i class="fas fa-step-forward"></i>';
        this.skipButtonElement.disabled = false;
    }
    
    #setupUIEventListeners()
    {
        this.skipButtonElement.addEventListener('click', async () =>
        {
            const response = await this.webRTCConnectionManager.CloseConnection();
        });
    }
}