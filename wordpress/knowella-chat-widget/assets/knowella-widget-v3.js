/**
 * Knowella Chat Widget
 * Standalone AI chat widget for Knowella website
 */

(function() {
    'use strict';
    
    // Configuration (passed from WordPress via wp_localize_script)
    const config = window.knowellaConfig || {
        apiUrl: 'http://localhost:3000/chat/knowella',
        theme: 'light'
    };
    
    // DOM Elements
    let chatButton, chatPanel, chatMessages, chatForm, chatInput, chatSendBtn, chatClose;
    
    // State
    let isOpen = false;
    let isLoading = false;
    
    // Session storage key for chat history
    const STORAGE_KEY = 'knowella_chat_history';
    
    /**
     * Initialize widget
     */
    function init() {
        // Get DOM elements
        chatButton = document.getElementById('knowella-chat-button');
        chatPanel = document.getElementById('knowella-chat-panel');
        chatMessages = document.getElementById('knowella-chat-messages');
        chatForm = document.getElementById('knowella-chat-form');
        chatInput = document.getElementById('knowella-chat-input');
        chatSendBtn = document.getElementById('knowella-chat-send');
        chatClose = document.getElementById('knowella-chat-close');
        
        if (!chatButton || !chatPanel) {
            console.error('Knowella Chat Widget: Required elements not found');
            return;
        }
        
        // Event listeners
        chatButton.addEventListener('click', toggleChat);
        chatClose.addEventListener('click', closeChat);
        chatForm.addEventListener('submit', handleSubmit);
        
        // Load chat history from sessionStorage
        loadChatHistory();
        
        console.log('Knowella Chat Widget initialized');
    }
    
    /**
     * Toggle chat panel
     */
    function toggleChat() {
        if (isOpen) {
            closeChat();
        } else {
            openChat();
        }
    }
    
    /**
     * Open chat panel
     */
    function openChat() {
        chatPanel.style.display = 'flex';
        chatButton.style.display = 'none';
        chatInput.focus();
        isOpen = true;
        
        // Scroll to bottom
        scrollToBottom();
    }
    
    /**
     * Close chat panel
     */
    function closeChat() {
        chatPanel.style.display = 'none';
        chatButton.style.display = 'flex';
        isOpen = false;
    }
    
    /**
     * Handle form submission
     */
    async function handleSubmit(e) {
        e.preventDefault();
        
        const question = chatInput.value.trim();
        
        if (!question || isLoading) {
            return;
        }
        
        // Clear input
        chatInput.value = '';
        
        // Add user message to chat
        addMessage(question, 'user');
        
        // Show loading indicator
        showLoading();
        
        try {
            // Call API
            const response = await fetch(config.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ question })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Remove loading indicator
            removeLoading();
            
            // Add bot response
            addMessage(data.answer, 'bot', data.citations || []);
            
            // Save to session storage
            saveChatHistory();
            
        } catch (error) {
            console.error('Knowella Chat Error:', error);
            removeLoading();
            addErrorMessage('Sorry, I encountered an error. Please try again in a moment.');
        }
    }
    
    /**
     * Parse markdown to HTML
     */
    function parseMarkdown(text) {
        let html = text;
        
        // Escape HTML to prevent XSS
        html = html.replace(/&/g, '&amp;')
                   .replace(/</g, '&lt;')
                   .replace(/>/g, '&gt;');
        
        // Parse bold **text**
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        
        // Parse markdown links [text](url)
        html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
        
        // Parse bullet points • item
        html = html.replace(/^• (.+)$/gm, '<li>$1</li>');
        
        // Wrap consecutive list items in <ul>
        html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
        
        // Parse line breaks (double newline = paragraph break)
        html = html.split('\n\n').map(para => {
            // Don't wrap if it's already a list or heading
            if (para.startsWith('<ul>') || para.startsWith('<strong>')) {
                return para;
            }
            return `<p>${para.replace(/\n/g, '<br>')}</p>`;
        }).join('');
        
        return html;
    }

    /**
     * Add message to chat
     */
    function addMessage(text, sender, citations = []) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `knowella-message knowella-message-${sender}`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'knowella-message-content';
        
        const textDiv = document.createElement('div');
        // Parse markdown for bot messages, plain text for user messages
        if (sender === 'bot') {
            textDiv.innerHTML = parseMarkdown(text);
        } else {
            textDiv.textContent = text;
        }
        contentDiv.appendChild(textDiv);
        
        // Add citations if present
        if (citations && citations.length > 0) {
            const citationsDiv = document.createElement('div');
            citationsDiv.className = 'knowella-citations';
            
            const citationsTitle = document.createElement('div');
            citationsTitle.className = 'knowella-citations-title';
            citationsTitle.textContent = '📚 Sources:';
            citationsDiv.appendChild(citationsTitle);
            
            citations.forEach(citation => {
                const citationLink = document.createElement('a');
                citationLink.href = citation.url;
                citationLink.target = '_blank';
                citationLink.rel = 'noopener noreferrer';
                citationLink.className = 'knowella-citation';
                
                const titleSpan = document.createElement('span');
                titleSpan.className = 'knowella-citation-title';
                titleSpan.textContent = citation.title || 'Learn more';
                
                const urlSpan = document.createElement('span');
                urlSpan.className = 'knowella-citation-url';
                urlSpan.textContent = citation.url;
                
                citationLink.appendChild(titleSpan);
                citationLink.appendChild(urlSpan);
                citationsDiv.appendChild(citationLink);
            });
            
            contentDiv.appendChild(citationsDiv);
        }
        
        messageDiv.appendChild(contentDiv);
        chatMessages.appendChild(messageDiv);
        
        scrollToBottom();
    }
    
    /**
     * Show loading indicator
     */
    function showLoading() {
        isLoading = true;
        chatSendBtn.disabled = true;
        chatInput.disabled = true;
        
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'knowella-message knowella-message-bot';
        loadingDiv.id = 'knowella-loading';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'knowella-message-content';
        
        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'knowella-loading';
        loadingIndicator.innerHTML = `
            <div class="knowella-loading-dot"></div>
            <div class="knowella-loading-dot"></div>
            <div class="knowella-loading-dot"></div>
        `;
        
        contentDiv.appendChild(loadingIndicator);
        loadingDiv.appendChild(contentDiv);
        chatMessages.appendChild(loadingDiv);
        
        scrollToBottom();
    }
    
    /**
     * Remove loading indicator
     */
    function removeLoading() {
        isLoading = false;
        chatSendBtn.disabled = false;
        chatInput.disabled = false;
        chatInput.focus();
        
        const loadingDiv = document.getElementById('knowella-loading');
        if (loadingDiv) {
            loadingDiv.remove();
        }
    }
    
    /**
     * Add error message
     */
    function addErrorMessage(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'knowella-error';
        errorDiv.textContent = message;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'knowella-message knowella-message-bot';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'knowella-message-content';
        contentDiv.appendChild(errorDiv);
        
        messageDiv.appendChild(contentDiv);
        chatMessages.appendChild(messageDiv);
        
        scrollToBottom();
    }
    
    /**
     * Scroll to bottom of messages
     */
    function scrollToBottom() {
        setTimeout(() => {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 100);
    }
    
    /**
     * Save chat history to sessionStorage
     */
    function saveChatHistory() {
        try {
            const messages = Array.from(chatMessages.children)
                .filter(msg => !msg.id || msg.id !== 'knowella-loading')
                .map(msg => msg.outerHTML);
            
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
        } catch (error) {
            console.warn('Failed to save chat history:', error);
        }
    }
    
    /**
     * Load chat history from sessionStorage
     */
    function loadChatHistory() {
        try {
            const saved = sessionStorage.getItem(STORAGE_KEY);
            
            if (saved) {
                const messages = JSON.parse(saved);
                // Keep only the welcome message, append saved messages
                chatMessages.innerHTML = chatMessages.innerHTML; // Keep welcome
                messages.slice(1).forEach(html => {
                    const temp = document.createElement('div');
                    temp.innerHTML = html;
                    chatMessages.appendChild(temp.firstChild);
                });
                scrollToBottom();
            }
        } catch (error) {
            console.warn('Failed to load chat history:', error);
        }
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();
