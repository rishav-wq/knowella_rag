<!-- Knowella Chat Widget -->
<div id="knowella-chat-widget">
    <!-- Chat Button (floating bubble) -->
    <button id="knowella-chat-button" class="knowella-chat-bubble" aria-label="Open Knowella Chat">
        <img src="<?php echo plugin_dir_url(dirname(__FILE__)) . 'assets/llogo.png'; ?>" alt="Knowella Logo" style="width: 56px; height: 56px;">
    </button>
    
    <!-- Chat Panel -->
    <div id="knowella-chat-panel" class="knowella-chat-panel" style="display: none;">
        <!-- Header -->
        <div class="knowella-chat-header">
            <div class="knowella-chat-header-content">
                <div class="knowella-chat-icon">
                    <img src="<?php echo plugin_dir_url(dirname(__FILE__)) . 'assets/llogo.png'; ?>" alt="Knowella Logo" style="width: 48px; height: 48px;">
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
