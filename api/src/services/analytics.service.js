/**
 * Analytics Service
 * Tracks user information and queries for lead generation and analytics
 */

const Database = require('better-sqlite3');
const path = require('path');

class AnalyticsService {
  constructor() {
    // Initialize SQLite database
    const dbPath = path.join(__dirname, '../../data/analytics.db');
    this.db = new Database(dbPath);

    // Enable WAL mode for better concurrency
    this.db.pragma('journal_mode = WAL');

    // Initialize tables
    this.initializeTables();

    console.log('📊 Analytics database initialized');
  }

  /**
   * Initialize database tables
   */
  initializeTables() {
    // User sessions table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_active DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // User queries table (only stores questions, not responses)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_queries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        question TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES user_sessions(session_id)
      )
    `);

    // Create indexes for faster queries
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_sessions_email ON user_sessions(email);
      CREATE INDEX IF NOT EXISTS idx_sessions_created ON user_sessions(created_at);
      CREATE INDEX IF NOT EXISTS idx_queries_session ON user_queries(session_id);
      CREATE INDEX IF NOT EXISTS idx_queries_timestamp ON user_queries(timestamp);
    `);
  }

  /**
   * Create or update user session
   * @param {string} sessionId - Unique session identifier
   * @param {string} name - User's name
   * @param {string} email - User's email
   * @param {string} ipAddress - User's IP address
   * @param {string} userAgent - User's browser user agent
   * @returns {object} Session info
   */
  createOrUpdateSession(sessionId, name, email, ipAddress, userAgent) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO user_sessions (session_id, name, email, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(session_id) DO UPDATE SET
          last_active = CURRENT_TIMESTAMP,
          name = excluded.name,
          email = excluded.email
      `);

      stmt.run(sessionId, name, email, ipAddress, userAgent);

      return {
        success: true,
        sessionId,
        name,
        email
      };
    } catch (error) {
      console.error('Error creating/updating session:', error);
      throw error;
    }
  }

  /**
   * Log user query (question only, not bot response)
   * @param {string} sessionId - Session identifier
   * @param {string} question - User's question
   * @returns {object} Query info
   */
  logQuery(sessionId, question) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO user_queries (session_id, question)
        VALUES (?, ?)
      `);

      const result = stmt.run(sessionId, question);

      // Update last_active timestamp for session
      this.db.prepare(`
        UPDATE user_sessions
        SET last_active = CURRENT_TIMESTAMP
        WHERE session_id = ?
      `).run(sessionId);

      return {
        success: true,
        queryId: result.lastInsertRowid,
        sessionId,
        question
      };
    } catch (error) {
      console.error('Error logging query:', error);
      throw error;
    }
  }

  /**
   * Get session by session ID
   * @param {string} sessionId
   * @returns {object|null}
   */
  getSession(sessionId) {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM user_sessions WHERE session_id = ?
      `);

      return stmt.get(sessionId);
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }

  /**
   * Get all queries for a session
   * @param {string} sessionId
   * @returns {array}
   */
  getSessionQueries(sessionId) {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM user_queries
        WHERE session_id = ?
        ORDER BY timestamp DESC
      `);

      return stmt.all(sessionId);
    } catch (error) {
      console.error('Error getting session queries:', error);
      return [];
    }
  }

  /**
   * Get analytics summary
   * @returns {object}
   */
  getAnalyticsSummary() {
    try {
      const totalSessions = this.db.prepare(`
        SELECT COUNT(*) as count FROM user_sessions
      `).get().count;

      const totalQueries = this.db.prepare(`
        SELECT COUNT(*) as count FROM user_queries
      `).get().count;

      const uniqueEmails = this.db.prepare(`
        SELECT COUNT(DISTINCT email) as count FROM user_sessions
      `).get().count;

      const recentQueries = this.db.prepare(`
        SELECT q.question, q.timestamp, s.name, s.email
        FROM user_queries q
        JOIN user_sessions s ON q.session_id = s.session_id
        ORDER BY q.timestamp DESC
        LIMIT 10
      `).all();

      const topQuestions = this.db.prepare(`
        SELECT question, COUNT(*) as count
        FROM user_queries
        GROUP BY LOWER(question)
        ORDER BY count DESC
        LIMIT 10
      `).all();

      return {
        totalSessions,
        totalQueries,
        uniqueEmails,
        averageQueriesPerSession: totalSessions > 0
          ? (totalQueries / totalSessions).toFixed(2)
          : 0,
        recentQueries,
        topQuestions
      };
    } catch (error) {
      console.error('Error getting analytics summary:', error);
      return null;
    }
  }

  /**
   * Export all data (for admin review)
   * @returns {object}
   */
  exportAllData() {
    try {
      const sessions = this.db.prepare(`
        SELECT * FROM user_sessions ORDER BY created_at DESC
      `).all();

      const queries = this.db.prepare(`
        SELECT q.*, s.name, s.email
        FROM user_queries q
        JOIN user_sessions s ON q.session_id = s.session_id
        ORDER BY q.timestamp DESC
      `).all();

      return {
        sessions,
        queries,
        exportDate: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error exporting data:', error);
      return null;
    }
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

// Export singleton instance
module.exports = new AnalyticsService();
