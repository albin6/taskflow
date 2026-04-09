import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseMetricsService {
  constructor(private readonly dataSource: DataSource) {}

  getPoolStats() {
    const driver = this.dataSource.driver as any;
    // TypeORM uses pg-pool for postgres
    const pool = driver.master || driver.pool;

    if (!pool) {
      return { status: 'disconnected' };
    }

    return {
      status: 'connected',
      totalConnections: pool.totalCount,
      idleConnections: pool.idleCount,
      waitingRequests: pool.waitingCount,
    };
  }
}
