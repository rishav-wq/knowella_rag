<?php
/**
 * Plugin Name: Knowella RAG Webhook Trigger
 * Plugin URI: https://knowella.com
 * Description: Automatically triggers RAG content re-ingestion when WordPress content is updated
 * Version: 1.0.0
 * Author: Knowella
 * Author URI: https://knowella.com
 * License: GPL v2 or later
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class Knowella_Webhook_Trigger {

    private $webhook_url;
    private $webhook_secret;

    public function __construct() {
        // Load configuration
        $this->webhook_url = get_option('knowella_webhook_url', '');
        $this->webhook_secret = get_option('knowella_webhook_secret', '');

        // Admin settings
        add_action('admin_menu', array($this, 'add_settings_page'));
        add_action('admin_init', array($this, 'register_settings'));

        // Trigger webhook on content changes
        add_action('save_post', array($this, 'trigger_on_post_save'), 10, 3);
        add_action('delete_post', array($this, 'trigger_on_post_delete'));

        // Add admin notice for webhook status
        add_action('admin_notices', array($this, 'show_admin_notices'));
    }

    /**
     * Add settings page to admin menu
     */
    public function add_settings_page() {
        add_options_page(
            'Knowella Webhook Settings',
            'Knowella Webhook',
            'manage_options',
            'knowella-webhook',
            array($this, 'render_settings_page')
        );
    }

    /**
     * Register plugin settings
     */
    public function register_settings() {
        register_setting('knowella_webhook_settings', 'knowella_webhook_url');
        register_setting('knowella_webhook_settings', 'knowella_webhook_secret');
        register_setting('knowella_webhook_settings', 'knowella_webhook_enabled');
        register_setting('knowella_webhook_settings', 'knowella_webhook_post_types');
    }

    /**
     * Render settings page
     */
    public function render_settings_page() {
        ?>
        <div class="wrap">
            <h1>🔗 Knowella RAG Webhook Settings</h1>

            <div class="notice notice-info">
                <p><strong>How it works:</strong> When you publish or update a page/post, this plugin automatically triggers the RAG system to re-crawl and update the chatbot's knowledge base.</p>
            </div>

            <form method="post" action="options.php">
                <?php settings_fields('knowella_webhook_settings'); ?>

                <table class="form-table">
                    <tr>
                        <th scope="row">
                            <label for="knowella_webhook_enabled">Enable Webhook</label>
                        </th>
                        <td>
                            <input type="checkbox"
                                   name="knowella_webhook_enabled"
                                   id="knowella_webhook_enabled"
                                   value="1"
                                   <?php checked(get_option('knowella_webhook_enabled'), 1); ?>>
                            <p class="description">Enable automatic webhook triggers on content changes</p>
                        </td>
                    </tr>

                    <tr>
                        <th scope="row">
                            <label for="knowella_webhook_url">Webhook URL</label>
                        </th>
                        <td>
                            <input type="url"
                                   name="knowella_webhook_url"
                                   id="knowella_webhook_url"
                                   value="<?php echo esc_attr($this->webhook_url); ?>"
                                   class="regular-text"
                                   placeholder="https://your-api-domain.com/webhook/wordpress-update">
                            <p class="description">Your RAG API webhook endpoint URL</p>
                        </td>
                    </tr>

                    <tr>
                        <th scope="row">
                            <label for="knowella_webhook_secret">Webhook Secret</label>
                        </th>
                        <td>
                            <input type="password"
                                   name="knowella_webhook_secret"
                                   id="knowella_webhook_secret"
                                   value="<?php echo esc_attr($this->webhook_secret); ?>"
                                   class="regular-text"
                                   placeholder="your-webhook-secret">
                            <p class="description">Secret key for webhook authentication (must match your .env WEBHOOK_SECRET)</p>
                        </td>
                    </tr>

                    <tr>
                        <th scope="row">
                            <label for="knowella_webhook_post_types">Post Types</label>
                        </th>
                        <td>
                            <input type="text"
                                   name="knowella_webhook_post_types"
                                   id="knowella_webhook_post_types"
                                   value="<?php echo esc_attr(get_option('knowella_webhook_post_types', 'post,page')); ?>"
                                   class="regular-text"
                                   placeholder="post,page">
                            <p class="description">Comma-separated list of post types to trigger on (e.g., post,page,product)</p>
                        </td>
                    </tr>
                </table>

                <?php submit_button('Save Settings'); ?>
            </form>

            <hr>

            <h2>🧪 Test Webhook</h2>
            <p>Click the button below to manually trigger the webhook and test your configuration:</p>
            <button type="button" class="button button-secondary" onclick="knowellaTestWebhook()">
                Test Webhook Connection
            </button>
            <div id="knowella-webhook-test-result" style="margin-top: 10px;"></div>

            <script>
            function knowellaTestWebhook() {
                const resultDiv = document.getElementById('knowella-webhook-test-result');
                resultDiv.innerHTML = '<p>⏳ Testing webhook connection...</p>';

                fetch(ajaxurl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: 'action=knowella_test_webhook'
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        resultDiv.innerHTML = '<div class="notice notice-success inline"><p>✅ ' + data.data.message + '</p></div>';
                    } else {
                        resultDiv.innerHTML = '<div class="notice notice-error inline"><p>❌ ' + data.data.message + '</p></div>';
                    }
                })
                .catch(error => {
                    resultDiv.innerHTML = '<div class="notice notice-error inline"><p>❌ Error: ' + error.message + '</p></div>';
                });
            }
            </script>
        </div>
        <?php
    }

    /**
     * Trigger webhook when post is saved/published
     */
    public function trigger_on_post_save($post_id, $post, $update) {
        // Check if webhook is enabled
        if (!get_option('knowella_webhook_enabled')) {
            return;
        }

        // Don't trigger on autosave or revisions
        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;
        if (wp_is_post_revision($post_id)) return;
        if (wp_is_post_autosave($post_id)) return;

        // Check if post type should trigger webhook
        $allowed_types = explode(',', str_replace(' ', '', get_option('knowella_webhook_post_types', 'post,page')));
        if (!in_array($post->post_type, $allowed_types)) {
            return;
        }

        // Only trigger on published posts
        if ($post->post_status !== 'publish') {
            return;
        }

        // Trigger webhook
        $this->send_webhook_request('post_updated', array(
            'post_id' => $post_id,
            'post_title' => $post->post_title,
            'post_url' => get_permalink($post_id),
            'post_type' => $post->post_type,
            'is_new' => !$update
        ));
    }

    /**
     * Trigger webhook when post is deleted
     */
    public function trigger_on_post_delete($post_id) {
        if (!get_option('knowella_webhook_enabled')) {
            return;
        }

        $post = get_post($post_id);
        if (!$post) return;

        $this->send_webhook_request('post_deleted', array(
            'post_id' => $post_id,
            'post_title' => $post->post_title,
            'post_type' => $post->post_type
        ));
    }

    /**
     * Send webhook HTTP request
     */
    private function send_webhook_request($event, $data) {
        if (empty($this->webhook_url) || empty($this->webhook_secret)) {
            error_log('Knowella Webhook: URL or secret not configured');
            return;
        }

        $payload = array(
            'event' => $event,
            'timestamp' => current_time('c'),
            'site_url' => get_site_url(),
            'data' => $data
        );

        $response = wp_remote_post($this->webhook_url, array(
            'method' => 'POST',
            'timeout' => 45,
            'headers' => array(
                'Content-Type' => 'application/json',
                'X-Webhook-Secret' => $this->webhook_secret,
                'X-WordPress-Site' => get_site_url()
            ),
            'body' => json_encode($payload)
        ));

        if (is_wp_error($response)) {
            error_log('Knowella Webhook Error: ' . $response->get_error_message());
        } else {
            $code = wp_remote_retrieve_response_code($response);
            $body = wp_remote_retrieve_body($response);

            if ($code == 200) {
                error_log('Knowella Webhook: Successfully triggered ingestion');
            } else {
                error_log('Knowella Webhook: Failed with code ' . $code . ' - ' . $body);
            }
        }
    }

    /**
     * Show admin notices
     */
    public function show_admin_notices() {
        if (empty($this->webhook_url) && current_user_can('manage_options')) {
            ?>
            <div class="notice notice-warning">
                <p><strong>Knowella RAG Webhook:</strong> Webhook URL not configured.
                   <a href="<?php echo admin_url('options-general.php?page=knowella-webhook'); ?>">Configure now</a>
                </p>
            </div>
            <?php
        }
    }
}

// AJAX handler for test webhook
add_action('wp_ajax_knowella_test_webhook', function() {
    $webhook_url = get_option('knowella_webhook_url');
    $webhook_secret = get_option('knowella_webhook_secret');

    if (empty($webhook_url) || empty($webhook_secret)) {
        wp_send_json_error(array('message' => 'Webhook URL or secret not configured'));
        return;
    }

    $response = wp_remote_post($webhook_url, array(
        'method' => 'POST',
        'timeout' => 30,
        'headers' => array(
            'Content-Type' => 'application/json',
            'X-Webhook-Secret' => $webhook_secret
        ),
        'body' => json_encode(array(
            'event' => 'test',
            'timestamp' => current_time('c'),
            'site_url' => get_site_url()
        ))
    ));

    if (is_wp_error($response)) {
        wp_send_json_error(array('message' => 'Connection failed: ' . $response->get_error_message()));
    } else {
        $code = wp_remote_retrieve_response_code($response);
        if ($code == 200) {
            wp_send_json_success(array('message' => 'Webhook test successful! RAG ingestion triggered.'));
        } else {
            wp_send_json_error(array('message' => 'Webhook returned error code: ' . $code));
        }
    }
});

// Initialize plugin
new Knowella_Webhook_Trigger();
