import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(private readonly configService: ConfigService) { }

  getHello(): { status: string; message: string; timestamp: string } {
    return {
      status: 'ok',
      message: 'Marhas Backend API is running',
      timestamp: new Date().toISOString(),
    };
  }

  getHealth(): {
    status: string;
    uptime: number;
    timestamp: string;
    environment: string;
  } {
    return {
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: this.configService.get<string>('server.nodeEnv') || 'development',
    };
  }
}
