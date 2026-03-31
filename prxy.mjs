async function initTransport() {
    if (document.readyState !== 'loading') {
        setupTransport();
    } else {
        document.addEventListener('DOMContentLoaded', setupTransport);
    }
}

async function setupTransport() {
    // Your transport setup code here
}