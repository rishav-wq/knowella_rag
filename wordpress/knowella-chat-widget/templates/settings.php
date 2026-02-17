<div class="wrap">
    <h1>Knowella Chat Widget Settings</h1>
    
    <form method="post" action="options.php">
        <?php settings_fields('knowella_chat_settings'); ?>
        <?php do_settings_sections('knowella_chat_settings'); ?>
        
        <table class="form-table">
            <tr>
                <th scope="row">
                    <label for="knowella_chat_api_url">API Endpoint URL</label>
                </th>
                <td>
                    <input 
                        type="url" 
                        id="knowella_chat_api_url" 
                        name="knowella_chat_api_url" 
                        value="<?php echo esc_attr(get_option('knowella_chat_api_url', 'https://apirg.knowella.com/chat/knowella')); ?>" 
                        class="regular-text"
                    />
                    <p class="description">The URL of your Knowella RAG API endpoint</p>
                </td>
            </tr>
            
            <tr>
                <th scope="row">
                    <label for="knowella_chat_theme">Widget Theme</label>
                </th>
                <td>
                    <select id="knowella_chat_theme" name="knowella_chat_theme">
                        <option value="light" <?php selected(get_option('knowella_chat_theme', 'light'), 'light'); ?>>Light</option>
                        <option value="dark" <?php selected(get_option('knowella_chat_theme', 'light'), 'dark'); ?>>Dark</option>
                    </select>
                </td>
            </tr>
            
            <tr>
                <th scope="row">
                    <label for="knowella_chat_tone">Bot Tone</label>
                </th>
                <td>
                    <input 
                        type="text" 
                        id="knowella_chat_tone" 
                        name="knowella_chat_tone" 
                        value="<?php echo esc_attr(get_option('knowella_chat_tone', 'helpful, professional, and friendly')); ?>" 
                        class="regular-text"
                    />
                    <p class="description">How the bot should communicate (e.g., "helpful, professional, and friendly")</p>
                </td>
            </tr>
            
            <tr>
                <th scope="row">
                    <label for="knowella_chat_rules">Response Rules</label>
                </th>
                <td>
                    <textarea 
                        id="knowella_chat_rules" 
                        name="knowella_chat_rules" 
                        rows="3" 
                        class="large-text"
                    ><?php echo esc_textarea(get_option('knowella_chat_rules', 'Keep answers concise and relevant. Focus on Knowella\'s AI-powered productivity solutions.')); ?></textarea>
                    <p class="description">Guidelines for how the bot should respond</p>
                </td>
            </tr>
            
            <tr>
                <th scope="row">
                    <label for="knowella_chat_disclaimer">Disclaimer</label>
                </th>
                <td>
                    <textarea 
                        id="knowella_chat_disclaimer" 
                        name="knowella_chat_disclaimer" 
                        rows="2" 
                        class="large-text"
                    ><?php echo esc_textarea(get_option('knowella_chat_disclaimer', 'This information is based on Knowella\'s website content. For specific inquiries, please contact Knowella directly.')); ?></textarea>
                    <p class="description">Disclaimer text shown to users</p>
                </td>
            </tr>
        </table>
        
        <?php submit_button(); ?>
    </form>
    
    <hr>
    
    <h2>Widget Status</h2>
    <p>The chat widget is currently <strong>active</strong> on all pages.</p>
    <p>To test the widget, visit any page on your site and look for the chat bubble in the bottom-right corner.</p>
    
    <h3>API Connection Test</h3>
    <p>
        <button type="button" id="test-api-connection" class="button">Test API Connection</button>
        <span id="api-test-result" style="margin-left: 10px;"></span>
    </p>
    
    <script>
    document.getElementById('test-api-connection').addEventListener('click', function() {
        const button = this;
        const result = document.getElementById('api-test-result');
        const apiUrl = document.getElementById('knowella_chat_api_url').value;
        
        button.disabled = true;
        result.textContent = 'Testing...';
        result.style.color = '#666';
        
        fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question: 'Hello' })
        })
        .then(response => response.json())
        .then(data => {
            result.textContent = '✓ Connection successful';
            result.style.color = 'green';
            button.disabled = false;
        })
        .catch(error => {
            result.textContent = '✗ Connection failed: ' + error.message;
            result.style.color = 'red';
            button.disabled = false;
        });
    });
    </script>
</div>
