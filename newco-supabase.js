// NewcoData - NewCo Supabase Data Layer
// v2.2 - localStorage removed, pure Supabase

const SUPABASE_URL = 'https://ufagkpdpzziuqiiudvmp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmYWdrcGRwenppdXFpaXVkdm1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0NDAyNzUsImV4cCI6MjA3NTAxNjI3NX0.7zla3G9lPFRiJTOE2XOiqXoIU7_5lqr1hC4KcwsNzrA';

const NewcoData = {
    customer: null,
    DB_PREFIX: 'newco_',
    supabaseUrl: SUPABASE_URL,
    supabaseKey: SUPABASE_ANON_KEY,
    cache: {}, // In-memory cache for synchronous access

    async init(customer = 'demo') {
        this.customer = customer;
        const urlParams = new URLSearchParams(window.location.search);
        const urlCustomer = urlParams.get('customer');
        if (urlCustomer) {
            this.customer = urlCustomer;
        }
        console.log(`NewCo Customer: ${this.customer}`);

        const defaults = {
            organization: {
                name: '',
                logo: '',
                address: '',
                phone: '',
                email: '',
                website: '',
                tagline: 'Your Premier Bingo Destination',
                colors: {
                    primary: '#00b894',
                    secondary: '#f59e0b',
                    accent: '#48bb78'
                }
            },
            halls: [],
            sessions: [],
            packages: [],
            salesItems: [],
            members: [],
            transactions: [],
            loyaltyItems: [],
            rewards: {
                items: [],
                coupons: [],
                pointsConfig: {
                    dollarToPoints: 10,
                    bonusRules: []
                }
            },
            schedule: {
                weekly: {},
                special: []
            },
            settings: {
                timezone: 'America/Los_Angeles',
                currency: 'USD',
                dateFormat: 'MM/DD/YYYY',
                pointsCurrencyName: 'Points'
            }
        };

        const custData = await this.read_cust();
        const initStore = { ...defaults, ...custData };

        // Load into cache
        this.cache = { ...initStore };

        // Initialize missing keys with defaults in Supabase
        for (const key of Object.keys(defaults)) {
            if (key && !custData[key]) {
                await this.set(key, defaults[key]);
            }
        }
    },

    // Read all customer data from Supabase
    async read_cust() {
        try {
            const response = await fetch(
                `${SUPABASE_URL}/rest/v1/newco_data?customer=eq.${this.customer}&select=*`,
                {
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Fetch error: ${response.status}`);
            }

            const rows = await response.json();

            // Convert array of {key, value} to {key: value} object
            const data = {};
            rows.forEach(row => {
                data[row.key] = row.value;
            });

            // Load members from members table instead of newco_data
            const membersData = await this.readMembersFromTable();
            if (membersData && membersData.length > 0) {
                data.members = membersData;
            }

            return data;
        } catch (err) {
            console.error('Error reading customer data from Supabase:', err);
            return {};
        }
    },

    // Read members from members table
    async readMembersFromTable() {
        try {
            const response = await fetch(
                `${SUPABASE_URL}/rest/v1/members?customer_id=eq.${this.customer}&select=*`,
                {
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                    }
                }
            );

            if (!response.ok) {
                console.error('Error reading members:', response.status);
                return [];
            }

            const members = await response.json();

            // Convert database format to app format
            return members.map(m => ({
                id: m.id,
                firstName: m.first_name,
                lastName: m.last_name,
                name: `${m.first_name || ''} ${m.last_name || ''}`.trim(),
                email: m.email,
                phone: m.phone || '',
                password: m.password_hash,
                dateOfBirth: m.date_of_birth || '',
                address: m.address || { street: '', city: '', state: '', zip: '' },
                tier: m.tier || 'bronze',
                lifetimePoints: m.lifetime_points || 0,
                currentPoints: m.current_points || 0,
                loyaltyPoints: m.current_points || 0,  // Admin expects this field
                lifetimeLoyalty: m.lifetime_points || 0,  // Admin expects this field
                lifetimeSpend: parseFloat(m.lifetime_spend) || 0,
                logins: 1,  // Default value for admin display
                visits: 1,  // Default value for admin display
                monthlySpend: 0,  // Default value for admin display
                barcode: m.barcode,
                memberId: m.id,
                status: m.status || 'active',
                preferredHall: m.preferred_hall,
                emailOptIn: m.email_opt_in !== false,
                smsOptIn: m.sms_opt_in === true,
                notes: m.notes || '',
                createdAt: m.created_at,
                dateCreated: m.created_at,  // Admin expects this field
                updatedAt: m.updated_at,
                lastVisit: m.last_visit,
                lastLogin: m.last_visit || m.created_at  // Admin expects this field
            }));
        } catch (err) {
            console.error('Error reading members from table:', err);
            return [];
        }
    },

    // Get value from cache (synchronous)
    get(key) {
        return this.cache[key] !== undefined ? this.cache[key] : null;
    },

    // Set value to cache AND Supabase
    async set(key, value) {
        try {
            // Update cache immediately (synchronous)
            this.cache[key] = value;

            // Handle members specially - save to members table
            if (key === 'members') {
                return await this.saveMembersToTable(value);
            }

            // Save to Supabase in background
            const jsonString = JSON.stringify(value);

            // Check if key exists
            const checkResponse = await fetch(
                `${SUPABASE_URL}/rest/v1/newco_data?customer=eq.${this.customer}&key=eq.${key}&select=id`,
                {
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                    }
                }
            );

            const existing = await checkResponse.json();

            if (existing && existing.length > 0) {
                // Update existing
                await fetch(
                    `${SUPABASE_URL}/rest/v1/newco_data?customer=eq.${this.customer}&key=eq.${key}`,
                    {
                        method: 'PATCH',
                        headers: {
                            'apikey': SUPABASE_ANON_KEY,
                            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=minimal'
                        },
                        body: JSON.stringify({
                            value: value,
                            updated_at: new Date().toISOString()
                        })
                    }
                );
            } else {
                // Insert new
                await fetch(
                    `${SUPABASE_URL}/rest/v1/newco_data`,
                    {
                        method: 'POST',
                        headers: {
                            'apikey': SUPABASE_ANON_KEY,
                            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=minimal'
                        },
                        body: JSON.stringify({
                            customer: this.customer,
                            key: key,
                            value: value,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        })
                    }
                );
            }

            return true;
        } catch (err) {
            console.error(`Error setting ${key} in Supabase:`, err);
            return false;
        }
    },

    // Save members array to members table
    async saveMembersToTable(membersArray) {
        try {
            if (!Array.isArray(membersArray)) {
                console.error('Members must be an array');
                return false;
            }

            // Get existing members to determine insert vs update
            const existingResponse = await fetch(
                `${SUPABASE_URL}/rest/v1/members?customer_id=eq.${this.customer}&select=id`,
                {
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                    }
                }
            );

            const existingMembers = await existingResponse.json();
            const existingIds = existingMembers.map(m => m.id);

            // Process each member
            for (const member of membersArray) {
                const dbMember = {
                    customer_id: this.customer,
                    email: member.email,
                    password_hash: member.password || '',
                    first_name: member.firstName || '',
                    last_name: member.lastName || '',
                    phone: member.phone || '',
                    date_of_birth: member.dateOfBirth || null,
                    address: member.address || { street: '', city: '', state: '', zip: '' },
                    tier: member.tier || 'bronze',
                    lifetime_points: member.lifetimePoints || 0,
                    current_points: member.currentPoints || 0,
                    lifetime_spend: member.lifetimeSpend || 0,
                    barcode: member.barcode || '',
                    status: member.status || 'active',
                    preferred_hall: member.preferredHall || null,
                    email_opt_in: member.emailOptIn !== false,
                    sms_opt_in: member.smsOptIn === true,
                    notes: member.notes || '',
                    updated_at: new Date().toISOString()
                };

                if (existingIds.includes(member.id)) {
                    // Update existing member
                    const updateResponse = await fetch(
                        `${SUPABASE_URL}/rest/v1/members?id=eq.${member.id}`,
                        {
                            method: 'PATCH',
                            headers: {
                                'apikey': SUPABASE_ANON_KEY,
                                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                                'Content-Type': 'application/json',
                                'Prefer': 'return=minimal'
                            },
                            body: JSON.stringify(dbMember)
                        }
                    );
                    if (!updateResponse.ok) {
                        console.error('Failed to update member:', await updateResponse.text());
                        return false;
                    }
                } else {
                    // Insert new member
                    const insertResponse = await fetch(
                        `${SUPABASE_URL}/rest/v1/members`,
                        {
                            method: 'POST',
                            headers: {
                                'apikey': SUPABASE_ANON_KEY,
                                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                                'Content-Type': 'application/json',
                                'Prefer': 'return=minimal'
                            },
                            body: JSON.stringify({
                                id: member.id,
                                ...dbMember,
                                created_at: member.createdAt || new Date().toISOString()
                            })
                        }
                    );
                    if (!insertResponse.ok) {
                        const errorText = await insertResponse.text();
                        console.error('Failed to insert member:', errorText);
                        return false;
                    }
                }
            }

            return true;
        } catch (err) {
            console.error('Error saving members to table:', err);
            return false;
        }
    },

    // Delete from Supabase only
    async delete(key) {
        try {
            await fetch(
                `${SUPABASE_URL}/rest/v1/newco_data?customer=eq.${this.customer}&key=eq.${key}`,
                {
                    method: 'DELETE',
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                    }
                }
            );

            return true;
        } catch (err) {
            console.error(`Error deleting ${key} from Supabase:`, err);
            return false;
        }
    },

    // Clear all data for this customer
    async clear() {
        try {
            await fetch(
                `${SUPABASE_URL}/rest/v1/newco_data?customer=eq.${this.customer}`,
                {
                    method: 'DELETE',
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                    }
                }
            );

            console.log(`Cleared all data for customer: ${this.customer}`);
            return true;
        } catch (err) {
            console.error('Error clearing customer data:', err);
            return false;
        }
    },

    // Get all keys for this customer
    async keys() {
        try {
            const response = await fetch(
                `${SUPABASE_URL}/rest/v1/newco_data?customer=eq.${this.customer}&select=key`,
                {
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Fetch error: ${response.status}`);
            }

            const rows = await response.json();
            return rows.map(row => row.key);
        } catch (err) {
            console.error('Error getting keys from Supabase:', err);
            return [];
        }
    },

    // Get all data for this customer
    async getAll() {
        try {
            const response = await fetch(
                `${SUPABASE_URL}/rest/v1/newco_data?customer=eq.${this.customer}&select=*`,
                {
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Fetch error: ${response.status}`);
            }

            const rows = await response.json();
            const data = {};
            rows.forEach(row => {
                data[row.key] = row.value;
            });

            return data;
        } catch (err) {
            console.error('Error getting all data from Supabase:', err);
            return {};
        }
    },

    // Update organization (helper method)
    async updateOrganization(org) {
        return await this.set('organization', org);
    }
};

// Export for use in other files
if (typeof window !== 'undefined') {
    window.NewcoData = NewcoData;
}
