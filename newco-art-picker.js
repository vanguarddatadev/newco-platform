// NewCo Art Picker Component
// Reusable art picker modal for selecting art from library or uploading new files

const ArtPicker = {
    currentCallback: null,
    currentCustomerId: null,
    allArt: [],
    myArt: [],
    newcoArt: [],
    recentArt: [],
    activeTab: 'newco',

    // Initialize the art picker
    init(customerId) {
        this.currentCustomerId = customerId;
        this.injectHTML();
        this.injectStyles();
    },

    // Inject HTML for the art picker modal
    injectHTML() {
        if (document.getElementById('artPickerModal')) return;

        const modalHTML = `
            <div id="artPickerModal" class="modal" style="display: none;">
                <div class="modal-content" style="max-width: 900px; max-height: 90vh; position: relative;">
                    <button class="modal-close" onclick="ArtPicker.close()">&times;</button>
                    <div class="modal-header">
                        <h2>🖼️ Select or Upload Art</h2>
                    </div>
                    <div class="modal-body" style="padding: 0; overflow: hidden;">
                        <!-- Tabs -->
                        <div class="art-picker-tabs">
                            <button class="art-picker-tab active" onclick="ArtPicker.switchTab('newco')">
                                🌐 NewCo Library
                            </button>
                            <button class="art-picker-tab" onclick="ArtPicker.switchTab('my')">
                                📁 My Library
                            </button>
                            <button class="art-picker-tab" onclick="ArtPicker.switchTab('recent')">
                                🕒 Recent
                            </button>
                            <button class="art-picker-tab" onclick="ArtPicker.switchTab('upload')">
                                📤 Upload New
                            </button>
                        </div>

                        <!-- Search and Filters -->
                        <div id="artPickerFilters" class="art-picker-filters">
                            <input type="text" id="artPickerSearch" class="form-input" placeholder="Search art..."
                                   oninput="ArtPicker.filterArt()" style="flex: 1;">
                            <select id="artPickerCategory" class="form-select" onchange="ArtPicker.filterArt()">
                                <option value="">All Categories</option>
                                <option value="logo">Logo</option>
                                <option value="banner">Banner</option>
                                <option value="package">Package</option>
                                <option value="social">Social Media</option>
                                <option value="marketing">Marketing</option>
                                <option value="background">Background</option>
                                <option value="icon">Icon</option>
                                <option value="other">Other</option>
                            </select>
                        </div>

                        <!-- Art Grid -->
                        <div id="artPickerGrid" class="art-picker-grid">
                            <div style="text-align: center; padding: 3rem; color: #999;">
                                Loading...
                            </div>
                        </div>

                        <!-- Upload Form -->
                        <div id="artPickerUpload" class="art-picker-upload" style="display: none;">
                            <form onsubmit="ArtPicker.uploadArt(event)">
                                <div class="form-group">
                                    <label class="form-label">Select Image Files (5MB max per file)</label>
                                    <input type="file" id="artPickerFiles" class="form-input"
                                           accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/gif,image/webp"
                                           multiple required style="width: 100%;">
                                    <small style="color: #666; margin-top: 0.5rem; display: block;">
                                        PNG, JPG, SVG, GIF, WebP. Multiple files allowed.
                                    </small>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Category</label>
                                    <select id="artPickerUploadCategory" class="form-select" required style="width: 100%;">
                                        <option value="">Select Category</option>
                                        <option value="logo">Logo</option>
                                        <option value="banner">Banner</option>
                                        <option value="package">Package</option>
                                        <option value="social">Social Media</option>
                                        <option value="marketing">Marketing</option>
                                        <option value="background">Background</option>
                                        <option value="icon">Icon</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Description (optional)</label>
                                    <textarea id="artPickerDescription" class="form-input" rows="2"
                                              style="width: 100%;" placeholder="Brief description..."></textarea>
                                </div>
                                <div style="display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 1.5rem;">
                                    <button type="button" class="btn btn-secondary" onclick="ArtPicker.switchTab('my')">Cancel</button>
                                    <button type="submit" class="btn btn-primary">Upload & Select</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    },

    // Inject CSS styles
    injectStyles() {
        if (document.getElementById('artPickerStyles')) return;

        const styles = `
            <style id="artPickerStyles">
                #artPickerModal .modal-close {
                    position: absolute;
                    top: 1rem;
                    right: 1rem;
                    background: #ff4444;
                    color: white;
                    border: none;
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    font-size: 24px;
                    line-height: 1;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.3s;
                    z-index: 1000;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                }

                #artPickerModal .modal-close:hover {
                    background: #cc0000;
                    transform: scale(1.1);
                }

                .art-picker-tabs {
                    display: flex;
                    border-bottom: 2px solid #e0e0e0;
                    background: #f8f9fa;
                    padding: 0 1rem;
                }

                .art-picker-tab {
                    padding: 1rem 1.5rem;
                    border: none;
                    background: transparent;
                    cursor: pointer;
                    font-weight: 600;
                    color: #666;
                    border-bottom: 3px solid transparent;
                    margin-bottom: -2px;
                    transition: all 0.3s;
                }

                .art-picker-tab:hover {
                    color: #333;
                    background: rgba(0,0,0,0.05);
                }

                .art-picker-tab.active {
                    color: #6c5ce7;
                    border-bottom-color: #6c5ce7;
                    background: white;
                }

                .art-picker-filters {
                    display: flex;
                    gap: 1rem;
                    padding: 1rem;
                    background: white;
                    border-bottom: 1px solid #e0e0e0;
                }

                .art-picker-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
                    gap: 1rem;
                    padding: 1rem;
                    max-height: 500px;
                    overflow-y: auto;
                    background: #f8f9fa;
                }

                .art-picker-item {
                    background: white;
                    border-radius: 8px;
                    overflow: hidden;
                    cursor: pointer;
                    transition: all 0.3s;
                    border: 2px solid transparent;
                }

                .art-picker-item:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    border-color: #6c5ce7;
                }

                .art-picker-item img {
                    width: 100%;
                    height: 150px;
                    object-fit: contain;
                    background: #f8f9fa;
                    padding: 0.5rem;
                }

                .art-picker-item-info {
                    padding: 0.5rem;
                    font-size: 0.75rem;
                }

                .art-picker-item-name {
                    font-weight: 600;
                    color: #333;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    margin-bottom: 0.25rem;
                }

                .art-picker-item-meta {
                    color: #999;
                    font-size: 0.7rem;
                }

                .art-picker-upload {
                    padding: 2rem;
                    background: white;
                }
            </style>
        `;

        document.head.insertAdjacentHTML('beforeend', styles);
    },

    // Open the art picker
    async open(callback, customerId = null) {
        this.currentCallback = callback;
        if (customerId) this.currentCustomerId = customerId;

        // Ensure modal is injected
        if (!document.getElementById('artPickerModal')) {
            this.injectHTML();
            this.injectStyles();
        }

        const modal = document.getElementById('artPickerModal');
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('active');
        }

        // Load art libraries
        await this.loadArt();
        this.switchTab('newco');
    },

    // Close the art picker
    close() {
        const modal = document.getElementById('artPickerModal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
        }
        this.currentCallback = null;
    },

    // Switch tabs
    switchTab(tab) {
        this.activeTab = tab;

        // Update tab buttons
        document.querySelectorAll('.art-picker-tab').forEach(t => t.classList.remove('active'));
        const activeButton = Array.from(document.querySelectorAll('.art-picker-tab')).find(
            btn => btn.textContent.includes(
                tab === 'newco' ? 'NewCo Library' :
                tab === 'my' ? 'My Library' :
                tab === 'recent' ? 'Recent' : 'Upload New'
            )
        );
        if (activeButton) activeButton.classList.add('active');

        // Show/hide filters and upload form
        const filters = document.getElementById('artPickerFilters');
        const grid = document.getElementById('artPickerGrid');
        const upload = document.getElementById('artPickerUpload');

        if (tab === 'upload') {
            filters.style.display = 'none';
            grid.style.display = 'none';
            upload.style.display = 'block';
        } else {
            filters.style.display = 'flex';
            grid.style.display = 'grid';
            upload.style.display = 'none';
            this.renderArt();
        }
    },

    // Load art from Supabase
    async loadArt() {
        const SUPABASE_URL = 'https://ufagkpdpzziuqiiudvmp.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmYWdrcGRwenppdXFpaXVkdm1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0NDAyNzUsImV4cCI6MjA3NTAxNjI3NX0.7zla3G9lPFRiJTOE2XOiqXoIU7_5lqr1hC4KcwsNzrA';

        try {
            // Load NewCo global art
            const newcoResponse = await fetch(
                `${SUPABASE_URL}/rest/v1/art_library?customer_id=eq.newco&order=created_at.desc`,
                {
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                    }
                }
            );
            this.newcoArt = await newcoResponse.json();

            // Load customer's own art
            if (this.currentCustomerId && this.currentCustomerId !== 'newco') {
                const myResponse = await fetch(
                    `${SUPABASE_URL}/rest/v1/art_library?customer_id=eq.${this.currentCustomerId}&order=created_at.desc`,
                    {
                        headers: {
                            'apikey': SUPABASE_ANON_KEY,
                            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                        }
                    }
                );
                this.myArt = await myResponse.json();
            }

            // Combine all art for recent tab (last 20 items)
            this.allArt = [...this.myArt, ...this.newcoArt];
            this.recentArt = this.allArt.slice(0, 20);

        } catch (error) {
            console.error('Error loading art:', error);
        }
    },

    // Render art grid based on active tab
    renderArt() {
        let artToShow = [];

        if (this.activeTab === 'newco') {
            artToShow = this.newcoArt;
        } else if (this.activeTab === 'my') {
            artToShow = this.myArt;
        } else if (this.activeTab === 'recent') {
            artToShow = this.recentArt;
        }

        // Apply filters
        const search = document.getElementById('artPickerSearch').value.toLowerCase();
        const category = document.getElementById('artPickerCategory').value;

        artToShow = artToShow.filter(art => {
            const matchesSearch = !search ||
                art.name.toLowerCase().includes(search) ||
                (art.description && art.description.toLowerCase().includes(search));
            const matchesCategory = !category || art.category === category;
            return matchesSearch && matchesCategory;
        });

        const grid = document.getElementById('artPickerGrid');

        if (artToShow.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: #999;">
                    ${this.activeTab === 'my' ? 'No art in your library yet. Upload some or use the NewCo library.' : 'No art found.'}
                </div>
            `;
            return;
        }

        grid.innerHTML = artToShow.map(art => `
            <div class="art-picker-item" onclick="ArtPicker.selectArt('${art.id}')">
                <img src="${art.file_data}" alt="${art.name}" loading="lazy">
                <div class="art-picker-item-info">
                    <div class="art-picker-item-name" title="${art.name}">${art.name}</div>
                    <div class="art-picker-item-meta">
                        ${art.file_type.toUpperCase()} • ${(art.file_size / 1024).toFixed(1)}KB
                    </div>
                </div>
            </div>
        `).join('');
    },

    // Filter art
    filterArt() {
        this.renderArt();
    },

    // Select an art piece
    selectArt(artId) {
        const art = this.allArt.find(a => a.id === artId);
        if (art && this.currentCallback) {
            this.currentCallback(art);
            this.close();
        }
    },

    // Upload new art
    async uploadArt(event) {
        event.preventDefault();

        const SUPABASE_URL = 'https://ufagkpdpzziuqiiudvmp.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmYWdrcGRwenppdXFpaXVkdm1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0NDAyNzUsImV4cCI6MjA3NTAxNjI3NX0.7zla3G9lPFRiJTOE2XOiqXoIU7_5lqr1hC4KcwsNzrA';

        const files = document.getElementById('artPickerFiles').files;
        const category = document.getElementById('artPickerUploadCategory').value;
        const description = document.getElementById('artPickerDescription').value;

        if (files.length === 0) {
            alert('Please select at least one file.');
            return;
        }

        // Validate file sizes
        for (let file of files) {
            if (file.size > 5 * 1024 * 1024) {
                alert(`File "${file.name}" exceeds 5MB limit.`);
                return;
            }
        }

        try {
            let uploadedArt = null;

            // Upload first file
            const file = files[0];

            const fileData = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            const img = new Image();
            await new Promise((resolve) => {
                img.onload = resolve;
                img.src = fileData;
            });

            const artData = {
                customer_id: this.currentCustomerId,
                name: file.name.replace(/\.[^/.]+$/, ""),
                description: description,
                category: category,
                file_data: fileData,
                file_type: file.type.split('/')[1],
                width: img.width,
                height: img.height,
                file_size: file.size,
                uploaded_by: 'admin',
                is_global: false
            };

            const response = await fetch(
                `${SUPABASE_URL}/rest/v1/art_library`,
                {
                    method: 'POST',
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify(artData)
                }
            );

            if (!response.ok) {
                throw new Error('Failed to upload art');
            }

            const result = await response.json();
            uploadedArt = result[0];

            // Reset form
            document.getElementById('artPickerFiles').value = '';
            document.getElementById('artPickerUploadCategory').value = '';
            document.getElementById('artPickerDescription').value = '';

            // Reload art and auto-select the uploaded piece
            await this.loadArt();

            if (uploadedArt && this.currentCallback) {
                this.currentCallback(uploadedArt);
                this.close();
            }

        } catch (error) {
            console.error('Error uploading art:', error);
            alert('Error uploading art: ' + error.message);
        }
    }
};

// Auto-initialize when script loads
if (typeof window !== 'undefined') {
    window.ArtPicker = ArtPicker;
}
