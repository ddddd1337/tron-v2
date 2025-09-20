class TronDApp {
    constructor() {
        this.provider = null;
        this.session = null;
        this.currentUri = null;
        
        this.init();
    }

    async init() {
        this.bindEvents();
        await this.checkExistingSession();
    }

    bindEvents() {
        document.getElementById('connect-btn').addEventListener('click', () => this.connect());
        document.getElementById('disconnect-btn').addEventListener('click', () => this.disconnect());
        document.querySelector('.close').addEventListener('click', () => this.hideModal());
        
        // Close modal when clicking outside
        document.getElementById('qr-modal').addEventListener('click', (e) => {
            if (e.target.id === 'qr-modal') this.hideModal();
        });
    }

    async checkExistingSession() {
        try {
            // Check if there's an existing session in localStorage
            const savedSession = localStorage.getItem('walletconnect_session');
            if (savedSession) {
                this.session = JSON.parse(savedSession);
                this.updateUI(true);
            }
        } catch (error) {
            console.log('No existing session found');
        }
    }

    async connect() {
        try {
            this.provider = await WalletConnectUniversalProvider.init({
                projectId: '555f0af265ac5f6ef43b3b567ee8a379',
                relayUrl: 'wss://relay.walletconnect.com',
                metadata: {
                    name: 'Tron dApp',
                    description: 'Tron dApp with WalletConnect v2',
                    url: window.location.origin,
                    icons: ['https://avatars.githubusercontent.com/u/37784886']
                }
            });

            const { uri, approval } = await this.provider.connect({
                namespaces: {
                    tron: {
                        methods: [
                            'tron_signTransaction',
                            'tron_signMessage',
                            'tron_sendTransaction',
                            'tron_getBalance'
                        ],
                        chains: ['tron:0x2b6653dc'],
                        events: ['chainChanged', 'accountsChanged']
                    }
                }
            });

            if (uri) {
                this.currentUri = uri;
                this.showQRCode(uri);
                this.showModal();
            }

            this.session = await approval();
            localStorage.setItem('walletconnect_session', JSON.stringify(this.session));
            
            this.hideModal();
            this.updateUI(true);
            
        } catch (error) {
            console.error('Connection failed:', error);
            alert('Connection failed: ' + error.message);
        }
    }

    async disconnect() {
        if (this.session && this.provider) {
            try {
                await this.provider.disconnect({
                    topic: this.session.topic,
                    reason: { code: 6000, message: 'User disconnected' }
                });
            } catch (error) {
                console.error('Disconnect error:', error);
            }
        }
        
        this.session = null;
        this.provider = null;
        localStorage.removeItem('walletconnect_session');
        this.updateUI(false);
    }

    showQRCode(uri) {
        const qrContainer = document.getElementById('qr-code');
        qrContainer.innerHTML = `
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(uri)}" 
                 alt="QR Code" style="border-radius: 8px; margin: 10px 0;" />
        `;
    }

    showModal() {
        document.getElementById('qr-modal').classList.remove('hidden');
    }

    hideModal() {
        document.getElementById('qr-modal').classList.add('hidden');
    }

    async updateUI(connected) {
        const connectBtn = document.getElementById('connect-btn');
        const walletInfo = document.getElementById('wallet-info');
        const accountAddress = document.getElementById('account-address');
        const accountBalance = document.getElementById('account-balance');

        if (connected && this.session) {
            connectBtn.style.display = 'none';
            walletInfo.classList.remove('hidden');
            
            try {
                const accounts = await this.provider.request({
                    topic: this.session.topic,
                    chainId: 'tron:0x2b6653dc',
                    request: {
                        method: 'tron_requestAccounts',
                        params: []
                    }
                });

                const address = Array.isArray(accounts) ? accounts[0] : accounts;
                accountAddress.textContent = `Address: ${address.slice(0, 8)}...${address.slice(-6)}`;

                const balance = await this.provider.request({
                    topic: this.session.topic,
                    chainId: 'tron:0x2b6653dc',
                    request: {
                        method: 'tron_getBalance',
                        params: [address]
                    }
                });

                accountBalance.textContent = `Balance: ${(balance / 1000000).toFixed(2)} TRX`;

            } catch (error) {
                console.error('UI update error:', error);
            }
        } else {
            connectBtn.style.display = 'block';
            walletInfo.classList.add('hidden');
        }
    }
}

// Global function for wallet buttons
function openWallet(type) {
    const uri = window.tronDApp?.currentUri;
    if (!uri) return;

    const deepLinks = {
        trust: `trust://wc?uri=${encodeURIComponent(uri)}`,
        fox: `foxwallet://wc?uri=${encodeURIComponent(uri)}`,
        gate: `gatewallet://wc?uri=${encodeURIComponent(uri)}`,
        exodus: `exodus://wc?uri=${encodeURIComponent(uri)}`
    };

    if (deepLinks[type]) {
        window.open(deepLinks[type], '_blank');
    }
}

// Initialize the dApp when page loads
window.addEventListener('load', () => {
    window.tronDApp = new TronDApp();
});
