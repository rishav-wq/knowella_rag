<?php
/**
 * Plugin Name: Knowella Chat Widget
 * Plugin URI: https://knowella.com
 * Description: AI-powered chat widget that answers questions using Knowella website content
 * Version: 1.0.0
 * Author: Knowella
 * Author URI: https://knowella.com
 * License: GPL v2 or later
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class Knowella_Chat_Widget {
    
    private $api_url;
    
    public function __construct() {
        // API endpoint - update this for production
        $this->api_url = get_option('knowella_chat_api_url', 'http://localhost:3000/chat/knowella');
        
        // Hooks
        add_action('wp_footer', array($this, 'render_widget'));
        add_action('wp_enqueue_scripts', array($this, 'enqueue_assets'));
        add_action('admin_menu', array($this, 'add_settings_page'));
        add_action('admin_init', array($this, 'register_settings'));
    }
    
    /**
     * Enqueue widget CSS and JS
     */
    public function enqueue_assets() {
        // Only load on frontend
        if (is_admin()) {
            return;
        }
        
        wp_enqueue_style(
            'knowella-chat-widget',
            plugins_url('assets/knowella-widget.css', __FILE__),
            array(),
            '1.0.0'
        );
        
        wp_enqueue_script(
            'knowella-chat-widget',
            plugins_url('assets/knowella-widget-v4.js', __FILE__),
            array(),
            '4.0.0',
            true
        );

        // Pass config to JavaScript
        wp_localize_script('knowella-chat-widget', 'knowellaConfig', array(
            'apiUrl' => $this->api_url,
            'theme' => get_option('knowella_chat_theme', 'light'),
            'logoUrl' => plugins_url('assets/logo4.png', __FILE__),
            'userIconUrl' => plugins_url('assets/icon.svg', __FILE__)
        ));
    }
    
    /**
     * Render the widget HTML in footer
     */
    public function render_widget() {
        if (is_admin()) {
            return;
        }
        
        include plugin_dir_path(__FILE__) . 'templates/widget.php';
    }
    
    /**
     * Add settings page to admin menu
     */
    public function add_settings_page() {
        add_options_page(
            'Knowella Chat Widget Settings',
            'Knowella Chat',
            'manage_options',
            'knowella-chat-widget',
            array($this, 'render_settings_page')
        );
    }
    
    /**
     * Register plugin settings
     */
    public function register_settings() {
        register_setting('knowella_chat_settings', 'knowella_chat_api_url');
        register_setting('knowella_chat_settings', 'knowella_chat_theme');
        register_setting('knowella_chat_settings', 'knowella_chat_tone');
        register_setting('knowella_chat_settings', 'knowella_chat_rules');
        register_setting('knowella_chat_settings', 'knowella_chat_disclaimer');
    }
    
    /**
     * Render settings page
     */
    public function render_settings_page() {
        include plugin_dir_path(__FILE__) . 'templates/settings.php';
    }
}

// Initialize plugin
new Knowella_Chat_Widget();
