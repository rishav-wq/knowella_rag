<!-- Knowella Chat Widget v4 -->
<div id="knowella-chat-widget">
    <!-- Chat Button (floating bubble) -->
    <button id="knowella-chat-button" class="knowella-chat-bubble" aria-label="Open Knowella Chat">
        <img src="<?php echo plugin_dir_url(dirname(__FILE__)) . 'assets/logo2.png'; ?>" alt="Knowella Logo">
    </button>

    <!-- Chat Panel -->
    <div id="knowella-chat-panel" class="knowella-chat-panel" style="display: none;">
        <!-- Header -->
        <div class="knowella-chat-header">
            <div class="knowella-chat-header-content">
                <button id="knowella-chat-back" class="knowella-chat-back" aria-label="Back to welcome">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
                <div class="knowella-chat-icon">
                    <img src="<?php echo plugin_dir_url(dirname(__FILE__)) . 'assets/logo2.png'; ?>" alt="Knowella Logo">
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

        <!-- Welcome Screen -->
        <div id="knowella-welcome-screen" class="knowella-welcome-screen">
            <div class="knowella-welcome-content">
                <h2>Hi there!</h2>
                <p>I'm the Knowella AI assistant. I can help you learn about our products, services, and solutions.</p>
            </div>

            <div class="knowella-faq-section">
                <h4>Frequently Asked</h4>
                <button class="knowella-faq-btn" data-question="What is Knowella?">What is Knowella?</button>
                <button class="knowella-faq-btn" data-question="What products does Knowella offer?">What products does Knowella offer?</button>
                <button class="knowella-faq-btn" data-question="How can Knowella help my business?">How can Knowella help my business?</button>
            </div>

            <button id="knowella-view-history" class="knowella-view-history" style="display: none;">
                View previous conversation
            </button>
        </div>

        <!-- Messages Container -->
        <div id="knowella-chat-messages" class="knowella-chat-messages hidden"></div>

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
                Powered by Knowella AI
            </p>
        </div>
    </div>
</div>
