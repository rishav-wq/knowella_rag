<!-- Knowella Chat Widget -->
<div id="knowella-chat-widget">
    <!-- Chat Button (floating bubble) -->
    <button id="knowella-chat-button" class="knowella-chat-bubble" aria-label="Open Knowella Chat">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z" stroke="white" stroke-width="2" fill="none"/>
            <line x1="6" y1="8" x2="18" y2="8" stroke="white" stroke-width="2"/>
            <line x1="6" y1="12" x2="14" y2="12" stroke="white" stroke-width="2"/>
        </svg>
    </button>
    
    <!-- Chat Panel -->
    <div id="knowella-chat-panel" class="knowella-chat-panel" style="display: none;">
        <!-- Header -->
        <div class="knowella-chat-header">
            <div class="knowella-chat-header-content">
                <div class="knowella-chat-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2C6.48 2 2 6.48 2 12C2 13.93 2.6 15.71 3.63 17.19L2.05 21.95L7.05 20.41C8.48 21.32 10.18 21.87 12 21.87C17.52 21.87 22 17.39 22 11.87C22 6.35 17.52 2 12 2Z" fill="currentColor"/>
                    </svg>
                </div>
                <div>
                    <h3 class="knowella-chat-title">Knowella Assistant</h3>
                    <p class="knowella-chat-status">Ask me anything about Knowella</p>
                </div>
            </div>
            <button id="knowella-chat-close" class="knowella-chat-close" aria-label="Close chat">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            </button>
        </div>
        
        <!-- Messages Container -->
        <div id="knowella-chat-messages" class="knowella-chat-messages">
            <div class="knowella-message knowella-message-bot">
                <div class="knowella-message-content">
                    <p>👋 Hi! I'm the Knowella AI assistant. Ask me anything about Knowella's products, services, or solutions!</p>
                </div>
            </div>
        </div>
        
        <!-- Input Area -->
        <div class="knowella-chat-input-container">
            <form id="knowella-chat-form">
                <input 
                    type="text" 
                    id="knowella-chat-input" 
                    class="knowella-chat-input" 
                    placeholder="Ask a question..."
                    autocomplete="off"
                    maxlength="500"
                />
                <button type="submit" id="knowella-chat-send" class="knowella-chat-send-btn" aria-label="Send message">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
            </form>
            <p class="knowella-chat-disclaimer">
                Powered by Knowella AI • Responses based on knowella.com content
            </p>
        </div>
    </div>
</div>
