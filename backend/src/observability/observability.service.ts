import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { monitorEventLoopDelay, IntervalHistogram } from 'perf_hooks';

@Injectable()
export class ObservabilityService implements OnModuleInit, OnModuleDestroy {
  private histogram: IntervalHistogram;
  private startTime: number;

  onModuleInit() {
    this.startTime = Date.now();
    // Monitor event loop delay with 10ms resolution
    this.histogram = monitorEventLoopDelay({ resolution: 10 });
    this.histogram.enable();
  }

  onModuleDestroy() {
    this.histogram.disable();
  }

  getAppHealth() {
    return {
      uptime: Math.floor((Date.now() - this.startTime) / 1000), // in seconds
      eventLoopLag: {
        p50: this.histogram.percentile(50) / 1e6, // ms
        p95: this.histogram.percentile(95) / 1e6, // ms
        p99: this.histogram.percentile(99) / 1e6, // ms
        max: this.histogram.max / 1e6, // ms
      },
    };
  }
}
