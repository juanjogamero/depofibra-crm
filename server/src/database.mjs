import pg from 'pg';

/**
 * Producción: conexión peer por socket Unix. No acepta URL, usuario o
 * contraseña configurables; el proceso debe correr como depofibra_v2_api.
 * Solo GitHub CI usa un DSN explícito en un entorno de prueba restringido.
 */
export class Database {
  constructor({ testConnectionString } = {}) {
    let connection = {
      host: '/var/run/postgresql',
      port: 5432,
      database: 'depofibra_crm_v2',
      user: 'depofibra_v2_api'
    };
    if (testConnectionString !== undefined) {
      if (process.env.NODE_ENV !== 'test' || process.env.CRM_INTEGRATION_TEST !== '1') {
        throw new Error('Solo las pruebas CI pueden utilizar cadena de conexión');
      }
      let url;
      try { url = new URL(testConnectionString); }
      catch { throw new Error('Cadena de conexión de pruebas inválida'); }
      if (!['postgres:', 'postgresql:'].includes(url.protocol)
        || !['127.0.0.1','localhost'].includes(url.hostname)
        || url.pathname !== '/depofibra_crm_v2'
        || decodeURIComponent(url.username) !== 'depofibra_v2_api') {
        throw new Error('Destino PostgreSQL de pruebas incorrecto');
      }
      connection = { connectionString: testConnectionString };
    }
    this.pool = new pg.Pool({
      ...connection,
      max: 4,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      application_name: 'depofibra_crm_v2_api'
    });
  }
  async health() {
    await this.pool.query('SELECT 1');
  }
  async getUser(username) {
    const result = await this.pool.query(
      'SELECT id, username, password_hash, role, active, locked_until FROM crm.users WHERE username=$1',
      [username]
    );
    return result.rows[0] || null;
  }
  async failLogin(userId) {
    await this.pool.query(`
      UPDATE crm.users
         SET failed_attempts=failed_attempts+1,
             locked_until=CASE WHEN failed_attempts+1 >= 5
                          THEN now()+interval '15 minutes' ELSE locked_until END
       WHERE id=$1`, [userId]);
    await this.pool.query(
      "INSERT INTO crm.audit(actor_id,action) VALUES($1,'login_fail')",
      [userId]
    );
  }
  async successfulLogin(userId, tokenHash, seconds) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        'UPDATE crm.users SET failed_attempts=0, locked_until=NULL, last_login_at=now() WHERE id=$1',
        [userId]
      );
      await client.query(
        "INSERT INTO crm.sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+($3::integer * interval '1 second'))",
        [tokenHash, userId, seconds]
      );
      await client.query("INSERT INTO crm.audit(actor_id,action) VALUES($1,'login_ok')", [userId]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  async session(tokenHash) {
    const result = await this.pool.query(`
      SELECT u.id, u.username, u.role
        FROM crm.sessions s
        JOIN crm.users u ON u.id=s.user_id
       WHERE s.token_hash=$1 AND s.revoked_at IS NULL AND s.expires_at>now() AND u.active=true
    `, [tokenHash]);
    return result.rows[0] || null;
  }
  async logout(tokenHash) {
    const result = await this.pool.query(`
      UPDATE crm.sessions SET revoked_at=now()
       WHERE token_hash=$1 AND revoked_at IS NULL
       RETURNING user_id
    `, [tokenHash]);
    if (result.rows[0]) {
      await this.pool.query("INSERT INTO crm.audit(actor_id,action) VALUES($1,'logout')", [result.rows[0].user_id]);
    }
  }
  async close() { await this.pool.end(); }
}
