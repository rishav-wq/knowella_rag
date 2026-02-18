<!-- Knowella Chat Widget v4 -->
<div id="knowella-chat-widget">
    <!-- Chat Button (floating bubble) -->
    <button id="knowella-chat-button" class="knowella-chat-bubble" aria-label="Open Knowella Chat">
        <img src="<?php echo plugin_dir_url(dirname(__FILE__)) . 'assets/logo4.png'; ?>" alt="Knowella Logo" style="width: 38px; height: 38px;">
    </button>

    <!-- Chat Panel -->
    <div id="knowella-chat-panel" class="knowella-chat-panel" style="display: none;">
        <!-- Header -->
        <div class="knowella-chat-header">
            <button id="knowella-chat-back" class="knowella-chat-back" aria-label="Back to welcome">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </button>
            <div class="knowella-chat-header-content">
                <div class="knowella-chat-icon">
                    <img src="<?php echo plugin_dir_url(dirname(__FILE__)) . 'assets/logo4.png'; ?>" alt="Knowella Logo" style="width: 32px; height: 32px;">
                </div>
                <div class="knowella-chat-header-info">
                    <h3 class="knowella-chat-title">
                        Knowella Assistant
                        <span class="knowella-status-indicator"></span>
                    </h3>
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
            <div class="knowella-welcome-greeting">
                <h2 class="knowella-welcome-title">👋 Hi there!</h2>
                <p class="knowella-welcome-subtitle">I'm the Knowella AI assistant. I can help you learn about our products, services, and solutions.</p>
            </div>

            <div class="knowella-faq-section">
                <p class="knowella-faq-label">FREQUENTLY ASKED</p>
                <div class="knowella-faq-list">
                    <button class="knowella-faq-btn" data-question="What is Knowella?">What is Knowella?</button>
                    <button class="knowella-faq-btn" data-question="What products does Knowella offer?">What products does Knowella offer?</button>
                    <button class="knowella-faq-btn" data-question="How can Knowella help my business?">How can Knowella help my business?</button>
                </div>
            </div>

            <!-- Hidden view history, shown by JS if history exists -->
            <button class="knowella-view-history-btn" id="knowella-view-history" style="display:none;">
                <div class="knowella-history-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                        <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </div>
                <div class="knowella-history-content">
                    <p class="knowella-history-title">View History</p>
                    <p class="knowella-history-subtitle">See your past conversation</p>
                </div>
            </button>
        </div>

        <!-- Messages Container -->
        <div id="knowella-chat-messages" class="knowella-chat-messages" style="display:none;"></div>

        <!-- Input Area -->
        <div class="knowella-chat-input-container">
            <form id="knowella-chat-form">
                <div class="knowella-input-card">
                    <textarea
                        id="knowella-chat-input"
                        class="knowella-chat-input"
                        placeholder="Type your message here"
                        maxlength="500"
                        rows="2"
                    ></textarea>
                    <button type="submit" id="knowella-chat-send" class="knowella-chat-send-btn" aria-label="Send message">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                </div>
            </form>
            <p class="knowella-chat-disclaimer">
                Powered by Knowella AI Inc. Ella-Chatbot is a preview feature. Inputs may be used to improve the feature. AI-generated outputs may be inaccurate; verify before use. Do not share sensitive information here.
            </p>
        </div>
    </div>
</div>
