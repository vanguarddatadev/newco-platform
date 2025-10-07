// NewCo Payment Processor - Authorize.Net Integration
// Handles secure payment processing using Accept.js tokenization

const PaymentProcessor = {
    initialized: false,
    environment: 'sandbox', // 'sandbox' or 'production'
    credentials: null,

    // Hardcoded sandbox credentials for testing (anyone can use these)
    SANDBOX_CREDENTIALS: {
        apiLoginID: '9Yec389BKa',
        transactionKey: '64LSvd6WT947y7J6',
        clientKey: '2nwP2CJXPts57aWyk8bm38aX28hCM7L355kHquJFv29NdmQ8cSPdpaUQMGe5LcLs',
        environment: 'sandbox'
    },

    // Initialize payment processor with credentials from Supabase or hardcoded sandbox
    async init() {
        const integrations = NewcoData.get('integrations') || {};
        const authNet = integrations.authorizeNet;
        const activeEnv = authNet?.activeEnvironment || 'sandbox';

        // Check if production mode is active and credentials exist
        if (activeEnv === 'production' && authNet?.productionCredentials) {
            this.credentials = {
                apiLoginID: authNet.productionCredentials.apiLoginId,
                transactionKey: authNet.productionCredentials.transactionKey,
                clientKey: authNet.productionCredentials.publicClientKey,
                environment: 'production'
            };
            console.log('✅ Using production Authorize.Net credentials');
        } else {
            // Otherwise use hardcoded sandbox credentials
            this.credentials = this.SANDBOX_CREDENTIALS;
            console.log('ℹ️ Using hardcoded sandbox credentials (for testing)');
        }

        this.environment = this.credentials.environment;

        // Load Accept.js library
        await this.loadAcceptJS();
        this.initialized = true;
        return true;
    },

    // Dynamically load Accept.js library
    loadAcceptJS() {
        return new Promise((resolve, reject) => {
            // Check if already loaded
            if (window.Accept) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            const url = this.environment === 'production'
                ? 'https://js.authorize.net/v1/Accept.js'
                : 'https://jstest.authorize.net/v1/Accept.js';

            script.src = url;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    },

    // Tokenize payment data using Accept.js
    tokenizeCard(cardData) {
        return new Promise((resolve, reject) => {
            if (!this.initialized) {
                reject(new Error('Payment processor not initialized'));
                return;
            }

            // Check if we're on HTTPS (Accept.js requirement)
            const isHttps = window.location.protocol === 'https:';
            const isLocalFile = window.location.protocol === 'file:';

            // If not HTTPS (local file or HTTP), use mock tokenization for demo
            if (!isHttps || isLocalFile) {
                console.log('⚠️ Not on HTTPS - using mock tokenization for demo');
                setTimeout(() => {
                    resolve({
                        dataDescriptor: 'COMMON.ACCEPT.INAPP.PAYMENT',
                        dataValue: 'MOCK_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
                    });
                }, 500);
                return;
            }

            if (!window.Accept) {
                reject(new Error('Accept.js library not loaded'));
                return;
            }

            const secureData = {
                authData: {
                    apiLoginID: this.credentials.apiLoginID,
                    clientKey: this.credentials.clientKey
                },
                cardData: {
                    cardNumber: cardData.cardNumber,
                    month: cardData.expiryMonth,
                    year: cardData.expiryYear,
                    cardCode: cardData.cvv
                }
            };

            window.Accept.dispatchData(secureData, (response) => {
                if (response.messages.resultCode === 'Error') {
                    const errors = response.messages.message.map(m => m.text).join(', ');
                    reject(new Error(errors));
                } else {
                    // Return payment nonce (opaqueData)
                    resolve({
                        dataDescriptor: response.opaqueData.dataDescriptor,
                        dataValue: response.opaqueData.dataValue
                    });
                }
            });
        });
    },

    // Process payment transaction
    async processPayment(paymentData) {
        try {
            // First tokenize the card
            const paymentNonce = await this.tokenizeCard({
                cardNumber: paymentData.cardNumber,
                expiryMonth: paymentData.expiryMonth,
                expiryYear: paymentData.expiryYear,
                cvv: paymentData.cvv
            });

            // Now charge the transaction using the nonce
            const transactionResult = await this.chargeTransaction({
                amount: paymentData.amount,
                paymentNonce: paymentNonce,
                description: paymentData.description,
                customerId: paymentData.customerId,
                customerEmail: paymentData.customerEmail,
                invoiceNumber: paymentData.invoiceNumber
            });

            return transactionResult;
        } catch (error) {
            console.error('Payment processing error:', error);
            throw error;
        }
    },

    // Charge transaction using payment nonce
    async chargeTransaction(data) {
        // IMPORTANT: In production, this MUST be done server-side!
        // Direct API calls from browser expose your Transaction Key (security risk)
        // and are blocked by CORS policies.
        //
        // Proper flow:
        // 1. Browser: Accept.js tokenizes card → returns payment nonce
        // 2. Browser: Send nonce to YOUR server
        // 3. Server: Charge the nonce using Authorize.Net API (with Transaction Key)
        // 4. Server: Return result to browser
        //
        // For demo/testing purposes, we'll simulate a successful transaction

        console.log('💳 Simulating transaction charge (sandbox mode)...');
        console.log('Payment nonce:', data.paymentNonce);
        console.log('Amount:', data.amount);

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Generate mock transaction response
        const mockTransactionId = 'DEMO_' + Date.now();
        const mockAuthCode = 'ABC' + Math.floor(Math.random() * 1000);

        // NOTE: Transaction logging is handled by the checkout flow in Customer Demo
        // The full transaction record (with customer info, items, loyalty, etc.) is created there
        // We don't log a partial transaction here to avoid duplicates

        // Return mock successful response matching Authorize.Net structure
        return {
            success: true,
            transactionId: mockTransactionId,
            authCode: mockAuthCode,
            accountNumber: 'XXXX1111', // Mock last 4 of test card
            accountType: 'Visa',
            avsResultCode: 'Y', // Address matches
            cvvResultCode: 'M', // CVV matches
            networkTransId: 'NET_' + Date.now(),
            responseCode: '1', // Approved
            message: '✅ DEMO: Payment processed successfully (sandbox simulation)'
        };
    },

    // Log transaction to NewCo database
    async logTransaction(transaction) {
        const transactions = NewcoData.get('transactions') || [];

        const txnRecord = {
            id: 'txn_' + Date.now(),
            transactionId: transaction.transactionId,
            amount: transaction.amount,
            customerId: transaction.customerId,
            status: transaction.status,
            timestamp: transaction.timestamp,
            invoiceNumber: transaction.invoiceNumber,
            description: transaction.description,
            source: 'authorize_net',
            metadata: {
                authCode: transaction.authCode
            }
        };

        transactions.push(txnRecord);

        console.log('💾 Logging transaction to NewCo:', txnRecord);
        await NewcoData.set('transactions', transactions);
        console.log('✅ Transaction logged successfully');
    },

    // Void transaction (cancel before settlement)
    async voidTransaction(transactionId) {
        // Demo mode: Simulate void
        console.log('🚫 Simulating transaction void (demo mode)...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        return {
            success: true,
            transactionId: 'VOID_' + Date.now(),
            message: '✅ DEMO: Transaction voided successfully'
        };

        /* Production code (requires server):
        const transactionRequest = {
            createTransactionRequest: {
                merchantAuthentication: {
                    name: this.credentials.apiLoginID,
                    transactionKey: this.credentials.transactionKey
                },
                transactionRequest: {
                    transactionType: 'voidTransaction',
                    refTransId: transactionId
                }
            }
        };

        const apiUrl = this.environment === 'production'
            ? 'https://api.authorize.net/xml/v1/request.api'
            : 'https://apitest.authorize.net/xml/v1/request.api';

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(transactionRequest)
            });

            const result = await response.json();

            if (result.messages.resultCode === 'Ok') {
                return {
                    success: true,
                    transactionId: result.transactionResponse.transId,
                    message: 'Transaction voided successfully'
                };
            } else {
                const errorMessage = result.transactionResponse?.errors?.[0]?.errorText || result.messages.message[0].text;
                throw new Error(errorMessage);
            }
        } catch (error) {
            throw new Error('Void failed: ' + error.message);
        }
        */
    },

    // Refund transaction (after settlement)
    async refundTransaction(transactionId, amount, cardLast4) {
        // Demo mode: Simulate refund
        console.log('💰 Simulating transaction refund (demo mode)...');
        console.log('Refund amount:', amount);
        await new Promise(resolve => setTimeout(resolve, 1000));

        return {
            success: true,
            transactionId: 'REFUND_' + Date.now(),
            message: `✅ DEMO: Refunded $${amount.toFixed(2)} successfully`
        };

        /* Production code (requires server):
        const transactionRequest = {
            createTransactionRequest: {
                merchantAuthentication: {
                    name: this.credentials.apiLoginID,
                    transactionKey: this.credentials.transactionKey
                },
                transactionRequest: {
                    transactionType: 'refundTransaction',
                    amount: amount.toFixed(2),
                    payment: {
                        creditCard: {
                            cardNumber: cardLast4,
                            expirationDate: 'XXXX'
                        }
                    },
                    refTransId: transactionId
                }
            }
        };

        const apiUrl = this.environment === 'production'
            ? 'https://api.authorize.net/xml/v1/request.api'
            : 'https://apitest.authorize.net/xml/v1/request.api';

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(transactionRequest)
            });

            const result = await response.json();

            if (result.messages.resultCode === 'Ok') {
                return {
                    success: true,
                    transactionId: result.transactionResponse.transId,
                    message: 'Refund processed successfully'
                };
            } else {
                const errorMessage = result.transactionResponse?.errors?.[0]?.errorText || result.messages.message[0].text;
                throw new Error(errorMessage);
            }
        } catch (error) {
            throw new Error('Refund failed: ' + error.message);
        }
        */
    },

    // Validate card (auth only, no capture)
    async validateCard(cardData) {
        // TODO: Implement card validation (auth-only transaction)
        throw new Error('Card validation not yet implemented');
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PaymentProcessor;
}
