
import { Pool, PoolClient, QueryResult } from 'pg'
import { env } from "decentraland-commons"

// tslint:disable-next-line:variable-name
const pg_pool = new Pool({
  connectionString: env.get("PG_URL") || 'postgresql://用户名:密码@IP:端口/数据库',
  max: 1,
  min: 0,
  idleTimeoutMillis: 30000
})
pg_pool.on('error', (err, client) => {
  console.error('Error on idle client', err.message || err + '')
})

class DB {
  private mPool: Pool
  constructor(pool: Pool) {
    this.mPool = pool
  }
  async connect(): Promise<DBSession> {
    const client = await this.mPool.connect()
    return new DBSession(client)
  }

  async doTrans(callback: (dbs: DBSession) => Promise<unknown>): Promise<unknown> {
    const dbs = await this.connect()
    try {
      await dbs.begin()
      const result = await callback(dbs)
      await dbs.commit()
      return result
    } catch (e) {
      await dbs.rollback()
      console.error('DB.doTrans() error, rollback:', e)
      throw e
    } finally {
      dbs.close()
    }
  }

  async run(callback: (dbs: DBSession) => Promise<unknown>): Promise<unknown> {
    const dbs = await this.connect()
    try {
      return await callback(dbs)
    } catch (e) {
      console.error('DB.execute() error:', e)
      throw e
    } finally {
      dbs.close()
    }
  }

  async queryList(sql: string, ...parameters: any[]): Promise<any[]> {
    const result = await this.mPool.query(sql, parameters)
    if (!result || !(result.rows instanceof Array)) {
      return []
    }
    return result.rows
  }

  async queryFirst(sql: string, ...parameters: any[]): Promise<any> {
    const result = await this.mPool.query(sql, parameters)
    if (result && result.rowCount > 0) {
      return result.rows[0]
    } else {
      return null
    }
  }

  async queryValue(sql: string, ...parameters: any[]): Promise<unknown> {
    const result = await this.mPool.query(sql, parameters)
    if (result && result.rowCount > 0) {
      const key = result.fields[0].name
      return result.rows[0][key]
    } else {
      return null
    }
  }

  async query(sql: string, ...parameters: any[]): Promise<QueryResult<any>> {
    return this.mPool.query(sql, parameters)
  }
}

const pgDB = new DB(pg_pool)
export { pgDB }

class DBSession {
  private _client: PoolClient
  private _transaction = false

  constructor(client: PoolClient) {
    this._client = client
  }
  async begin(): Promise<void> {
    await this._client.query('begin')
    this._transaction = true
  }

  async commit(): Promise<void> {
    await this._client.query('commit')
    this._transaction = false
  }

  async savepoint(id: string): Promise<void> {
    await this._client.query('savepoint $1', [id])
  }

  async rollback(savepoint?: string): Promise<void> {
    if (savepoint) {
      await this._client.query('rollback to savepoint $1', [savepoint])
    } else {
      await this._client.query('rollback')
      this._transaction = false
    }
  }
  async queryList(sql: string, ...parameters: any[]): Promise<any[]> {
    const result = await this._client.query(sql, parameters)
    if (!result || !(result.rows instanceof Array)) {
      return []
    }
    return result.rows
  }
  async queryFirst(sql: string, ...parameters: any[]): Promise<any> {
    const result = await this._client.query(sql, parameters)
    if (result && result.rowCount > 0) {
      return result.rows[0]
    } else {
      return null
    }
  }
  async queryValue(sql: string, ...parameters: any[]): Promise<unknown> {
    const result = await this._client.query(sql, parameters)
    if (result && result.rowCount > 0) {
      const key = result.fields[0].name
      return result.rows[0][key]
    } else {
      return null
    }
  }
  async query(sql: string, ...parameters: any[]): Promise<QueryResult<any>> {
    return this._client.query(sql, parameters)
  }
  close() {
    if (this._transaction) {
      this.rollback()
    }
    this._client.release()
  }
}
