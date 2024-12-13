document.addEventListener('DOMContentLoaded', () => {
    // Configuration
    const GITHUB_API_BASE = 'https://api.github.com/repos';
    const REPO_OWNER = 'MapMakersAndProgrammers';
    const REPO_NAME = 'tanki-bin-maps'; // Change this dynamically based on which repo is being viewed

    // DOM Elements
    const fileTreeEl = document.getElementById('file-tree');
    const breadcrumbEl = document.getElementById('breadcrumb');
    const repoNameEl = document.getElementById('repo-name');
    const readmeContainerEl = document.getElementById('readme-container');

    // Icons for different file types
    const icons = {
        folder: '../../../assets/icons/folder.svg',
        file: '../../../assets/icons/file.svg',
        'webp': '../../../assets/icons/webp.svg',
        'ktx': '../../../assets/icons/ktx.svg',
        'bin': '../../../assets/icons/bin.svg',
        'json': '../../../assets/icons/json.svg',
        'xml': '../../../assets/icons/xml.svg',
        'md': '../../../assets/icons/readme.svg'
    };

    // Markdown rendering function (using GitHub's API)
    async function renderMarkdown(markdown) {
        try {
            const response = await fetch('https://api.github.com/markdown', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: markdown,
                    mode: 'markdown'
                })
            });
            return await response.text();
        } catch (error) {
            console.error('Error rendering markdown:', error);
            return `<p>Error rendering README</p>`;
        }
    }

    /**
     * Fetch and display README
     */
    async function loadReadme() {
        try {
            // Fetch README content
            const readmeResponse = await fetch(`${GITHUB_API_BASE}/${REPO_OWNER}/${REPO_NAME}/readme`);
            const readmeData = await readmeResponse.json();

            // Decode base64 README content
            const readmeContent = atob(readmeData.content);

            // Render markdown
            const renderedReadme = await renderMarkdown(readmeContent);

            // Create README container
            const readmeWrapper = document.createElement('div');
            readmeWrapper.classList.add('readme-content');
            readmeWrapper.innerHTML = renderedReadme;

            // Clear previous content and append new README
            readmeContainerEl.innerHTML = '';
            readmeContainerEl.appendChild(readmeWrapper);
        } catch (error) {
            console.error('Error loading README:', error);
            readmeContainerEl.innerHTML = `<p>No README available</p>`;
        }
    }

    /**
     * Get appropriate icon for a file type
     * @param {string} name - Filename
     * @param {string} type - File type (dir or file)
     * @returns {string} Path to icon
     */
    function getFileIcon(name, type) {
        if (type === 'dir') return icons.folder;
        const ext = name.split('.').pop().toLowerCase();
        return icons[ext] || icons.file;
    }

    /**
     * Format bytes to human-readable string
     * @param {number} bytes - Size in bytes
     * @returns {string} Formatted file size
     */
    function formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Create breadcrumb navigation
     * @param {string} path - Current path in repository
     */
    function createBreadcrumb(path) {
        breadcrumbEl.innerHTML = '';
        const parts = path.split('/').filter(p => p);
        
        const homeLink = document.createElement('div');
        homeLink.classList.add('breadcrumb-item');
        homeLink.innerHTML = `<a href="#" data-path="">Repository Root</a>`;
        breadcrumbEl.appendChild(homeLink);

        parts.forEach((part, index) => {
            const crumb = document.createElement('div');
            crumb.classList.add('breadcrumb-item');
            const fullPath = parts.slice(0, index + 1).join('/');
            crumb.innerHTML = `<a href="#" data-path="${fullPath}">${part}</a>`;
            breadcrumbEl.appendChild(crumb);
        });

        // Add click listeners to breadcrumb items
        breadcrumbEl.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                loadRepoContents(link.dataset.path);
            });
        });
    }

    /**
     * Load and display repository contents
     * @param {string} [path=''] - Path within the repository
     */
    async function loadRepoContents(path = '') {
        try {
            const apiUrl = `${GITHUB_API_BASE}/${REPO_OWNER}/${REPO_NAME}/contents/${path}`;
            const response = await fetch(apiUrl);
            const contents = await response.json();

            // Filter out README.md doesnt work :(
            const filteredContents = contents.filter(item =>
                item.name.toLowerCase() !== 'readme.md'
            );

            // Sort contents: folders first, then files
            contents.sort((a, b) => {
                if (a.type === 'dir' && b.type !== 'dir') return -1;
                if (a.type !== 'dir' && b.type === 'dir') return 1;
                return a.name.localeCompare(b.name);
            });



            // Clear previous contents
            fileTreeEl.innerHTML = '';

            // Update page title
            repoNameEl.textContent = REPO_NAME;

            // Create breadcrumb
            createBreadcrumb(path);

            // Render contents
            contents.forEach(item => {
                const fileItem = document.createElement('div');
                fileItem.classList.add('file-item');

                const icon = document.createElement('img');
                icon.src = getFileIcon(item.name, item.type);
                icon.alt = item.type;
                icon.classList.add('file-icon');

                const nameEl = document.createElement('div');
                nameEl.classList.add('file-name');
                nameEl.textContent = item.name;

                const sizeEl = document.createElement('div');
                sizeEl.classList.add('file-size');
                sizeEl.textContent = item.type === 'file' ? formatBytes(item.size) : '';

                fileItem.appendChild(icon);
                fileItem.appendChild(nameEl);
                fileItem.appendChild(sizeEl);

                // Add click handler for folders
                if (item.type === 'dir') {
                    fileItem.addEventListener('click', () => {
                        loadRepoContents(`${path}/${item.name}`);
                    });
                } else if (item.type === 'file') {
                    // Optional: Add file preview/download logic
                    fileItem.addEventListener('click', () => {
                        window.open(item.html_url, '_blank');
                    });
                }

                fileTreeEl.appendChild(fileItem);
            });

        } catch (error) {
            console.error('Error loading repository contents:', error);
            fileTreeEl.innerHTML = `<p>Error loading repository contents. Please try again.</p>`;
        }
    }

    async function initializeRepository() {
        await loadRepoContents();
        await loadReadme();
    }

    // Initial load
    initializeRepository();
});
